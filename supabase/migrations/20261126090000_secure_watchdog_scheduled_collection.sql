create table if not exists public.watchdog_cron_auth (
  id boolean primary key default true check (id),
  token_hash text not null check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);
alter table public.watchdog_cron_auth enable row level security;
revoke all on table public.watchdog_cron_auth from anon, authenticated;
grant select on table public.watchdog_cron_auth to service_role;
insert into public.watchdog_cron_auth (id, token_hash)
values (true, '0cc6896a6c26447f19430fb3ed27ac7bb842a4c91d0913d8256c67b2c8e975d9')
on conflict (id) do update set token_hash = excluded.token_hash, created_at = now();