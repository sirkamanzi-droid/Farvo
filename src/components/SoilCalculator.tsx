import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft, Beaker, CheckCircle2, ChevronRight, CircleHelp, ClipboardCheck,
  Droplets, Leaf, Save, Sprout, TestTube2
} from 'lucide-react';

type Mode = 'tested' | 'guided';
type Texture = 'sandy' | 'loamy' | 'clay' | 'unknown';
type Drainage = 'fast' | 'moderate' | 'slow' | 'unknown';
type SavedAssessment = {
  id: string;
  createdAt: string;
  crop: string;
  mode: Mode;
  ph: number | null;
  texture: Texture;
  drainage: Drainage;
  findings: string[];
};

const CROPS = ['Maize', 'Beans', 'Coffee', 'Banana', 'Tomato', 'Potato', 'Cassava', 'Rice'];

function pHInterpretation(ph: number) {
  if (ph < 5.5) return { label: 'Strongly acidic', detail: 'This reading is strongly acidic. Some crops may struggle to access nutrients at this pH.', tone: 'amber' as const };
  if (ph < 6.5) return { label: 'Moderately acidic', detail: 'This reading is moderately acidic. Crop response varies, so compare it with the selected crop and other soil information.', tone: 'amber' as const };
  if (ph <= 7.5) return { label: 'Near neutral', detail: 'This reading is near neutral. It is generally a favourable pH range for many crops, but it does not prove the soil is fertile.', tone: 'green' as const };
  if (ph <= 8.5) return { label: 'Moderately alkaline', detail: 'This reading is moderately alkaline. Some nutrients may become less available to plants.', tone: 'amber' as const };
  return { label: 'Strongly alkaline', detail: 'This reading is strongly alkaline. A laboratory test can help identify the cause and suitable management.', tone: 'rose' as const };
}

function textureText(texture: Texture) {
  const values: Record<Texture, string> = {
    sandy: 'Sandy soil usually drains quickly and may need more frequent, careful water and organic-matter management.',
    loamy: 'Loamy soil often balances drainage and water retention, but its fertility still needs to be assessed separately.',
    clay: 'Clay soil can hold water and nutrients well, but may drain slowly and become difficult to work when wet.',
    unknown: 'Soil texture has not been identified. A local extension worker can help assess it using a simple field test.'
  };
  return values[texture];
}

function drainageText(drainage: Drainage) {
  const values: Record<Drainage, string> = {
    fast: 'Fast drainage can increase the chance of water stress, especially during dry periods.',
    moderate: 'Moderate drainage is often manageable. Continue observing the field after heavy rain.',
    slow: 'Slow drainage can leave roots in waterlogged soil. Check field drainage before planting.',
    unknown: 'Drainage has not been assessed. Observe how long water remains after rainfall.'
  };
  return values[drainage];
}

function cropGuidance(crop: string, ph: number | null, texture: Texture, drainage: Drainage) {
  if (crop === 'Maize') {
    const notes = ['Uganda’s Ministry of Agriculture maize extension manual describes deep, fertile, well-drained loam or sandy-loam soils and gives a pH range of 5.0–7.0.'];
    if (ph !== null && (ph < 5 || ph > 7)) notes.push('Your measured pH is outside that manual’s stated range. Ask an extension worker or soil laboratory to interpret the result before changing the soil.');
    else if (ph !== null) notes.push('Your measured pH falls within that stated range, but pH alone does not confirm that the field is suitable or fertile.');
    if (texture === 'sandy') notes.push('Your sandy-soil observation may be a concern for maize; the manual advises avoiding very sandy soils.');
    if (drainage === 'slow') notes.push('Your slow-drainage observation may be a concern because the manual advises avoiding waterlogged fields for maize.');
    return { text: notes.join(' '), source: 'https://www.agriculture.go.ug/wp-content/uploads/2019/09/Maize-training-manual-for-extension-workers-in-Uganda.pdf' };
  }
  return {
    text: 'Omulimi does not yet have a locally verified crop-specific pH and soil-requirement profile for ' + crop + '. This report therefore shows your measured pH and field observations separately instead of claiming a crop-suitability score. Ask a local extension worker for crop-specific interpretation.',
    source: null as string | null
  };
}

