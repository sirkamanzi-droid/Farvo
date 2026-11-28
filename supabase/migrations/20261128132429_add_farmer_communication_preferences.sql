-- Add farmer communication and consent preferences without changing existing login.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS preferred_channel text NOT NULL DEFAULT 'in_app',
  ADD COLUMN IF NOT EXISTS preferred_contact_time time,
  ADD COLUMN IF NOT EXISTS privacy_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS proactive_contact_consent_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_phone_number_e164_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_phone_number_e164_check
      CHECK (phone_number IS NULL OR phone_number ~ '^\\+[1-9][0-9]{7,14}$');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_preferred_channel_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_preferred_channel_check
      CHECK (preferred_channel IN ('in_app', 'whatsapp', 'none'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_preferred_language_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_preferred_language_check
      CHECK (preferred_language IN ('en', 'lg', 'nyn', 'cgg', 'sw'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.create_farmer_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  selected_cooperative uuid;
  entered_name text;
  cooperative_name text;
  prefix_code text;
  candidate_code text;
  entered_phone text;
  selected_language text;
  selected_channel text;
  selected_contact_time time;
BEGIN
  entered_name := trim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  IF entered_name = '' THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;

  IF coalesce((new.raw_user_meta_data ->> 'privacy_consent')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Privacy consent is required';
  END IF;

  SELECT c.id, c.name INTO selected_cooperative, cooperative_name
  FROM public.cooperatives c
  WHERE c.code_hash = encode(
    extensions.digest(
      upper(trim(coalesce(new.raw_user_meta_data ->> 'cooperative_code', ''))),
      'sha256'
    ), 'hex'
  )
  AND c.is_active = true
  LIMIT 1;

  IF selected_cooperative IS NULL THEN
    RAISE EXCEPTION 'A valid cooperative code is required';
  END IF;

  entered_phone := nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone_number', '')), '');
  selected_language := coalesce(nullif(new.raw_user_meta_data ->> 'preferred_language', ''), 'en');
  selected_channel := coalesce(nullif(new.raw_user_meta_data ->> 'preferred_channel', ''), 'in_app');
  selected_contact_time := nullif(new.raw_user_meta_data ->> 'preferred_contact_time', '')::time;

  IF selected_language NOT IN ('en', 'lg', 'nyn', 'cgg', 'sw') THEN
    RAISE EXCEPTION 'Unsupported preferred language';
  END IF;

  IF selected_channel NOT IN ('in_app', 'whatsapp', 'none') THEN
    RAISE EXCEPTION 'Unsupported preferred contact channel';
  END IF;

  IF entered_phone IS NOT NULL AND entered_phone !~ '^\\+[1-9][0-9]{7,14}$' THEN
    RAISE EXCEPTION 'Phone number must use international format, for example +2567XXXXXXXX';
  END IF;

  IF selected_channel = 'whatsapp' AND (
    entered_phone IS NULL OR
    coalesce((new.raw_user_meta_data ->> 'proactive_contact_consent')::boolean, false) IS NOT TRUE
  ) THEN
    RAISE EXCEPTION 'WhatsApp contact requires a phone number and consent';
  END IF;

  prefix_code := left(
    regexp_replace(upper(coalesce(cooperative_name, '')), '[^A-Z]', '', 'g'),
    3
  );
  IF length(prefix_code) < 3 THEN
    prefix_code := rpad(prefix_code, 3, 'X');
  END IF;

  LOOP
    candidate_code := prefix_code || '-' ||
      lpad((floor(random() * 900000) + 100000)::integer::text, 6, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE farmer_code = candidate_code
    );
  END LOOP;

  INSERT INTO public.profiles (
    id, full_name, cooperative_id, farmer_code, phone_number,
    preferred_language, preferred_channel, preferred_contact_time,
    privacy_consent_at, proactive_contact_consent_at
  )
  VALUES (
    new.id, entered_name, selected_cooperative, candidate_code, entered_phone,
    selected_language, selected_channel, selected_contact_time,
    now(),
    CASE
      WHEN coalesce((new.raw_user_meta_data ->> 'proactive_contact_consent')::boolean, false)
      THEN now()
      ELSE NULL
    END
  );

  RETURN new;
END;
$function$;

DROP FUNCTION IF EXISTS public.get_my_farmer_account();

CREATE FUNCTION public.get_my_farmer_account()
RETURNS TABLE (
  full_name text,
  cooperative_name text,
  farmer_code text,
  phone_number text,
  preferred_language text,
  preferred_channel text,
  preferred_contact_time time,
  privacy_consent_at timestamptz,
  proactive_contact_consent_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT
    p.full_name,
    c.name,
    p.farmer_code,
    p.phone_number,
    p.preferred_language,
    p.preferred_channel,
    p.preferred_contact_time,
    p.privacy_consent_at,
    p.proactive_contact_consent_at
  FROM public.profiles p
  JOIN public.cooperatives c ON c.id = p.cooperative_id
  WHERE p.id = (SELECT auth.uid())
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.get_my_farmer_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_farmer_account() TO authenticated;
