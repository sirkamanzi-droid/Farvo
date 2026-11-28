REVOKE ALL PRIVILEGES ON TABLE public.farm_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.farm_events TO authenticated;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.farm_events FROM authenticated;
