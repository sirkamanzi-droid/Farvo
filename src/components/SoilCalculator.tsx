import FormattedResponse from './FormattedResponse';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { recordFarmEvent } from '../lib/farmEvents';
import { SUPPORTED_CROP_NAMES } from '../data/supportedCrops';
import { ArrowLeft, CheckCircle2, ChevronRight, CloudRain, Droplets, FlaskConical, Save, Sprout, Thermometer, Loader2, RefreshCw, Camera } from 'lucide-react';

type Mode = 'tested' | 'guided';
type Texture = 'sandy' | 'loamy' | 'clay' | 'unknown';
type Drainage = 'fast' | 'moderate' | 'slow' | 'unknown';
type IsdaSoilProfile = { provider: string; depth: string; resolution: string; classification: string; properties: Record<string, { value: number; unit: string | null; lowerBound: number | null; upperBound: number | null }> };
type WeatherSnapshot = {
  current?: { soilTemperature?: number | null; soilMoisture?: number | null; rainfall?: number | null; temperature?: number | null; time?: string };
  daily?: Array<{ date: string; precipitation?: number | null; maxTemp?: number | null; minTemp?: number | null }>;
  isdaSoil?: IsdaSoilProfile | null;
};

const SOIL_PROPERTY_LABELS: Record<string, string> = {
  ph: 'Soil pH', nitrogen: 'Nitrogen', total_nitrogen: 'Total nitrogen',
  phosphorus: 'Phosphorus', extractable_phosphorus: 'Extractable phosphorus',
  potassium: 'Potassium', extractable_potassium: 'Extractable potassium',
  carbon_organic: 'Organic carbon', organic_carbon: 'Organic carbon',
  clay: 'Clay', sand: 'Sand', silt: 'Silt', cec: 'Cation exchange capacity',
};
type SavedAssessment = {
  id: string; createdAt: string; crop: string; mode: Mode; ph: number | null;
  texture: Texture; drainage: Drainage; findings: string[]; locationLabel: string;
  latitude: number | null; longitude: number | null; aiReport: string | null; weatherSnapshot: WeatherSnapshot | null;
};

