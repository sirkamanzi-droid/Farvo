CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
ALTER TABLE public.farmer_pin_credentials SET SCHEMA private;
REVOKE ALL PRIVILEGES ON TABLE private.farmer_pin_credentials FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE private.farmer_pin_credentials TO service_role;
CREATE OR REPLACE FUNCTION private.set_my_farmer_pin(p_pin text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE current_user_id uuid := (SELECT auth.uid());
BEGIN
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'Please sign in before creating your farmer PIN'; END IF;
  IF p_pin IS NULL OR p_pin !~ '^[0-9]{6}$' THEN RAISE EXCEPTION 'Farmer PIN must contain exactly six digits'; END IF;
  INSERT INTO private.farmer_pin_credentials (user_id,pin_hash,pin_set_at,failed_attempts,locked_until,updated_at)
  VALUES (current_user_id,extensions.crypt(p_pin,extensions.gen_salt('bf',12)),now(),0,NULL,now())
  ON CONFLICT (user_id) DO UPDATE SET pin_hash=EXCLUDED.pin_hash,pin_set_at=now(),failed_attempts=0,locked_until=NULL,updated_at=now();
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION private.set_my_farmer_pin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.set_my_farmer_pin(text) TO authenticated;
CREATE OR REPLACE FUNCTION private.has_my_farmer_pin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM private.farmer_pin_credentials c WHERE c.user_id=(SELECT auth.uid())); $$;
REVOKE ALL ON FUNCTION private.has_my_farmer_pin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_my_farmer_pin() TO authenticated;
CREATE OR REPLACE FUNCTION public.set_my_farmer_pin(p_pin text)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.set_my_farmer_pin(p_pin); $$;
REVOKE ALL ON FUNCTION public.set_my_farmer_pin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_farmer_pin(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.has_my_farmer_pin()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.has_my_farmer_pin(); $$;
REVOKE ALL ON FUNCTION public.has_my_farmer_pin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_my_farmer_pin() TO authenticated;
CREATE INDEX IF NOT EXISTS crop_care_checkins_user_id_idx ON public.crop_care_checkins (user_id);
CREATE INDEX IF NOT EXISTS crop_care_plans_farm_id_idx ON public.crop_care_plans (farm_id);
CREATE INDEX IF NOT EXISTS crop_care_plans_plot_fk_idx ON public.crop_care_plans (plot_id,farm_id,user_id);
CREATE INDEX IF NOT EXISTS crop_care_push_subscriptions_user_id_idx ON public.crop_care_push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS crop_care_tasks_plan_id_idx ON public.crop_care_tasks (plan_id);
CREATE INDEX IF NOT EXISTS farm_crops_plot_fk_idx ON public.farm_crops (plot_id,farm_id,user_id);
CREATE INDEX IF NOT EXISTS farm_events_plot_fk_idx ON public.farm_events (plot_id,farm_id,user_id);
CREATE INDEX IF NOT EXISTS soil_assessments_plot_fk_idx ON public.soil_assessments (plot_id,farm_id,user_id);
