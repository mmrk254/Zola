begin;

create table if not exists public.referral_responses (
  id uuid primary key default gen_random_uuid(),
  referral_case_id uuid not null references public.referral_cases(id) on delete cascade,
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  response text not null check (response in ('declined')),
  reason text not null,
  created_at timestamptz not null default now(),
  unique (referral_case_id, hospital_id)
);

alter table public.referral_responses enable row level security;

-- Seed two Kenyan-plate ambulances (LLLNNNL) per hospital.
do $$
declare
  h record;
  idx int := 0;
  prefixes text[] := array['KCA', 'KCB', 'KCC', 'KCD', 'KCE', 'KCF', 'KCG', 'KCH'];
begin
  for h in select id from public.hospitals order by created_at loop
    idx := idx + 1;
    insert into public.hospital_ambulances (hospital_id, plate_number, driver_name, driver_phone, status)
    values
      (h.id, prefixes[idx] || lpad((10 + idx)::text, 2, '0') || 'A', 'James Otieno', '+254712' || lpad(idx::text, 6, '0'), 'available'),
      (h.id, prefixes[idx] || lpad((40 + idx)::text, 2, '0') || 'B', 'Mary Wanjiku', '+254713' || lpad(idx::text, 6, '0'), 'available')
    on conflict (hospital_id, plate_number) do nothing;
  end loop;
end $$;

commit;
