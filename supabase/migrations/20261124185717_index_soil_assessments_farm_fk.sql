-- Keep the farm foreign-key column as the leading index column.
-- This supports both FK maintenance and farm-scoped soil history lookups.
drop index if exists public.soil_assessments_farm_created_idx;
create index if not exists soil_assessments_farm_created_idx
  on public.soil_assessments (farm_id, user_id, created_at desc)
  where farm_id is not null;
