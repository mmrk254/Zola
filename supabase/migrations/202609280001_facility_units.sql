create table if not exists public.facility_units (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  name text not null,
  care_level care_level not null,
  unit_type text not null default 'ward',
  capacity integer not null default 0 check (capacity >= 0),
  available_beds integer not null default 0 check (available_beds >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.facility_units enable row level security;
create index if not exists facility_units_hospital_idx on public.facility_units(hospital_id, care_level);
