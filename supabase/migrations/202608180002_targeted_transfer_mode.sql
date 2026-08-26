-- Allow targeted referrals (single hospital chosen upfront, not broadcast)
alter table public.referral_cases drop constraint if exists referral_cases_transfer_mode_check;
alter table public.referral_cases
  add constraint referral_cases_transfer_mode_check
  check (transfer_mode in ('external', 'targeted', 'internal_onsite', 'internal_offsite'));
