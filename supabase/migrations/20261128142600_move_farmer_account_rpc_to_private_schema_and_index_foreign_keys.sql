ALTER FUNCTION public.get_my_farmer_account() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.get_my_farmer_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.get_my_farmer_account() TO authenticated;
CREATE OR REPLACE FUNCTION public.get_my_farmer_account()
RETURNS TABLE (
  full_name text, cooperative_name text, farmer_code text, phone_number text,
  preferred_language text, preferred_channel text, preferred_contact_time time without time zone,
  privacy_consent_at timestamp with time zone, proactive_contact_consent_at timestamp with time zone
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT * FROM private.get_my_farmer_account(); $$;
REVOKE ALL ON FUNCTION public.get_my_farmer_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_farmer_account() TO authenticated;
CREATE INDEX IF NOT EXISTS crop_care_checkins_user_id_idx ON public.crop_care_checkins (user_id);
CREATE INDEX IF NOT EXISTS crop_care_plans_farm_id_idx ON public.crop_care_plans (farm_id);
CREATE INDEX IF NOT EXISTS crop_care_plans_plot_fk_idx ON public.crop_care_plans (plot_id,farm_id,user_id);
CREATE INDEX IF NOT EXISTS crop_care_push_subscriptions_user_id_idx ON public.crop_care_push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS crop_care_tasks_plan_id_idx ON public.crop_care_tasks (plan_id);
CREATE INDEX IF NOT EXISTS farm_crops_plot_fk_idx ON public.farm_crops (plot_id,farm_id,user_id);
CREATE INDEX IF NOT EXISTS farm_events_plot_fk_idx ON public.farm_events (plot_id,farm_id,user_id);
CREATE INDEX IF NOT EXISTS soil_assessments_plot_fk_idx ON public.soil_assessments (plot_id,farm_id,user_id);
