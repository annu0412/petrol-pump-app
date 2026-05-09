-- ── Invitations table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invitations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('manager', 'staff')),
  token      UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  invited_by UUID REFERENCES auth.users(id),
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Members can view invitations for their org
CREATE POLICY "members_view_invitations"
ON public.invitations FOR SELECT
USING (org_id = public.my_org_id());

-- Owners can create / update / delete invitations for their org
CREATE POLICY "owners_manage_invitations"
ON public.invitations FOR ALL
USING  (org_id = public.my_org_id() AND public.my_role() = 'owner')
WITH CHECK (org_id = public.my_org_id() AND public.my_role() = 'owner');

-- ── RPC: get_org_members ──────────────────────────────────────────────────────
-- Returns all members of the caller's org with email addresses from auth.users
CREATE OR REPLACE FUNCTION public.get_org_members()
RETURNS TABLE(
  member_id UUID,
  user_id   UUID,
  email     TEXT,
  role      TEXT,
  is_active BOOLEAN,
  joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT org_id INTO v_org_id
  FROM   org_members
  WHERE  user_id = auth.uid() AND is_active = true;

  IF v_org_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT om.id, om.user_id, au.email::TEXT, om.role, om.is_active, om.joined_at
  FROM   org_members om
  JOIN   auth.users  au ON au.id = om.user_id
  WHERE  om.org_id = v_org_id
  ORDER  BY om.joined_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_members() TO authenticated;

-- ── RPC: create_invitation ────────────────────────────────────────────────────
-- Creates a new invitation token; only org owners may call this
CREATE OR REPLACE FUNCTION public.create_invitation(p_role TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_role   TEXT;
  v_token  UUID;
BEGIN
  SELECT org_id, role INTO v_org_id, v_role
  FROM   org_members
  WHERE  user_id = auth.uid() AND is_active = true;

  IF v_role != 'owner' THEN
    RAISE EXCEPTION 'Only owners can create invitations';
  END IF;

  INSERT INTO invitations (org_id, role, invited_by)
  VALUES (v_org_id, p_role, auth.uid())
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_invitation(TEXT) TO authenticated;

-- ── RPC: accept_invitation ────────────────────────────────────────────────────
-- Links the currently authenticated user to the org referenced by the token
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_inv
  FROM   invitations
  WHERE  token = p_token
    AND  status = 'pending'
    AND  expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation link';
  END IF;

  INSERT INTO org_members (org_id, user_id, role, is_active, invited_by)
  VALUES (v_inv.org_id, auth.uid(), v_inv.role, true, v_inv.invited_by)
  ON CONFLICT (org_id, user_id)
  DO UPDATE SET role = v_inv.role, is_active = true;

  UPDATE invitations SET status = 'accepted' WHERE id = v_inv.id;

  RETURN jsonb_build_object('org_id', v_inv.org_id, 'role', v_inv.role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invitation(UUID) TO authenticated;

-- ── RPC: get_invitation_preview ───────────────────────────────────────────────
-- Returns org name + role for a token without requiring authentication
-- Used by the /join page before the visitor has signed in
CREATE OR REPLACE FUNCTION public.get_invitation_preview(p_token UUID)
RETURNS TABLE(org_name TEXT, role TEXT, valid BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.name::TEXT,
    i.role,
    (i.status = 'pending' AND i.expires_at > now()) AS valid
  FROM   invitations i
  JOIN   organizations o ON o.id = i.org_id
  WHERE  i.token = p_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invitation_preview(UUID) TO anon, authenticated;
