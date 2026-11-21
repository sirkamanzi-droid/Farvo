import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Building2, BadgeCheck, Loader2, AlertCircle, LogOut } from 'lucide-react';

type FarmerProfile = { full_name: string; cooperative_name: string; farmer_code: string; };

export default function AccountScreen() {
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true); setError('');
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) { setError('Could not sign out. Try again.'); setSigningOut(false); }
  }

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      setLoading(true); setError('');
      const { data, error: requestError } = await supabase.rpc('get_my_farmer_account');
      if (cancelled) return;
      if (requestError) { setError('Could not load your account. Try again.'); setLoading(false); return; }
      const row = Array.isArray(data) ? data[0] : null;
      if (!row) { setError('No farmer profile found. Contact your cooperative.'); setLoading(false); return; }
      setProfile(row as FarmerProfile); setLoading(false);
    }
    void loadProfile();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="mx-auto w-full max-w-xl space-y-5">
      <div><p className="text-sm font-medium text-leaf-700">Your details</p><h1 className="mt-1 text-3xl font-bold text-soil-900">Account</h1></div>
      {loading ? <div className="flex items-center gap-3 rounded-2xl bg-[#faf7ef] p-5"><Loader2 className="h-5 w-5 animate-spin text-leaf-600"/><p className="text-sm text-soil-700">Loading…</p></div>
      : error ? <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-5"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600"/><p className="text-sm text-red-800">{error}</p></div>
      : profile ? <div className="divide-y divide-[#e4dac7] rounded-2xl bg-[#faf7ef] px-4">
        <div className="flex items-center gap-4 py-4"><User className="h-5 w-5 text-leaf-700"/><div><p className="text-xs text-soil-500">Name</p><p className="mt-1 font-semibold text-soil-900">{profile.full_name}</p></div></div>
        <div className="flex items-center gap-4 py-4"><Building2 className="h-5 w-5 text-leaf-700"/><div><p className="text-xs text-soil-500">Cooperative</p><p className="mt-1 font-semibold text-soil-900">{profile.cooperative_name}</p></div></div>
        <div className="flex items-center gap-4 py-4"><BadgeCheck className="h-5 w-5 text-leaf-700"/><div><p className="text-xs text-soil-500">Farmer ID</p><p className="mt-1 font-mono text-lg font-bold text-soil-900">{profile.farmer_code}</p></div></div>
      </div> : null}
      <button type="button" onClick={() => void handleSignOut()} disabled={signingOut} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#faf7ef] px-4 py-3 font-medium text-soil-700 transition hover:bg-[#efe7d8] disabled:opacity-60">
        {signingOut ? <Loader2 className="h-4 w-4 animate-spin"/> : <LogOut className="h-4 w-4"/>}{signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </section>
  );
}
