begin;

create table if not exists public.hospital_applications (
  id uuid primary key default gen_random_uuid(),
  hospital_name text not null,
  admin_name text not null,
  admin_email text not null,
  phone text not null,
  hospital_type text not null default 'referring',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.hospital_applications enable row level security;

commit;
