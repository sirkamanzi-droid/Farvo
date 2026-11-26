alter table public.farms
  add column if not exists location_accuracy_m double precision check (location_accuracy_m is null or location_accuracy_m >= 0),
  add column if not exists location_source text not null default 'legacy_district' check (location_source in ('phone_gps', 'manual_pin', 'legacy_district')),
  add column if not exists location_captured_at timestamptz,
  add column if not exists location_label text,
  add column if not exists village text,
  add column if not exists parish text,
  add column if not exists subcounty text,
  add column if not exists farm_size_value numeric check (farm_size_value is null or farm_size_value > 0),
  add column if not exists farm_size_unit text check (farm_size_unit is null or farm_size_unit in ('acres', 'hectares'));

create table if not exists public.farm_crops (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  crop_name text not null check (char_length(trim(crop_name)) between 1 and 80),
  variety text check (variety is null or char_length(variety) <= 100),
  planting_date date,
  growth_stage text check (growth_stage is null or char_length(growth_stage) <= 100),
  area_value numeric check (area_value is null or area_value > 0),
  area_unit text check (area_unit is null or area_unit in ('acres', 'hectares')),
  notes text check (notes is null or char_length(notes) <= 1000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists farm_crops_farm_active_idx on public.farm_crops (farm_id, is_active, crop_name);
create index if not exists farm_crops_user_idx on public.farm_crops (user_id, farm_id);
alter table public.farm_crops enable row level security;
drop policy if exists "Farmers read crops on their farms" on public.farm_crops;
create policy "Farmers read crops on their farms" on public.farm_crops for select to authenticated
using (user_id = (select auth.uid()) and exists (select 1 from public.farms f where f.id = farm_id and f.user_id = (select auth.uid())));
drop policy if exists "Farmers add crops to their farms" on public.farm_crops;
create policy "Farmers add crops to their farms" on public.farm_crops for insert to authenticated
with check (user_id = (select auth.uid()) and exists (select 1 from public.farms f where f.id = farm_id and f.user_id = (select auth.uid())));
drop policy if exists "Farmers update crops on their farms" on public.farm_crops;
create policy "Farmers update crops on their farms" on public.farm_crops for update to authenticated
using (user_id = (select auth.uid()) and exists (select 1 from public.farms f where f.id = farm_id and f.user_id = (select auth.uid())))
with check (user_id = (select auth.uid()) and exists (select 1 from public.farms f where f.id = farm_id and f.user_id = (select auth.uid())));
drop policy if exists "Farmers delete crops on their farms" on public.farm_crops;
create policy "Farmers delete crops on their farms" on public.farm_crops for delete to authenticated
using (user_id = (select auth.uid()) and exists (select 1 from public.farms f where f.id = farm_id and f.user_id = (select auth.uid())));
revoke all on public.farm_crops from anon;
grant select, insert, update, delete on public.farm_crops to authenticated;

create table if not exists public.farm_livestock (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  species text not null check (char_length(trim(species)) between 1 and 80),
  breed text check (breed is null or char_length(breed) <= 100),
  animal_count integer check (animal_count is null or animal_count >= 0),
  production_purpose text check (production_purpose is null or char_length(production_purpose) <= 100),
  age_group text check (age_group is null or char_length(age_group) <= 100),
  notes text check (notes is null or char_length(notes) <= 1000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists farm_livestock_farm_active_idx on public.farm_livestock (farm_id, is_active, species);
create index if not exists farm_livestock_user_idx on public.farm_livestock (user_id, farm_id);
alter table public.farm_livestock enable row level security;
drop policy if exists "Farmers read livestock on their farms" on public.farm_livestock;
create policy "Farmers read livestock on their farms" on public.farm_livestock for select to authenticated
using (user_id = (select auth.uid()) and exists (select 1 from public.farms f where f.id = farm_id and f.user_id = (select auth.uid())));
drop policy if exists "Farmers add livestock to their farms" on public.farm_livestock;
create policy "Farmers add livestock to their farms" on public.farm_livestock for insert to authenticated
with check (user_id = (select auth.uid()) and exists (select 1 from public.farms f where f.id = farm_id and f.user_id = (select auth.uid())));
drop policy if exists "Farmers update livestock on their farms" on public.farm_livestock;
create policy "Farmers update livestock on their farms" on public.farm_livestock for update to authenticated
using (user_id = (select auth.uid()) and exists (select 1 from public.farms f where f.id = farm_id and f.user_id = (select auth.uid())))
with check (user_id = (select auth.uid()) and exists (select 1 from public.farms f where f.id = farm_id and f.user_id = (select auth.uid())));
drop policy if exists "Farmers delete livestock on their farms" on public.farm_livestock;
create policy "Farmers delete livestock on their farms" on public.farm_livestock for delete to authenticated
using (user_id = (select auth.uid()) and exists (select 1 from public.farms f where f.id = farm_id and f.user_id = (select auth.uid())));
revoke all on public.farm_livestock from anon;
grant select, insert, update, delete on public.farm_livestock to authenticated;
