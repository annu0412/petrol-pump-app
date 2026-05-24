-- ============================================================
-- RLS policies for registration flow — Run AFTER 002_rls.sql
-- ============================================================
-- During registration, the user has no org_member row yet,
-- so my_org_id() returns NULL. These policies allow the
-- initial setup inserts for authenticated users.

-- Allow any authenticated user to create an org
-- Note: Direct inserts to organizations and org_members are no longer allowed
-- for any authenticated user to prevent arbitrary data creation.
-- The RPC `register_org` handles this securely as it runs as SECURITY DEFINER.

-- Allow new org owners to insert machines during registration
create policy "members can insert machines"
  on public.machines for insert
  with check (auth.uid() is not null);

-- Allow new org owners to insert employees during registration
create policy "members can insert employees"
  on public.employees for insert
  with check (auth.uid() is not null);

-- Allow new org owners to insert customers during registration
create policy "members can insert customers"
  on public.customers for insert
  with check (auth.uid() is not null);
