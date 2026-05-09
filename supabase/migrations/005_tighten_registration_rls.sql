-- ============================================================
-- Tighten INSERT policies for registration flow
-- Replaces overly permissive policies from 003
-- ============================================================

drop policy if exists "members can insert machines"  on public.machines;
drop policy if exists "members can insert employees" on public.employees;
drop policy if exists "members can insert customers" on public.customers;

create policy "members can insert machines"
  on public.machines for insert
  with check (org_id = public.my_org_id());

create policy "members can insert employees"
  on public.employees for insert
  with check (org_id = public.my_org_id());

create policy "members can insert customers"
  on public.customers for insert
  with check (org_id = public.my_org_id());
