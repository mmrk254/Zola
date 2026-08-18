-- Add geolocation fields to hospitals for proximity matching
alter table hospitals
  add column if not exists address text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

create index if not exists hospitals_geo_idx on hospitals (latitude, longitude)
  where latitude is not null and longitude is not null;
