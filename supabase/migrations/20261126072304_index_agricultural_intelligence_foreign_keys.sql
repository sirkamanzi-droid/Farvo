create index if not exists agri_items_source_id_idx
  on public.agri_intelligence_items (source_id)
  where source_id is not null;
create index if not exists farmer_notifications_farm_id_idx
  on public.farmer_notifications (farm_id);
create index if not exists farmer_notifications_item_id_idx
  on public.farmer_notifications (item_id);
