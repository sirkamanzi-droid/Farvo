import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Building2, BadgeCheck, Loader2, AlertCircle, LogOut } from 'lucide-react';

type FarmerProfile = {
  full_name: string;
  cooperative_name: string;
  farmer_code: string;
};

export default function AccountScreen() {
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    setError('');

    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError('Could not sign out. Please try again.');
      setSigningOut(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError('');

      const { data, error: requestError } = await supabase.rpc(
        'get_my_farmer_account'
      );

      if (cancelled) return;

      if (requestError) {
        setError('Could not load your account. Please try again.');
        setLoading(false);
        return;
      }

      const row = Array.isArray(data) ? data[0] : null;

      if (!row) {
        setError(
          'No farmer profile was found for this account. Please contact your cooperative administrator.'
        );
        setLoading(false);
        return;
      }

      setProfile(row as FarmerProfile);
      setLoading(false);
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mx-auto w-full max-w-xl space-y-5">
      <div>
        <p className="text-sm font-medium text-leaf-600">YOUR PROFILE</p>
        <h1 className="mt-1 text-2xl font-semibold text-soil-800">
          Account
        </h1>
        <p className="mt-2 text-sm text-soil-600">
          Your Omulimi farmer account and cooperative details.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-soil-200 bg-white p-5">
          <Loader2 className="h-5 w-5 animate-spin text-leaf-600" />
          <p className="text-sm text-soil-600">Loading your profile…</p>
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      ) : profile ? (
        <div className="overflow-hidden rounded-2xl border border-soil-200 bg-white">
          <div className="flex items-center gap-4 border-b border-soil-100 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf-100">
              <User className="h-6 w-6 text-leaf-700" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-soil-500">
                Farmer name
              </p>
              <p className="mt-1 break-words font-semibold text-soil-800">
                {profile.full_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-b border-soil-100 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf-100">
              <Building2 className="h-6 w-6 text-leaf-700" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-soil-500">
                Cooperative
              </p>
              <p className="mt-1 break-words font-semibold text-soil-800">
                {profile.cooperative_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf-100">
              <BadgeCheck className="h-6 w-6 text-leaf-700" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-soil-500">
                Your Farmer ID
              </p>
              <p className="mt-1 font-mono text-lg font-bold tracking-wide text-soil-800">
                {profile.farmer_code}
              </p>
              <p className="mt-1 text-xs text-soil-500">
                Keep this ID for your Omulimi records.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <p className="text-xs text-soil-500">
        Your cooperative membership is managed securely through Omulimi.
      </p>

      <button
        type="button"
        onClick={() => void handleSignOut()}
        disabled={signingOut}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-soil-200 bg-white px-4 py-3 font-medium text-soil-700 transition hover:bg-parchment-100 disabled:opacity-60"
      >
        {signingOut ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </section>
  );
}
