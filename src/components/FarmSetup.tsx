import { useEffect, useRef, useState } from 'react';
import { MapPin, LocateFixed, Loader2, Sprout, X } from 'lucide-react';
import { DISTRICTS } from '../data/districts';
import { findNearestDistrict, type LocationStatus } from '../data/geolocation';
import { SUPPORTED_CROP_NAMES } from '../data/supportedCrops';
import type { District } from '../types';
import { supabase } from '../lib/supabase';
import type { FarmPlotBoundary, FarmQuestionnaireInput, FarmCropDetailsInput, FarmLivestockInput } from '../data/farms';
import { buildGpsBoundary, distanceMetres, type BoundaryPoint } from '../utils/farmBoundary';

export type FarmSetupResult = {
  latitude: number;
  longitude: number;
  accuracyM: number;
  capturedAt: string;
  district: District;
  label: string;
  crops: string[];
  livestock: FarmLivestockInput[];
  farmQuestionnaire: FarmQuestionnaireInput;
  cropDetails: FarmCropDetailsInput[];
  locationLabel: string | null;
  village: string | null;
  parish: string | null;
  subcounty: string | null;
  boundary: FarmPlotBoundary | null;
};

type Props = {
  title?: string;
  onCancel?: () => void;
  initialCrops?: string[];
  initialLabel?: string;
  initialLivestock?: FarmLivestockInput[];
  initialFarmQuestionnaire?: FarmQuestionnaireInput;
  initialCropDetails?: FarmCropDetailsInput[];
  onSave: (result: FarmSetupResult) => Promise<void>;
};

const LIVESTOCK_OPTIONS = ['Cattle', 'Goats', 'Sheep', 'Pigs', 'Chicken', 'Ducks', 'Turkeys', 'Rabbits', 'Fish'];

