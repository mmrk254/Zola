begin;

-- Transfer context on referrals (external vs internal same-hospital)
alter table public.referral_cases
  add column if not exists transfer_mode text not null default 'external';

alter table public.referral_cases drop constraint if exists referral_cases_transfer_mode_check;
alter table public.referral_cases
  add constraint referral_cases_transfer_mode_check
  check (transfer_mode in ('external', 'internal_onsite', 'internal_offsite'));

alter table public.referral_cases
  add column if not exists patient_location text;

-- Decline reasons and other notes on audit events
alter table public.referral_events
  add column if not exists notes text;

-- Hospital-owned ambulance fleet
create table if not exists public.hospital_ambulances (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  plate_number text not null,
  driver_name text not null,
  driver_phone text,
  status text not null default 'available' check (status in ('available', 'dispatched')),
  current_referral_id uuid references public.referral_cases(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hospital_id, plate_number)
);

alter table public.referral_cases
  add column if not exists ambulance_id uuid references public.hospital_ambulances(id) on delete set null;

alter table public.hospital_ambulances enable row level security;

commit;
