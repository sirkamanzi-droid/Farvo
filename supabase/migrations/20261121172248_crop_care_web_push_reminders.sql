create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

alter table public.crop_care_tasks
  add column if not exists reminder_sent_at timestamptz;

create table if not exists public.crop_care_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crop_care_push_subscriptions enable row level security;

drop policy if exists "Farmers manage their own push subscriptions" on public.crop_care_push_subscriptions;
create policy "Farmers manage their own push subscriptions"
on public.crop_care_push_subscriptions for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.crop_care_push_subscriptions to authenticated;

create index if not exists crop_care_tasks_due_push_idx
  on public.crop_care_tasks (due_at)
  where status = 'pending' and reminder_sent_at is null;

create or replace function public.get_crop_care_vapid_config()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'public_key', (select decrypted_secret from vault.decrypted_secrets where name = 'omulimi_vapid_public'),
    'private_key', (select decrypted_secret from vault.decrypted_secrets where name = 'omulimi_vapid_private')
  );
$$;

revoke all on function public.get_crop_care_vapid_config() from public, anon, authenticated;
grant execute on function public.get_crop_care_vapid_config() to service_role;