const CROPS = SUPPORTED_CROP_NAMES;
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
  token: string; farmId: string; crop: string; location: string; weather: WeatherSnapshot;
  ph: number | null; texture: Texture; drainage: Drainage; locationPrecision: string; soilProfile: IsdaSoilProfile | null; photoObservations: string;
}) {
  const current = input.weather.current || {};
  const forecast = (input.weather.daily || []).slice(0, 3).map(day => ({
    date: day.date, rainMm: day.precipitation, maxC: day.maxTemp, minC: day.minTemp,
  }));
  const soilData = input.soilProfile ? {
    source: input.soilProfile.provider,
    depth: input.soilProfile.depth,
    mapResolution: input.soilProfile.resolution,
    note: 'Mapped model estimates for this location, not a laboratory test.',
    properties: input.soilProfile.properties,
  } : null;
  const prompt = [
    'Prepare a practical Soil Intelligence report for a smallholder farmer in Uganda. Use simple English and short sections.',
    'IMPORTANT: Use the iSDAsoil mapped profile below for numeric soil pH and nutrient estimates whenever those properties are present. Do not say pH is unavailable just because it cannot be read from the photo. Explain that the pH estimate comes from the mapped soil data for this farm location, while the photo adds visible colour and surface clues. Never calculate pH from colour alone.',
    'Clearly label iSDAsoil values as location-based model estimates (about 30 m map resolution), not lab measurements. Include uncertainty bounds when supplied. If iSDAsoil has no pH property, say the mapped pH value was unavailable; do not invent one.',
    'Use the photo to describe visible soil colour, surface texture clues, stones and organic matter clues. Use drainage as the farmer observation. Use weather only as regional model context.',
    'Explain what the pH estimate means for the selected crop and give cautious practical soil-improvement advice. Do not invent fertiliser or lime rates. Do not claim the image itself measured pH or nutrients.',
    'Sections: FARM SNAPSHOT; SOIL PROFILE; WHAT THIS MEANS FOR YOUR CROP; PRACTICAL NEXT STEPS; WEATHER WATCH.',
    `Crop: ${input.crop}. Farm area: ${input.location} (${input.locationPrecision}).`,
    `Photo observations: ${input.photoObservations.slice(0, 700)}.`,
    `Farmer drainage answer: ${drainageLabels[input.drainage]}. Texture observation: ${textureLabels[input.texture]}.`,
    `Farmer-entered lab pH, if any: ${input.ph === null ? 'none' : input.ph}.`,
    `iSDAsoil location profile: ${soilData ? JSON.stringify(soilData) : 'No mapped profile returned. Do not invent values.'}.`,
    `Weather: ${JSON.stringify({ current: { soilTemperature: current.soilTemperature, soilMoisture: current.soilMoisture, rainfall: current.rainfall, temperature: current.temperature, time: current.time }, nextDays: forecast })}.`,
  ].join('\n');
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${input.token}` },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      farmId: input.farmId,
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

export default function SoilCalculator({ userId, farmId, initialCrop, initialLatitude, initialLongitude, initialLocation, onBack }: {
  userId: string; farmId: string; initialCrop: string; initialLatitude: number; initialLongitude: number;
  initialLocation: string; onBack: () => void;
}) {
  const [crop, setCrop] = useState(CROPS.includes(initialCrop) ? initialCrop : 'Maize');
  const [locationLabel, setLocationLabel] = useState(initialLocation);
  const [latitude, setLatitude] = useState(initialLatitude);
  const [longitude, setLongitude] = useState(initialLongitude);
  const [usingExactLocation, setUsingExactLocation] = useState(false);
  const [phInput, setPhInput] = useState('');
  const [soilPhoto, setSoilPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoObservations, setPhotoObservations] = useState('');
  const [analysingPhoto, setAnalysingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [texture, setTexture] = useState<Texture>('unknown');
  const [drainage, setDrainage] = useState<Drainage>('unknown');
  const [hasAnsweredDrainage, setHasAnsweredDrainage] = useState(false);
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
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (sessionError || !token) throw new Error('Please sign in again to load farm reports.');
        const response = await fetch(`/api/farm-context?farmId=${encodeURIComponent(farmId)}&soilHistoryLimit=30`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || 'Could not load this farm’s information.');
        }
        const context = await response.json() as { soilAssessments?: any[] };
        if (!active) return;
        setSavedAssessments((context.soilAssessments || []).map((row: any) => ({
          id: row.id, createdAt: row.created_at, crop: row.crop, mode: row.mode,
          ph: row.measured_ph === null ? null : Number(row.measured_ph),
          texture: row.texture, drainage: row.drainage,
          findings: Array.isArray(row.findings) ? row.findings : [],
          locationLabel: row.location_label || 'Farm location not recorded',
          latitude: row.latitude === null ? null : Number(row.latitude),
          longitude: row.longitude === null ? null : Number(row.longitude),
          aiReport: row.ai_report || null, weatherSnapshot: row.weather_snapshot || null,
        })));
      } catch (loadError) {
        if (active) console.warn('Could not load shared farm context for soil reports:', loadError);
      }
    };
    void load();
    return () => { active = false; };
  }, [userId, farmId]);

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

  const analyseSoilPhoto = async () => {
    if (!soilPhoto) { setError('Take or upload a clear soil photo first.'); return; }
    setError(''); setAnalysingPhoto(true);
    try {
      const image = new Image(); const source = URL.createObjectURL(soilPhoto);
      try {
        await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Could not read this photo.')); image.src = source; });
        const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas'); canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
        const context = canvas.getContext('2d'); if (!context) throw new Error('Photo processing is not supported on this device.');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.78);
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token; if (sessionError || !token) throw new Error('Please sign in again to analyse this soil photo.');
        const response = await fetch('/api/soil-image', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ image: imageData }) });
        const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Could not analyse this soil photo.');
        setPhotoObservations(String(payload.observations || 'No clear visual clues could be identified.').slice(0, 1800));
      } finally { URL.revokeObjectURL(source); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not analyse this soil photo.'); }
    finally { setAnalysingPhoto(false); }
  };
  const createReport = async () => {
    setError('');
    setSaved(false);
    setAiReport('');
    setWeather(null);
    setSelectedSaved(null);
    if (!soilPhoto || !photoObservations) { setError('Take a soil photo and analyse it before continuing.'); return; }
    if (!locationLabel.trim()) { setError('Set your farm location in your farmer profile before creating a soil report.'); return; }
    if (!hasAnsweredDrainage) { setError('Please answer the drainage question.'); return; }
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
      let soilProfile: IsdaSoilProfile | null = null;
      const soilResponse = await fetch(`/api/soil?latitude=${latitude}&longitude=${longitude}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (soilResponse.ok) {
        const soilPayload = await soilResponse.json() as IsdaSoilProfile;
        soilProfile = soilPayload;
      } else {
        const soilPayload = await soilResponse.json().catch(() => ({}));
        console.warn('iSDAsoil lookup unavailable:', soilPayload.error || soilResponse.status);
        setError(soilPayload.error || 'iSDAsoil data is not connected yet. This report will use weather and field observations only.');
      }
      const combinedWeather: WeatherSnapshot = { ...weatherData, isdaSoil: soilProfile };
      setWeather(combinedWeather);
      const report = await streamKatoReport({
        token, farmId, crop, location: locationLabel.trim(), weather: weatherData,
        ph: measuredPH, texture, drainage, soilProfile,
        locationPrecision: usingExactLocation ? 'farmer-approved device GPS coordinates' : 'selected district-centre coordinates; village name is a text label only',
        photoObservations,
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
        `Soil photo visual observations: ${photoObservations}`,
        usingExactLocation ? 'Location source: farmer-approved device GPS.' : 'Location source: selected farm district coordinates.',
      ];
      const { data, error: saveError } = await supabase.from('soil_assessments').insert({
        user_id: userId, farm_id: farmId, crop, mode: measuredPH === null ? 'guided' : 'tested',
        measured_ph: measuredPH, texture, drainage, findings,
        location_label: reportLocation, latitude, longitude,
        weather_snapshot: weather, ai_report: aiReport,
      }).select('id,created_at').single();
      if (saveError) throw saveError;
      await recordFarmEvent({
        userId, farmId, eventType: 'soil_assessment', source: 'farmer',
        sourceRecordType: 'soil_assessments', sourceRecordId: data.id,
        occurredAt: data.created_at,
        payload: { crop, mode: measuredPH === null ? 'guided' : 'tested', measured_ph: measuredPH, texture, drainage, location_label: reportLocation },
      });
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
        <section className="mb-4 rounded-2xl bg-[#174432] p-4 text-white"><div className="flex items-center gap-2"><Sprout className="h-5 w-5 text-[#e8d6a8]"/><h2 className="text-sm font-semibold">Start with a soil photo</h2></div><p className="mt-2 text-xs leading-relaxed text-white/75">Take a clear photo of the soil on your farm. Omulimi will inspect visible features, then combine them with mapped soil data and local weather.</p></section>
        <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={event => { const next=event.target.files?.[0]; if(!next)return; if(!next.type.startsWith('image/')){setError('Choose an image file.');return;} setSoilPhoto(next); setPhotoPreview(URL.createObjectURL(next)); setPhotoObservations(''); setError(''); }}/>
        <section className="mb-4 rounded-2xl border border-dashed border-[#cfc2aa] bg-[#fffdf8] p-4">{photoPreview ? <img src={photoPreview} alt="Soil sample" className="mb-3 max-h-64 w-full rounded-xl object-cover"/> : <div className="flex min-h-36 flex-col items-center justify-center text-soil-500"><Camera className="mb-2 h-8 w-8"/><p className="text-xs">No soil photo added yet</p></div>}
          <button onClick={() => photoInputRef.current?.click()} className="w-full rounded-xl border border-[#d9cfbc] bg-[#faf7ef] px-3 py-3 text-xs font-bold text-soil-800"><Camera className="mr-1 inline h-4 w-4"/>Take soil photo</button>
          {soilPhoto && <button onClick={() => void analyseSoilPhoto()} disabled={analysingPhoto} className="mt-3 w-full rounded-xl bg-leaf-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{analysingPhoto ? <><Loader2 className="mr-2 inline h-4 w-4 animate-spin"/>Scanning soil photo…</> : photoObservations ? 'Scan photo again' : 'Scan soil photo'}</button>}
          {photoObservations && <div className="mt-3 rounded-xl border border-[#d8e5d9] bg-[#f4f8f1] p-3"><p className="mb-1 text-xs font-bold text-leaf-800">What the photo shows</p><p className="text-xs leading-relaxed text-soil-700">{photoObservations}</p><p className="mt-2 text-[10px] text-soil-500">A photo cannot measure pH or nutrients.</p></div>}
        </section>

        {photoObservations && <>
          <section className="mb-4 rounded-2xl bg-[#faf7ef] p-4">
            <h3 className="mb-1 text-sm font-bold text-soil-900">One quick question</h3>
            <label className="mb-3 block text-xs text-soil-700">When it rains, how quickly does water drain from this soil?</label>
            <div className="space-y-2">{(['fast','moderate','slow','unknown'] as Drainage[]).map(value => <button key={value} onClick={() => { setDrainage(value); setHasAnsweredDrainage(true); }} className={`w-full rounded-xl border px-3 py-3 text-left text-xs font-medium ${drainage === value ? 'border-leaf-700 bg-leaf-100 text-leaf-800' : 'border-[#e6dcc8] bg-white text-soil-700'}`}>{value === 'fast' ? 'Quickly' : value === 'moderate' ? 'At a moderate rate' : value === 'slow' ? 'Slowly — water stays for a while' : "I don't know"}</button>)}</div>
          </section>
          <p className="mb-3 text-[10px] text-soil-500">We'll use your farm location and selected crop from your Omulimi account, then combine the photo, iSDAsoil estimates and local weather.</p>
        </>}
        {error && <p role="alert" className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
        <button onClick={() => void createReport()} disabled={loading} className="w-full rounded-xl bg-leaf-700 px-4 py-3.5 text-sm font-bold text-white disabled:opacity-60">{loading ? <><Loader2 className="mr-2 inline h-4 w-4 animate-spin"/>Preparing your report…</> : <>Create soil report <ChevronRight className="ml-1 inline h-4 w-4"/></>}</button>
      </> : <>
        <section className="mb-4 rounded-2xl border border-[#e6dcc8] bg-[#fffdf8] p-4">
          <div className="flex items-center gap-2 text-leaf-700"><CheckCircle2 className="h-5 w-5"/><span className="text-xs font-bold">Soil Intelligence report</span></div>
          <h2 className="mt-2 text-xl font-bold text-soil-900" style={{fontFamily:'Fraunces, Georgia, serif'}}>{crop} · {reportLocation}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-[#f7f1e5] p-3"><div className="flex items-center gap-2 text-soil-600"><Thermometer className="h-4 w-4"/><span className="text-[10px]">Soil temperature</span></div><p className="mt-1 text-lg font-bold text-soil-900">{reportWeather?.current?.soilTemperature == null ? '—' : `${reportWeather.current.soilTemperature.toFixed(1)}°C`}</p><p className="text-[9px] text-soil-500">Model estimate · 6 cm</p></div>
            <div className="rounded-xl bg-[#f7f1e5] p-3"><div className="flex items-center gap-2 text-soil-600"><Droplets className="h-4 w-4"/><span className="text-[10px]">Soil moisture</span></div><p className="mt-1 text-lg font-bold text-soil-900">{reportWeather?.current?.soilMoisture == null ? '—' : `${(reportWeather.current.soilMoisture * 100).toFixed(1)}%`}</p><p className="text-[9px] text-soil-500">Model estimate · 3–9 cm</p></div>
            <div className="rounded-xl bg-[#f7f1e5] p-3"><div className="flex items-center gap-2 text-soil-600"><FlaskConical className="h-4 w-4"/><span className="text-[10px]">Soil pH</span></div><p className="mt-1 text-lg font-bold text-soil-900">{reportPH !== null ? `pH ${reportPH.toFixed(1)}` : reportWeather?.isdaSoil?.properties?.ph ? `pH ${reportWeather.isdaSoil.properties.ph.value.toFixed(1)}` : 'No mapped pH'}</p><p className="text-[9px] text-soil-500">{reportPH !== null ? 'Farmer-entered test reading' : reportWeather?.isdaSoil?.properties?.ph ? 'iSDAsoil mapped estimate · not a lab test' : 'No pH value available'}</p></div>
            <div className="rounded-xl bg-[#f7f1e5] p-3"><div className="flex items-center gap-2 text-soil-600"><CloudRain className="h-4 w-4"/><span className="text-[10px]">Rain today</span></div><p className="mt-1 text-lg font-bold text-soil-900">{reportWeather?.current?.rainfall == null ? '—' : `${reportWeather.current.rainfall.toFixed(1)} mm`}</p><p className="text-[9px] text-soil-500">Weather model</p></div>
          </div>
          {reportWeather?.isdaSoil ? <div className="mt-3 rounded-xl border border-[#d8e5d9] bg-[#f4f8f1] p-3">
            <div className="mb-2 flex items-center justify-between gap-2"><span className="text-xs font-bold text-leaf-800">iSDAsoil mapped profile</span><span className="text-[9px] text-soil-500">{reportWeather.isdaSoil.depth} · {reportWeather.isdaSoil.resolution}</span></div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(SOIL_PROPERTY_LABELS).filter(([key]) => reportWeather.isdaSoil?.properties[key]).map(([key, label]) => {
                const item = reportWeather.isdaSoil!.properties[key];
                return <div key={key} className="rounded-lg bg-white/80 p-2"><p className="text-[9px] text-soil-500">{label}</p><p className="text-sm font-bold text-soil-900">{item.value.toFixed(2)}{item.unit ? ` ${item.unit}` : ''}</p>{item.lowerBound !== null && item.upperBound !== null && <p className="text-[9px] text-soil-500">Model range: {item.lowerBound.toFixed(2)}–{item.upperBound.toFixed(2)}</p>}</div>;
              })}
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-soil-600">These are iSDAsoil machine-learning estimates at mapped resolution, not laboratory measurements. Model uncertainty varies by property.</p>
          </div> : <div className="mt-3 rounded-xl border border-[#eadfca] bg-[#faf7ef] p-3 text-[10px] leading-relaxed text-soil-600">iSDAsoil mapped data is not available for this report yet. Weather-based soil conditions are model estimates, not field sensor readings. Do not use them as a substitute for a soil test.</div>}
          <div className="mt-3 rounded-xl border border-[#eadfca] bg-[#faf7ef] p-3 text-[10px] leading-relaxed text-soil-600">Weather-based soil conditions are model estimates for the selected coordinates, not a sensor reading from this exact field. Confirm important decisions with a local soil test or extension officer.</div>
        </section>

        <article className="mb-4 rounded-2xl border border-[#e6dcc8] bg-[#fffdf8] p-4 text-sm text-soil-800"><FormattedResponse content={aiReport}/></article>
        {error && <p role="alert" className="mb-3 text-xs text-rose-700">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => void saveReport()} disabled={saving || saved || Boolean(selectedSaved)} className="rounded-xl bg-leaf-700 px-3 py-3 text-xs font-bold text-white disabled:opacity-60">{saved ? <><CheckCircle2 className="mr-1 inline h-4 w-4"/>Saved</> : saving ? 'Saving…' : <><Save className="mr-1 inline h-4 w-4"/>Save report</>}</button>
          <button onClick={() => { setAiReport(''); setWeather(null); setSelectedSaved(null); setSaved(false); setError(''); setPhotoObservations(''); setSoilPhoto(null); setPhotoPreview(''); setDrainage('unknown'); setHasAnsweredDrainage(false); }} className="rounded-xl border border-[#d9cfbc] bg-[#fffdf8] px-3 py-3 text-xs font-bold text-soil-800"><RefreshCw className="mr-1 inline h-4 w-4"/>New report</button>
        </div>
      </>}
    </div>
  );
}
