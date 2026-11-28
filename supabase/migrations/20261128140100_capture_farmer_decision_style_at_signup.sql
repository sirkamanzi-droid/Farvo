CREATE OR REPLACE FUNCTION public.create_farmer_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
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
  selected_decision_style text;
BEGIN
  entered_name := trim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  IF entered_name = '' THEN RAISE EXCEPTION 'Full name is required'; END IF;
  IF new.raw_user_meta_data ? 'privacy_consent' AND coalesce((new.raw_user_meta_data ->> 'privacy_consent')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Privacy consent is required';
  END IF;
  SELECT c.id, c.name INTO selected_cooperative, cooperative_name
  FROM public.cooperatives c
  WHERE c.code_hash = encode(extensions.digest(upper(trim(coalesce(new.raw_user_meta_data ->> 'cooperative_code', ''))), 'sha256'), 'hex')
    AND c.is_active = true
  LIMIT 1;
  IF selected_cooperative IS NULL THEN RAISE EXCEPTION 'A valid cooperative code is required'; END IF;
  entered_phone := nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone_number', '')), '');
  selected_language := coalesce(nullif(new.raw_user_meta_data ->> 'preferred_language', ''), 'en');
  selected_channel := coalesce(nullif(new.raw_user_meta_data ->> 'preferred_channel', ''), 'in_app');
  selected_contact_time := nullif(new.raw_user_meta_data ->> 'preferred_contact_time', '')::time;
  selected_decision_style := coalesce(nullif(new.raw_user_meta_data ->> 'decision_style', ''), 'unknown');
  IF selected_language NOT IN ('en','lg','nyn','cgg','sw','ach','teo','other') THEN RAISE EXCEPTION 'Unsupported preferred language'; END IF;
  IF selected_channel NOT IN ('in_app','whatsapp','none') THEN RAISE EXCEPTION 'Unsupported preferred contact channel'; END IF;
  IF selected_decision_style NOT IN ('alone','with_someone','unknown') THEN RAISE EXCEPTION 'Unsupported decision style'; END IF;
  IF entered_phone IS NOT NULL AND entered_phone !~ '^\\+[1-9][0-9]{7,14}$' THEN
    RAISE EXCEPTION 'Phone number must use international format, for example +2567XXXXXXXX';
  END IF;
  IF selected_channel = 'whatsapp' AND (entered_phone IS NULL OR coalesce((new.raw_user_meta_data ->> 'proactive_contact_consent')::boolean,false) IS NOT TRUE) THEN
    RAISE EXCEPTION 'WhatsApp contact requires a phone number and consent';
  END IF;
  prefix_code := left(regexp_replace(upper(coalesce(cooperative_name,'')), '[^A-Z]', '', 'g'), 3);
  IF length(prefix_code) < 3 THEN prefix_code := rpad(prefix_code, 3, 'X'); END IF;
  LOOP
    candidate_code := prefix_code || '-' || lpad((floor(random()*900000)+100000)::integer::text, 6, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE farmer_code = candidate_code);
  END LOOP;
  INSERT INTO public.profiles (
    id,full_name,cooperative_id,farmer_code,phone_number,preferred_language,preferred_channel,
    preferred_contact_time,privacy_consent_at,proactive_contact_consent_at,decision_style
  ) VALUES (
    new.id,entered_name,selected_cooperative,candidate_code,entered_phone,selected_language,selected_channel,
    selected_contact_time,now(),
    CASE WHEN coalesce((new.raw_user_meta_data ->> 'proactive_contact_consent')::boolean,false) THEN now() ELSE NULL END,
    selected_decision_style
  );
  RETURN new;
END;
$function$;
