-- ============================================================
-- RLS policies for registration flow — Run AFTER 002_rls.sql
-- ============================================================
-- During registration, the user has no org_member row yet,
-- so my_org_id() returns NULL. These policies allow the
-- initial setup inserts for authenticated users.

-- Allow any authenticated user to create an org
create policy "authenticated users can create an org"
  on public.organizations for insert
  with check (auth.uid() is not null);

-- Allow any authenticated user to insert themselves as org member
create policy "authenticated users can join as owner on insert"
  on public.org_members for insert
  with check (auth.uid() is not null and user_id = auth.uid());

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
