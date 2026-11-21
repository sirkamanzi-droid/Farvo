alter table public.soil_assessments
  add column if not exists location_label text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists weather_snapshot jsonb,
  add column if not exists ai_report text;

alter table public.soil_assessments
  drop constraint if exists soil_assessments_coordinates_range;

alter table public.soil_assessments
  add constraint soil_assessments_coordinates_range check (
    (latitude is null or latitude between -90 and 90)
    and (longitude is null or longitude between -180 and 180)
  );
