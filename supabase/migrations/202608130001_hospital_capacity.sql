begin;

do $$ begin
  create type facility_status as enum ('open', 'at_capacity', 'closed');
exception when duplicate_object then null;
end $$;

create table if not exists public.hospital_capacity (
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  care_level care_level not null,
  available_beds integer not null default 0 check (available_beds >= 0),
  facility_status facility_status not null default 'open',
  updated_at timestamptz not null default now(),
  primary key (hospital_id, care_level)
);

alter table public.hospital_capacity enable row level security;

commit;
