create table if not exists public.agri_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  name text not null,
  source_kind text not null check (source_kind in ('government','research','news','markets','climate','earth_observation','development')),
  homepage_url text not null,
  feed_url text,
  api_base_url text,
  access_method text not null check (access_method in ('rss','api','open_dataset','website_review','licensed_feed','manual')),
  access_status text not null default 'review_required' check (access_status in ('review_required','permission_pending','approved','blocked')),
  country_code text,
  topic_tags text[] not null default '{}',
  commercial_use_notes text,
  enabled boolean not null default false,
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agri_intelligence_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.agri_sources(id) on delete set null,
  source_name text not null,
  title text not null check (char_length(title) between 5 and 300),
  summary text,
  canonical_url text not null,
  category text not null check (category in ('threat','news','opportunity','market','research','environment')),
  geography_scope text not null default 'national' check (geography_scope in ('global','national','region','district','local')),
  country_code text not null default 'UG',
  region text,
  district text,
  affected_crops text[] not null default '{}',
  affected_livestock text[] not null default '{}',
  published_at timestamptz,
  retrieved_at timestamptz not null default now(),
  expires_at timestamptz,
  confidence numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  verification_status text not null default 'unverified' check (verification_status in ('unverified','corroborating','verified','disputed','expired')),
  evidence_type text not null default 'source_report' check (evidence_type in ('source_report','official_notice','dataset_observation','research_publication','verified_submission')),
  dedupe_key text not null unique,
  is_published boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists agri_items_published_created_idx
  on public.agri_intelligence_items (is_published, published_at desc nulls last);
create index if not exists agri_items_category_published_idx
  on public.agri_intelligence_items (category, published_at desc nulls last)
  where is_published = true;
create index if not exists agri_items_asset_tags_gin_idx
  on public.agri_intelligence_items using gin (affected_crops, affected_livestock);

create table if not exists public.farmer_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  item_id uuid not null references public.agri_intelligence_items(id) on delete cascade,
  relevance_reason text not null default '',
  read_at timestamptz,
  push_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, farm_id, item_id)
);

create index if not exists farmer_notifications_inbox_idx
  on public.farmer_notifications (user_id, created_at desc);
create index if not exists farmer_notifications_unread_idx
  on public.farmer_notifications (user_id, created_at desc)
  where read_at is null;

alter table public.agri_sources enable row level security;
alter table public.agri_intelligence_items enable row level security;
alter table public.farmer_notifications enable row level security;

revoke all on public.agri_sources from anon, authenticated;
grant all on public.agri_sources to service_role;

revoke all on public.agri_intelligence_items from anon, authenticated;
grant select on public.agri_intelligence_items to authenticated;
create policy "Signed-in farmers can read published intelligence"
  on public.agri_intelligence_items for select to authenticated
  using (is_published = true and (expires_at is null or expires_at > now()));

revoke all on public.farmer_notifications from anon, authenticated;
grant select on public.farmer_notifications to authenticated;
grant update (read_at) on public.farmer_notifications to authenticated;

create policy "Farmers read their own notifications"
  on public.farmer_notifications for select to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.farms f
      where f.id = farm_id and f.user_id = (select auth.uid())
    )
  );

create policy "Farmers mark their own notifications read"
  on public.farmer_notifications for update to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.farms f
      where f.id = farm_id and f.user_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.farms f
      where f.id = farm_id and f.user_id = (select auth.uid())
    )
  );

grant all on public.agri_intelligence_items to service_role;
grant all on public.farmer_notifications to service_role;

insert into public.agri_sources
  (source_key,name,source_kind,homepage_url,access_method,access_status,country_code,topic_tags,commercial_use_notes)
values
  ('uganda_media_centre','Uganda Media Centre','government','https://www.mediacentre.go.ug/','rss','review_required','UG',array['government_announcements','agriculture','programmes'],'Confirm official feed URL and reuse terms before automated collection.'),
  ('maaif','Ministry of Agriculture, Animal Industry and Fisheries','government','https://www.agriculture.go.ug/','website_review','review_required','UG',array['agriculture','livestock','policy','disease_alerts','programmes'],'Public pages; verify automated access, feed/API availability and reuse terms.'),
  ('naro','National Agricultural Research Organisation','research','https://www.naro.go.ug/','open_dataset','review_required','UG',array['research','crop_technology','livestock_research','training','opportunities'],'Dataset-specific licences and access conditions must be checked.'),
  ('nifamis','National Integrated Food and Agriculture Management Information System','government','https://nifamis.go.ug/','website_review','review_required','UG',array['agricultural_statistics','crop','livestock','advisory'],'Check for documented public endpoints and terms before integration.'),
  ('fews_net','FEWS NET','markets','https://fews.net/','api','approved','UG',array['market_prices','food_security','trade','climate_risk'],'Use documented API and retain dataset attribution, coverage and observation dates.'),
  ('fao','Food and Agriculture Organization','development','https://www.fao.org/','open_dataset','approved',null,array['agriculture','livestock','food_security','statistics','research'],'Use datasets whose licences permit reuse; attribute and check third-party restrictions.'),
  ('icpac','IGAD Climate Prediction and Applications Centre','climate','https://www.icpac.net/','open_dataset','review_required','UG',array['climate','seasonal_forecasts','early_warning'],'Dataset availability and access conditions vary.'),
  ('nasa_earthdata','NASA Earthdata / GIBS','earth_observation','https://www.earthdata.nasa.gov/','api','approved',null,array['satellite','vegetation','rainfall','drought','flooding'],'Use dataset-specific documentation; record resolution, observation date and uncertainty.'),
  ('copernicus','Copernicus Data Space Ecosystem','earth_observation','https://dataspace.copernicus.eu/','api','approved',null,array['sentinel','vegetation','land_cover','flooding','environment'],'Use open Sentinel datasets under applicable terms; record processing and observation metadata.'),
  ('daily_monitor','Daily Monitor','news','https://www.monitor.co.ug/','licensed_feed','permission_pending','UG',array['news','business','agriculture','policy'],'Automated commercial processing requires publisher permission or an appropriate licence.'),
  ('new_vision','New Vision','news','https://www.newvision.co.ug/','licensed_feed','permission_pending','UG',array['news','business','agriculture','policy'],'Automated commercial processing requires publisher permission or an appropriate licence.'),
  ('bbc_news','BBC News','news','https://www.bbc.com/news','licensed_feed','permission_pending',null,array['news','africa','climate','business','agriculture'],'Obtain permission for business use of feeds and comply with BBC terms.'),
  ('reuters','Reuters','news','https://www.reuters.com/','licensed_feed','permission_pending',null,array['news','business','commodities','agriculture'],'Commercial feed or automated content use requires an appropriate licence.'),
  ('cabi','CABI','research','https://www.cabi.org/','manual','permission_pending',null,array['crop_protection','pests','diseases','research'],'Only ingest resources whose specific licence permits the intended automated use.')
on conflict (source_key) do update set
  name=excluded.name,
  homepage_url=excluded.homepage_url,
  access_method=excluded.access_method,
  access_status=excluded.access_status,
  topic_tags=excluded.topic_tags,
  commercial_use_notes=excluded.commercial_use_notes,
  updated_at=now();
