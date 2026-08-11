begin;

-- Upgrade the existing access model without removing referrals or hospitals.
alter table public.users
  add column if not exists network_admin boolean not null default false;

-- The legacy role constraint does not include the application's current roles.
alter table public.users drop constraint if exists users_role_check;
alter table public.users
  add constraint users_role_check
  check (role in ('network_admin', 'hospital_admin', 'hospital_staff', 'clinician'));

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
  role hospital_membership_role not null,
  status hospital_membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, hospital_id)
);

-- No browser policy is created: membership lookups are server-side only.
alter table public.hospital_memberships enable row level security;

insert into public.users (id, name, email, role, network_admin)
select id, 'Zola Network Admin', 'admin@zola.local', 'network_admin', true
from auth.users
where email = 'admin@zola.local'
on conflict (id) do update
set name = excluded.name,
    email = excluded.email,
    role = excluded.role,
    network_admin = true;

commit;
