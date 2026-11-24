-- Connect soil reports to the farm they describe.
-- Existing reports remain available as unassigned history (farm_id = NULL).
alter table public.soil_assessments
  add column if not exists farm_id uuid;

alter table public.soil_assessments
  add constraint soil_assessments_farm_id_fkey
  foreign key (farm_id) references public.farms(id) on delete set null;

create index if not exists soil_assessments_farm_created_idx
  on public.soil_assessments (user_id, farm_id, created_at desc)
  where farm_id is not null;

-- A farmer may only attach a soil report to a farm they own.
drop policy if exists "Farmers create own soil assessments" on public.soil_assessments;
create policy "Farmers create own soil assessments"
  on public.soil_assessments for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      farm_id is null
      or exists (
        select 1
        from public.farms f
        where f.id = farm_id
          and f.user_id = (select auth.uid())
      )
    )
  );
