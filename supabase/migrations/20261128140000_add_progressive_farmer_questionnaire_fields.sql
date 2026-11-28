ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS decision_style text
    CHECK (decision_style IS NULL OR decision_style IN ('alone','with_someone','unknown'));
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_preferred_language_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_preferred_language_check
  CHECK (preferred_language IN ('en','lg','nyn','cgg','sw','ach','teo','other'));
ALTER TABLE public.farms
  ADD COLUMN IF NOT EXISTS years_farmed_land text CHECK (years_farmed_land IS NULL OR years_farmed_land IN ('under_1_year','1_to_5_years','6_to_10_years','over_10_years','unknown')),
  ADD COLUMN IF NOT EXISTS previous_season_crops text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS season_before_previous_crops text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS water_pools_after_rain boolean,
  ADD COLUMN IF NOT EXISTS water_access text CHECK (water_access IS NULL OR water_access IN ('stream','well','dam','none','unknown')),
  ADD COLUMN IF NOT EXISTS biggest_challenge text CHECK (biggest_challenge IS NULL OR biggest_challenge IN ('pests','weather','money','market','labour','other','unknown')),
  ADD COLUMN IF NOT EXISTS selling_habit text CHECK (selling_habit IS NULL OR selling_habit IN ('sell_at_once','store','both','unknown')),
  ADD COLUMN IF NOT EXISTS last_season_harvest_kg numeric CHECK (last_season_harvest_kg IS NULL OR last_season_harvest_kg >= 0),
  ADD COLUMN IF NOT EXISTS last_season_income_ugx numeric CHECK (last_season_income_ugx IS NULL OR last_season_income_ugx >= 0),
  ADD COLUMN IF NOT EXISTS previous_farming_service text CHECK (previous_farming_service IS NULL OR char_length(previous_farming_service) <= 200),
  ADD COLUMN IF NOT EXISTS previous_farming_service_feedback text CHECK (previous_farming_service_feedback IS NULL OR char_length(previous_farming_service_feedback) <= 1000);
ALTER TABLE public.farm_crops
  ADD COLUMN IF NOT EXISTS area_share_percent numeric CHECK (area_share_percent IS NULL OR area_share_percent BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS input_source text CHECK (input_source IS NULL OR input_source IN ('shop','cooperative','saved_seed','other','unknown')),
  ADD COLUMN IF NOT EXISTS fertiliser_manure_applied text CHECK (fertiliser_manure_applied IS NULL OR char_length(fertiliser_manure_applied) <= 500);
ALTER TABLE public.farm_livestock
  ADD COLUMN IF NOT EXISTS cattle_status text CHECK (cattle_status IS NULL OR cattle_status IN ('milking','pregnant','young','not_applicable','unknown')),
  ADD COLUMN IF NOT EXISTS vaccinated_this_year boolean,
  ADD COLUMN IF NOT EXISTS vaccination_details text CHECK (vaccination_details IS NULL OR char_length(vaccination_details) <= 500);
CREATE TABLE IF NOT EXISTS public.farmer_pin_credentials (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  pin_set_at timestamptz NOT NULL DEFAULT now(),
  failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.farmer_pin_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.farmer_pin_credentials FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.farmer_pin_credentials TO service_role;
CREATE OR REPLACE FUNCTION public.set_my_farmer_pin(p_pin text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE current_user_id uuid := (SELECT auth.uid());
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'Please sign in before creating your farmer PIN'; END IF;
  IF p_pin IS NULL OR p_pin !~ '^[0-9]{6}$' THEN RAISE EXCEPTION 'Farmer PIN must contain exactly six digits'; END IF;
  INSERT INTO public.farmer_pin_credentials (user_id,pin_hash,pin_set_at,failed_attempts,locked_until,updated_at)
  VALUES (current_user_id,extensions.crypt(p_pin,extensions.gen_salt('bf',12)),now(),0,NULL,now())
  ON CONFLICT (user_id) DO UPDATE SET pin_hash=EXCLUDED.pin_hash,pin_set_at=now(),failed_attempts=0,locked_until=NULL,updated_at=now();
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.set_my_farmer_pin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_farmer_pin(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.has_my_farmer_pin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.farmer_pin_credentials c WHERE c.user_id=(SELECT auth.uid())); $$;
REVOKE ALL ON FUNCTION public.has_my_farmer_pin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_my_farmer_pin() TO authenticated;
ALTER TABLE public.farm_events DROP CONSTRAINT IF EXISTS farm_events_event_type_check;
ALTER TABLE public.farm_events ADD CONSTRAINT farm_events_event_type_check CHECK (event_type IN (
  'disease_detection','advice','alert','farmer_reply','weather_action','soil_assessment',
  'crop_update','livestock_update','follow_up','questionnaire_answer','vigour_reading'
));
