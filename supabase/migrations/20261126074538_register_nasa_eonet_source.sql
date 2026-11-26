insert into public.agri_sources
  (source_key,name,source_kind,homepage_url,access_method,access_status,country_code,topic_tags,commercial_use_notes,enabled)
values
  ('nasa_eonet','NASA Earth Observatory Natural Event Tracker (EONET)','earth_observation','https://eonet.gsfc.nasa.gov/','api','approved',null,array['natural_events','wildfires','storms','floods','volcanoes','environmental_hazards'],'NASA EONET v3 provides open natural-event metadata. Retain NASA attribution and event links; event observations are leads, not agricultural diagnoses. Review geography and relevance before farmer publication.',false)
on conflict (source_key) do update set
  name=excluded.name,
  homepage_url=excluded.homepage_url,
  access_method=excluded.access_method,
  access_status=excluded.access_status,
  topic_tags=excluded.topic_tags,
  commercial_use_notes=excluded.commercial_use_notes,
  updated_at=now();