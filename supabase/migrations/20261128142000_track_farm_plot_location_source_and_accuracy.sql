ALTER TABLE public.farm_plots
  ADD COLUMN IF NOT EXISTS centroid_source text NOT NULL DEFAULT 'farm_point'
    CHECK (centroid_source IN ('farm_point','phone_gps','gps_walk','manual_draw')),
  ADD COLUMN IF NOT EXISTS centroid_accuracy_m double precision
    CHECK (centroid_accuracy_m IS NULL OR centroid_accuracy_m >= 0);
UPDATE public.farm_plots p
SET centroid_source = CASE WHEN f.location_source = 'phone_gps' THEN 'phone_gps' ELSE 'farm_point' END,
    centroid_accuracy_m = f.location_accuracy_m
FROM public.farms f
WHERE f.id = p.farm_id;
CREATE OR REPLACE FUNCTION public.create_default_farm_plot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.farm_plots (
    farm_id,user_id,label,boundary_status,mapping_method,
    centroid_latitude,centroid_longitude,centroid_source,centroid_accuracy_m,
    area_acres,area_hectares
  ) VALUES (
    NEW.id,NEW.user_id,'Main plot','needs_boundary','point',
    NEW.latitude,NEW.longitude,
    CASE WHEN NEW.location_source='phone_gps' THEN 'phone_gps' ELSE 'farm_point' END,
    NEW.location_accuracy_m,
    CASE WHEN NEW.farm_size_unit='acres' THEN NEW.farm_size_value WHEN NEW.farm_size_unit='hectares' THEN NEW.farm_size_value*2.47105 ELSE NULL END,
    CASE WHEN NEW.farm_size_unit='hectares' THEN NEW.farm_size_value WHEN NEW.farm_size_unit='acres' THEN NEW.farm_size_value*0.404686 ELSE NULL END
  );
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.create_default_farm_plot() FROM PUBLIC,anon,authenticated;
