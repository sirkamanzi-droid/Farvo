-- This RPC was superseded by get_my_farmer_account().
-- Keep it unavailable through PostgREST so there is only one account RPC.
REVOKE EXECUTE ON FUNCTION public.get_my_cooperative()
FROM PUBLIC, anon, authenticated;
