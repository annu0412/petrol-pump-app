-- ============================================================
-- ROW LEVEL SECURITY — Run AFTER 001_schema.sql
-- ============================================================

-- Enable RLS on all tables
alter table public.organizations   enable row level security;
alter table public.org_members     enable row level security;
alter table public.machines        enable row level security;
alter table public.employees       enable row level security;
alter table public.customers       enable row level security;
alter table public.master_entries  enable row level security;
alter table public.daily_summaries enable row level security;
alter table public.expenses        enable row level security;
alter table public.credit_entries  enable row level security;

-- ─────────────────────────────────────────────
-- HELPER FUNCTION: get current user's org_id
-- ─────────────────────────────────────────────
create or replace function public.my_org_id()
returns uuid language sql stable security definer as $$
  select org_id from public.org_members
  where user_id = auth.uid() and is_active = true
  limit 1;
$$;

-- ─────────────────────────────────────────────
-- HELPER FUNCTION: get current user's role
-- ─────────────────────────────────────────────
create or replace function public.my_role()
returns text language sql stable security definer as $$
  select role from public.org_members
  where user_id = auth.uid() and is_active = true
  limit 1;
$$;

-- ─────────────────────────────────────────────
-- ORGANIZATIONS
-- ─────────────────────────────────────────────
create policy "members can view their org"
  on public.organizations for select
  using (id = public.my_org_id());

create policy "owners can update their org"
  on public.organizations for update
  using (id = public.my_org_id() and public.my_role() = 'owner');

-- ─────────────────────────────────────────────
-- ORG MEMBERS
-- ─────────────────────────────────────────────
create policy "members can view their org members"
  on public.org_members for select
  using (org_id = public.my_org_id());

create policy "owners can manage members"
  on public.org_members for all
  using (org_id = public.my_org_id() and public.my_role() = 'owner');

-- ─────────────────────────────────────────────
-- MACHINES
-- ─────────────────────────────────────────────
create policy "members can view machines"
  on public.machines for select
  using (org_id = public.my_org_id());

create policy "owner and manager can manage machines"
  on public.machines for all
  using (org_id = public.my_org_id() and public.my_role() in ('owner','manager'));

-- ─────────────────────────────────────────────
-- EMPLOYEES
-- ─────────────────────────────────────────────
create policy "members can view employees"
  on public.employees for select
  using (org_id = public.my_org_id());

create policy "only owners can manage employees"
  on public.employees for all
  using (org_id = public.my_org_id() and public.my_role() = 'owner');

-- ─────────────────────────────────────────────
-- CUSTOMERS
-- ─────────────────────────────────────────────
create policy "members can view customers"
  on public.customers for select
  using (org_id = public.my_org_id());

create policy "owner and manager can manage customers"
  on public.customers for all
  using (org_id = public.my_org_id() and public.my_role() in ('owner','manager'));

-- ─────────────────────────────────────────────
-- MASTER ENTRIES
-- ─────────────────────────────────────────────
create policy "members can view master entries"
  on public.master_entries for select
  using (org_id = public.my_org_id());

create policy "members can insert master entries"
  on public.master_entries for insert
  with check (org_id = public.my_org_id());

create policy "members can update master entries"
  on public.master_entries for update
  using (org_id = public.my_org_id());

create policy "only owners can delete master entries"
  on public.master_entries for delete
  using (org_id = public.my_org_id() and public.my_role() = 'owner');

-- ─────────────────────────────────────────────
-- DAILY SUMMARIES
-- ─────────────────────────────────────────────
create policy "members can manage daily summaries"
  on public.daily_summaries for all
  using (org_id = public.my_org_id());

-- ─────────────────────────────────────────────
-- EXPENSES
-- ─────────────────────────────────────────────
create policy "members can view expenses"
  on public.expenses for select
  using (org_id = public.my_org_id());

create policy "members can add expenses"
  on public.expenses for insert
  with check (org_id = public.my_org_id());

create policy "owner and manager can delete expenses"
  on public.expenses for delete
  using (org_id = public.my_org_id() and public.my_role() in ('owner','manager'));

-- ─────────────────────────────────────────────
-- CREDIT ENTRIES
-- ─────────────────────────────────────────────
create policy "members can view credit entries"
  on public.credit_entries for select
  using (org_id = public.my_org_id());

create policy "members can add credit entries"
  on public.credit_entries for insert
  with check (org_id = public.my_org_id());

create policy "owner and manager can delete credit entries"
  on public.credit_entries for delete
  using (org_id = public.my_org_id() and public.my_role() in ('owner','manager'));
