import React, { useMemo, useState } from 'react';
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
const STORAGE_KEY = (userId: string) => `omulimi_soil_assessments:${userId}`;

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
  const [error, setError] = useState('');

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

  const saveReport = () => {
    if (!report) return;
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY(userId)) || '[]');
      const list = Array.isArray(existing) ? existing : [];
      localStorage.setItem(STORAGE_KEY(userId), JSON.stringify([report, ...list].slice(0, 50)));
      setSaved(true);
    } catch {
      setError('This device could not save the report. Check available browser storage and try again.');
    }
  };

  const reset = () => {
    setReport(null);
    setSaved(false);
    setError('');
  };

  return (
    <div className="px-4 sm:px-6 py-5 pb-8 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} aria-label="Back" className="rounded-xl border border-[#e6dcc8] bg-[#fffdf8] p-2 text-soil-700"><ArrowLeft className="h-4 w-4"/></button>
        <div><p className="text-[10px] font-bold uppercase tracking-wide text-leaf-700">Omulimi farm tools</p><h1 className="text-2xl font-bold text-soil-900" style={{fontFamily:'Fraunces, Georgia, serif'}}>Soil calculator</h1></div>
      </div>

      <section className="rounded-2xl border border-[#e6dcc8] bg-[#fffdf8] p-4">
        <div className="flex items-start gap-3"><div className="rounded-xl bg-leaf-100 p-2.5 text-leaf-700"><Sprout className="h-5 w-5"/></div><div><h2 className="text-sm font-bold text-soil-900">Understand your soil before planting</h2><p className="mt-1 text-xs leading-relaxed text-soil-600">Use a soil-test reading or describe what you observe in your field. The result is guidance, not a laboratory diagnosis.</p></div></div>
      </section>

      {!report ? <>
        <section className="space-y-2">
          <label className="block text-xs font-bold text-soil-800">1. What crop are you planning to grow?</label>
          <select value={crop} onChange={e=>setCrop(e.target.value)} className="w-full rounded-xl border border-[#ded3bf] bg-[#fffdf8] p-3 text-sm text-soil-900 focus:outline-none focus:ring-2 focus:ring-leaf-600">{CROPS.map(item=><option key={item}>{item}</option>)}</select>
        </section>

        <section className="space-y-3">
          <div><label className="block text-xs font-bold text-soil-800">2. Choose your assessment method</label><p className="mt-1 text-[11px] text-soil-500">You can create an assessment with or without a pH test.</p></div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={()=>{setMode('tested');setError('');}} className={`rounded-xl border p-3 text-left ${mode==='tested'?'border-leaf-700 bg-leaf-50':'border-[#e6dcc8] bg-[#fffdf8]'}`}><TestTube2 className="h-5 w-5 text-leaf-700"/><span className="mt-2 block text-xs font-bold text-soil-900">I have a soil test</span><span className="mt-1 block text-[10px] text-soil-600">Enter measured pH and observations</span></button>
            <button onClick={()=>{setMode('guided');setError('');}} className={`rounded-xl border p-3 text-left ${mode==='guided'?'border-leaf-700 bg-leaf-50':'border-[#e6dcc8] bg-[#fffdf8]'}`}><CircleHelp className="h-5 w-5 text-leaf-700"/><span className="mt-2 block text-xs font-bold text-soil-900">Guide me</span><span className="mt-1 block text-[10px] text-soil-600">Use field observations only</span></button>
          </div>
        </section>

        {mode==='tested' && <section className="rounded-2xl border border-[#e6dcc8] bg-[#fffdf8] p-4 space-y-2">
          <label className="block text-xs font-bold text-soil-800" htmlFor="soil-ph">Soil pH reading</label>
          <p className="text-[11px] text-soil-500">Enter the number shown by your soil test or pH meter. Do not guess.</p>
          <div className="flex items-center gap-2"><input id="soil-ph" type="number" min="0" max="14" step="0.1" inputMode="decimal" value={phInput} onChange={e=>setPhInput(e.target.value)} placeholder="e.g. 5.8" className="min-w-0 flex-1 rounded-xl border border-[#ded3bf] bg-[#faf7ef] p-3 text-lg font-bold text-soil-900 outline-none focus:ring-2 focus:ring-leaf-600"/><span className="text-xs text-soil-500">pH / 14</span></div>
          <p className="text-[10px] text-soil-500">pH describes acidity or alkalinity. It does not measure all soil nutrients.</p>
        </section>}

        <section className="rounded-2xl border border-[#e6dcc8] bg-[#fffdf8] p-4 space-y-4">
          <div><label className="block text-xs font-bold text-soil-800">3. What does your soil feel like?</label><p className="mt-1 text-[10px] text-soil-500">Choose the closest description. Select “Not sure” if you cannot tell.</p>
            <div className="mt-2 grid grid-cols-2 gap-2">{([{value:'sandy',label:'Sandy'},{value:'loamy',label:'Loamy'},{value:'clay',label:'Clay'},{value:'unknown',label:'Not sure'}] as const).map(item=><button key={item.value} onClick={()=>setTexture(item.value)} className={`rounded-lg border px-3 py-2.5 text-left text-xs font-semibold ${texture===item.value?'border-leaf-700 bg-leaf-50 text-leaf-800':'border-[#e6dcc8] text-soil-700'}`}>{item.label}</button>)}</div>
          </div>
          <div><label className="block text-xs font-bold text-soil-800">4. What happens after heavy rain?</label><div className="mt-2 space-y-2">{([{value:'fast',label:'Water drains away quickly'},{value:'moderate',label:'Water drains at a moderate rate'},{value:'slow',label:'Water remains for a long time'},{value:'unknown',label:'I have not observed'}] as const).map(item=><button key={item.value} onClick={()=>setDrainage(item.value)} className={`w-full rounded-lg border px-3 py-2.5 text-left text-xs ${drainage===item.value?'border-leaf-700 bg-leaf-50 text-leaf-800':'border-[#e6dcc8] text-soil-700'}`}>{item.label}</button>)}</div></div>
        </section>

        {error&&<p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
        <button onClick={runAssessment} className="w-full rounded-xl bg-leaf-700 px-4 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-leaf-800">Assess my soil <ChevronRight className="ml-1 inline h-4 w-4"/></button>
      </> : <section className="space-y-4">
        <div className="rounded-2xl border border-[#e6dcc8] bg-[#fffdf8] p-4">
          <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-leaf-700"><ClipboardCheck className="h-5 w-5"/><span className="text-xs font-bold">Your soil assessment</span></div><span className="rounded-full bg-[#f0eadb] px-2 py-1 text-[9px] font-semibold text-soil-600">{report.mode==='tested'?'Soil-test mode':'Guided mode'}</span></div>
          <h2 className="mt-3 text-2xl font-bold text-soil-900" style={{fontFamily:'Fraunces, Georgia, serif'}}>{report.crop} field</h2>
          <p className="mt-1 text-[10px] text-soil-500">Created {new Date(report.createdAt).toLocaleString()}</p>
          {report.ph!==null && <div className="mt-4 rounded-xl bg-[#f7f1e5] p-3"><div className="flex items-center justify-between"><span className="text-xs font-bold text-soil-800">Measured soil pH</span><span className="text-xl font-bold text-soil-900">{report.ph.toFixed(1)}</span></div><p className="mt-1 text-xs font-bold text-soil-800">{pHInterpretation(report.ph).label}</p><p className="mt-1 text-xs leading-relaxed text-soil-600">{pHInterpretation(report.ph).detail}</p></div>}
          <div className="mt-4 space-y-3"><h3 className="text-xs font-bold text-soil-900">What your observations suggest</h3>{report.texture!=='unknown'&&<div className="flex gap-2"><Leaf className="mt-0.5 h-4 w-4 shrink-0 text-leaf-700"/><p className="text-xs leading-relaxed text-soil-700">{textureText(report.texture)}</p></div>}{report.drainage!=='unknown'&&<div className="flex gap-2"><Droplets className="mt-0.5 h-4 w-4 shrink-0 text-blue-700"/><p className="text-xs leading-relaxed text-soil-700">{drainageText(report.drainage)}</p></div>}{report.mode==='guided'&&<p className="text-xs leading-relaxed text-soil-700">This is a preliminary field assessment. It cannot determine soil pH, nutrient levels or exact crop suitability.</p>}</div>
        </div>
        <div className="rounded-2xl border border-[#e6dcc8] bg-[#fffdf8] p-4"><h3 className="text-xs font-bold text-soil-900">Recommended next steps</h3><ul className="mt-2 list-disc space-y-2 pl-4 text-xs leading-relaxed text-soil-700"><li>For a reliable nutrient and pH picture, take a representative soil sample for laboratory testing.</li><li>Use the crop-specific advice from a local extension officer before applying lime or fertiliser.</li><li>Keep observing the field, especially drainage after rainfall.</li></ul></div>
        <div className="rounded-xl border border-[#e6dcc8] bg-[#f8f4eb] p-3 text-[10px] leading-relaxed text-soil-600">This assessment uses the information you supplied. It does not measure nutrients, diagnose soil diseases or guarantee that a field is suitable for a crop.</div>
        {error&&<p role="alert" className="text-xs text-rose-700">{error}</p>}
        <div className="grid grid-cols-2 gap-2"><button onClick={saveReport} disabled={saved} className="rounded-xl bg-leaf-700 px-3 py-3 text-xs font-bold text-white disabled:opacity-70">{saved?<><CheckCircle2 className="mr-1 inline h-4 w-4"/>Saved on this device</>:<><Save className="mr-1 inline h-4 w-4"/>Save report</>}</button><button onClick={reset} className="rounded-xl border border-[#d9cfbc] bg-[#fffdf8] px-3 py-3 text-xs font-bold text-soil-800">New assessment</button></div>
      </section>}
    </div>
  );
}
