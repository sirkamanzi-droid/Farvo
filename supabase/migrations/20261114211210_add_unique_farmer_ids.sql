-- Reconstructed from the applied production migration 20261114211210.
-- This migration assumes the existing public.profiles and public.cooperatives
-- base tables are already present.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS farmer_code text;

DO $$
DECLARE
  profile_row record;
  prefix_code text;
  candidate_code text;
BEGIN
  FOR profile_row IN
    SELECT p.id, c.name
    FROM public.profiles p
    JOIN public.cooperatives c ON c.id = p.cooperative_id
    WHERE p.farmer_code IS NULL
  LOOP
    prefix_code := left(
      regexp_replace(upper(coalesce(profile_row.name, '')), '[^A-Z]', '', 'g'),
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

    UPDATE public.profiles
    SET farmer_code = candidate_code
    WHERE id = profile_row.id;
  END LOOP;
END;
$$;

ALTER TABLE public.profiles
  ALTER COLUMN farmer_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_farmer_code_key
  ON public.profiles (farmer_code);

CREATE OR REPLACE FUNCTION public.prevent_farmer_code_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.farmer_code IS DISTINCT FROM OLD.farmer_code THEN
    RAISE EXCEPTION 'Farmer ID cannot be changed';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS prevent_farmer_code_change ON public.profiles;
CREATE TRIGGER prevent_farmer_code_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_farmer_code_change();

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
BEGIN
  entered_name := trim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  IF entered_name = '' THEN
    RAISE EXCEPTION 'Full name is required';
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

  INSERT INTO public.profiles (id, full_name, cooperative_id, farmer_code)
  VALUES (new.id, entered_name, selected_cooperative, candidate_code);
  RETURN new;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created_farmer ON auth.users;
CREATE TRIGGER on_auth_user_created_farmer
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_farmer_profile();

CREATE OR REPLACE FUNCTION public.get_my_farmer_account()
RETURNS TABLE(full_name text, cooperative_name text, farmer_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT p.full_name, c.name, p.farmer_code
  FROM public.profiles p
  JOIN public.cooperatives c ON c.id = p.cooperative_id
  WHERE p.id = (SELECT auth.uid())
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.get_my_farmer_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_farmer_account() TO authenticated;
