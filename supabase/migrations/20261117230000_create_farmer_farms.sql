create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Farm',
  crop text not null,
  district_id text not null,
  district_name text not null,
  region text not null check (region in ('Central','Eastern','Northern','Western')),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint farms_crop_check check (char_length(crop) between 1 and 80)
);

create index if not exists farms_user_id_created_at_idx
  on public.farms (user_id, created_at asc);

alter table public.farms enable row level security;

drop policy if exists "Farmers can read their own farms" on public.farms;
create policy "Farmers can read their own farms"
  on public.farms for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Farmers can create their own farms" on public.farms;
create policy "Farmers can create their own farms"
  on public.farms for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Farmers can update their own farms" on public.farms;
create policy "Farmers can update their own farms"
  on public.farms for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Farmers can delete their own farms" on public.farms;
create policy "Farmers can delete their own farms"
  on public.farms for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.farms from anon;
grant select, insert, update, delete on public.farms to authenticated;

create or replace function public.set_farms_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_farms_updated_at() from public;

drop trigger if exists farms_set_updated_at on public.farms;
create trigger farms_set_updated_at
before update on public.farms
for each row execute function public.set_farms_updated_at();
