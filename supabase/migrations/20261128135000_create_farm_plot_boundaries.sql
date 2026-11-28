CREATE TABLE IF NOT EXISTS public.farm_plots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Main plot' CHECK (char_length(trim(label)) BETWEEN 1 AND 80),
  boundary_geojson jsonb,
  boundary_status text NOT NULL DEFAULT 'needs_boundary' CHECK (boundary_status IN ('needs_boundary','mapped')),
  mapping_method text NOT NULL DEFAULT 'point' CHECK (mapping_method IN ('point','gps_walk','manual_draw')),
  centroid_latitude double precision NOT NULL CHECK (centroid_latitude BETWEEN -90 AND 90),
  centroid_longitude double precision NOT NULL CHECK (centroid_longitude BETWEEN -180 AND 180),
  area_acres numeric CHECK (area_acres IS NULL OR area_acres > 0),
  area_hectares numeric CHECK (area_hectares IS NULL OR area_hectares > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT farm_plots_geojson_polygon_check CHECK (
    boundary_geojson IS NULL OR (
      jsonb_typeof(boundary_geojson) = 'object'
      AND boundary_geojson->>'type' = 'Polygon'
      AND jsonb_typeof(boundary_geojson->'coordinates') = 'array'
      AND jsonb_array_length(boundary_geojson->'coordinates') = 1
      AND jsonb_typeof(boundary_geojson->'coordinates'->0) = 'array'
      AND jsonb_array_length(boundary_geojson->'coordinates'->0) >= 4
      AND (boundary_geojson->'coordinates'->0->0) =
          (boundary_geojson->'coordinates'->0->(jsonb_array_length(boundary_geojson->'coordinates'->0)-1))
    )
  ),
  CONSTRAINT farm_plots_boundary_state_check CHECK (
    (boundary_status = 'needs_boundary' AND boundary_geojson IS NULL AND mapping_method = 'point')
    OR
    (boundary_status = 'mapped' AND boundary_geojson IS NOT NULL AND mapping_method IN ('gps_walk','manual_draw'))
  ),
  CONSTRAINT farm_plots_id_farm_user_unique UNIQUE (id, farm_id, user_id)
);
CREATE INDEX IF NOT EXISTS farm_plots_farm_created_idx ON public.farm_plots (farm_id, created_at);
CREATE INDEX IF NOT EXISTS farm_plots_user_idx ON public.farm_plots (user_id, farm_id);
ALTER TABLE public.farm_plots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farmers read plots on their farms" ON public.farm_plots;
CREATE POLICY "Farmers read plots on their farms" ON public.farm_plots FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_plots.farm_id AND f.user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "Farmers create plots on their farms" ON public.farm_plots;
CREATE POLICY "Farmers create plots on their farms" ON public.farm_plots FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_plots.farm_id AND f.user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "Farmers update plots on their farms" ON public.farm_plots;
CREATE POLICY "Farmers update plots on their farms" ON public.farm_plots FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_plots.farm_id AND f.user_id = (SELECT auth.uid())))
WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_plots.farm_id AND f.user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "Farmers delete plots on their farms" ON public.farm_plots;
CREATE POLICY "Farmers delete plots on their farms" ON public.farm_plots FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_plots.farm_id AND f.user_id = (SELECT auth.uid())));
REVOKE ALL PRIVILEGES ON TABLE public.farm_plots FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.farm_plots TO authenticated;
ALTER TABLE public.farm_crops ADD COLUMN IF NOT EXISTS plot_id uuid;
ALTER TABLE public.farm_crops ADD CONSTRAINT farm_crops_plot_farm_user_fk
FOREIGN KEY (plot_id, farm_id, user_id) REFERENCES public.farm_plots (id, farm_id, user_id) ON DELETE RESTRICT;
ALTER TABLE public.farm_events ADD CONSTRAINT farm_events_plot_farm_user_fk
FOREIGN KEY (plot_id, farm_id, user_id) REFERENCES public.farm_plots (id, farm_id, user_id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS farm_crops_plot_active_idx ON public.farm_crops (plot_id, is_active) WHERE plot_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.create_default_farm_plot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.farm_plots (farm_id,user_id,label,boundary_status,mapping_method,centroid_latitude,centroid_longitude,area_acres,area_hectares)
  VALUES (
    NEW.id, NEW.user_id, 'Main plot', 'needs_boundary', 'point', NEW.latitude, NEW.longitude,
    CASE WHEN NEW.farm_size_unit = 'acres' THEN NEW.farm_size_value WHEN NEW.farm_size_unit = 'hectares' THEN NEW.farm_size_value * 2.47105 ELSE NULL END,
    CASE WHEN NEW.farm_size_unit = 'hectares' THEN NEW.farm_size_value WHEN NEW.farm_size_unit = 'acres' THEN NEW.farm_size_value * 0.404686 ELSE NULL END
  );
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.create_default_farm_plot() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS farms_create_default_plot ON public.farms;
CREATE TRIGGER farms_create_default_plot AFTER INSERT ON public.farms FOR EACH ROW EXECUTE FUNCTION public.create_default_farm_plot();
INSERT INTO public.farm_plots (farm_id,user_id,label,boundary_status,mapping_method,centroid_latitude,centroid_longitude,area_acres,area_hectares)
SELECT f.id,f.user_id,'Main plot','needs_boundary','point',f.latitude,f.longitude,
CASE WHEN f.farm_size_unit='acres' THEN f.farm_size_value WHEN f.farm_size_unit='hectares' THEN f.farm_size_value*2.47105 ELSE NULL END,
CASE WHEN f.farm_size_unit='hectares' THEN f.farm_size_value WHEN f.farm_size_unit='acres' THEN f.farm_size_value*0.404686 ELSE NULL END
FROM public.farms f WHERE NOT EXISTS (SELECT 1 FROM public.farm_plots p WHERE p.farm_id=f.id);
UPDATE public.farm_crops c SET plot_id=p.id FROM public.farm_plots p WHERE c.plot_id IS NULL AND c.farm_id=p.farm_id AND c.user_id=p.user_id;
