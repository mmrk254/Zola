-- Facility contact details used for referral alerts.
alter table public.hospitals
  add column if not exists alert_phone text,
  add column if not exists alert_email text;
