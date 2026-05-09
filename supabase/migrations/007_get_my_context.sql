-- Returns the calling user's org context (bypasses RLS via SECURITY DEFINER)
-- Used by getUserContext() on the server side where direct org_members queries
-- can fail due to JWT propagation differences across hosts.
CREATE OR REPLACE FUNCTION public.get_my_context()
RETURNS TABLE(
  org_id   UUID,
  role     TEXT,
  org_name TEXT,
  hsd_rate NUMERIC,
  ms_rate  NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT om.org_id, om.role, o.name::TEXT, o.hsd_rate, o.ms_rate
  FROM   org_members om
  JOIN   organizations o ON o.id = om.org_id
  WHERE  om.user_id = auth.uid() AND om.is_active = true
  LIMIT  1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_context() TO authenticated;
