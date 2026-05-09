-- ============================================================
-- RPC: register_org — creates org + owner membership atomically
-- Run AFTER 003_rls_registration.sql
-- ============================================================

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
