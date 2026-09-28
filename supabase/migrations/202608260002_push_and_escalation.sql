alter table public.referral_cases add column if not exists patient_latitude double precision;
alter table public.referral_cases add column if not exists patient_longitude double precision;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