export default function SoilCalculator({ userId, initialCrop, onBack }: {
  userId: string;
  initialCrop: string;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<Mode>('tested');
  const [crop, setCrop] = useState(CROPS.includes(initialCrop) ? initialCrop : 'Maize');
  const [phInput, setPhInput] = useState('');
  const [texture, setTexture] = useState<Texture>('unknown');
  const [drainage, setDrainage] = useState<Drainage>('unknown');
  const [report, setReport] = useState<SavedAssessment | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAssessments, setSavedAssessments] = useState<SavedAssessment[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const loadSaved = async () => {
      // Import reports saved by the previous device-only version before loading cloud history.
      const legacyKey = `omulimi_soil_assessments:${userId}`;
      try {
        const legacyRaw = localStorage.getItem(legacyKey);
        if (legacyRaw) {
          const legacy = JSON.parse(legacyRaw);
          if (Array.isArray(legacy) && legacy.length > 0) {
            const validLegacy = legacy.filter((item: any) =>
              item && typeof item.id === 'string' &&
              CROPS.includes(item.crop) &&
              (item.mode === 'tested' || item.mode === 'guided') &&
              ['sandy', 'loamy', 'clay', 'unknown'].includes(item.texture) &&
              ['fast', 'moderate', 'slow', 'unknown'].includes(item.drainage) &&
              Array.isArray(item.findings) &&
              (item.mode === 'guided'
                ? item.ph === null
                : typeof item.ph === 'number' && Number.isFinite(item.ph) && item.ph >= 0 && item.ph <= 14)
            ).slice(0, 50);
            if (validLegacy.length > 0) {
              const { error: importError } = await supabase.from('soil_assessments').insert(
                validLegacy.map((item: any) => ({
                  id: item.id,
                  user_id: userId,
                  crop: item.crop,
                  mode: item.mode,
                  measured_ph: item.mode === 'tested' ? item.ph : null,
                  texture: item.texture,
                  drainage: item.drainage,
                  findings: item.findings,
                  created_at: item.createdAt
                }))
              );
              if (importError) {
                console.error('Could not migrate older device-saved soil reports:', importError);
              } else {
                localStorage.removeItem(legacyKey);
              }
            } else {
              console.warn('Older device soil reports were not imported because their saved data did not pass validation.');
            }
          } else if (Array.isArray(legacy)) {
            localStorage.removeItem(legacyKey);
          }
        }
      } catch (migrationError) {
        console.error('Could not read older device-saved soil reports:', migrationError);
      }
      const { data, error: loadError } = await supabase
        .from('soil_assessments')
        .select('id, created_at, crop, mode, measured_ph, texture, drainage, findings')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!active) return;
      if (loadError) { console.error('Could not load saved soil assessments:', loadError); return; }
      setSavedAssessments((data || []).map((item: any) => ({
        id: item.id, createdAt: item.created_at, crop: item.crop, mode: item.mode,
        ph: item.measured_ph === null ? null : Number(item.measured_ph),
        texture: item.texture, drainage: item.drainage,
        findings: Array.isArray(item.findings) ? item.findings : []
      })));
    };
    void loadSaved();
    return () => { active = false; };
  }, [userId]);

  const ph = useMemo(() => {
    if (!phInput.trim()) return null;
    const parsed = Number(phInput);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 14 ? parsed : null;
  }, [phInput]);

  const runAssessment = () => {
    setError('');
    setSaved(false);
    if (mode === 'tested' && (ph === null || !phInput.trim())) {
      setError('Enter a valid measured pH value between 0 and 14.');
      return;
    }
    if (mode === 'guided' && texture === 'unknown' && drainage === 'unknown') {
      setError('Choose at least one soil observation to create a guided assessment.');
      return;
    }
    const findings: string[] = [];
    if (ph !== null && mode === 'tested') findings.push(`Measured pH: ${ph.toFixed(1)} — ${pHInterpretation(ph).label.toLowerCase()}.`);
    if (texture !== 'unknown') findings.push(textureText(texture));
    if (drainage !== 'unknown') findings.push(drainageText(drainage));
    setReport({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      crop,
      mode,
      ph: mode === 'tested' ? ph : null,
      texture,
      drainage,
      findings
    });
  };

  const saveReport = async () => {
    if (!report || saving || saved) return;
    setSaving(true);
    setError('');
    try {
      const { data, error: saveError } = await supabase
        .from('soil_assessments')
        .insert({
          id: report.id, user_id: userId, crop: report.crop, mode: report.mode,
          measured_ph: report.ph, texture: report.texture, drainage: report.drainage,
          findings: report.findings
        })
        .select('id, created_at, crop, mode, measured_ph, texture, drainage, findings')
        .single();
      if (saveError) throw saveError;
      const savedItem: SavedAssessment = {
        id: data.id, createdAt: data.created_at, crop: data.crop, mode: data.mode,
        ph: data.measured_ph === null ? null : Number(data.measured_ph),
        texture: data.texture, drainage: data.drainage,
        findings: Array.isArray(data.findings) ? data.findings : []
      };
      setSavedAssessments(current => [savedItem, ...current.filter(item => item.id !== savedItem.id)].slice(0, 50));
      setSaved(true);
    } catch (saveError) {
      console.error('Could not save soil assessment:', saveError);
      setError('Could not save this report to your Omulimi account. Check your connection and try again.');
    } finally { setSaving(false); }
  };

  const reset = () => {
    setReport(null);
    setSaved(false);
    setError('');
  };

  return (
    <div className="px-4 sm:px-6 py-5 pb-8 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} aria-label="Back" className="rounded-xl border border-[#e6dcc8] bg-[#fffdf8] p-2 text-soil-700"><ArrowLeft className="h-4 w-4"/></button>
          <div><h1 className="text-2xl font-bold text-soil-900" style={{fontFamily:'Fraunces, Georgia, serif'}}>Soil check</h1></div>
        </div>
        <button onClick={() => setShowHistory(value => !value)} className="rounded-xl border border-[#e6dcc8] bg-[#fffdf8] px-3 py-2 text-[11px] font-bold text-soil-800">Saved ({savedAssessments.length})</button>
      </div>
      {showHistory && <section className="rounded-2xl border border-[#e6dcc8] bg-[#fffdf8] p-4 space-y-3">
        <h2 className="text-sm font-bold text-soil-900">Your saved soil reports</h2>
        {savedAssessments.length === 0 ? <p className="text-xs text-soil-600">You have no saved soil reports yet.</p> : savedAssessments.map(item => <div key={item.id} className="flex items-center justify-between gap-3 border-b border-[#eee5d5] pb-2 last:border-0 last:pb-0">
          <div><p className="text-xs font-bold text-soil-900">{item.crop} field</p><p className="text-[10px] text-soil-500">{item.mode === 'tested' ? 'Soil-test' : 'Guided'} · {new Date(item.createdAt).toLocaleDateString()}</p></div>
          <span className="text-xs font-semibold text-soil-700">{item.ph === null ? 'No pH reading' : 'pH ' + item.ph.toFixed(1)}</span>
        </div>)}
      </section>}

      <section className="rounded-2xl border border-[#e6dcc8] bg-[#fffdf8] p-4">
        <div className="flex items-start gap-3"><div className="rounded-xl bg-leaf-100 p-2.5 text-leaf-700"><Sprout className="h-5 w-5"/></div><div><h2 className="text-sm font-bold text-soil-900">Soil check</h2><p className="mt-1 text-xs leading-relaxed text-soil-600">Use a soil-test reading or describe what you observe in your field. The result is guidance, not a laboratory diagnosis.</p></div></div>
      </section>

      {!report ? <>
        <section className="space-y-2">
          <label className="block text-xs font-bold text-soil-800">Crop</label>
          <select value={crop} onChange={e=>setCrop(e.target.value)} className="w-full rounded-xl border border-[#ded3bf] bg-[#fffdf8] p-3 text-sm text-soil-900 focus:outline-none focus:ring-2 focus:ring-leaf-600">{CROPS.map(item=><option key={item}>{item}</option>)}</select>
        </section>

        <section className="space-y-3">
          <div><label className="block text-xs font-bold text-soil-800">How will you assess your soil?</label><p className="mt-1 text-[11px] text-soil-500">Choose a soil test or describe your field.</p></div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={()=>{setMode('tested');setError('');}} className={`rounded-xl border p-3 text-left ${mode==='tested'?'border-leaf-700 bg-leaf-100':'border-[#e6dcc8] bg-white'}`}><TestTube2 className="h-5 w-5 text-leaf-700"/><span className="mt-2 block text-xs font-bold text-soil-900">I have a pH reading</span><span className="mt-1 block text-[10px] text-soil-600">Enter your pH and observations</span></button>
            <button onClick={()=>{setMode('guided');setError('');}} className={`rounded-xl border p-3 text-left ${mode==='guided'?'border-leaf-700 bg-leaf-100':'border-[#e6dcc8] bg-white'}`}><CircleHelp className="h-5 w-5 text-leaf-700"/><span className="mt-2 block text-xs font-bold text-soil-900">No pH test</span><span className="mt-1 block text-[10px] text-soil-600">Use what you observe</span></button>
          </div>
        </section>

        {mode==='tested' && <section className="rounded-2xl bg-[#faf7ef] p-4 space-y-2">
          <label className="block text-xs font-bold text-soil-800" htmlFor="soil-ph">Soil pH reading</label>
          <p className="text-[11px] text-soil-500">Enter the pH from your test.</p>
          <div className="flex items-center gap-2"><input id="soil-ph" type="number" min="0" max="14" step="0.1" inputMode="decimal" value={phInput} onChange={e=>setPhInput(e.target.value)} placeholder="e.g. 5.8" className="min-w-0 flex-1 rounded-xl border border-[#ded3bf] bg-[#faf7ef] p-3 text-lg font-bold text-soil-900 outline-none focus:ring-2 focus:ring-leaf-600"/><span className="text-xs text-soil-500">pH / 14</span></div>
          <p className="text-[10px] text-soil-500">pH does not measure all nutrients.</p>
        </section>}

        <section className="rounded-2xl bg-[#faf7ef] p-4 space-y-4">
          <div><label className="block text-xs font-bold text-soil-800">Soil texture</label><p className="mt-1 text-[10px] text-soil-500">Choose the closest match.</p>
            <div className="mt-2 grid grid-cols-2 gap-2">{([{value:'sandy',label:'Sandy'},{value:'loamy',label:'Loamy'},{value:'clay',label:'Clay'},{value:'unknown',label:'Not sure'}] as const).map(item=><button key={item.value} onClick={()=>setTexture(item.value)} className={`rounded-lg border px-3 py-3 text-left text-sm font-medium ${texture===item.value?'border-leaf-700 bg-leaf-100 text-leaf-800':'border-[#e6dcc8] bg-white text-soil-700'}`}>{item.label}</button>)}</div>
          </div>
          <div><label className="block text-xs font-bold text-soil-800">Drainage</label><div className="mt-2 space-y-2">{([{value:'fast',label:'Water drains away quickly'},{value:'moderate',label:'Water drains at a moderate rate'},{value:'slow',label:'Water remains for a long time'},{value:'unknown',label:'I have not observed'}] as const).map(item=><button key={item.value} onClick={()=>setDrainage(item.value)} className={`w-full rounded-lg border px-3 py-3 text-left text-sm ${drainage===item.value?'border-leaf-700 bg-leaf-100 text-leaf-800':'border-[#e6dcc8] bg-white text-soil-700'}`}>{item.label}</button>)}</div></div>
        </section>

        {error&&<p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
        <button onClick={runAssessment} className="w-full rounded-xl bg-leaf-700 px-4 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-leaf-800">Assess my soil <ChevronRight className="ml-1 inline h-4 w-4"/></button>
      </> : <section className="space-y-4">
        <div className="rounded-2xl border border-[#e6dcc8] bg-[#fffdf8] p-4">
          <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-leaf-700"><ClipboardCheck className="h-5 w-5"/><span className="text-xs font-bold">Your soil assessment</span></div><span className="rounded-full bg-[#f0eadb] px-2 py-1 text-[9px] font-semibold text-soil-600">{report.mode==='tested'?'Soil-test mode':'Guided mode'}</span></div>
          <h2 className="mt-3 text-2xl font-bold text-soil-900" style={{fontFamily:'Fraunces, Georgia, serif'}}>{report.crop} field</h2>
          <p className="mt-1 text-[10px] text-soil-500">Created {new Date(report.createdAt).toLocaleString()}</p>
          {report.ph!==null && <div className="mt-4 rounded-xl bg-[#f7f1e5] p-3"><div className="flex items-center justify-between"><span className="text-xs font-bold text-soil-800">Measured soil pH</span><span className="text-xl font-bold text-soil-900">{report.ph.toFixed(1)}</span></div><p className="mt-1 text-xs font-bold text-soil-800">{pHInterpretation(report.ph).label}</p><p className="mt-1 text-xs leading-relaxed text-soil-600">{pHInterpretation(report.ph).detail}</p></div>}
          <div className="mt-4 space-y-3"><h3 className="text-xs font-bold text-soil-900">What your observations suggest</h3>
            <div className="rounded-xl bg-[#f7f1e5] p-3"><h3 className="text-xs font-bold text-soil-900">Crop guidance: {report.crop}</h3><p className="mt-1 text-xs leading-relaxed text-soil-700">{cropGuidance(report.crop, report.ph, report.texture, report.drainage).text}</p>{cropGuidance(report.crop, report.ph, report.texture, report.drainage).source && <a className="mt-2 inline-block text-[10px] font-semibold text-leaf-700 underline" href={cropGuidance(report.crop, report.ph, report.texture, report.drainage).source!} target="_blank" rel="noreferrer">Source: Uganda Ministry of Agriculture maize extension manual</a>}</div>{report.texture!=='unknown'&&<div className="flex gap-2"><Leaf className="mt-0.5 h-4 w-4 shrink-0 text-leaf-700"/><p className="text-xs leading-relaxed text-soil-700">{textureText(report.texture)}</p></div>}{report.drainage!=='unknown'&&<div className="flex gap-2"><Droplets className="mt-0.5 h-4 w-4 shrink-0 text-blue-700"/><p className="text-xs leading-relaxed text-soil-700">{drainageText(report.drainage)}</p></div>}{report.mode==='guided'&&<p className="text-xs leading-relaxed text-soil-700">This is a preliminary field assessment. It cannot determine soil pH, nutrient levels or exact crop suitability.</p>}</div>
        </div>
        <div className="rounded-2xl border border-[#e6dcc8] bg-[#fffdf8] p-4"><h3 className="text-xs font-bold text-soil-900">Recommended next steps</h3><ul className="mt-2 list-disc space-y-2 pl-4 text-xs leading-relaxed text-soil-700"><li>For a reliable nutrient and pH picture, take a representative soil sample for laboratory testing.</li><li>Use the crop-specific advice from a local extension officer before applying lime or fertiliser.</li><li>Keep observing the field, especially drainage after rainfall.</li></ul></div>
        <div className="rounded-xl border border-[#e6dcc8] bg-[#f8f4eb] p-3 text-[10px] leading-relaxed text-soil-600">This assessment uses the information you supplied. It does not measure nutrients, diagnose soil diseases or guarantee that a field is suitable for a crop.</div>
        {error&&<p role="alert" className="text-xs text-rose-700">{error}</p>}
        <div className="grid grid-cols-2 gap-2"><button onClick={() => void saveReport()} disabled={saved || saving} className="rounded-xl bg-leaf-700 px-3 py-3 text-xs font-bold text-white disabled:opacity-70">{saved?<><CheckCircle2 className="mr-1 inline h-4 w-4"/>Saved to account</>:saving?'Saving…':<><Save className="mr-1 inline h-4 w-4"/>Save report</>}</button><button onClick={reset} className="rounded-xl border border-[#d9cfbc] bg-[#fffdf8] px-3 py-3 text-xs font-bold text-soil-800">New assessment</button></div>
      </section>}
    </div>
  );
}
