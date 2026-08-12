begin;

alter table public.users
  add column if not exists network_admin boolean not null default false;

alter table public.referral_cases
  add column if not exists created_by uuid references public.users(id);

do $$ begin
  create type hospital_membership_role as enum ('clinician', 'hospital_staff', 'hospital_admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type hospital_membership_status as enum ('active', 'revoked');
exception when duplicate_object then null;
end $$;

create table if not exists public.hospital_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  role hospital_membership_role not null default 'hospital_admin',
  status hospital_membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, hospital_id)
);

alter table public.hospital_memberships enable row level security;

insert into public.users (id, name, email, network_admin)
select id, 'Zola Network Admin', email, true
from auth.users
where email = 'admin@zola.local'
on conflict (id) do update
set name = excluded.name,
    email = excluded.email,
    network_admin = true;

insert into public.hospital_memberships (user_id, hospital_id, role, status)
select u.id, h.id, 'hospital_admin', 'active'
from public.users u
cross join lateral (
  select id from public.hospitals order by created_at asc limit 1
) h
where u.email = 'admin@zola.local'
on conflict (user_id, hospital_id) do update
set role = excluded.role,
    status = 'active',
    updated_at = now();

commit;
