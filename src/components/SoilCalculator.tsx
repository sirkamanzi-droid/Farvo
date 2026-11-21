import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, CheckCircle2, ChevronRight, CloudRain, Compass, Droplets, FlaskConical, MapPin, Save, Sprout, Thermometer, Loader2, RefreshCw } from 'lucide-react';

type Mode = 'tested' | 'guided';
type Texture = 'sandy' | 'loamy' | 'clay' | 'unknown';
type Drainage = 'fast' | 'moderate' | 'slow' | 'unknown';
type WeatherSnapshot = {
  current?: { soilTemperature?: number | null; soilMoisture?: number | null; rainfall?: number | null; temperature?: number | null; time?: string };
  daily?: Array<{ date: string; precipitation?: number | null; maxTemp?: number | null; minTemp?: number | null }>;
};
type SavedAssessment = {
  id: string; createdAt: string; crop: string; mode: Mode; ph: number | null;
  texture: Texture; drainage: Drainage; findings: string[]; locationLabel: string;
  latitude: number | null; longitude: number | null; aiReport: string | null; weatherSnapshot: WeatherSnapshot | null;
};

const CROPS = ['Maize', 'Beans', 'Coffee', 'Banana', 'Tomato', 'Potato', 'Cassava', 'Rice'];
const textureLabels: Record<Texture, string> = { sandy: 'Sandy', loamy: 'Loamy', clay: 'Clay', unknown: 'Not sure' };
const drainageLabels: Record<Drainage, string> = { fast: 'Drains quickly', moderate: 'Drains moderately', slow: 'Holds water for long', unknown: 'Not observed' };

function pHLabel(ph: number) {
  if (ph < 5.5) return 'Acidic';
  if (ph < 6.5) return 'Slightly acidic';
  if (ph <= 7.5) return 'Near neutral';
  if (ph <= 8.5) return 'Alkaline';
  return 'Strongly alkaline';
}

