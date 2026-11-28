CREATE TABLE IF NOT EXISTS public.farm_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  plot_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('disease_detection','advice','alert','farmer_reply','weather_action','soil_assessment','crop_update','livestock_update','follow_up')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK (source IN ('farmer','kato','system','agronomist','external_service')),
  source_record_type text,
  source_record_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object' AND pg_column_size(payload) <= 32768),
  related_event_id uuid REFERENCES public.farm_events(id) ON DELETE SET NULL,
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 160),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT farm_events_user_idempotency_unique UNIQUE (user_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS farm_events_farm_occurred_idx ON public.farm_events (farm_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS farm_events_user_occurred_idx ON public.farm_events (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS farm_events_type_occurred_idx ON public.farm_events (event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS farm_events_related_event_idx ON public.farm_events (related_event_id) WHERE related_event_id IS NOT NULL;
ALTER TABLE public.farm_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farmers read events on their farms" ON public.farm_events;
CREATE POLICY "Farmers read events on their farms" ON public.farm_events FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_events.farm_id AND f.user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "Farmers add events to their farms" ON public.farm_events;
CREATE POLICY "Farmers add events to their farms" ON public.farm_events FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_events.farm_id AND f.user_id = (SELECT auth.uid())));
REVOKE ALL ON TABLE public.farm_events FROM PUBLIC, anon;
GRANT SELECT, INSERT ON TABLE public.farm_events TO authenticated;
