-- Soil assessment history for authenticated farmers.
-- Each farmer can only read, create, and delete their own reports.

create table if not exists public.soil_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  crop text not null check (crop in ('Maize','Beans','Coffee','Banana','Tomato','Potato','Cassava','Rice')),
  mode text not null check (mode in ('tested','guided')),
  measured_ph numeric(3,1),
  texture text not null check (texture in ('sandy','loamy','clay','unknown')),
  drainage text not null check (drainage in ('fast','moderate','slow','unknown')),
  findings jsonb not null default '[]'::jsonb check (jsonb_typeof(findings) = 'array'),
  created_at timestamptz not null default now(),
  constraint soil_assessments_ph_range check (measured_ph is null or (measured_ph >= 0 and measured_ph <= 14)),
  constraint soil_assessments_mode_ph check (
    (mode = 'tested' and measured_ph is not null) or
    (mode = 'guided' and measured_ph is null)
  )
);

create index if not exists soil_assessments_user_created_idx
  on public.soil_assessments (user_id, created_at desc);

alter table public.soil_assessments enable row level security;

create policy "Farmers read own soil assessments"
  on public.soil_assessments for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Farmers create own soil assessments"
  on public.soil_assessments for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Farmers delete own soil assessments"
  on public.soil_assessments for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on public.soil_assessments to authenticated;
revoke all on public.soil_assessments from anon;
