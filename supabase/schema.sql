-- Zola referral service schema
-- Run once in Supabase: Project > SQL Editor > New query > paste > Run.

create extension if not exists "pgcrypto";

create type referral_status as enum (
  'draft',
  'consent_pending',
  'ready_to_send',
  'searching',
  'hospital_accepted',
  'family_confirmed',
  'ambulance_arranged',
  'patient_en_route',
  'patient_received',
  'closed'
);

create type care_level as enum ('ICU', 'HDU', 'NICU');
create type urgency_level as enum ('critical', 'urgent', 'routine');
create type facility_status as enum ('open', 'at_capacity', 'closed');

create table hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  contact_info text,
  created_at timestamptz not null default now()
);

create type hospital_membership_role as enum ('clinician', 'hospital_staff', 'hospital_admin');
create type hospital_membership_status as enum ('active', 'revoked');

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  phone text,
  network_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table hospital_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  hospital_id uuid not null references hospitals(id) on delete cascade,
  role hospital_membership_role not null,
  status hospital_membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, hospital_id)
);

create table referral_cases (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  patient_initials text not null,
  care_level care_level not null,
  urgency urgency_level not null default 'urgent',
  status referral_status not null default 'draft',
  created_by uuid references users(id),
  referring_facility_id uuid not null references hospitals(id),
  receiving_facility_id uuid references hospitals(id),
  clinical_summary text,
  consent_obtained boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table referral_events (
  id uuid primary key default gen_random_uuid(),
  referral_case_id uuid not null references referral_cases(id) on delete cascade,
  from_status referral_status,
  to_status referral_status not null,
  actor_user_id uuid references users(id),
  facility_id uuid references hospitals(id),
  created_at timestamptz not null default now()
);

create table family_confirmations (
  id uuid primary key default gen_random_uuid(),
  referral_case_id uuid not null references referral_cases(id) on delete cascade,
  relationship text not null,
  name text not null,
  phone text not null,
  consent_given boolean not null default false,
  confirmed_at timestamptz not null default now()
);

create table hospital_capacity (
  hospital_id uuid not null references hospitals(id) on delete cascade,
  care_level care_level not null,
  available_beds integer not null default 0 check (available_beds >= 0),
  facility_status facility_status not null default 'open',
  updated_at timestamptz not null default now(),
  primary key (hospital_id, care_level)
);

create index on referral_cases (status);
create index on referral_cases (referring_facility_id);
create index on referral_cases (receiving_facility_id);
create index on referral_events (referral_case_id);

-- Row Level Security: writes only happen server-side via the service role
-- key (which bypasses RLS), so the browser (anon key) gets read-only access.
alter table hospitals enable row level security;
alter table users enable row level security;
alter table hospital_memberships enable row level security;
alter table referral_cases enable row level security;
alter table referral_events enable row level security;
alter table family_confirmations enable row level security;
alter table hospital_capacity enable row level security;

create policy "Public read access" on hospitals for select using (true);
create policy "Public read access" on referral_cases for select using (true);
create policy "Public read access" on referral_events for select using (true);
create policy "Hospital membership read access" on hospital_memberships for select using (true);

-- Seed two hospitals so the app has something to reference on first run.
insert into hospitals (name, type) values
  ('Kijani County Hospital', 'referring'),
  ('Riverside Medical Centre', 'referring'),
  ('Nairobi Central Hospital', 'receiving');
