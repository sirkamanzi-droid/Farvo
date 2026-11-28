import { useState, type FormEvent } from 'react';
import { Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Props = { onComplete: () => void };

export default function FarmerPinSetup({ onComplete }: Props) {
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(pin)) { setError('Use exactly six digits.'); return; }
    if (pin !== confirmation) { setError('The two PIN entries do not match.'); return; }
    setSaving(true);
    try {
      const { error: saveError } = await supabase.rpc('set_my_farmer_pin', { p_pin: pin });
      if (saveError) throw saveError;
      setPin('');
      setConfirmation('');
      onComplete();
    } catch (cause) {
      console.error('Could not save farmer PIN:', cause);
      setError('We could not save your PIN. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#14251d]/70 p-4">
    <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-[#e6dcc8] bg-[#faf7ef] p-6 shadow-2xl">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e7eddf]"><LockKeyhole className="h-7 w-7 text-[#285b40]"/></div>
      <p className="mt-4 text-center text-xs font-semibold uppercase tracking-wide text-[#56715f]">Private farmer access</p>
      <h2 className="mt-1 text-center text-2xl font-semibold text-[#1d2d27]">Create your 6-digit PIN</h2>
      <p className="mt-2 text-center text-sm leading-6 text-[#66746b]">You will use this PIN to open your own farm information when you borrow or share a phone. Your PIN is stored as a secure hash, not as readable digits.</p>
      <label className="mt-5 block text-xs font-semibold text-[#52645a]">Create PIN</label>
      <input type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" maxLength={6} value={pin} onChange={event=>setPin(event.target.value.replace(/\D/g,'').slice(0,6))} className="mt-1 w-full rounded-xl border border-[#e6dcc8] bg-white px-4 py-3 text-center text-xl tracking-[0.5em] text-[#1d2d27]" placeholder="••••••" required/>
      <label className="mt-4 block text-xs font-semibold text-[#52645a]">Confirm PIN</label>
      <input type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" maxLength={6} value={confirmation} onChange={event=>setConfirmation(event.target.value.replace(/\D/g,'').slice(0,6))} className="mt-1 w-full rounded-xl border border-[#e6dcc8] bg-white px-4 py-3 text-center text-xl tracking-[0.5em] text-[#1d2d27]" placeholder="••••••" required/>
      {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <button type="submit" disabled={saving || pin.length!==6 || confirmation.length!==6} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#174432] px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-50">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:<ShieldCheck className="h-4 w-4"/>}{saving?'Saving securely…':'Save my PIN'}</button>
      <p className="mt-3 text-center text-[11px] leading-5 text-[#879188]">Do not share your PIN. Omulimi staff will never ask you to send it in a message.</p>
    </form>
  </div>;
}
