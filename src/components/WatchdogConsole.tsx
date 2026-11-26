import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, ExternalLink, Loader2, RefreshCw, Rss, ShieldCheck } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

type Source = { id:string; source_key:string; name:string; source_kind:string; homepage_url:string; feed_url:string|null; api_base_url:string|null; access_method:string; access_status:string; commercial_use_notes:string|null; enabled:boolean; last_checked_at:string|null; last_success_at:string|null; last_error:string|null };
type Item = { id:string; source_id:string|null; source_name:string; title:string; summary:string|null; canonical_url:string; category:string; geography_scope:string; region:string|null; district:string|null; affected_crops:string[]; affected_livestock:string[]; published_at:string|null; verification_status:string; expires_at:string|null; confidence:number|null; metadata:Record<string,unknown> };
const categories = ['threat','news','opportunity','market','research','environment'];
const scopes = ['global','national','region','district','local'];
const input = 'mt-1 w-full rounded-xl border border-[#ded5c3] bg-white px-3 py-2.5 text-sm text-[#1d2d27]';
const label = 'block text-xs font-semibold text-[#52645a]';

export default function WatchdogConsole({ session }: { session: Session }) {
  const [sources,setSources] = useState<Source[]>([]);
  const [items,setItems] = useState<Item[]>([]);
  const [selected,setSelected] = useState<string>('');
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [feedDrafts,setFeedDrafts] = useState<Record<string,string>>({});
  const [apiDrafts,setApiDrafts] = useState<Record<string,string>>({});
  const [permissionDrafts,setPermissionDrafts] = useState<Record<string,string>>({});
  const [enabledDrafts,setEnabledDrafts] = useState<Record<string,boolean>>({});
  const [permissionNotes,setPermissionNotes] = useState<Record<string,string>>({});
  const [category,setCategory] = useState('news');
  const [scope,setScope] = useState('national');
  const [region,setRegion] = useState('');
  const [district,setDistrict] = useState('');
  const [localArea,setLocalArea] = useState('');
  const [summary,setSummary] = useState('');
  const [crops,setCrops] = useState('');
  const [livestock,setLivestock] = useState('');
  const [verificationNotes,setVerificationNotes] = useState('');
  const [confidence,setConfidence] = useState('0.8');
  const [expiresAt,setExpiresAt] = useState('');

  const request = useCallback(async (url:string, init:RequestInit = {}) => {
    const headers = new Headers(init.headers);
    headers.set('Authorization','Bearer '+session.access_token);
    headers.set('Content-Type','application/json');
    const response = await fetch(url,{...init,headers,cache:'no-store'});
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    return data;
  },[session.access_token]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await request('/api/watchdog/review');
      setSources(data.sources || []); setItems(data.items || []);
      setFeedDrafts(Object.fromEntries((data.sources || []).map((s:Source)=>[s.id,s.feed_url || ''])));
      setApiDrafts(Object.fromEntries((data.sources || []).map((s:Source)=>[s.id,s.api_base_url || (s.source_key==='nasa_earthdata'?'https://eonet.gsfc.nasa.gov/api/v3':'')])));
      setPermissionDrafts(Object.fromEntries((data.sources || []).map((s:Source)=>[s.id,s.access_status])));
      setEnabledDrafts(Object.fromEntries((data.sources || []).map((s:Source)=>[s.id,s.enabled])));
      setPermissionNotes(Object.fromEntries((data.sources || []).map((s:Source)=>[s.id,s.commercial_use_notes || ''])));
      if (selected && !(data.items || []).some((item:Item)=>item.id===selected)) setSelected('');
    } catch(e) { setError(e instanceof Error?e.message:'Could not load Watchdog review data.'); }
    finally { setLoading(false); }
  },[request,selected]);

  useEffect(()=>{void load();},[load]);
  const current = useMemo(()=>items.find(item=>item.id===selected)||null,[items,selected]);
  useEffect(()=>{
    if (!current) return;
    setCategory(current.category); setScope(current.geography_scope);
    setRegion(current.region || ''); setDistrict(current.district || '');
    setSummary(current.summary || ''); setCrops((current.affected_crops||[]).join(', '));
    setLivestock((current.affected_livestock||[]).join(', '));
    setConfidence(String(current.confidence ?? 0.8)); setExpiresAt(current.expires_at ? current.expires_at.slice(0,16) : '');
    setLocalArea(typeof current.metadata?.local_area==='string'?current.metadata.local_area:'');
    setVerificationNotes('');
  },[selected]);

  const saveSource = async (source:Source) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const data=await request('/api/watchdog/review',{method:'PATCH',body:JSON.stringify({action:'update-source',sourceId:source.id,feedUrl:feedDrafts[source.id]||'',apiBaseUrl:apiDrafts[source.id]||'',accessStatus:permissionDrafts[source.id],enabled:enabledDrafts[source.id],commercialUseNotes:permissionNotes[source.id]||''})});
      setSources(current=>current.map(item=>item.id===source.id?data.source:item));
      setNotice(source.name+' settings saved.'); 
    } catch(e) {setError(e instanceof Error?e.message:'Could not save source.');}
    finally {setBusy(false);}
  };

  const collect = async () => {
    setBusy(true); setError(''); setNotice('');
    try { const data=await request('/api/watchdog/ingest',{method:'POST',body:'{}'}); setNotice(`Collection complete: ${data.checked} sources checked, ${data.inserted} new items, ${data.duplicates} duplicates, ${data.failed} failed.`); await load(); }
    catch(e){setError(e instanceof Error?e.message:'Collection failed.');}
    finally{setBusy(false);}
  };

  const publish = async () => {
    if (!current) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const data=await request('/api/watchdog/publish',{method:'POST',body:JSON.stringify({
        itemId:current.id,category,geographyScope:scope,region,district,localArea,summary,
        affectedCrops:crops.split(',').map(v=>v.trim()).filter(Boolean),
        affectedLivestock:livestock.split(',').map(v=>v.trim()).filter(Boolean),
        verificationNotes,confidence:Number(confidence),expiresAt:expiresAt?new Date(expiresAt).toISOString():undefined
      })});
      setNotice(`Published successfully. ${data.notificationsCreated} farm notifications created.`);
      setSelected(''); await load();
    } catch(e){setError(e instanceof Error?e.message:'Could not publish this item.');}
    finally{setBusy(false);}
  };

  const statusStyle=(status:string)=>status==='approved'?'bg-[#e4efdf] text-[#285b40]':status==='permission_pending'||status==='blocked'?'bg-rose-100 text-rose-700':'bg-[#f5ebd2] text-[#80602b]';
  if(loading) return <div className="rounded-2xl border border-[#ded5c3] bg-[#f8f4eb] p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[#285b40]"/><p className="mt-3 text-sm text-[#52645a]">Loading source registry and review queue…</p></div>;

  return <div className="space-y-6">
    <section className="rounded-2xl border border-[#ded5c3] bg-[#f8f4eb] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Rss className="h-5 w-5 text-[#285b40]"/><h3 className="text-lg font-bold">Information sources</h3></div><p className="mt-1 text-xs text-[#52645a]">Only enable feeds after checking the publisher's permission, endpoint and commercial reuse terms.</p></div><button onClick={()=>void collect()} disabled={busy||!sources.some(s=>s.enabled&&s.access_status==='approved'&&(s.access_method==='rss'?s.feed_url:s.api_base_url))} className="inline-flex items-center gap-2 rounded-xl bg-[#174432] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40"><Rss className="h-4 w-4"/>{busy?'Working…':'Collect approved sources'}</button></div>
      <div className="mt-4 grid gap-3 xl:grid-cols-2">{sources.map(source=><article key={source.id} className="rounded-xl border border-[#e5dccb] bg-white/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="font-bold">{source.name}</h4><p className="text-[10px] uppercase tracking-wide text-[#879188]">{source.source_kind.replaceAll('_',' ')} · {source.access_method}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyle(source.access_status)}`}>{source.access_status.replaceAll('_',' ')}</span></div>
        {source.access_method==='rss' ? <div className="mt-3"><label className={label}>Approved RSS feed URL<input value={feedDrafts[source.id]??''} onChange={e=>setFeedDrafts(v=>({...v,[source.id]:e.target.value}))} placeholder="https://publisher.example/feed.xml" className={input}/></label></div> : <div className="mt-3"><label className={label}>Official API base URL<input value={apiDrafts[source.id]??''} onChange={e=>setApiDrafts(v=>({...v,[source.id]:e.target.value}))} placeholder={source.source_key==='nasa_earthdata'?'https://eonet.gsfc.nasa.gov/api/v3':'Official API base URL'} className={input}/></label><p className="mt-1 text-[10px] text-[#879188]">Only approved provider domains and documented endpoints are accepted.</p></div>}
        <label className={label+' mt-3'}>Permission / licence basis<textarea rows={2} maxLength={1200} value={permissionNotes[source.id]??''} onChange={e=>setPermissionNotes(v=>({...v,[source.id]:e.target.value}))} placeholder="Record the open-data licence, publisher permission, terms checked and date…" className={input}/></label>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]"><label className={label}>Access permission<select value={permissionDrafts[source.id]||source.access_status} onChange={e=>setPermissionDrafts(v=>({...v,[source.id]:e.target.value}))} className={input}><option value="review_required">Review required</option><option value="permission_pending">Permission pending</option><option value="approved">Approved</option><option value="blocked">Blocked</option></select></label><label className="flex items-end gap-2 pb-2 text-xs font-semibold text-[#52645a]"><input type="checkbox" checked={!!enabledDrafts[source.id]} onChange={e=>setEnabledDrafts(v=>({...v,[source.id]:e.target.checked}))}/> Enable source</label></div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] text-[#879188]">{source.last_success_at?'Last successful: '+new Date(source.last_success_at).toLocaleString('en-UG'):source.last_error?'Last error: '+source.last_error:'Not yet collected'} </p><button onClick={()=>void saveSource(source)} disabled={busy} className="rounded-lg border border-[#c9d9c6] px-3 py-2 text-xs font-bold text-[#285b40] disabled:opacity-50">Save source</button></div>
        <a href={source.homepage_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[#52645a] underline">Publisher website <ExternalLink className="h-3 w-3"/></a>
      </article>)}</div>
    </section>

    <section className="rounded-2xl border border-[#ded5c3] bg-[#f8f4eb] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-lg font-bold">Evidence review queue</h3><p className="text-xs text-[#52645a]">New feed entries remain private until reviewed and published.</p></div><button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-xl border border-[#ded5c3] px-3 py-2 text-xs font-semibold"><RefreshCw className="h-4 w-4"/>Refresh</button></div>
      {!items.length?<p className="py-8 text-center text-sm text-[#68756d]">No items awaiting review. Run a collection after approving and enabling a feed.</p>:<div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-2">{items.map(item=><button key={item.id} onClick={()=>setSelected(item.id)} className={`w-full rounded-xl border p-3 text-left ${selected===item.id?'border-[#78977a] bg-[#eaf1e6]':'border-[#e5dccb] bg-white/70'}`}><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold text-[#80602b]">{item.source_name}</span><span className="text-[10px] text-[#879188]">{item.published_at?new Date(item.published_at).toLocaleDateString('en-UG'):'Date missing'}</span></div><p className="mt-2 text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-[#68756d]">{item.verification_status} · {item.category}</p></button>)}</div>
        {current&&<form onSubmit={e=>{e.preventDefault();void publish();}} className="rounded-xl border border-[#e5dccb] bg-white/75 p-4">
          <div className="flex items-start justify-between gap-2"><div><h4 className="font-bold">Review and publish</h4><p className="mt-1 text-xs text-[#68756d]">{current.source_name} · <a className="underline" href={current.canonical_url} target="_blank" rel="noreferrer">Open original</a></p></div><ShieldCheck className="h-5 w-5 text-[#285b40]"/></div>
          <h5 className="mt-3 text-sm font-semibold">{current.title}</h5>
          <label className={label+' mt-4'}>Farmer-facing summary<textarea required minLength={20} maxLength={1200} rows={3} value={summary} onChange={e=>setSummary(e.target.value)} className={input}/></label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className={label}>Category<select value={category} onChange={e=>setCategory(e.target.value)} className={input}>{categories.map(v=><option key={v}>{v}</option>)}</select></label><label className={label}>Geographic coverage<select value={scope} onChange={e=>setScope(e.target.value)} className={input}>{scopes.map(v=><option key={v}>{v}</option>)}</select></label></div>
          {(scope==='region')&&<label className={label+' mt-3'}>Region<input required value={region} onChange={e=>setRegion(e.target.value)} className={input}/></label>}
          {(scope==='district'||scope==='local')&&<label className={label+' mt-3'}>District<input required value={district} onChange={e=>setDistrict(e.target.value)} className={input}/></label>}
          {scope==='local'&&<label className={label+' mt-3'}>Village, parish or subcounty<input required value={localArea} onChange={e=>setLocalArea(e.target.value)} className={input}/></label>}
          <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className={label}>Affected crops (comma-separated)<input value={crops} onChange={e=>setCrops(e.target.value)} placeholder="coffee, maize" className={input}/></label><label className={label}>Affected livestock<input value={livestock} onChange={e=>setLivestock(e.target.value)} placeholder="poultry, cattle" className={input}/></label></div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className={label}>Confidence (0–1)<input type="number" min="0" max="1" step="0.05" value={confidence} onChange={e=>setConfidence(e.target.value)} className={input}/></label><label className={label}>Expiry / review date{category==='opportunity'&&<span className="text-rose-700"> *</span>}<input type="datetime-local" required={category==='opportunity'} value={expiresAt} onChange={e=>setExpiresAt(e.target.value)} className={input}/></label></div>
          <label className={label+' mt-3'}>Verification notes (minimum 20 characters)<textarea required minLength={20} maxLength={1200} value={verificationNotes} onChange={e=>setVerificationNotes(e.target.value)} rows={3} className={input} placeholder="What did you verify, and against which evidence?"/></label>
          <div className="mt-4 flex items-center justify-between gap-2"><p className="text-[10px] text-[#68756d]">Publishing creates farm-matched notifications.</p><button disabled={busy} className="rounded-xl bg-[#174432] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{busy?'Publishing…':'Verify & publish'}</button></div>
        </form>}
      </div>}
    </section>
    {error&&<div role="alert" className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><CircleAlert className="h-4 w-4 shrink-0"/>{error}</div>}
    {notice&&<div role="status" className="flex gap-2 rounded-xl border border-[#c9d9c6] bg-[#e7eddf] p-3 text-sm text-[#174432]"><CheckCircle2 className="h-4 w-4"/>{notice}</div>}
    <p className="text-[11px] leading-5 text-[#68756d]">A source is not automatically trustworthy because it is listed here. Only enable sources after confirming the exact feed and reuse permission. Publishing requires human verification and explicit geographic coverage. Opportunity records require an expiry or review date.</p>
  </div>;
}
