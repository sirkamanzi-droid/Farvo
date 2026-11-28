import { useEffect, useRef, useState } from 'react';
import { MapPin, LocateFixed, Loader2, Sprout, X } from 'lucide-react';
import { DISTRICTS } from '../data/districts';
import { findNearestDistrict, type LocationStatus } from '../data/geolocation';
import { SUPPORTED_CROP_NAMES } from '../data/supportedCrops';
import type { District } from '../types';
import { supabase } from '../lib/supabase';
import type { FarmPlotBoundary } from '../data/farms';

type BoundaryPoint = { latitude: number; longitude: number; accuracyM: number; capturedAt: string };

function distanceMetres(a: BoundaryPoint, b: BoundaryPoint) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function buildGpsBoundary(points: BoundaryPoint[]): FarmPlotBoundary {
  const first = points[0];
  const ring: [number, number][] = points.map(point => [point.longitude, point.latitude]);
  ring.push([first.longitude, first.latitude]);

  const meanLatitude = points.reduce((sum, point) => sum + point.latitude, 0) / points.length;
  const radians = Math.PI / 180;
  const scaleX = 111320 * Math.cos(meanLatitude * radians);
  const scaleY = 110540;
  const projected = points.map(point => ({
    x: point.longitude * scaleX,
    y: point.latitude * scaleY,
  }));
  let twiceArea = 0;
  let centroidX = 0;
  let centroidY = 0;
  for (let index = 0; index < projected.length; index++) {
    const current = projected[index];
    const next = projected[(index + 1) % projected.length];
    const cross = current.x * next.y - next.x * current.y;
    twiceArea += cross;
    centroidX += (current.x + next.x) * cross;
    centroidY += (current.y + next.y) * cross;
  }
  const planarArea = Math.abs(twiceArea / 2);
  const centroidLatitude = Math.abs(twiceArea) > 0.01
    ? centroidY / (3 * twiceArea) / scaleY
    : meanLatitude;
  const centroidLongitude = Math.abs(twiceArea) > 0.01
    ? centroidX / (3 * twiceArea) / scaleX
    : points.reduce((sum, point) => sum + point.longitude, 0) / points.length;

  let sphericalArea = 0;
  for (let index = 0; index < ring.length - 1; index++) {
    const [lon1, lat1] = ring[index];
    const [lon2, lat2] = ring[index + 1];
    sphericalArea += (lon2 - lon1) * radians *
      (2 + Math.sin(lat1 * radians) + Math.sin(lat2 * radians));
  }
  const areaSquareMetres = Math.abs(sphericalArea * 6371008.8 * 6371008.8 / 2);
  const areaAcres = areaSquareMetres / 4046.8564224;
  const areaHectares = areaSquareMetres / 10000;
  if (!Number.isFinite(planarArea) || !Number.isFinite(areaAcres) || areaAcres <= 0 ||
      !Number.isFinite(centroidLatitude) || !Number.isFinite(centroidLongitude)) {
    throw new Error('We could not calculate this boundary. Walk the plot again with a clearer GPS signal.');
  }
  return {
    coordinates: ring,
    centroidLatitude,
    centroidLongitude,
    areaAcres,
    areaHectares,
    mappingMethod: 'gps_walk',
  };
}

export type FarmSetupResult = {
  latitude: number;
  longitude: number;
  accuracyM: number;
  capturedAt: string;
  district: District;
  label: string;
  crops: string[];
  livestock: Array<{ species: string; animalCount: number | null }>;
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
  initialLivestock?: Array<{ species: string; animalCount: number | null }>;
  onSave: (result: FarmSetupResult) => Promise<void>;
};

const LIVESTOCK_OPTIONS = ['Cattle', 'Goats', 'Sheep', 'Pigs', 'Chicken', 'Ducks', 'Turkeys', 'Rabbits', 'Fish'];

export default function FarmSetup({ title = 'Set up your farm', onCancel, initialCrops = [], initialLabel = 'My farm', initialLivestock = [], onSave }: Props) {
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
  const [livestock, setLivestock] = useState<Array<{ species: string; animalCount: string }>>(() => initialLivestock.map(item => ({ species: item.species, animalCount: item.animalCount === null ? '' : String(item.animalCount) })));
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

  const toggleCrop = (crop: string) => setCrops(current =>
    current.includes(crop) ? current.filter(item => item !== crop) : [...current, crop]
  );

  const addLivestock = (species: string) => {
    setLivestock(current => current.some(item => item.species === species)
      ? current.filter(item => item.species !== species)
      : [...current, { species, animalCount: '' }]
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
        livestock: livestock.map(item => ({
          species: item.species,
          animalCount: item.animalCount.trim() && Number.isFinite(Number(item.animalCount))
            ? Math.max(0, Math.floor(Number(item.animalCount))) : null,
        })),
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
          <h2 className="font-semibold text-[#1d2d27]">What do you grow here?</h2>
          <p className="mt-1 text-xs text-[#66746b]">Select all crops grown on this farm.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {SUPPORTED_CROP_NAMES.map(crop => <button key={crop} type="button" onClick={() => toggleCrop(crop)} className={`rounded-xl border px-3 py-3 text-left text-sm ${crops.includes(crop) ? 'border-[#285b40] bg-[#e7eddf] font-semibold text-[#174432]' : 'border-[#e6dcc8] bg-white text-[#536158]'}`}>{crops.includes(crop) ? '✓ ' : ''}{crop}</button>)}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[#e6dcc8] bg-[#faf7ef] p-4">
          <h2 className="font-semibold text-[#1d2d27]">Do you keep livestock here?</h2>
          <p className="mt-1 text-xs text-[#66746b]">Choose any that apply. Animal counts are optional.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {LIVESTOCK_OPTIONS.map(species => <button key={species} type="button" onClick={() => addLivestock(species)} className={`rounded-full border px-3 py-2 text-xs ${livestock.some(item => item.species === species) ? 'border-[#285b40] bg-[#e7eddf] font-semibold text-[#174432]' : 'border-[#e6dcc8] bg-white text-[#536158]'}`}>{species}</button>)}
          </div>
          {livestock.map(item => <label key={item.species} className="mt-3 flex items-center justify-between gap-3 text-sm text-[#405148]">
            <span>{item.species}</span>
            <input inputMode="numeric" type="number" min="0" step="1" placeholder="Number (optional)" value={item.animalCount} onChange={event => setLivestock(current => current.map(row => row.species === item.species ? { ...row, animalCount: event.target.value } : row))} className="w-40 rounded-lg border border-[#e6dcc8] bg-white px-3 py-2 text-right text-xs"/>
          </label>)}
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
