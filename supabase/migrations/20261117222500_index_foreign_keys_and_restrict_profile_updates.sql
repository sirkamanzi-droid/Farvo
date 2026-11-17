-- Index foreign-key columns used for joins and deletes.
CREATE INDEX IF NOT EXISTS profiles_cooperative_id_idx
  ON public.profiles (cooperative_id);

CREATE INDEX IF NOT EXISTS kato_messages_user_id_idx
  ON public.kato_messages (user_id);

-- Farmer profile data is currently read-only after registration.
-- Registration creates the profile through the protected auth trigger.
REVOKE UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
