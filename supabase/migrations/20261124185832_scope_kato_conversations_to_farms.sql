alter table public.kato_conversations
  add column if not exists farm_id uuid;

alter table public.kato_conversations
  add constraint kato_conversations_farm_id_fkey
  foreign key (farm_id) references public.farms(id) on delete set null;

-- Safely attach legacy conversations only where one matching farm is unambiguous.
with matching_farms as (
  select c.id as conversation_id, (array_agg(f.id))[1] as farm_id
  from public.kato_conversations c
  join public.farms f
    on f.user_id = c.user_id
   and f.crop = c.crop_name
   and f.district_name = c.district_name
  where c.farm_id is null
  group by c.id
  having count(*) = 1
)
update public.kato_conversations c
set farm_id = matching_farms.farm_id
from matching_farms
where c.id = matching_farms.conversation_id;

create index if not exists kato_conversations_farm_updated_idx
  on public.kato_conversations (farm_id, user_id, updated_at desc)
  where farm_id is not null;

drop policy if exists "Farmers manage their Kato conversations" on public.kato_conversations;
create policy "Farmers manage their Kato conversations"
  on public.kato_conversations for all to authenticated
  using (
    (select auth.uid()) = user_id
    and (
      farm_id is null
      or exists (
        select 1 from public.farms f
        where f.id = farm_id and f.user_id = (select auth.uid())
      )
    )
  )
  with check (
    (select auth.uid()) = user_id
    and (
      farm_id is null
      or exists (
        select 1 from public.farms f
        where f.id = farm_id and f.user_id = (select auth.uid())
      )
    )
  );