async function streamKatoReport(input: {
  token: string; crop: string; location: string; weather: WeatherSnapshot;
  ph: number | null; texture: Texture; drainage: Drainage; locationPrecision: string;
}) {
  const prompt = [
    'Create a concise, practical Soil Intelligence report for a smallholder farmer in Uganda.',
    'Separate confirmed farmer-provided information from weather-model estimates.',
    'Never infer or invent pH, nitrogen, phosphorus, potassium, organic matter, soil type or nutrient levels from coordinates or weather.',
    'If a measured pH is supplied, label it as farmer-entered test reading, not independently verified.',
    'Texture and drainage are farmer observations, not laboratory measurements.',
    'Open-Meteo soil temperature and soil moisture are regional model estimates, not direct measurements at the plot. Explain this limitation.',
    'Give cautious crop and soil-management guidance for the selected crop. Do not prescribe fertiliser, lime or chemical rates without soil-test evidence.',
    'Include: FARM SNAPSHOT, WHAT THE DATA SAYS, WHAT WE CANNOT CONFIRM, PRACTICAL NEXT STEPS, WEATHER WATCH.',
    'Use simple English and short bullets. Never promise yield or profit.',
    `Selected crop: ${input.crop}. Farm location entered by farmer: ${input.location}. Coordinate precision: ${input.locationPrecision}. Do not describe district-centre weather as plot-level weather.`,
    `Measured pH entered by farmer: ${input.ph === null ? 'not supplied' : input.ph}.`,
    `Farmer-observed texture: ${textureLabels[input.texture]}; drainage: ${drainageLabels[input.drainage]}.`,
    `Weather and soil model response: ${JSON.stringify(input.weather)}.`,
  ].join('\n');
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${input.token}` },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      cropName: input.crop,
      districtName: input.location,
      weatherDistrictName: input.location,
      weatherContext: input.weather,
    }),
  });
  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => '');
    throw new Error(body.slice(0, 250) || 'Kato could not prepare the soil report.');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';
  let completed = false;
  const consume = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as { text?: string; done?: boolean; error?: string };
    if (event.error) throw new Error(event.error);
    if (typeof event.text === 'string') answer += event.text;
    if (event.done) completed = true;
  };
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    lines.forEach(consume);
  }
  buffer += decoder.decode();
  if (buffer.trim()) consume(buffer);
  if (!completed || !answer.trim()) throw new Error('Kato did not finish the soil report. Please try again.');
  return answer.trim();
}

export default function SoilCalculator({ userId, initialCrop, initialLatitude, initialLongitude, initialLocation, onBack }: {
  userId: string; initialCrop: string; initialLatitude: number; initialLongitude: number;
  initialLocation: string; onBack: () => void;
}) {
  const [crop, setCrop] = useState(CROPS.includes(initialCrop) ? initialCrop : 'Maize');
  const [locationLabel, setLocationLabel] = useState(initialLocation);
  const [latitude, setLatitude] = useState(initialLatitude);
  const [longitude, setLongitude] = useState(initialLongitude);
  const [usingExactLocation, setUsingExactLocation] = useState(false);
  const [phInput, setPhInput] = useState('');
  const [texture, setTexture] = useState<Texture>('unknown');
  const [drainage, setDrainage] = useState<Drainage>('unknown');
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [aiReport, setAiReport] = useState('');
  const [reportLocation, setReportLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [savedAssessments, setSavedAssessments] = useState<SavedAssessment[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedSaved, setSelectedSaved] = useState<SavedAssessment | null>(null);

  const measuredPH = useMemo(() => {
    if (!phInput.trim()) return null;
    const value = Number(phInput);
    return Number.isFinite(value) && value >= 0 && value <= 14 ? value : null;
  }, [phInput]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data, error: loadError } = await supabase.from('soil_assessments')
        .select('id,created_at,crop,mode,measured_ph,texture,drainage,findings,location_label,latitude,longitude,ai_report,weather_snapshot')
        .eq('user_id', userId).order('created_at', { ascending: false }).limit(30);
      if (!active || loadError) {
        if (loadError) console.warn('Could not load soil reports:', loadError.message);
        return;
      }
      setSavedAssessments((data || []).map((row: any) => ({
        id: row.id, createdAt: row.created_at, crop: row.crop, mode: row.mode,
        ph: row.measured_ph === null ? null : Number(row.measured_ph),
        texture: row.texture, drainage: row.drainage,
        findings: Array.isArray(row.findings) ? row.findings : [],
        locationLabel: row.location_label || 'Farm location not recorded',
        latitude: row.latitude === null ? null : Number(row.latitude),
        longitude: row.longitude === null ? null : Number(row.longitude),
        aiReport: row.ai_report || null, weatherSnapshot: row.weather_snapshot || null,
      })));
    };
    void load();
    return () => { active = false; };
  }, [userId]);

  const useMyLocation = () => {
    if (!navigator.geolocation) { setError('Location is not available on this device.'); return; }
    setError('');
    navigator.geolocation.getCurrentPosition(
      position => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setUsingExactLocation(true);
        setLocationLabel(current => current.trim() || 'My farm location');
      },
      () => setError('Location permission was not granted. You can continue with your selected farm district.'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const createReport = async () => {
    setError('');
    setSaved(false);
    setAiReport('');
    setWeather(null);
    setSelectedSaved(null);
    if (!locationLabel.trim()) { setError('Enter the farm village, parish or area.'); return; }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) { setError('Farm coordinates are not valid.'); return; }
    if (phInput.trim() && measuredPH === null) { setError('Enter a valid pH reading between 0 and 14.'); return; }
    setLoading(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (sessionError || !token) throw new Error('Please sign in again to create a soil report.');
      const weatherResponse = await fetch(`/api/weather?latitude=${latitude}&longitude=${longitude}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!weatherResponse.ok) {
        const body = await weatherResponse.json().catch(() => ({}));
        throw new Error(body.error || 'Weather and soil conditions are unavailable right now.');
      }
      const weatherData = await weatherResponse.json() as WeatherSnapshot;
      setWeather(weatherData);
      const report = await streamKatoReport({
        token, crop, location: locationLabel.trim(), weather: weatherData,
        ph: measuredPH, texture, drainage,
        locationPrecision: usingExactLocation ? 'farmer-approved device GPS coordinates' : 'selected district-centre coordinates; village name is a text label only',
      });
      setAiReport(report);
      setReportLocation(locationLabel.trim());
    } catch (cause) {
      console.error('Soil intelligence report failed:', cause);
      setError(cause instanceof Error ? cause.message : 'Could not create your soil report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveReport = async () => {
    if (!aiReport || !weather || saving || saved) return;
    setSaving(true); setError('');
    try {
      const findings = [
        texture !== 'unknown' ? `Farmer-observed texture: ${textureLabels[texture]}.` : 'Texture not assessed.',
        drainage !== 'unknown' ? `Farmer-observed drainage: ${drainageLabels[drainage]}.` : 'Drainage not assessed.',
        usingExactLocation ? 'Location source: farmer-approved device GPS.' : 'Location source: selected farm district coordinates.',
      ];
      const { data, error: saveError } = await supabase.from('soil_assessments').insert({
        user_id: userId, crop, mode: measuredPH === null ? 'guided' : 'tested',
        measured_ph: measuredPH, texture, drainage, findings,
        location_label: reportLocation, latitude, longitude,
        weather_snapshot: weather, ai_report: aiReport,
      }).select('id,created_at').single();
      if (saveError) throw saveError;
      const item: SavedAssessment = {
        id: data.id, createdAt: data.created_at, crop, mode: measuredPH === null ? 'guided' : 'tested',
        ph: measuredPH, texture, drainage, findings, locationLabel: reportLocation,
        latitude, longitude, aiReport, weatherSnapshot: weather,
      };
      setSavedAssessments(current => [item, ...current].slice(0, 30));
      setSaved(true);
    } catch (cause) {
      console.error('Could not save soil report:', cause);
      setError('Could not save this report. Please check your connection and try again.');
    } finally { setSaving(false); }
  };

  const openSaved = (item: SavedAssessment) => {
    setCrop(item.crop);
    setSelectedSaved(item);
    setAiReport(item.aiReport || 'This older report contains field observations only. Create a new Soil Intelligence report to include weather and Kato guidance.');
    setWeather(item.weatherSnapshot);
    setReportLocation(item.locationLabel);
    setSaved(true);
    setShowHistory(false);
  };

  const reportPH = selectedSaved ? selectedSaved.ph : measuredPH;
  const reportWeather = weather;

  return (
    <div className="min-h-screen px-4 pb-10 pt-5 sm:px-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} aria-label="Back" className="rounded-xl border border-[#e6dcc8] bg-[#fffdf8] p-2 text-soil-700"><ArrowLeft className="h-4 w-4"/></button>
          <div><h1 className="text-2xl font-bold text-soil-900" style={{fontFamily:'Fraunces, Georgia, serif'}}>Soil Intelligence</h1><p className="text-[11px] text-soil-500">Soil, location and weather in one report</p></div>
        </div>
        <button onClick={() => setShowHistory(value => !value)} className="rounded-xl border border-[#e6dcc8] bg-[#fffdf8] px-3 py-2 text-[11px] font-bold text-soil-800">Saved ({savedAssessments.length})</button>
      </header>

      {showHistory && <section className="mb-4 rounded-2xl border border-[#e6dcc8] bg-[#fffdf8] p-4">
        <h2 className="mb-3 text-sm font-bold text-soil-900">Saved soil reports</h2>
        {savedAssessments.length === 0 ? <p className="text-xs text-soil-600">No saved reports yet.</p> : <div className="space-y-2">{savedAssessments.map(item => <button key={item.id} onClick={() => openSaved(item)} className="flex w-full items-center justify-between gap-3 border-b border-[#eee5d5] pb-2 text-left last:border-0"><span><span className="block text-xs font-semibold text-soil-900">{item.crop} · {item.locationLabel}</span><span className="text-[10px] text-soil-500">{new Date(item.createdAt).toLocaleDateString()}</span></span><ChevronRight className="h-4 w-4 text-soil-500"/></button>)}</div>}
      </section>}

      {!aiReport ? <>
        <section className="mb-4 rounded-2xl bg-[#174432] p-4 text-white">
          <div className="flex items-center gap-2"><Sprout className="h-5 w-5 text-[#e8d6a8]"/><h2 className="text-sm font-semibold">Understand the soil on your farm</h2></div>
          <p className="mt-2 text-xs leading-relaxed text-white/75">We'll combine your field observations with local soil moisture, soil temperature and the weather forecast. pH and nutrients need a soil test.</p>
        </section>

        <div className="mb-4 space-y-2">
          <label className="block text-xs font-bold text-soil-800">Farm location</label>
          <input value={locationLabel} onChange={event => setLocationLabel(event.target.value)} placeholder="Village, parish or area" className="w-full rounded-xl border border-[#ded3bf] bg-[#fffdf8] p-3 text-sm text-soil-900 outline-none focus:ring-2 focus:ring-leaf-600"/>
          <div className="flex items-center justify-between gap-3"><p className="text-[10px] text-soil-500">{usingExactLocation ? 'Using your device location' : 'Using your selected farm district as an estimate'}</p><button onClick={useMyLocation} className="inline-flex items-center gap-1 rounded-lg border border-[#d9cfbc] bg-white px-3 py-2 text-[10px] font-semibold text-leaf-800"><Compass className="h-3.5 w-3.5"/> Use my location</button></div>
        </div>

        <section className="mb-4 space-y-2">
          <label className="block text-xs font-bold text-soil-800">Crop you're planning for</label>
          <select value={crop} onChange={event => setCrop(event.target.value)} className="w-full rounded-xl border border-[#ded3bf] bg-[#fffdf8] p-3 text-sm text-soil-900">{CROPS.map(item => <option key={item}>{item}</option>)}</select>
        </section>

        <section className="mb-4 rounded-2xl bg-[#faf7ef] p-4">
          <label className="mb-2 block text-xs font-bold text-soil-800">Soil pH (optional)</label>
          <input type="number" min="0" max="14" step="0.1" inputMode="decimal" value={phInput} onChange={event => setPhInput(event.target.value)} placeholder="Enter a reading from a soil test" className="w-full rounded-xl border border-[#ded3bf] bg-[#fffdf8] p-3 text-sm text-soil-900"/>
          <p className="mt-1 text-[10px] text-soil-500">Leave blank if you haven't tested it. A phone photo or weather data cannot measure pH.</p>
          {measuredPH !== null && <p className="mt-2 text-xs font-semibold text-leaf-800">Entered reading: pH {measuredPH.toFixed(1)} · {pHLabel(measuredPH)}</p>}
        </section>

        <section className="mb-4 rounded-2xl bg-[#faf7ef] p-4">
          <h3 className="text-xs font-bold text-soil-800">What have you observed?</h3>
          <p className="mt-1 text-[10px] text-soil-500">These are field observations, not lab results.</p>
          <div className="mt-3"><label className="mb-2 block text-[11px] font-semibold text-soil-700">Soil texture</label><div className="grid grid-cols-2 gap-2">{(['sandy','loamy','clay','unknown'] as Texture[]).map(value => <button key={value} onClick={() => setTexture(value)} className={`rounded-lg border px-3 py-3 text-left text-xs font-medium ${texture === value ? 'border-leaf-700 bg-leaf-100 text-leaf-800' : 'border-[#e6dcc8] bg-white text-soil-700'}`}>{textureLabels[value]}</button>)}</div></div>
          <div className="mt-4"><label className="mb-2 block text-[11px] font-semibold text-soil-700">How does water drain?</label><div className="space-y-2">{(['fast','moderate','slow','unknown'] as Drainage[]).map(value => <button key={value} onClick={() => setDrainage(value)} className={`w-full rounded-lg border px-3 py-3 text-left text-xs ${drainage === value ? 'border-leaf-700 bg-leaf-100 text-leaf-800' : 'border-[#e6dcc8] bg-white text-soil-700'}`}>{drainageLabels[value]}</button>)}</div></div>
        </section>

        {error && <p role="alert" className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
        <button onClick={() => void createReport()} disabled={loading} className="w-full rounded-xl bg-leaf-700 px-4 py-3.5 text-sm font-bold text-white disabled:opacity-60">{loading ? <><Loader2 className="mr-2 inline h-4 w-4 animate-spin"/>Preparing your report…</> : <>Create soil report <ChevronRight className="ml-1 inline h-4 w-4"/></>}</button>
      </> : <>
        <section className="mb-4 rounded-2xl border border-[#e6dcc8] bg-[#fffdf8] p-4">
          <div className="flex items-center gap-2 text-leaf-700"><CheckCircle2 className="h-5 w-5"/><span className="text-xs font-bold">Soil Intelligence report</span></div>
          <h2 className="mt-2 text-xl font-bold text-soil-900" style={{fontFamily:'Fraunces, Georgia, serif'}}>{crop} · {reportLocation}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-[#f7f1e5] p-3"><div className="flex items-center gap-2 text-soil-600"><Thermometer className="h-4 w-4"/><span className="text-[10px]">Soil temperature</span></div><p className="mt-1 text-lg font-bold text-soil-900">{reportWeather?.current?.soilTemperature == null ? '—' : `${reportWeather.current.soilTemperature.toFixed(1)}°C`}</p><p className="text-[9px] text-soil-500">Model estimate · 6 cm</p></div>
            <div className="rounded-xl bg-[#f7f1e5] p-3"><div className="flex items-center gap-2 text-soil-600"><Droplets className="h-4 w-4"/><span className="text-[10px]">Soil moisture</span></div><p className="mt-1 text-lg font-bold text-soil-900">{reportWeather?.current?.soilMoisture == null ? '—' : `${(reportWeather.current.soilMoisture * 100).toFixed(1)}%`}</p><p className="text-[9px] text-soil-500">Model estimate · 3–9 cm</p></div>
            <div className="rounded-xl bg-[#f7f1e5] p-3"><div className="flex items-center gap-2 text-soil-600"><FlaskConical className="h-4 w-4"/><span className="text-[10px]">Soil pH</span></div><p className="mt-1 text-lg font-bold text-soil-900">{reportPH === null ? 'Needs a soil test' : `pH ${reportPH.toFixed(1)}`}</p><p className="text-[9px] text-soil-500">{reportPH === null ? 'Not estimated from weather' : 'Farmer-entered test reading'}</p></div>
            <div className="rounded-xl bg-[#f7f1e5] p-3"><div className="flex items-center gap-2 text-soil-600"><CloudRain className="h-4 w-4"/><span className="text-[10px]">Rain today</span></div><p className="mt-1 text-lg font-bold text-soil-900">{reportWeather?.current?.rainfall == null ? '—' : `${reportWeather.current.rainfall.toFixed(1)} mm`}</p><p className="text-[9px] text-soil-500">Weather model</p></div>
          </div>
          <div className="mt-3 rounded-xl border border-[#eadfca] bg-[#faf7ef] p-3 text-[10px] leading-relaxed text-soil-600">Weather-based soil conditions are model estimates for the selected coordinates, not a sensor reading from this exact field. Soil pH and nutrient levels require a proper soil test.</div>
        </section>

        <article className="mb-4 whitespace-pre-wrap rounded-2xl border border-[#e6dcc8] bg-[#fffdf8] p-4 text-xs leading-relaxed text-soil-800">{aiReport}</article>
        {error && <p role="alert" className="mb-3 text-xs text-rose-700">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => void saveReport()} disabled={saving || saved || Boolean(selectedSaved)} className="rounded-xl bg-leaf-700 px-3 py-3 text-xs font-bold text-white disabled:opacity-60">{saved ? <><CheckCircle2 className="mr-1 inline h-4 w-4"/>Saved</> : saving ? 'Saving…' : <><Save className="mr-1 inline h-4 w-4"/>Save report</>}</button>
          <button onClick={() => { setAiReport(''); setWeather(null); setSelectedSaved(null); setSaved(false); setError(''); }} className="rounded-xl border border-[#d9cfbc] bg-[#fffdf8] px-3 py-3 text-xs font-bold text-soil-800"><RefreshCw className="mr-1 inline h-4 w-4"/>New report</button>
        </div>
      </>}
    </div>
  );
}
