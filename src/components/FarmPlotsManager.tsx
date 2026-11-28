import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Layers3, Loader2, MapPin, Plus, Route, Sprout, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SUPPORTED_CROP_NAMES } from '../data/supportedCrops';
import { buildGpsBoundary, distanceMetres, type BoundaryPoint } from '../utils/farmBoundary';
import type { FarmPlotBoundary } from '../data/farms';
import { recordFarmEvent } from '../lib/farmEvents';

type PlotRow = {
  id: string;
  label: string;
  boundary_status: 'needs_boundary' | 'mapped';
  mapping_method: 'point' | 'gps_walk' | 'manual_draw';
  centroid_latitude: number;
  centroid_longitude: number;
  area_acres: number | null;
  area_hectares: number | null;
  created_at: string;
};

type CropRow = { id: string; plot_id: string | null; crop_name: string };

type Props = {
  userId: string;
  farmId: string;
  farmLatitude: number;
  farmLongitude: number;
  onClose: () => void;
};

export default function FarmPlotsManager({ userId, farmId, farmLatitude, farmLongitude, onClose }: Props) {
  const [plots, setPlots] = useState<PlotRow[]>([]);
  const [crops, setCrops] = useState<CropRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState('');
  const [cropName, setCropName] = useState(SUPPORTED_CROP_NAMES[0] || 'Maize');
  const [variety, setVariety] = useState('');
  const [plantingDate, setPlantingDate] = useState('');
  const [areaSharePercent, setAreaSharePercent] = useState('');
  const [inputSource, setInputSource] = useState('unknown');
  const [fertiliserManureApplied, setFertiliserManureApplied] = useState('');
  const [point, setPoint] = useState<BoundaryPoint | null>(null);
  const [boundaryPoints, setBoundaryPoints] = useState<BoundaryPoint[]>([]);
  const [boundary, setBoundary] = useState<FarmPlotBoundary | null>(null);
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const watchId = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [plotResult, cropResult] = await Promise.all([
      supabase.from('farm_plots').select('id,label,boundary_status,mapping_method,centroid_latitude,centroid_longitude,area_acres,area_hectares,created_at').eq('farm_id', farmId).eq('user_id', userId).order('created_at', { ascending: true }),
      supabase.from('farm_crops').select('id,plot_id,crop_name').eq('farm_id', farmId).eq('user_id', userId).eq('is_active', true).order('created_at', { ascending: true }),
    ]);
    if (plotResult.error || cropResult.error) {
      setError('Could not load your farm plots. Check your connection and try again.');
    } else {
      setPlots((plotResult.data || []) as PlotRow[]);
      setCrops((cropResult.data || []) as CropRow[]);
      setError('');
    }
    setLoading(false);
  }, [farmId, userId]);

  useEffect(() => { void load(); }, [load]);

  const stopWatch = () => {
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setRecording(false);
  };

  useEffect(() => () => {
    if (watchId.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId.current);
  }, []);

  const capturePoint = () => {
    if (!navigator.geolocation) { setError('This device does not support GPS location.'); return; }
    setError('');
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const captured: BoundaryPoint = {
        latitude: coords.latitude, longitude: coords.longitude,
        accuracyM: coords.accuracy, capturedAt: new Date().toISOString(),
      };
      setPoint(captured);
      setBoundary(null);
      setNotice('Plot location captured.');
    }, () => setError('Could not capture this plot location. Check GPS permission and try again.'), {
      enableHighAccuracy: true, timeout: 20000, maximumAge: 0,
    });
  };

  const useFarmPoint = () => {
    setPoint({
      latitude: farmLatitude, longitude: farmLongitude,
      accuracyM: -1, capturedAt: new Date().toISOString(),
    });
    setBoundary(null);
    setNotice('Using the saved farm location as an approximate plot point.');
    setError('');
  };

  const startWalk = () => {
    if (!navigator.geolocation) { setError('This device does not support GPS boundary recording.'); return; }
    if (!point) { setError('Capture the plot location first, then start the boundary walk.'); return; }
    if (point.accuracyM < 0) { setError('Capture the actual plot GPS location before recording its boundary.'); return; }
    setBoundary(null);
    setBoundaryPoints([point]);
    setRecording(true);
    setError('');
    watchId.current = navigator.geolocation.watchPosition(({ coords }) => {
      if (coords.accuracy > 100) { setError('GPS accuracy is weak. Move to a clearer area; this reading was not added.'); return; }
      const next: BoundaryPoint = {
        latitude: coords.latitude, longitude: coords.longitude,
        accuracyM: coords.accuracy, capturedAt: new Date().toISOString(),
      };
      setBoundaryPoints(current => {
        const last = current[current.length - 1];
        if (last && distanceMetres(last, next) < 3) return current;
        return [...current, next].slice(-1200);
      });
      setError('');
    }, () => {
      setError('GPS tracking stopped. Check location services and start the walk again.');
      stopWatch();
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  };

  const finishWalk = () => {
    stopWatch();
    try {
      setBoundary(buildGpsBoundary(boundaryPoints));
      setNotice('Boundary recorded. Review the estimated area before saving.');
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not calculate this boundary.');
    }
  };

  const resetForm = () => {
    stopWatch();
    setLabel('');
    setCropName(SUPPORTED_CROP_NAMES[0] || 'Maize');
    setVariety(''); setPlantingDate(''); setAreaSharePercent(''); setInputSource('unknown'); setFertiliserManureApplied('');
    setPoint(null);
    setBoundaryPoints([]);
    setBoundary(null);
    setShowAdd(false);
    setError('');
    setNotice('');
  };

  const savePlot = async () => {
    if (!label.trim()) { setError('Give this plot a name.'); return; }
    if (!point) { setError('Capture this plot location or use the farm location as an approximate point.'); return; }
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const latitude = boundary?.centroidLatitude ?? point.latitude;
      const longitude = boundary?.centroidLongitude ?? point.longitude;
      const { data: plot, error: plotError } = await supabase.from('farm_plots').insert({
        user_id: userId,
        farm_id: farmId,
        label: label.trim().slice(0, 80),
        boundary_geojson: boundary ? { type: 'Polygon', coordinates: [boundary.coordinates] } : null,
        boundary_status: boundary ? 'mapped' : 'needs_boundary',
        mapping_method: boundary?.mappingMethod ?? 'point',
        centroid_latitude: latitude,
        centroid_longitude: longitude,
        area_acres: boundary?.areaAcres ?? null,
        area_hectares: boundary?.areaHectares ?? null,
      }).select('id').single();
      if (plotError || !plot) throw plotError || new Error('Could not create this plot.');

      const { data: crop, error: cropError } = await supabase.from('farm_crops').insert({
        user_id: userId, farm_id: farmId, plot_id: plot.id, crop_name: cropName, is_active: true,
        variety: variety.trim() || null,
        planting_date: plantingDate || null,
        area_share_percent: areaSharePercent.trim() && Number.isFinite(Number(areaSharePercent)) ? Math.min(100, Math.max(0, Number(areaSharePercent))) : null,
        input_source: inputSource || 'unknown',
        fertiliser_manure_applied: fertiliserManureApplied.trim() || null,
      }).select('id').single();
      if (cropError || !crop) {
        await supabase.from('farm_plots').delete().eq('id', plot.id).eq('farm_id', farmId).eq('user_id', userId);
        throw cropError || new Error('Could not register this plot’s crop.');
      }

      await recordFarmEvent({
        userId, farmId, plotId: plot.id, eventType: 'crop_update', source: 'farmer',
        sourceRecordType: 'farm_crops', sourceRecordId: crop.id,
        payload: { action: 'plot_and_crop_registered', plot_label: label.trim(), crop_name: cropName, boundary_status: boundary ? 'mapped' : 'needs_boundary' },
      });
      setNotice('Plot and crop saved.');
      await load();
      resetForm();
      setNotice('Plot and crop saved.');
    } catch (cause) {
      console.error('Could not save farm plot:', cause);
      setError(cause instanceof Error ? cause.message : 'Could not save this plot. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const cropNamesFor = (plotId: string) => crops.filter(crop => crop.plot_id === plotId).map(crop => crop.crop_name);

  return <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f1ebdc]">
    <div className="mx-auto min-h-full w-full max-w-xl px-4 py-6 sm:px-6">
      <header className="mb-5 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e7eddf]"><Layers3 className="h-5 w-5 text-[#285b40]"/></span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#56715f]">Farm profile</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#1d2d27]">Your plots</h1>
          <p className="mt-1 text-xs leading-5 text-[#66746b]">Keep each field separate so Omulimi can remember its crop, location and history.</p>
        </div>
        <button onClick={onClose} aria-label="Close plots" className="rounded-full p-2 text-[#66746b]"><X className="h-5 w-5"/></button>
      </header>

      {notice && <p role="status" className="mb-3 rounded-xl bg-[#e7eddf] p-3 text-xs text-[#285b40]">{notice}</p>}
      {error && <p role="alert" className="mb-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}

      {loading ? <div className="py-12 text-center text-sm text-[#66746b]"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin"/>Loading plots…</div> :
        <div className="space-y-3">
          {plots.map(plot => <article key={plot.id} className="rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white"><MapPin className="h-4 w-4 text-[#285b40]"/></span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-[#1d2d27]">{plot.label}</h2>
                <p className="mt-1 text-xs text-[#66746b]">{cropNamesFor(plot.id).join(', ') || 'No crop linked yet'}</p>
                <p className="mt-1 text-[11px] text-[#879188]">{plot.boundary_status === 'mapped' ? 'Boundary mapped' : 'Point location only · boundary not mapped'}</p>
                {plot.area_acres !== null && <p className="mt-1 text-xs text-[#52645a]">Approx. {Number(plot.area_acres).toFixed(2)} acres · {Number(plot.area_hectares || 0).toFixed(2)} hectares</p>}
              </div>
              <span className={plot.boundary_status === 'mapped' ? 'rounded-full bg-[#e7eddf] px-2 py-1 text-[10px] font-semibold text-[#285b40]' : 'rounded-full bg-[#f5ebd2] px-2 py-1 text-[10px] font-semibold text-[#8b6531]'}>
                {plot.boundary_status === 'mapped' ? 'Mapped' : 'Needs mapping'}
              </span>
            </div>
          </article>)}
          {plots.length === 0 && <p className="rounded-xl bg-[#faf7ef] p-4 text-sm text-[#66746b]">No plots have been added to this farm yet.</p>}
        </div>}

      {!showAdd ? <button onClick={() => { setShowAdd(true); setError(''); setNotice(''); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#174432] px-4 py-3.5 text-sm font-semibold text-white"><Plus className="h-4 w-4"/>Add a plot</button> :
        <section className="mt-4 rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
          <h2 className="font-semibold text-[#1d2d27]">New plot</h2>
          <label className="mt-3 block text-xs font-semibold text-[#52645a]">Plot name</label>
          <input value={label} onChange={event => setLabel(event.target.value)} maxLength={80} placeholder="e.g. Upper field" className="mt-1 w-full rounded-xl border border-[#e6dcc8] bg-white px-3 py-3 text-sm text-[#1d2d27]"/>
          <label className="mt-3 block text-xs font-semibold text-[#52645a]">Crop grown on this plot</label>
          <select value={cropName} onChange={event => setCropName(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e6dcc8] bg-white px-3 py-3 text-sm text-[#1d2d27]">
            {SUPPORTED_CROP_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
          <label className="mt-3 block text-xs font-semibold text-[#52645a]">Variety (if known)</label>
          <input value={variety} onChange={event=>setVariety(event.target.value)} placeholder="Variety or leave blank" className="mt-1 w-full rounded-xl border border-[#e6dcc8] bg-white px-3 py-2.5 text-sm"/>
          <label className="mt-3 block text-xs font-semibold text-[#52645a]">Planting date (actual or planned)</label>
          <input type="date" value={plantingDate} onChange={event=>setPlantingDate(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e6dcc8] bg-white px-3 py-2.5 text-sm"/>
          <label className="mt-3 block text-xs font-semibold text-[#52645a]">Share of this farm under this crop (%)</label>
          <input type="number" min="0" max="100" step="1" value={areaSharePercent} onChange={event=>setAreaSharePercent(event.target.value)} placeholder="I don't know / skip" className="mt-1 w-full rounded-xl border border-[#e6dcc8] bg-white px-3 py-2.5 text-sm"/>
          <label className="mt-3 block text-xs font-semibold text-[#52645a]">Where do you get seed and inputs?</label>
          <select value={inputSource} onChange={event=>setInputSource(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e6dcc8] bg-white px-3 py-2.5 text-sm"><option value="unknown">I don't know / skip</option><option value="shop">Shop</option><option value="cooperative">Cooperative</option><option value="saved_seed">Saved seed</option><option value="other">Other</option></select>
          <label className="mt-3 block text-xs font-semibold text-[#52645a]">Fertiliser or manure applied this season?</label>
          <input value={fertiliserManureApplied} onChange={event=>setFertiliserManureApplied(event.target.value)} placeholder="Name it, or leave blank" className="mt-1 w-full rounded-xl border border-[#e6dcc8] bg-white px-3 py-2.5 text-sm"/>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={capturePoint} className="rounded-xl border border-[#285b40] bg-white px-3 py-3 text-xs font-semibold text-[#174432]"><MapPin className="mr-1 inline h-4 w-4"/>Capture GPS</button>
            <button type="button" onClick={useFarmPoint} className="rounded-xl border border-[#e6dcc8] bg-white px-3 py-3 text-xs font-semibold text-[#52645a]">Use farm point</button>
          </div>
          {point && <p className="mt-2 text-[11px] text-[#66746b]">Point: {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)} · {point.accuracyM >= 0 ? `GPS accuracy ±${Math.round(point.accuracyM)} m` : 'Approximate saved farm point'}</p>}
          {!recording && !boundary && <button type="button" disabled={!point} onClick={startWalk} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#285b40] bg-white px-3 py-3 text-xs font-semibold text-[#174432] disabled:opacity-50"><Route className="h-4 w-4"/>Walk this plot boundary</button>}
          {recording && <div className="mt-3 rounded-xl bg-[#e7eddf] p-3">
            <p className="text-sm font-semibold text-[#174432]">Recording · {boundaryPoints.length} GPS points</p>
            <p className="mt-1 text-xs text-[#52645a]">Walk around the edge of the plot. Keep this screen open.</p>
            <button type="button" onClick={finishWalk} className="mt-3 w-full rounded-xl bg-[#174432] px-3 py-3 text-sm font-semibold text-white">Finish boundary</button>
          </div>}
          {boundary && <div className="mt-3 rounded-xl border border-[#d8e2d0] bg-white p-3">
            <p className="text-sm font-semibold text-[#174432]">Boundary ready</p>
            <p className="mt-1 text-xs text-[#52645a]">{boundary.areaAcres.toFixed(2)} acres · {boundary.areaHectares.toFixed(2)} hectares</p>
            <button type="button" onClick={() => { setBoundary(null); setBoundaryPoints([]); }} className="mt-2 text-xs font-semibold text-[#8b4b35]">Remove boundary</button>
          </div>}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={resetForm} disabled={saving} className="rounded-xl border border-[#e6dcc8] bg-white px-3 py-3 text-sm font-semibold text-[#52645a]">Cancel</button>
            <button type="button" onClick={() => void savePlot()} disabled={saving || !point || !label.trim()} className="rounded-xl bg-[#174432] px-3 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin"/> : <><CheckCircle2 className="mr-1 inline h-4 w-4"/>Save plot</>}</button>
          </div>
        </section>}
      <p className="mt-5 text-[11px] leading-relaxed text-[#879188]">GPS walking works without mobile data while location services are available. Satellite-map drawing is not enabled yet; mapped areas are approximate and should be checked on the ground.</p>
    </div>
  </div>;
}
