-- Remove default/public table privileges that are not required by the app.
-- RLS controls rows, but it does not protect against TRUNCATE.
REVOKE ALL PRIVILEGES ON TABLE
  public.kato_conversations,
  public.kato_messages
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.kato_conversations,
  public.kato_messages
TO authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.soil_assessments
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, DELETE ON TABLE public.soil_assessments
TO authenticated;
