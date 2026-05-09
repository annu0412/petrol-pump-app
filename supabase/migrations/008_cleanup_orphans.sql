-- ── Cleanup Script for Orphaned Rows ──────────────────────────────────────────
-- This script removes test data and failed registration attempts.
-- Run this in the Supabase SQL Editor as needed.

-- 1. Remove organizations with no members
-- (Failed registration at Step 2 or manual deletion of last member)
DELETE FROM public.organizations
WHERE id NOT IN (SELECT org_id FROM public.org_members);

-- 2. Remove users who haven't completed registration
-- We give a 24-hour grace period for active registration attempts.
-- Note: This requires high-level permissions usually available in the SQL Editor.
DELETE FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.org_members)
  AND created_at < now() - INTERVAL '24 hours';

-- 3. Remove stale invitations
-- (Already accepted, revoked, or expired)
DELETE FROM public.invitations
WHERE status IN ('accepted', 'revoked')
   OR expires_at < now();
