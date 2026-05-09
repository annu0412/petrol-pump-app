# Supabase SQL Setup Guide

Run these SQL scripts **in order** in the Supabase SQL Editor.
Each section corresponds to a migration file in `supabase/migrations/`.

---

## 1. Schema (`001_schema.sql`)

```sql
-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ORGANIZATIONS (one row per petrol pump)
create table public.organizations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  address     text,
  city        text,
  state       text,
  mobile      text,
  hsd_rate    numeric(10,2) default 87.49,
  ms_rate     numeric(10,2) default 94.44,
  def_rate    numeric(10,2) default 0,
  plan        text default 'free' check (plan in ('free','pro')),
  created_at  timestamptz default now()
);

-- ORG MEMBERS (who belongs to which pump)
create table public.org_members (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'staff' check (role in ('owner','manager','staff')),
  is_active   boolean default true,
  invited_by  uuid references auth.users(id),
  joined_at   timestamptz default now(),
  unique(org_id, user_id)
);

-- MACHINES (each pump's dispensing machines)
create table public.machines (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  name          text not null,
  fuel_type     text not null check (fuel_type in ('HSD','MS','DEF')),
  nozzle_count  int default 1,
  display_order int default 0,
  is_active     boolean default true,
  created_at    timestamptz default now()
);

-- EMPLOYEES (operators / staff)
create table public.employees (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  user_id     uuid references auth.users(id),
  name        text not null,
  mobile      text,
  role        text default 'operator' check (role in ('operator','manager')),
  shift       text default 'day' check (shift in ('day','night','both')),
  salary      numeric(10,2),
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- CUSTOMERS (credit account holders)
create table public.customers (
  id               uuid primary key default uuid_generate_v4(),
  org_id           uuid not null references public.organizations(id) on delete cascade,
  name             text not null,
  firm_name        text,
  mobile           text,
  gst_no           text,
  address          text,
  opening_balance  numeric(12,2) default 0,
  is_active        boolean default true,
  created_at       timestamptz default now()
);

-- MASTER ENTRIES (daily meter readings per machine)
create table public.master_entries (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  date            date not null,
  machine_id      uuid not null references public.machines(id),
  reading_open    numeric(12,2) not null,
  reading_close   numeric(12,2) not null,
  sale_liters     numeric(10,2) generated always as (reading_close - reading_open) stored,
  fuel_rate       numeric(10,2) not null,
  sale_inr        numeric(14,2) generated always as ((reading_close - reading_open) * fuel_rate) stored,
  operator_id     uuid references public.employees(id),
  phonepe         numeric(12,2) default 0,
  sbi             numeric(12,2) default 0,
  icici           numeric(12,2) default 0,
  paytm           numeric(12,2) default 0,
  dt_plus         numeric(12,2) default 0,
  neft            numeric(12,2) default 0,
  additive        numeric(12,2) default 0,
  def_liters      numeric(10,2) default 0,
  hsd_stock_in    numeric(10,2) default 0,
  ms_stock_in     numeric(10,2) default 0,
  notes           text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz default now(),
  unique(org_id, date, machine_id)
);

-- DAILY SUMMARY (one row per day)
create table public.daily_summaries (
  id                uuid primary key default uuid_generate_v4(),
  org_id            uuid not null references public.organizations(id) on delete cascade,
  date              date not null,
  total_sale_inr    numeric(14,2) default 0,
  total_digital     numeric(14,2) default 0,
  total_expense     numeric(14,2) default 0,
  total_credit      numeric(14,2) default 0,
  cash_received     numeric(14,2) default 0,
  prev_cash_in_hand numeric(14,2) default 0,
  cash_in_hand      numeric(14,2) default 0,
  bank_deposit      numeric(14,2) default 0,
  genset_reading    int,
  notes             text,
  created_by        uuid references auth.users(id),
  created_at        timestamptz default now(),
  unique(org_id, date)
);

-- EXPENSES
create table public.expenses (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  date        date not null,
  amount      numeric(12,2) not null,
  category    text not null,
  comment     text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now()
);

-- CREDIT ENTRIES
create table public.credit_entries (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  customer_id   uuid not null references public.customers(id),
  date          date not null,
  entry_type    text not null check (entry_type in ('sale','payment')),
  fuel_type     text check (fuel_type in ('HSD','MS','DEF')),
  liters        numeric(10,2),
  amount        numeric(12,2) not null,
  vehicle_no    text,
  receipt_no    int,
  pay_mode      text check (pay_mode in ('cash','online','dt','cheque')),
  def_cash      numeric(10,2) default 0,
  notes         text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz default now()
);

-- INDEXES
create index on public.master_entries(org_id, date);
create index on public.expenses(org_id, date);
create index on public.credit_entries(org_id, date);
create index on public.credit_entries(org_id, customer_id);
create index on public.daily_summaries(org_id, date);
create index on public.org_members(user_id);
create index on public.org_members(org_id);
```

