create table if not exists public.crop_care_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete set null,
  crop_name text not null check (char_length(crop_name) between 1 and 80),
  district_name text,
  issue_name text not null check (char_length(issue_name) between 1 and 160),
  diagnosis_status text not null default 'unconfirmed' check (diagnosis_status in ('unconfirmed','extension_officer_confirmed','other')),
  status text not null default 'active' check (status in ('active','recovered','paused')),
  care_plan jsonb not null default '{}'::jsonb check (jsonb_typeof(care_plan) = 'object'),
  started_at timestamptz not null default now(),
  next_review_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crop_care_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.crop_care_plans(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  instructions text,
  task_type text not null default 'check' check (task_type in ('inspect','treatment','fertiliser','watering','photo_check','other')),
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','done','skipped')),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.crop_care_checkins (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.crop_care_plans(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  health_status text not null default 'unknown' check (health_status in ('improving','unchanged','worsening','unknown')),
  notes text not null default '' check (char_length(notes) <= 2000),
  photo_url text,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.crop_care_plans enable row level security;
alter table public.crop_care_tasks enable row level security;
alter table public.crop_care_checkins enable row level security;

create policy "Farmers manage their own crop care plans"
on public.crop_care_plans for all to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (farm_id is null or exists (
    select 1 from public.farms f where f.id = farm_id and f.user_id = (select auth.uid())
  ))
);

create policy "Farmers manage their own crop care tasks"
on public.crop_care_tasks for all to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.crop_care_plans p
    where p.id = plan_id and p.user_id = (select auth.uid())
  )
);

create policy "Farmers manage their own crop care checkins"
on public.crop_care_checkins for all to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.crop_care_plans p
    where p.id = plan_id and p.user_id = (select auth.uid())
  )
);

grant select, insert, update, delete on public.crop_care_plans to authenticated;
grant select, insert, update, delete on public.crop_care_tasks to authenticated;
grant select, insert, update, delete on public.crop_care_checkins to authenticated;

create index if not exists crop_care_plans_user_status_idx on public.crop_care_plans(user_id, status, next_review_at);
create index if not exists crop_care_tasks_user_due_idx on public.crop_care_tasks(user_id, status, due_at);
create index if not exists crop_care_checkins_plan_observed_idx on public.crop_care_checkins(plan_id, observed_at desc);
