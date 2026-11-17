create table if not exists public.admin_settings (
  key text primary key check (char_length(key) between 1 and 80),
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (char_length(action) between 1 and 100),
  target_type text not null check (char_length(target_type) between 1 and 60),
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs (created_at desc);
create index if not exists admin_audit_logs_actor_user_id_idx on public.admin_audit_logs (actor_user_id);
alter table public.admin_settings enable row level security;
alter table public.admin_audit_logs enable row level security;
revoke all on table public.admin_settings from public, anon, authenticated;
revoke all on table public.admin_audit_logs from public, anon, authenticated;
grant all on table public.admin_settings to service_role;
grant all on table public.admin_audit_logs to service_role;
grant usage, select on sequence public.admin_audit_logs_id_seq to service_role;
insert into public.admin_settings (key, value) values ('command_centre', '{"announcement":""}'::jsonb) on conflict (key) do nothing;