---

## 2. RLS Policies (`002_rls.sql`)

```sql
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

-- Helper: get current user's org_id
create or replace function public.my_org_id()
returns uuid language sql stable security definer as $$
  select org_id from public.org_members
  where user_id = auth.uid() and is_active = true
  limit 1;
$$;

-- Helper: get current user's role
create or replace function public.my_role()
returns text language sql stable security definer as $$
  select role from public.org_members
  where user_id = auth.uid() and is_active = true
  limit 1;
$$;

-- ORGANIZATIONS
create policy "members can view their org"
  on public.organizations for select
  using (id = public.my_org_id());

create policy "owners can update their org"
  on public.organizations for update
  using (id = public.my_org_id() and public.my_role() = 'owner');

-- ORG MEMBERS
create policy "members can view their org members"
  on public.org_members for select
  using (org_id = public.my_org_id());

create policy "owners can manage members"
  on public.org_members for all
  using (org_id = public.my_org_id() and public.my_role() = 'owner');

-- MACHINES
create policy "members can view machines"
  on public.machines for select
  using (org_id = public.my_org_id());

create policy "owner and manager can manage machines"
  on public.machines for all
  using (org_id = public.my_org_id() and public.my_role() in ('owner','manager'));

-- EMPLOYEES
create policy "members can view employees"
  on public.employees for select
  using (org_id = public.my_org_id());

create policy "only owners can manage employees"
  on public.employees for all
  using (org_id = public.my_org_id() and public.my_role() = 'owner');

-- CUSTOMERS
create policy "members can view customers"
  on public.customers for select
  using (org_id = public.my_org_id());

create policy "owner and manager can manage customers"
  on public.customers for all
  using (org_id = public.my_org_id() and public.my_role() in ('owner','manager'));

-- MASTER ENTRIES
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

-- DAILY SUMMARIES
create policy "members can manage daily summaries"
  on public.daily_summaries for all
  using (org_id = public.my_org_id());

-- EXPENSES
create policy "members can view expenses"
  on public.expenses for select
  using (org_id = public.my_org_id());

create policy "members can add expenses"
  on public.expenses for insert
  with check (org_id = public.my_org_id());

create policy "owner and manager can delete expenses"
  on public.expenses for delete
  using (org_id = public.my_org_id() and public.my_role() in ('owner','manager'));

-- CREDIT ENTRIES
create policy "members can view credit entries"
  on public.credit_entries for select
  using (org_id = public.my_org_id());

create policy "members can add credit entries"
  on public.credit_entries for insert
  with check (org_id = public.my_org_id());

create policy "owner and manager can delete credit entries"
  on public.credit_entries for delete
  using (org_id = public.my_org_id() and public.my_role() in ('owner','manager'));
```

---

## 3. Registration RLS (`003_rls_registration.sql`)

```sql
-- Allow any authenticated user to create an org
create policy "authenticated users can create an org"
  on public.organizations for insert
  with check (auth.uid() is not null);

-- Allow any authenticated user to insert themselves as org member
create policy "authenticated users can join as owner on insert"
  on public.org_members for insert
  with check (auth.uid() is not null and user_id = auth.uid());
```

---

## 4. Register Org RPC (`004_register_org_rpc.sql`)

```sql
create or replace function public.register_org(
  p_name     text,
  p_city     text    default null,
  p_address  text    default null,
  p_mobile   text    default null,
  p_hsd_rate numeric default 87.49,
  p_ms_rate  numeric default 94.44
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id  uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from org_members where user_id = v_user_id) then
    raise exception 'User already belongs to an organization';
  end if;

  insert into organizations(name, city, address, mobile, hsd_rate, ms_rate)
  values (p_name, p_city, p_address, p_mobile, p_hsd_rate, p_ms_rate)
  returning id into v_org_id;

  insert into org_members(org_id, user_id, role)
  values (v_org_id, v_user_id, 'owner');

  return v_org_id;
end;
$$;
```

---

## 5. Tighten Registration Policies (`005_tighten_registration_rls.sql`)

```sql
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
```

---

## 6. Extra Policies (run manually)

These were needed but not in any migration file:

```sql
-- Let users read their own org_members row (needed for getUserContext)
create policy "users can read own membership"
  on public.org_members for select
  using (user_id = auth.uid());
```

---

## Supabase Dashboard Settings

Before testing registration, ensure:

1. **Authentication > Sign In / Providers > Email**: Turn OFF "Confirm email"
2. **Authentication > Users**: Delete any test users from failed attempts
3. Clean up any orphaned rows in `organizations` / `org_members` tables
