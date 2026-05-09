-- ============================================================
-- RUPALI HP SALES — Multi-Tenant Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- 1. ORGANIZATIONS (one row per petrol pump)
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- 2. ORG MEMBERS (who belongs to which pump)
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- 3. MACHINES (each pump's dispensing machines)
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- 4. EMPLOYEES (operators / staff)
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- 5. CUSTOMERS (credit account holders)
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- 6. MASTER ENTRIES (daily meter readings per machine)
-- ─────────────────────────────────────────────
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
  -- Payment modes
  phonepe         numeric(12,2) default 0,
  sbi             numeric(12,2) default 0,
  icici           numeric(12,2) default 0,
  paytm           numeric(12,2) default 0,
  dt_plus         numeric(12,2) default 0,
  neft            numeric(12,2) default 0,
  -- Misc
  additive        numeric(12,2) default 0,
  def_liters      numeric(10,2) default 0,
  hsd_stock_in    numeric(10,2) default 0,
  ms_stock_in     numeric(10,2) default 0,
  notes           text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz default now(),
  unique(org_id, date, machine_id)
);

-- ─────────────────────────────────────────────
-- 7. DAILY SUMMARY (one row per day, auto cash calc)
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- 8. EXPENSES
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- 9. CREDIT ENTRIES
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- INDEXES for performance
-- ─────────────────────────────────────────────
create index on public.master_entries(org_id, date);
create index on public.expenses(org_id, date);
create index on public.credit_entries(org_id, date);
create index on public.credit_entries(org_id, customer_id);
create index on public.daily_summaries(org_id, date);
create index on public.org_members(user_id);
create index on public.org_members(org_id);