export default function FarmSetup({ title = 'Set up your farm', onCancel, initialCrops = [], initialLabel = 'My farm', initialLivestock = [], initialFarmQuestionnaire, initialCropDetails = [], onSave }: Props) {
  const [position, setPosition] = useState<{ latitude: number; longitude: number; accuracyM: number; capturedAt: string } | null>(null);
  const [boundaryPoints, setBoundaryPoints] = useState<BoundaryPoint[]>([]);
  const [boundary, setBoundary] = useState<FarmPlotBoundary | null>(null);
  const [recordingBoundary, setRecordingBoundary] = useState(false);
  const [boundaryError, setBoundaryError] = useState('');
  const boundaryWatchId = useRef<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [locationError, setLocationError] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [area, setArea] = useState<{ displayName: string | null; village: string | null; parish: string | null; subcounty: string | null; district: string | null; region: string | null } | null>(null);
  const [farmName, setFarmName] = useState(initialLabel);
  const [crops, setCrops] = useState<string[]>(initialCrops);
  const [yearsFarmedLand, setYearsFarmedLand] = useState(initialFarmQuestionnaire?.yearsFarmedLand || 'unknown');
  const [previousSeasonCrops, setPreviousSeasonCrops] = useState<string[]>(initialFarmQuestionnaire?.previousSeasonCrops || []);
  const [seasonBeforePreviousCrops, setSeasonBeforePreviousCrops] = useState<string[]>(initialFarmQuestionnaire?.seasonBeforePreviousCrops || []);
  const [waterPoolsAfterRain, setWaterPoolsAfterRain] = useState(initialFarmQuestionnaire?.waterPoolsAfterRain === true ? 'yes' : initialFarmQuestionnaire?.waterPoolsAfterRain === false ? 'no' : 'unknown');
  const [waterAccess, setWaterAccess] = useState(initialFarmQuestionnaire?.waterAccess || 'unknown');
  const [cropDetails, setCropDetails] = useState<Record<string, { variety: string; plantingDate: string; areaSharePercent: string; inputSource: string; fertiliserManureApplied: string }>>(() => Object.fromEntries(initialCropDetails.map(item => [item.cropName, {
    variety: item.variety || '', plantingDate: item.plantingDate || '',
    areaSharePercent: item.areaSharePercent === null ? '' : String(item.areaSharePercent),
    inputSource: item.inputSource || 'unknown', fertiliserManureApplied: item.fertiliserManureApplied || '',
  }])));
  const [livestock, setLivestock] = useState<FarmLivestockInput[]>(() => initialLivestock.map(item => ({ ...item })));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const stopBoundaryWatch = () => {
    if (boundaryWatchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(boundaryWatchId.current);
      boundaryWatchId.current = null;
    }
    setRecordingBoundary(false);
  };

  useEffect(() => () => {
    if (boundaryWatchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(boundaryWatchId.current);
    }
  }, []);

  const startBoundaryWalk = () => {
    if (!navigator.geolocation) {
      setBoundaryError('This device cannot record a GPS boundary.');
      return;
    }
    if (!position) {
      setBoundaryError('Capture the farm GPS location first, then start walking its boundary.');
      return;
    }
    setBoundary(null);
    setBoundaryError('');
    setBoundaryPoints([{
      latitude: position.latitude,
      longitude: position.longitude,
      accuracyM: position.accuracyM,
      capturedAt: position.capturedAt,
    }]);
    setRecordingBoundary(true);
    boundaryWatchId.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        if (coords.accuracy > 100) {
          setBoundaryError('GPS accuracy is weak. Move to a clearer area; this reading was not added.');
          return;
        }
        const point: BoundaryPoint = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracyM: coords.accuracy,
          capturedAt: new Date().toISOString(),
        };
        setBoundaryPoints(current => {
          const last = current[current.length - 1];
          if (last && distanceMetres(last, point) < 3) return current;
          return [...current, point].slice(-1200);
        });
        setBoundaryError('');
      },
      error => {
        setBoundaryError(error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. Allow GPS access and start the walk again.'
          : 'GPS tracking paused. Check location services and try again.');
        stopBoundaryWatch();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  };

  const finishBoundaryWalk = () => {
    stopBoundaryWatch();
    if (boundaryPoints.length < 3) {
      setBoundaryError('Walk at least three different corners before finishing the boundary.');
      return;
    }
    try {
      setBoundary(buildGpsBoundary(boundaryPoints));
      setBoundaryError('');
    } catch (error) {
      setBoundaryError(error instanceof Error ? error.message : 'Could not calculate this boundary.');
    }
  };

  const removeBoundary = () => {
    stopBoundaryWatch();
    setBoundaryPoints([]);
    setBoundary(null);
    setBoundaryError('');
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
      setLocationError('This device does not support location. Try a device with GPS enabled.');
      return;
    }
    setLocationStatus('detecting');
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const captured = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracyM: coords.accuracy,
          capturedAt: new Date().toISOString(),
        };
        setPosition(captured);
        setArea(null);
        setLocationStatus('success');
        setGeocoding(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) return;
          const response = await fetch(`/api/geocode?latitude=${captured.latitude}&longitude=${captured.longitude}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (!response.ok) return;
          const result = await response.json() as {
            found?: boolean; displayName?: string | null; village?: string | null;
            parish?: string | null; subcounty?: string | null; district?: string | null; region?: string | null;
          };
          if (result.found) setArea({
            displayName: result.displayName ?? null,
            village: result.village ?? null,
            parish: result.parish ?? null,
            subcounty: result.subcounty ?? null,
            district: result.district ?? null,
            region: result.region ?? null,
          });
        } catch {
          // Reverse geocoding is optional; the captured GPS coordinates remain authoritative.
        } finally {
          setGeocoding(false);
        }
      },
      error => {
        const status: LocationStatus = error.code === error.PERMISSION_DENIED ? 'denied' : 'error';
        setLocationStatus(status);
        setLocationError(status === 'denied'
          ? 'Location permission was not granted. Allow location access in your browser settings and try again.'
          : 'We could not get a GPS reading. Move to an open area and try again.');
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const toggleCrop = (crop: string) => {
    setCrops(current => current.includes(crop) ? current.filter(item => item !== crop) : [...current, crop]);
    setCropDetails(current => current[crop] ? current : ({
      ...current,
      [crop]: { variety: '', plantingDate: '', areaSharePercent: '', inputSource: 'unknown', fertiliserManureApplied: '' },
    }));
  };

  const updateCropDetail = (crop: string, field: keyof (typeof cropDetails)[string], value: string) => {
    setCropDetails(current => ({
      ...current,
      [crop]: { ...(current[crop] || { variety: '', plantingDate: '', areaSharePercent: '', inputSource: 'unknown', fertiliserManureApplied: '' }), [field]: value },
    }));
  };

  const togglePreviousCrop = (crop: string, target: 'last' | 'before') => {
    const setter = target === 'last' ? setPreviousSeasonCrops : setSeasonBeforePreviousCrops;
    setter(current => current.includes(crop) ? current.filter(item => item !== crop) : [...current, crop]);
  };

  const addLivestock = (species: string) => {
    setLivestock(current => current.some(item => item.species === species)
      ? current.filter(item => item.species !== species)
      : [...current, { species, animalCount: null, ageGroup: null, cattleStatus: species === 'Cattle' ? 'unknown' : null, vaccinatedThisYear: null, vaccinationDetails: null }]
    );
  };

  const submit = async () => {
    if (!farmName.trim()) { setSaveError('Enter a name for this farm.'); return; }
    if (!position) { setSaveError('Capture this farm’s GPS location first.'); return; }
    if (crops.length === 0) { setSaveError('Select at least one crop grown on this farm.'); return; }
    setSaving(true);
    setSaveError('');
    try {
      const normaliseArea = (value: string) => value.toLowerCase().replace(/\bdistrict\b/g, '').replace(/[^a-z]/g, '');
      const mappedDistrict = area?.district
        ? DISTRICTS.find(item => normaliseArea(item.name) === normaliseArea(area.district!))
        : undefined;
      // Use a district name returned by the map when it matches our district registry.
      // Otherwise retain the nearest-centroid value only as a compatibility fallback.
      const district = mappedDistrict ?? findNearestDistrict(position.latitude, position.longitude, DISTRICTS);
      await onSave({
        ...position,
        district,
        label: farmName.trim().slice(0, 60),
        crops,
        locationLabel: area?.displayName ?? null,
        village: area?.village ?? null,
        parish: area?.parish ?? null,
        subcounty: area?.subcounty ?? null,
        boundary,
        farmQuestionnaire: {
          yearsFarmedLand,
          previousSeasonCrops,
          seasonBeforePreviousCrops,
          waterPoolsAfterRain: waterPoolsAfterRain === 'yes' ? true : waterPoolsAfterRain === 'no' ? false : null,
          waterAccess,
        },
        cropDetails: crops.map(cropName => {
          const item = cropDetails[cropName] || { variety: '', plantingDate: '', areaSharePercent: '', inputSource: 'unknown', fertiliserManureApplied: '' };
          return {
            cropName,
            variety: item.variety.trim() || null,
            plantingDate: item.plantingDate || null,
            areaSharePercent: item.areaSharePercent.trim() && Number.isFinite(Number(item.areaSharePercent)) ? Math.min(100, Math.max(0, Number(item.areaSharePercent))) : null,
            inputSource: item.inputSource || 'unknown',
            fertiliserManureApplied: item.fertiliserManureApplied.trim() || null,
          };
        }),
        livestock: livestock.map(item => ({ ...item, vaccinationDetails: item.vaccinationDetails?.trim() || null })),
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save this farm. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f1ebdc]">
      <div className="mx-auto flex min-h-full w-full max-w-xl flex-col px-4 py-7 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#56715f]">Omulimi · Farm profile</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#1d2d27]">{title}</h1>
            <p className="mt-1 text-sm text-[#66746b]">Each farm has its own location, crops and livestock.</p>
          </div>
          {onCancel && <button onClick={onCancel} aria-label="Close" className="rounded-full p-2 text-[#66746b]"><X className="h-5 w-5"/></button>}
        </div>

        <section className="mb-4 rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
          <label htmlFor="farm-name" className="block text-sm font-semibold text-[#1d2d27]">Farm name</label>
          <p className="mt-1 text-xs text-[#66746b]">Give this farm a name you will recognise.</p>
          <input id="farm-name" type="text" maxLength={60} value={farmName} onChange={event => setFarmName(event.target.value)} placeholder="e.g. Home Farm" className="mt-3 w-full rounded-xl border border-[#e6dcc8] bg-white px-3 py-3 text-sm text-[#1d2d27] outline-none focus:border-[#285b40]" />
        </section>

        <section className="rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7eddf]"><MapPin className="h-5 w-5 text-[#285b40]"/></span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-[#1d2d27]">Farm location</h2>
              <p className="mt-1 text-xs leading-5 text-[#66746b]">Stand at or near this farm before capturing its location. Omulimi saves the GPS coordinates and the accuracy reported by your device.</p>
            </div>
          </div>
          <button onClick={captureLocation} disabled={locationStatus === 'detecting' || geocoding} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#174432] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
            {locationStatus === 'detecting' ? <><Loader2 className="h-4 w-4 animate-spin"/>Getting GPS location…</> : geocoding ? <><Loader2 className="h-4 w-4 animate-spin"/>Looking up area…</> : <><LocateFixed className="h-4 w-4"/> {position ? 'Capture location again' : 'Capture farm GPS location'}</>}
          </button>
          {position && <div className="mt-3 rounded-xl bg-[#e7eddf] p-3 text-xs text-[#285b40]">
            <p className="font-semibold">GPS location captured</p>
            <p className="mt-1">Accuracy reported: ±{Math.round(position.accuracyM)} metres</p>
            <p className="mt-1 break-all">Coordinates: {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}</p>
            {position.accuracyM > 100 && <p className="mt-1">This reading is not very precise. Try again in a more open area if possible.</p>}
          </div>}
          {geocoding && <p className="mt-2 text-xs text-[#66746b]">Looking up nearby area names…</p>}
          {area && <div className="mt-3 rounded-xl border border-[#d8e2d0] bg-white p-3 text-xs text-[#405148]">
            <p className="font-semibold text-[#174432]">Mapped area (where available)</p>
            <p className="mt-1">{[area.village, area.parish, area.subcounty, area.district, area.region].filter(Boolean).join(' · ') || area.displayName || 'No administrative labels found'}</p>
            <p className="mt-1 text-[11px] text-[#7b867d]">Area names come from OpenStreetMap and may be incomplete. GPS coordinates remain the location reference. © OpenStreetMap contributors.</p>
          </div>}
          {locationError && <p role="alert" className="mt-3 text-xs text-rose-700">{locationError}</p>}
        </section>

        <section className="mt-4 rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e7eddf]"><MapPin className="h-5 w-5 text-[#285b40]"/></span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-[#1d2d27]">Farm boundary (optional)</h2>
              <p className="mt-1 text-xs leading-5 text-[#66746b]">Walk around the edge of this plot while GPS records its shape. You can add or map more plots later. If you skip this, Omulimi keeps the farm point and marks the boundary as not yet mapped.</p>
            </div>
          </div>
          {!recordingBoundary && !boundary && <button type="button" onClick={startBoundaryWalk} disabled={!position} className="mt-3 w-full rounded-xl border border-[#285b40] bg-white px-4 py-3 text-sm font-semibold text-[#174432] disabled:opacity-50">Start GPS boundary walk</button>}
          {recordingBoundary && <div className="mt-3 rounded-xl bg-[#e7eddf] p-3">
            <p className="text-sm font-semibold text-[#174432]">Recording boundary · {boundaryPoints.length} points</p>
            <p className="mt-1 text-xs leading-5 text-[#52645a]">Keep Omulimi open and walk along the plot edge. GPS points are collected on this device; a data connection is not required for recording.</p>
            <button type="button" onClick={finishBoundaryWalk} className="mt-3 w-full rounded-xl bg-[#174432] px-4 py-3 text-sm font-semibold text-white">Finish boundary</button>
          </div>}
          {boundary && <div className="mt-3 rounded-xl border border-[#d8e2d0] bg-white p-3">
            <p className="text-sm font-semibold text-[#174432]">Boundary recorded</p>
            <p className="mt-1 text-xs text-[#52645a]">Approximate area: {boundary.areaAcres.toFixed(2)} acres · {boundary.areaHectares.toFixed(2)} hectares</p>
            <p className="mt-1 text-xs text-[#7b867d]">Centre: {boundary.centroidLatitude.toFixed(6)}, {boundary.centroidLongitude.toFixed(6)}</p>
            <button type="button" onClick={removeBoundary} className="mt-2 text-xs font-semibold text-[#8b4b35]">Remove boundary and use farm point</button>
          </div>}
          {boundaryError && <p role="alert" className="mt-2 text-xs text-rose-700">{boundaryError}</p>}
          {!position && <p className="mt-2 text-xs text-[#879188]">Capture the farm GPS location above to enable boundary walking.</p>}
        </section>

        <section className="mt-4 rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
          <h2 className="font-semibold text-[#1d2d27]">About this land</h2>
          <p className="mt-1 text-xs text-[#66746b]">Answer what you know. Every question can be skipped.</p>
          <label className="mt-3 block text-xs font-semibold text-[#52645a]">How long have you farmed this land?</label>
          <select value={yearsFarmedLand} onChange={event => setYearsFarmedLand(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e6dcc8] bg-white px-3 py-3 text-sm">
            <option value="unknown">I don't know / skip</option><option value="under_1_year">Less than 1 year</option><option value="1_to_5_years">1–5 years</option><option value="6_to_10_years">6–10 years</option><option value="over_10_years">More than 10 years</option>
          </select>
          <div className="mt-4">
            <p className="text-xs font-semibold text-[#52645a]">Which crops did you grow last season?</p>
            <div className="mt-2 grid grid-cols-2 gap-2">{SUPPORTED_CROP_NAMES.map(crop => <button key={'last-'+crop} type="button" onClick={() => togglePreviousCrop(crop,'last')} className={`rounded-lg border px-2 py-2 text-left text-xs ${previousSeasonCrops.includes(crop) ? 'border-[#285b40] bg-[#e7eddf] font-semibold text-[#174432]' : 'border-[#e6dcc8] bg-white text-[#536158]'}`}>{previousSeasonCrops.includes(crop) ? '✓ ' : ''}{crop}</button>)}</div>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-[#52645a]">Which crops did you grow the season before that?</p>
            <div className="mt-2 grid grid-cols-2 gap-2">{SUPPORTED_CROP_NAMES.map(crop => <button key={'before-'+crop} type="button" onClick={() => togglePreviousCrop(crop,'before')} className={`rounded-lg border px-2 py-2 text-left text-xs ${seasonBeforePreviousCrops.includes(crop) ? 'border-[#285b40] bg-[#e7eddf] font-semibold text-[#174432]' : 'border-[#e6dcc8] bg-white text-[#536158]'}`}>{seasonBeforePreviousCrops.includes(crop) ? '✓ ' : ''}{crop}</button>)}</div>
          </div>
          <label className="mt-4 block text-xs font-semibold text-[#52645a]">Does water pool anywhere after heavy rain?</label>
          <select value={waterPoolsAfterRain} onChange={event => setWaterPoolsAfterRain(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e6dcc8] bg-white px-3 py-3 text-sm"><option value="unknown">I don't know / skip</option><option value="yes">Yes</option><option value="no">No</option></select>
          <label className="mt-4 block text-xs font-semibold text-[#52645a]">What water source can you access?</label>
          <select value={waterAccess} onChange={event => setWaterAccess(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e6dcc8] bg-white px-3 py-3 text-sm"><option value="unknown">I don't know / skip</option><option value="stream">Stream</option><option value="well">Well</option><option value="dam">Dam</option><option value="none">No water source</option></select>
        </section>

        <section className="mt-4 rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
          <h2 className="font-semibold text-[#1d2d27]">What do you grow here?</h2>
          <p className="mt-1 text-xs text-[#66746b]">Select all crops grown on this farm.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {SUPPORTED_CROP_NAMES.map(crop => <button key={crop} type="button" onClick={() => toggleCrop(crop)} className={`rounded-xl border px-3 py-3 text-left text-sm ${crops.includes(crop) ? 'border-[#285b40] bg-[#e7eddf] font-semibold text-[#174432]' : 'border-[#e6dcc8] bg-white text-[#536158]'}`}>{crops.includes(crop) ? '✓ ' : ''}{crop}</button>)}
          </div>
        </section>

        {crops.length > 0 && <section className="mt-4 rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
          <h2 className="font-semibold text-[#1d2d27]">Crop details</h2>
          <p className="mt-1 text-xs text-[#66746b]">These details help Kato time advice. Skip anything you do not know.</p>
          {crops.map(crop => <div key={crop} className="mt-4 border-t border-[#e6dcc8] pt-3 first:border-0 first:pt-0">
            <h3 className="text-sm font-semibold text-[#174432]">{crop}</h3>
            <label className="mt-2 block text-xs font-medium text-[#52645a]">Variety (if known)</label>
            <input value={cropDetails[crop]?.variety || ''} onChange={event => updateCropDetail(crop,'variety',event.target.value)} placeholder="Variety name or leave blank" className="mt-1 w-full rounded-xl border border-[#e6dcc8] bg-white px-3 py-2.5 text-sm"/>
            <label className="mt-2 block text-xs font-medium text-[#52645a]">Planting date (actual or planned)</label>
            <input type="date" value={cropDetails[crop]?.plantingDate || ''} onChange={event => updateCropDetail(crop,'plantingDate',event.target.value)} className="mt-1 w-full rounded-xl border border-[#e6dcc8] bg-white px-3 py-2.5 text-sm"/>
            <label className="mt-2 block text-xs font-medium text-[#52645a]">Share of this farm under {crop} (%)</label>
            <input type="number" min="0" max="100" step="1" value={cropDetails[crop]?.areaSharePercent || ''} onChange={event => updateCropDetail(crop,'areaSharePercent',event.target.value)} placeholder="I don't know / skip" className="mt-1 w-full rounded-xl border border-[#e6dcc8] bg-white px-3 py-2.5 text-sm"/>
            <label className="mt-2 block text-xs font-medium text-[#52645a]">Where do you get seed and inputs?</label>
            <select value={cropDetails[crop]?.inputSource || 'unknown'} onChange={event => updateCropDetail(crop,'inputSource',event.target.value)} className="mt-1 w-full rounded-xl border border-[#e6dcc8] bg-white px-3 py-2.5 text-sm"><option value="unknown">I don't know / skip</option><option value="shop">Shop</option><option value="cooperative">Cooperative</option><option value="saved_seed">Saved seed</option><option value="other">Other</option></select>
            <label className="mt-2 block text-xs font-medium text-[#52645a]">Fertiliser or manure applied this season?</label>
            <input value={cropDetails[crop]?.fertiliserManureApplied || ''} onChange={event => updateCropDetail(crop,'fertiliserManureApplied',event.target.value)} placeholder="Name it, or leave blank" className="mt-1 w-full rounded-xl border border-[#e6dcc8] bg-white px-3 py-2.5 text-sm"/>
          </div>)}
        </section>}

        <section className="mt-4 rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
          <h2 className="font-semibold text-[#1d2d27]">Do you keep livestock here?</h2>
          <p className="mt-1 text-xs text-[#66746b]">Choose any that apply. Animal counts are optional.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {LIVESTOCK_OPTIONS.map(species => <button key={species} type="button" onClick={() => addLivestock(species)} className={`rounded-full border px-3 py-2 text-xs ${livestock.some(item => item.species === species) ? 'border-[#285b40] bg-[#e7eddf] font-semibold text-[#174432]' : 'border-[#e6dcc8] bg-white text-[#536158]'}`}>{species}</button>)}
          </div>
          {livestock.map(item => <div key={item.species} className="mt-3 rounded-xl bg-white p-3">
            <label className="flex items-center justify-between gap-3 text-sm text-[#405148]"><span className="font-medium">{item.species}</span>
              <input inputMode="numeric" type="number" min="0" step="1" placeholder="Number (optional)" value={item.animalCount ?? ''} onChange={event => setLivestock(current => current.map(row => row.species === item.species ? { ...row, animalCount: event.target.value.trim() && Number.isFinite(Number(event.target.value)) ? Math.max(0, Math.floor(Number(event.target.value))) : null } : row))} className="w-40 rounded-lg border border-[#e6dcc8] bg-white px-3 py-2 text-right text-xs"/>
            </label>
            {item.species === 'Cattle' && <>
              <label className="mt-3 block text-xs font-medium text-[#52645a]">Cattle status (not birthdays)</label>
              <select value={item.cattleStatus || 'unknown'} onChange={event => setLivestock(current => current.map(row => row.species === item.species ? { ...row, cattleStatus: event.target.value } : row))} className="mt-1 w-full rounded-lg border border-[#e6dcc8] bg-white px-3 py-2.5 text-sm"><option value="unknown">I don't know / skip</option><option value="milking">Milking</option><option value="pregnant">Pregnant</option><option value="young">Young</option></select>
            </>}
            <label className="mt-3 block text-xs font-medium text-[#52645a]">Vaccinated this year?</label>
            <select value={item.vaccinatedThisYear === true ? 'yes' : item.vaccinatedThisYear === false ? 'no' : 'unknown'} onChange={event => setLivestock(current => current.map(row => row.species === item.species ? { ...row, vaccinatedThisYear: event.target.value === 'yes' ? true : event.target.value === 'no' ? false : null } : row))} className="mt-1 w-full rounded-lg border border-[#e6dcc8] bg-white px-3 py-2.5 text-sm"><option value="unknown">I don't know / skip</option><option value="yes">Yes</option><option value="no">No</option></select>
            {item.vaccinatedThisYear === true && <><label className="mt-2 block text-xs font-medium text-[#52645a]">Against what, if known?</label><input value={item.vaccinationDetails || ''} onChange={event => setLivestock(current => current.map(row => row.species === item.species ? { ...row, vaccinationDetails: event.target.value } : row))} placeholder="Vaccine or disease name" className="mt-1 w-full rounded-lg border border-[#e6dcc8] bg-white px-3 py-2.5 text-sm"/></>}
          </div>)}
        </section>

        {saveError && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{saveError}</p>}
        <button onClick={submit} disabled={saving || !position || crops.length === 0} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#174432] px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin"/>Saving farm…</> : <><Sprout className="h-4 w-4"/>Save farm profile</>}
        </button>
        {onCancel && <button onClick={onCancel} className="mt-3 w-full py-2 text-sm text-[#66746b]">Cancel</button>}
      </div>
    </div>
  );
}
