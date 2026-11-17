import { useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Activity, ArrowLeft, Building2, CheckCircle2, ClipboardList, Loader2, LogOut, Megaphone, RefreshCw, ShieldCheck, Sprout, Users, CircleAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';

type View = 'overview' | 'farmers' | 'cooperatives' | 'settings' | 'activity';
type Farmer = { id: string; full_name: string; farmer_code: string; cooperativeName?: string; created_at: string };
type Cooperative = { id: string; name: string; is_active: boolean; farmerCount: number; created_at: string };
type Audit = { id: number; action: string; target_type: string; target_id: string | null; created_at: string };
const nav: { id: View; label: string; icon: typeof Activity }[] = [
  { id: 'overview', label: 'Overview', icon: Activity }, { id: 'farmers', label: 'Farmers', icon: Users },
  { id: 'cooperatives', label: 'Cooperatives', icon: Building2 }, { id: 'settings', label: 'App settings', icon: Megaphone },
  { id: 'activity', label: 'Audit trail', icon: ClipboardList },
];
const date = (value: string) => new Date(value).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });

export default function CommandCentre({ session }: { session: Session | null }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [view, setView] = useState<View>('overview'); const [refresh, setRefresh] = useState(0);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [farmers, setFarmers] = useState<Farmer[]>([]); const [recent, setRecent] = useState<Farmer[]>([]);
  const [coops, setCoops] = useState<Cooperative[]>([]); const [activity, setActivity] = useState<Audit[]>([]);
  const [announcement, setAnnouncement] = useState(''); const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setError(''); setNotice('');
      try {
        const response = await fetch('/api/command?view=' + view, { headers: { Authorization: 'Bearer ' + session.access_token }, cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load this section.');
        if (cancelled) return;
        if (view === 'overview') { setCounts(data.counts); setRecent(data.recentFarmers || []); }
        if (view === 'farmers') setFarmers(data.farmers || []);
        if (view === 'cooperatives') setCoops(data.cooperatives || []);
        if (view === 'settings') { setAnnouncement(data.settings?.announcement || ''); setDraft(data.settings?.announcement || ''); }
        if (view === 'activity') setActivity(data.activity || []);
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to load this section.'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [session?.access_token, view, refresh]);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (authError) setError('Sign-in failed. Check your details and try again.');
    else setPassword('');
  };
  const signOut = async () => { await supabase.auth.signOut(); };
  const publish = async () => {
    if (!session) return; setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/command', { method: 'PATCH', headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update-announcement', announcement: draft }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not publish announcement.');
      setAnnouncement(data.announcement); setDraft(data.announcement); setNotice('Announcement published in the farmer app.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not publish announcement.'); }
    finally { setBusy(false); }
  };
  const toggleCoop = async (coop: Cooperative) => {
    if (!session || !window.confirm((coop.is_active ? 'Deactivate ' : 'Activate ') + coop.name + '?')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/command', { method: 'PATCH', headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set-cooperative-status', cooperativeId: coop.id, isActive: !coop.is_active }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not update cooperative.');
      setCoops(items => items.map(item => item.id === coop.id ? { ...item, is_active: !coop.is_active } : item));
      setNotice(coop.name + ' is now ' + (!coop.is_active ? 'active.' : 'inactive.'));
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update cooperative.'); }
    finally { setBusy(false); }
  };

  if (!session) return <div className="min-h-screen bg-[#172b22] flex items-center justify-center p-4"><section className="w-full max-w-md rounded-3xl bg-[#f8f4eb] p-7 shadow-2xl">
    <div className="mb-8 flex items-center gap-3"><div className="rounded-2xl bg-[#174432] p-3 text-white"><ShieldCheck className="h-7 w-7"/></div><div><p className="text-xs font-bold tracking-[.2em] text-[#a94d2e]">OMULIMI</p><h1 className="text-2xl font-bold">Command Centre</h1></div></div>
    <h2 className="text-lg font-bold">Administrator sign-in</h2><p className="mb-6 mt-1 text-sm text-[#52645a]">Use the authorised administrator account. There is no admin registration.</p>
    <form onSubmit={login} className="space-y-4"><label className="block text-sm font-semibold">Email<input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-[#ded5c3] bg-white px-4 py-3"/></label><label className="block text-sm font-semibold">Password<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-[#ded5c3] bg-white px-4 py-3"/></label>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<button disabled={busy} className="w-full rounded-xl bg-[#174432] py-3 font-bold text-white disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in securely'}</button></form>
    <a href="/" className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-[#52645a]"><ArrowLeft className="h-4 w-4"/>Back to Omulimi</a>
  </section></div>;

  return <div className="min-h-screen bg-[#f1ebdc] text-[#1d2d27]">
    <header className="sticky top-0 z-20 border-b border-[#ded5c3] bg-[#f8f4eb]/95 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
      <div className="flex items-center gap-3"><div className="rounded-xl bg-[#174432] p-2 text-white"><Sprout className="h-6 w-6"/></div><div><p className="text-[10px] font-bold tracking-[.2em] text-[#a94d2e]">OMULIMI / OPERATIONS</p><h1 className="text-xl font-bold">Command Centre</h1></div></div>
      <div className="flex gap-2"><button onClick={() => setRefresh(v => v + 1)} aria-label="Refresh" className="rounded-xl border border-[#ded5c3] p-2"><RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')}/></button><button onClick={signOut} className="flex items-center gap-2 rounded-xl border border-[#ded5c3] px-3 py-2 text-xs font-semibold"><LogOut className="h-4 w-4"/>Sign out</button></div>
    </div></header>
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-8">
      <aside className="flex gap-2 overflow-x-auto lg:block lg:space-y-1">{nav.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => setView(item.id)} className={'flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold lg:w-full ' + (view === item.id ? 'bg-[#174432] text-white' : 'text-[#52645a] hover:bg-[#e7eddf]')}><Icon className="h-4 w-4"/>{item.label}</button>; })}<div className="mt-8 hidden rounded-xl border border-[#ded5c3] bg-[#f8f4eb] p-3 text-xs text-[#52645a] lg:block"><ShieldCheck className="mb-2 h-5 w-5 text-[#285b40]"/>Server verifies administrator identity on every protected request. The page address is not the security boundary.</div></aside>
      <main className="min-w-0"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#a94d2e]">Operations</p><h2 className="mt-1 text-3xl font-bold">{nav.find(item => item.id === view)?.label}</h2></div>
        {error && <div role="alert" className="mb-4 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><CircleAlert className="h-4 w-4 shrink-0"/>{error}</div>}
        {notice && <div role="status" className="mb-4 flex gap-2 rounded-xl border border-[#c9d9c6] bg-[#e7eddf] p-3 text-sm text-[#174432]"><CheckCircle2 className="h-4 w-4"/>{notice}</div>}
        {loading ? <div className="rounded-2xl border border-[#ded5c3] bg-[#f8f4eb] p-12 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-[#285b40]"/> <p className="mt-3 text-sm text-[#52645a]">Loading operational data…</p></div> : <>
          {view === 'overview' && <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[['Farmers',counts?.farmers],['Cooperatives',counts?.cooperatives],['Registered farms',counts?.farms],['Soil reports',counts?.soilAssessments],['Kato conversations',counts?.katoConversations]].map(([label,value]) => <div key={String(label)} className="rounded-2xl border border-[#ded5c3] bg-[#f8f4eb] p-4"><Activity className="h-5 w-5 text-[#285b40]"/><p className="mt-4 text-3xl font-bold tabular-nums">{value ?? '—'}</p><p className="mt-1 text-xs font-semibold text-[#52645a]">{label}</p></div>)}</div>
            <section className="rounded-2xl border border-[#ded5c3] bg-[#f8f4eb] p-4"><div className="mb-3 flex items-center justify-between"><div><h3 className="font-bold">Recently registered farmers</h3><p className="text-xs text-[#52645a]">Latest eight accounts</p></div><button onClick={() => setView('farmers')} className="text-xs font-bold text-[#285b40]">All farmers →</button></div>{recent.length ? recent.map(f => <div key={f.id} className="flex justify-between gap-3 border-t border-[#e5dccb] py-3"><div><p className="text-sm font-semibold">{f.full_name}</p><p className="text-xs text-[#52645a]">{f.farmer_code}</p></div><span className="text-xs text-[#52645a]">{date(f.created_at)}</span></div>) : <p className="py-5 text-sm text-[#52645a]">No farmer accounts yet.</p>}</section></div>}
          {view === 'farmers' && <section className="overflow-hidden rounded-2xl border border-[#ded5c3] bg-[#f8f4eb]"><div className="border-b border-[#ded5c3] p-4"><h3 className="font-bold">Farmer directory</h3><p className="text-xs text-[#52645a]">Read-only. Passwords and private credentials are never displayed.</p></div>{farmers.map(f => <div key={f.id} className="flex flex-wrap justify-between gap-2 border-b border-[#e5dccb] p-4"><div><p className="font-semibold">{f.full_name}</p><p className="text-xs text-[#52645a]">{f.farmer_code} · {f.cooperativeName}</p></div><span className="text-xs text-[#52645a]">{date(f.created_at)}</span></div>)}<p className="p-3 text-xs text-[#52645a]">Showing up to 250 farmer accounts.</p></section>}
          {view === 'cooperatives' && <section className="space-y-3"><p className="text-sm text-[#52645a]">Activate or deactivate cooperative registration access. Existing farmer records are not deleted.</p>{coops.map(c => <article key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ded5c3] bg-[#f8f4eb] p-4"><div><div className="flex items-center gap-2"><h3 className="font-bold">{c.name}</h3><span className={'rounded-full px-2 py-1 text-[10px] font-bold ' + (c.is_active ? 'bg-[#e7eddf] text-[#174432]' : 'bg-rose-100 text-rose-700')}>{c.is_active ? 'ACTIVE' : 'INACTIVE'}</span></div><p className="mt-1 text-xs text-[#52645a]">{c.farmerCount} farmers · Added {date(c.created_at)}</p></div><button disabled={busy} onClick={() => void toggleCoop(c)} className={'rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50 ' + (c.is_active ? 'border border-rose-200 text-rose-700' : 'bg-[#174432] text-white')}>{c.is_active ? 'Deactivate' : 'Activate'}</button></article>)}</section>}
          {view === 'settings' && <section className="max-w-2xl rounded-2xl border border-[#ded5c3] bg-[#f8f4eb] p-5"><div className="flex items-start gap-3"><Megaphone className="h-6 w-6 text-[#285b40]"/><div><h3 className="font-bold">Farmer app announcement</h3><p className="text-xs text-[#52645a]">Publish a short notice visible in the farmer app.</p></div></div><textarea rows={4} maxLength={240} value={draft} onChange={e => setDraft(e.target.value)} placeholder="Write a farmer-facing announcement…" className="mt-5 w-full rounded-xl border border-[#ded5c3] bg-white p-3 text-sm"/><div className="mt-2 flex items-center justify-between"><span className="text-xs text-[#52645a]">{draft.length}/240</span><button disabled={busy} onClick={() => void publish()} className="rounded-xl bg-[#174432] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Publishing…' : 'Publish announcement'}</button></div><div className="mt-4 rounded-xl border border-dashed border-[#cfc4ae] bg-white/70 p-3"><p className="text-[10px] font-bold uppercase text-[#52645a]">Live preview</p><p className="mt-2 text-sm">{draft.trim() || 'Your announcement will appear here.'}</p></div><p className="mt-3 text-xs text-[#52645a]">Do not publish passwords, personal data or confidential information.</p></section>}
          {view === 'activity' && <section className="rounded-2xl border border-[#ded5c3] bg-[#f8f4eb] p-4"><h3 className="font-bold">Administrative audit trail</h3><p className="mb-3 text-xs text-[#52645a]">Latest 100 actions performed through this console.</p>{activity.length ? activity.map(a => <div key={a.id} className="border-t border-[#e5dccb] py-3"><div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-semibold">{a.action.replaceAll('_',' ')}</p><span className="text-xs text-[#52645a]">{date(a.created_at)}</span></div><p className="mt-1 text-xs text-[#52645a]">{a.target_type}{a.target_id ? ' · ' + a.target_id : ''}</p></div>) : <p className="py-6 text-center text-sm text-[#52645a]">No admin actions recorded yet.</p>}</section>}
        </>}
      </main>
    </div></div><footer className="mx-auto max-w-7xl px-4 pb-6 text-xs text-[#52645a] sm:px-6"><ShieldCheck className="mr-1 inline h-3 w-3"/>Server-verified administrator access</footer></div>;
}
