import React, { useState, useRef, useEffect } from 'react';
import DiagnosisKatoPanel from './DiagnosisKatoPanel';
import DiagnosisCarePanel from './DiagnosisCarePanel';
import type { WeatherData } from '../types';
import { findMismatchedDiseaseHost, isGenericDiseaseLabel, matchesSelectedCropPlant } from '../utils/diseaseValidation';
import { supabase } from '../lib/supabase';
import { SUPPORTED_CROPS } from '../data/supportedCrops';
import { Camera, Image as ImageIcon, Lightbulb, Sprout, ChevronLeft, Search, Check, Scan, Loader2, RotateCcw, MoreVertical } from 'lucide-react';

interface Crop {
  id: string;
  name: string;
  emoji: string;
  diseaseSupported: boolean;
}

const CROPS: Crop[] = SUPPORTED_CROPS.map(crop => ({ ...crop, diseaseSupported: true }));



type DiseaseView = 'home' | 'cropSelect' | 'capture' | 'analyzing' | 'result' | 'saved';

interface Diagnosis {
  outcome: 'disease' | 'healthy' | 'no_match' | 'uncertain';
  diseaseName?: string;
  simpleDiseaseName?: string;
  diseaseExplanation?: string;
  confidence: number;
  severity?: 'Low' | 'Moderate' | 'High';
  affectedPart?: string;
  whatObserved?: string;
}

type SavedDiagnosis = { id: string; crop_name: string; district_name: string; issue_name: string; started_at: string; source_scan: Record<string, unknown> | null; care_plan: Record<string, unknown> | null };

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

async function prepareDiseasePhoto(file: File): Promise<string> {
  // Do not whitelist formats here. Let the device's image decoders open the
  // selected image, then normalize it to JPEG before it reaches our APIs.
  if (file.size === 0) throw new Error('This image is empty. Please choose another photo.');
  if (file.size > 15 * 1024 * 1024) throw new Error('This photo is larger than 15 MB. Choose a smaller image.');

  let bitmap: ImageBitmap | null = null;
  let objectUrl: string | null = null;
  let source: CanvasImageSource;
  let width = 0;
  let height = 0;

  try {
    // createImageBitmap supports more browser-native image formats than a
    // MIME-type allowlist and avoids relying on the filename extension.
    if (typeof createImageBitmap === 'function') {
      try {
        bitmap = await createImageBitmap(file);
        source = bitmap;
        width = bitmap.width;
        height = bitmap.height;
      } catch {
        // Fall back to the browser's standard image element decoder.
      }
    }

    if (!bitmap) {
      objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.src = objectUrl;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error(
          'This device could not read the selected image. Try opening it in your gallery and sharing or saving a compatible copy.'
        ));
      });
      source = image;
      width = image.naturalWidth;
      height = image.naturalHeight;
    }

    if (!width || !height) throw new Error('This image could not be read. Please choose another photo.');

    const scale = Math.min(1, 1600 / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not prepare this image. Please try again.');

    context.drawImage(source, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.86, 0.76, 0.66, 0.56]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob && blob.size > 0 && blob.size <= MAX_UPLOAD_BYTES) {
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => typeof reader.result === 'string'
            ? resolve(reader.result)
            : reject(new Error('The prepared image could not be read.'));
          reader.onerror = () => reject(new Error('The prepared image could not be read.'));
          reader.readAsDataURL(blob);
        });
      }
    }

    throw new Error('This photo is still too large after compression. Choose a smaller or lower-resolution photo.');
  } finally {
    bitmap?.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
type PlainDiseaseInfo = { simpleName: string; explanation: string };

function explainDisease(label: string): PlainDiseaseInfo {
  const value = label.toLowerCase();

  const known: { match: string[]; simpleName: string; explanation: string }[] = [
    { match: ['late blight', 'phytophthora infestans'], simpleName: 'Late blight', explanation: 'A disease that can cause dark, spreading patches on leaves and stems. It can develop quickly in cool, wet conditions.' },
    { match: ['early blight', 'alternaria solani'], simpleName: 'Early blight', explanation: 'A leaf disease that often causes brown spots, sometimes with ring-shaped patterns, and yellowing around affected areas.' },
    { match: ['bacterial wilt', 'ralstonia solanacearum'], simpleName: 'Bacterial wilt', explanation: 'A bacterial disease that blocks water movement inside the plant, causing leaves and stems to wilt even when the soil is moist.' },
    { match: ['coffee leaf rust', 'hemileia vastatrix'], simpleName: 'Coffee leaf rust', explanation: 'A fungal disease that causes yellow-orange powdery spots, usually on the underside of coffee leaves. Severe infections can lead to leaf loss.' },
    { match: ['coffee berry disease', 'colletotrichum kahawae'], simpleName: 'Coffee berry disease', explanation: 'A fungal disease that attacks developing coffee berries, causing dark, sunken lesions and berry loss.' },
    { match: ['banana xanthomonas wilt', 'banana bacterial wilt', 'xanthomonas campestris pv. musacearum'], simpleName: 'Banana bacterial wilt', explanation: 'A serious bacterial disease that can cause yellowing and wilting, premature ripening, and rotting of banana bunches.' },
    { match: ['black sigatoka', 'pseudocercospora fijiensis'], simpleName: 'Black Sigatoka', explanation: 'A fungal leaf disease that begins as small marks and develops into dark streaks, reducing the green leaf area used by the plant.' },
    { match: ['bean rust', 'uromyces appendiculatus'], simpleName: 'Bean rust', explanation: 'A fungal disease that produces small raised orange-brown powdery spots, commonly on bean leaves.' },
    { match: ['angular leaf spot', 'pseudocercospora griseola'], simpleName: 'Angular leaf spot', explanation: 'A bean disease that causes brown or grey spots limited by the small veins of the leaf, giving them an angular shape.' },
    { match: ['anthracnose', 'colletotrichum lindemuthianum'], simpleName: 'Anthracnose', explanation: 'A fungal disease that can cause dark sunken spots on leaves, stems, pods or fruit, depending on the crop.' },
    { match: ['maize streak', 'maize streak virus'], simpleName: 'Maize streak disease', explanation: 'A viral disease that causes thin yellow or pale streaks along maize leaves and can make plants stunted.' },
    { match: ['common rust', 'puccinia sorghi'], simpleName: 'Common rust', explanation: 'A fungal disease that forms small reddish-brown powdery spots on maize leaves.' },
    { match: ['gray leaf spot', 'grey leaf spot', 'cercospora zeae-maydis'], simpleName: 'Grey leaf spot', explanation: 'A maize leaf disease that causes long, rectangular grey or tan lesions, often between the leaf veins.' },
    { match: ['tomato leaf mold', 'passalora fulva'], simpleName: 'Tomato leaf mould', explanation: 'A fungal disease that often causes pale patches on the upper leaf surface and olive-brown mould on the underside, especially in humid conditions.' },
  ];

  const found = known.find(item => item.match.some(term => value.includes(term)));
  if (found) return { simpleName: found.simpleName, explanation: found.explanation };

  return {
    simpleName: label,
    explanation: 'This is the disease name returned by the image-check service. We do not yet have a verified plain-language explanation for this label.',
  };
}

async function computeDiagnosis(
  cropId: string,
  photoDataUrl: string
): Promise<Diagnosis> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (sessionError || !accessToken) throw new Error('Please sign in again to check your crop.');

    // Stage 1: identify the plant
    const plantResponse = await fetch('/api/plant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ imageDataUrl: photoDataUrl }),
    });

    const plantData = await plantResponse.json();

    if (!plantResponse.ok) {
      throw new Error(
        typeof plantData.error === 'string'
          ? plantData.error
          : 'The plant identification service could not process this photo.'
      );
    }

    const plantResults = Array.isArray(plantData.results)
      ? plantData.results
      : [];
    const bestPlant = plantResults[0];

    if (
      !bestPlant ||
      typeof bestPlant.score !== 'number' ||
      !bestPlant.scientificName
    ) {
      return {
        outcome: 'uncertain',
        confidence: 0,
        whatObserved:
          'We could not reliably identify a plant in this photo. Try a clear photo of the plant or affected leaf.',
      };
    }

    // Stage 2: compare the identified species with the selected crop.
    // Keep this conservative: unsupported or unmatched crops are not diagnosed.
    // Only proceed when the provider's strongest species candidate matches
    // the crop the farmer selected. A weaker later candidate is not enough.
    const topPlant = plantResults[0];
    const cropMatchesPlant = matchesSelectedCropPlant(
      cropId as 'maize' | 'beans' | 'coffee' | 'banana' | 'tomato' | 'potato',
      topPlant?.scientificName,
    );
    const matchingPlant = cropMatchesPlant ? topPlant : null;

    if (!cropMatchesPlant) {
      const selectedCrop =
        CROPS.find((crop) => crop.id === cropId)?.name ?? 'selected crop';

      const candidateSummary = plantResults
        .slice(0, 5)
        .map((candidate: any) => {
          const name =
            typeof candidate.scientificName === 'string'
              ? candidate.scientificName
              : 'Unknown species';

          const score =
            typeof candidate.score === 'number'
              ? ` (${Math.round(candidate.score * 100)}%)`
              : '';

          return `${name}${score}`;
        })
        .join('; ');

      return {
        outcome: 'uncertain',
        confidence: Math.round(bestPlant.score * 100),
        whatObserved:
          `The leading match was ${bestPlant.scientificName} (${Math.round(bestPlant.score * 100)}%), which does not match ${selectedCrop}. Other candidates: ${candidateSummary}. Please try a clearer photo.`,
      };
    }

    // Use only the top candidate after it has passed the selected-crop check.
    const cropCandidate = matchingPlant as { scientificName: string; score: number };

    // Stage 3: only after crop validation, request disease identification.
    const diseaseResponse = await fetch('/api/disease', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        imageDataUrl: photoDataUrl,
        cropId,
      }),
    });

    const diseaseData = await diseaseResponse.json();

    if (!diseaseResponse.ok) {
      throw new Error(
        typeof diseaseData.error === 'string'
          ? diseaseData.error
          : 'The disease detection service could not process this photo.'
      );
    }

    if (!Array.isArray(diseaseData.results)) {
      return {
        outcome: 'uncertain',
        confidence: 0,
        whatObserved:
          'The disease service returned an unexpected response. We cannot assess this photo reliably. Please try again later or ask an agricultural extension officer.',
      };
    }

    // Pl@ntNet returns probable disease candidates, not a verified healthy verdict.
    // An empty candidate list is therefore reported as "no match", never "100% healthy".
    if (diseaseData.results.length === 0) {
      return {
        outcome: 'no_match',
        confidence: 0,
        whatObserved:
          'The scan did not return a disease match for this photo. This does not prove that the whole plant is disease-free. Keep monitoring your crop and seek advice if symptoms appear or spread.',
      };
    }

    const match = diseaseData.results[0];

    if (
      !match ||
      typeof match.score !== 'number' ||
      !Number.isFinite(match.score) ||
      match.score < 0 ||
      match.score > 1
    ) {
      return {
        outcome: 'uncertain',
        confidence: 0,
        whatObserved:
          'The disease service returned a result that could not be interpreted reliably. Please try another clear photo or ask an agricultural extension officer.',
      };
    }

    // Reject this generic Pl@ntNet result instead of presenting it as a named diagnosis.
    const diseaseLabel =
      typeof match.description === 'string' ? match.description.trim() : '';

    const normalizedDiseaseLabel = (String(match.name ?? '') + ' ' + diseaseLabel)
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    // Broad pathogen groups and unclassified labels are not specific diagnoses.
    const isGenericResult = isGenericDiseaseLabel(match.name, match.description);

    if (isGenericResult) {
      return {
        outcome: 'no_match',
        confidence: 0,
        whatObserved:
          'The crop was identified, but the scan did not return a specific disease match. This does not prove the plant is disease-free. Keep monitoring it and seek local advice if symptoms appear or spread.',
      };
    }

    // Scan the complete provider label for other crop hosts. Provider wording
    // varies, so checking only a trailing "of <crop>" phrase is not sufficient.
    const mismatchedHost = findMismatchedDiseaseHost(
      cropId as 'maize' | 'beans' | 'coffee' | 'banana' | 'tomato' | 'potato',
      normalizedDiseaseLabel,
    );
    if (mismatchedHost) {
      return {
        outcome: 'no_match',
        confidence: 0,
        whatObserved:
          `The provider's label refers to "${mismatchedHost}", not the selected crop. We will not show it as a diagnosis for this plant. The scan did not return a verified crop-specific disease match.`,
      };
    }

    const confidence = Math.round(match.score * 100);

    // Temporary conservative gate, not a clinically or scientifically validated threshold.
    if (confidence < 30) {
      return {
        outcome: 'no_match',
        confidence,
        whatObserved:
          'The crop was identified, but the disease service did not return a strong enough match to name a disease. This does not prove the plant is disease-free. Keep monitoring it and seek local advice if symptoms appear or spread.',
      };
    }

    const providerDiseaseName = match.description || match.name || 'Possible plant disease';
    const plainDiseaseInfo = explainDisease(providerDiseaseName);

    return {
      outcome: 'disease',
      diseaseName: providerDiseaseName,
      simpleDiseaseName: plainDiseaseInfo.simpleName,
      diseaseExplanation: plainDiseaseInfo.explanation,
      confidence,
      whatObserved:
        `The photo was identified as ${cropCandidate.scientificName}. This is a possible disease match, not a confirmed diagnosis. Check the visible symptoms before taking action.`,
    };
  } catch (error) {
    console.error('Disease detection failed:', error);

    return {
      outcome: 'uncertain',
      confidence: 0,
      whatObserved:
        error instanceof Error
          ? error.message
          : 'Unable to check this photo right now. Please try again.',
    };
  }
}



export default function DiseaseDetection({
  onCreateCarePlan,
  userId,
  farmId,
  districtName,
  weatherData,
  weatherDistrictName,
}: {
  onCreateCarePlan: (input: { farmId: string; cropName: string; diagnosis: Diagnosis }) => Promise<string>;
  userId: string;
  farmId: string;
  districtName: string;
  weatherData: WeatherData | null;
  weatherDistrictName: string | null;
}) {
  const [view, setView] = useState<DiseaseView>('home');
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<number>(0);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [carePlanStatus, setCarePlanStatus] = useState<'idle'|'creating'|'created'|'error'>('idle');
  const [carePlanId, setCarePlanId] = useState<string | null>(null);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [savedDiagnoses, setSavedDiagnoses] = useState<SavedDiagnosis[]>([]);
  const [activeSavedDiagnosis, setActiveSavedDiagnosis] = useState<SavedDiagnosis | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [farmCrops, setFarmCrops] = useState<Crop[]>([]);
  const [farmContextLoading, setFarmContextLoading] = useState(true);
  const [farmContextError, setFarmContextError] = useState<string | null>(null);

  const cropKey = (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z]/g, '');
    if (normalized.includes('banana') || normalized.includes('matooke')) return 'banana';
    if (normalized.includes('potato')) return 'potato';
    if (normalized.includes('maize')) return 'maize';
    if (normalized.includes('bean')) return 'beans';
    if (normalized.includes('coffee')) return 'coffee';
    if (normalized.includes('tomato')) return 'tomato';
    return normalized;
  };

  const loadFarmContext = async () => {
    setFarmContextLoading(true);
    setFarmContextError(null);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (sessionError || !token) throw new Error('Please sign in again to load this farm.');
      const response = await fetch(`/api/farm-context?farmId=${encodeURIComponent(farmId)}&cropCarePlanLimit=30`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Could not load this farm’s crop information.');
      }
      const context = await response.json() as {
        farm?: { crop?: string };
        crops?: Array<{ id: string; crop_name: string }>;
        cropCarePlans?: SavedDiagnosis[];
      };
      const registeredNames = (context.crops || []).map(crop => crop.crop_name);
      const farmCropNames = registeredNames.length ? registeredNames : (context.farm?.crop ? [context.farm.crop] : []);
      const registeredCrops = CROPS.filter(crop => farmCropNames.some(name => cropKey(name) === crop.id));
      setFarmCrops(registeredCrops);
      setSavedDiagnoses((context.cropCarePlans || []) as SavedDiagnosis[]);
      if (registeredCrops.length === 0) {
        setFarmContextError('No supported crops are registered for this farm yet. Update the farm’s crop details before starting a scan.');
      }
    } catch (error) {
      console.warn('Could not load shared farm context for crop checks:', error);
      setFarmContextError(error instanceof Error ? error.message : 'Farm information is temporarily unavailable.');
      setFarmCrops([]);
      setSavedDiagnoses([]);
    } finally {
      setFarmContextLoading(false);
    }
  };

  useEffect(() => { void loadFarmContext(); }, [userId, farmId]);
  useEffect(() => {
    setView('home');
    setSelectedCrop(null);
    setPhotoDataUrl(null);
    setPhotoError(null);
    setDiagnosis(null);
  }, [farmId]);

  async function handleDeleteDiagnosis(item: SavedDiagnosis) {
    const confirmed = window.confirm(`Delete this ${item.crop_name} crop check? Its care plan, activities and check-ins will also be deleted. This cannot be undone.`);
    if (!confirmed) {
      setOpenMenuId(null);
      return;
    }

    setDeletingId(item.id);
    setDeleteError(null);
    const { error } = await supabase.from('crop_care_plans')
      .delete()
      .eq('id', item.id)
      .eq('user_id', userId);

    if (error) {
      console.error('Could not delete crop check:', error);
      setDeleteError('This crop check could not be deleted. Please try again.');
    } else {
      setSavedDiagnoses(current => current.filter(check => check.id !== item.id));
      if (activeSavedDiagnosis?.id === item.id) {
        setActiveSavedDiagnosis(null);
        setView('home');
      }
    }
    setDeletingId(null);
    setOpenMenuId(null);
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoError(null);
    setCarePlanStatus('idle');
    setCarePlanId(null);
    const scanStartedAt = new Date().toISOString();
    setScannedAt(scanStartedAt);
    try {
      const dataUrl = await prepareDiseasePhoto(file);
      setPhotoDataUrl(dataUrl);
      setView('analyzing');
      setCheckedSteps(0);
      runAnalysisSequence(dataUrl, scanStartedAt);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'This photo could not be prepared. Please try another.');
    }
  }

  async function runAnalysisSequence(dataUrl: string, scanStartedAt: string) {
    const delays = [400, 900, 1400];
    delays.forEach((delay, idx) => {
      setTimeout(() => setCheckedSteps(idx + 1), delay);
    });

    const cropId = selectedCrop?.id || 'maize';
    const result = await computeDiagnosis(cropId, dataUrl);
    const eventKey = `disease-scan:${crypto.randomUUID()}`;
    const scanTimestamp = scanStartedAt;

    const saveScanEvent = async (sourceRecordId: string | null = null) => {
      const { error } = await supabase.from('farm_events').insert({
        user_id: userId,
        farm_id: farmId,
        event_type: 'disease_detection',
        occurred_at: scanTimestamp,
        source: 'farmer',
        source_record_type: sourceRecordId ? 'crop_care_plans' : null,
        source_record_id: sourceRecordId,
        idempotency_key: eventKey,
        payload: {
          crop_id: cropId,
          crop_name: selectedCrop?.name || cropId,
          district_name: districtName,
          outcome: result.outcome,
          disease_name: result.diseaseName || null,
          simple_disease_name: result.simpleDiseaseName || null,
          confidence_score: result.confidence,
          observations: result.whatObserved || null,
          scanned_at: scanTimestamp,
          confidence_is_diagnostic_accuracy: false,
        },
      });
      if (error) console.error('Could not save crop scan to farm history:', error);
    };

    const minimumDisplayTime = 1800;
    setTimeout(() => {
      setDiagnosis(result);
      setView('result');
      if (result.outcome === 'disease' && selectedCrop) {
        setCarePlanStatus('creating');
        void onCreateCarePlan({ farmId, cropName: selectedCrop.name, diagnosis: result })
          .then(async (id) => {
            setCarePlanId(id);
            setCarePlanStatus('created');
            await saveScanEvent(id);
            await loadFarmContext();
          })
          .catch(async (error) => {
            console.error('Automatic crop-care plan creation failed:', error);
            setCarePlanStatus('error');
            await saveScanEvent();
          });
      } else {
        void saveScanEvent();
      }
    }, minimumDisplayTime);
  }

  const filteredCrops = farmCrops.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (view === 'cropSelect') {
    return (
      <section className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('home')} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e8eee2] text-[#28583d]"><ChevronLeft className="h-5 w-5" /></button>
          <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7b916e]">FIELD SCAN · 01</p><h2 className="text-xl font-bold text-[#24392b]">Choose your crop</h2></div>
        </div>
        <div className="rounded-3xl bg-[#1d4b35] p-4 text-white">
          <div className="flex items-center gap-2"><Sprout className="h-5 w-5 text-[#d8c58c]" /><span className="text-sm font-semibold">What are you growing?</span></div>
          <p className="mt-1 text-xs leading-relaxed text-white/75">Choose a crop registered on this farm. The scan checks supported crops only.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#829084]" />
          <input type="search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search crops" className="w-full rounded-2xl border-0 bg-white py-3.5 pl-11 pr-4 text-sm text-[#24392b] shadow-sm outline-none ring-1 ring-[#e5e9df] focus:ring-2 focus:ring-[#527a55]" />
        </div>
        {farmContextLoading && <p className="text-sm text-[#718074]">Loading crops registered on this farm…</p>}
        {farmContextError && <div role="alert" className="rounded-xl bg-[#fff6df] p-3 text-xs text-[#735523]">{farmContextError} <button onClick={() => void loadFarmContext()} className="ml-1 font-semibold underline">Try again</button></div>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filteredCrops.map(crop => {
            const active = selectedCrop?.id === crop.id;
            const unavailable = !crop.diseaseSupported;
            return <button key={crop.id} disabled={unavailable} onClick={() => setSelectedCrop(crop)} className={`relative flex min-h-28 flex-col items-start justify-between rounded-2xl p-4 text-left transition ${unavailable ? 'cursor-not-allowed bg-[#f0f0e9] opacity-55' : active ? 'bg-[#e8eee2] ring-2 ring-[#527a55]' : 'bg-white ring-1 ring-[#e6e9df] hover:ring-[#a9b9a3]'}`}>
              <span className="text-2xl">{crop.emoji}</span><span className="text-sm font-semibold text-[#263b2d]">{crop.name}</span>
              {unavailable ? <span className="text-[10px] text-[#879087]">Not supported yet</span> : active && <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#527a55]"><Check className="h-3 w-3 text-white" /></span>}
            </button>;
          })}
        </div>
        <button onClick={() => selectedCrop && setView('capture')} disabled={!selectedCrop} className="w-full rounded-2xl bg-[#1d4b35] py-4 text-sm font-semibold text-white shadow-sm transition disabled:bg-[#c9d0c5]">Continue to photo <span aria-hidden="true">→</span></button>
      </section>
    );
  }

  if (view === 'capture') {
    return (
      <section className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('cropSelect')} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e8eee2] text-[#28583d]"><ChevronLeft className="h-5 w-5" /></button>
          <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7b916e]">FIELD SCAN · 02</p><h2 className="text-xl font-bold text-[#24392b]">Capture a plant photo</h2></div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-[#e8eee2] p-4">
          <span className="text-3xl">{selectedCrop?.emoji}</span><div><p className="text-[10px] font-bold uppercase tracking-wide text-[#71866e]">Selected crop</p><p className="text-sm font-semibold text-[#263b2d]">{selectedCrop?.name}</p></div>
        </div>
        {photoError && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{photoError}</div>}
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelected} className="hidden" />
        <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFileSelected} className="hidden" />
        <div className="rounded-3xl bg-white p-5 ring-1 ring-[#e6e9df]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8eee2] text-[#356445]"><Camera className="h-7 w-7" /></div>
          <h3 className="mt-4 text-center text-lg font-semibold text-[#263b2d]">Show us the affected part</h3>
          <p className="mx-auto mt-2 max-w-xs text-center text-sm leading-relaxed text-[#718074]">Use daylight. Keep the leaf or plant part in focus and avoid blurry photos.</p>
          <button onClick={() => cameraInputRef.current?.click()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1d4b35] py-4 text-sm font-semibold text-white"><Camera className="h-4 w-4" /> Take a photo</button>
          <button onClick={() => galleryInputRef.current?.click()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f0f3eb] py-4 text-sm font-semibold text-[#315640]"><ImageIcon className="h-4 w-4" /> Choose from gallery</button>
        </div>
      </section>
    );
  }

  if (view === 'analyzing') {
    const steps = ['Checking visible crop symptoms', 'Comparing possible disease matches', 'Preparing your scan result'];
    return (
      <section className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <div className="overflow-hidden rounded-3xl bg-[#1d4b35]">
          {photoDataUrl && <img src={photoDataUrl} alt="Crop being checked" className="h-64 w-full object-cover" />}
          <div className="p-6 text-center text-white">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#e3d5a6]" />
            <h2 className="mt-3 text-lg font-semibold">Checking your crop</h2>
            <p className="mt-1 text-xs text-white/70">Looking for possible signs. This may take a moment.</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-[#e6e9df]">
          {steps.map((step, idx) => <div key={step} className="flex items-center gap-3 py-2">
            {checkedSteps > idx ? <Check className="h-4 w-4 shrink-0 text-[#527a55]" /> : <span className="h-4 w-4 shrink-0 rounded-full border-2 border-[#dce3d8]" />}
            <span className={`text-sm ${checkedSteps > idx ? 'font-semibold text-[#263b2d]' : 'text-[#829084]'}`}>{step}</span>
          </div>)}
        </div>
      </section>
    );
  }

  if (view === 'saved' && activeSavedDiagnosis) {
    const scan = activeSavedDiagnosis.source_scan || {};
    const scanned = typeof scan.scanned_at === 'string' ? scan.scanned_at : activeSavedDiagnosis.started_at;
    const observations = typeof scan.observations === 'string' ? scan.observations : 'No scan observations were saved.';
    const matchScore = typeof scan.match_score === 'number' ? scan.match_score : 0;
    return <section className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <button onClick={() => { setActiveSavedDiagnosis(null); setView('home'); }} className="flex items-center gap-2 self-start text-sm font-semibold text-[#315640]"><ChevronLeft className="h-4 w-4"/> All crop checks</button>
      <div className="rounded-3xl bg-[#1d4b35] p-5 text-white">
        <p className="text-xs text-white/70">{activeSavedDiagnosis.crop_name} · {activeSavedDiagnosis.district_name}</p>
        <h2 className="mt-2 text-2xl font-semibold">{activeSavedDiagnosis.issue_name}</h2>
        <p className="mt-2 text-xs text-white/70">Scanned {new Date(scanned).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
        <p className="mt-2 text-[11px] text-white/65">Image-service match score: {matchScore}% · Not diagnostic accuracy</p>
      </div>
      <div className="rounded-2xl bg-white p-4 ring-1 ring-[#e6e9df]"><h3 className="text-sm font-semibold text-[#24392b]">Original scan notes</h3><p className="mt-2 text-sm leading-relaxed text-[#718074]">{observations}</p></div>
      <DiagnosisCarePanel planId={activeSavedDiagnosis.id} userId={userId}/>
      <DiagnosisKatoPanel planId={activeSavedDiagnosis.id} userId={userId} cropName={activeSavedDiagnosis.crop_name} districtName={activeSavedDiagnosis.district_name} issueName={activeSavedDiagnosis.issue_name} observations={observations} confidence={matchScore} weatherData={null} weatherDistrictName={null}/>
    </section>;
  }

  if (view === 'result' && diagnosis) {
    const resetAll = () => { setView('home'); setSelectedCrop(null); setPhotoDataUrl(null); setDiagnosis(null); setCarePlanStatus('idle'); setCarePlanId(null); setScannedAt(null); };

    if (diagnosis.outcome === 'uncertain') {
      return (
        <div className="flex flex-col gap-5">
          <div className="rounded-3xl overflow-hidden h-48">
            {photoDataUrl && <img src={photoDataUrl} alt="Captured leaf" className="w-full h-full object-cover" />}
          </div>
          <div className="bg-gold-100/40 border border-gold-100 rounded-2xl p-5 text-center">
            <p className="text-sm font-bold text-soil-900 mb-1">Unable to identify this photo</p>
            <p className="text-xs text-soil-700 max-w-xs mx-auto">
              {diagnosis.whatObserved || 'No reliable match was returned. Please try a clearer photo of the plant.'}
            </p>
          </div>
          <button onClick={() => setView('capture')} className="bg-leaf-600 hover:bg-leaf-700 text-white font-bold text-sm py-3 rounded-xl">
            Retake photo
          </button>
          <button onClick={resetAll} className="text-xs font-semibold text-soil-400 py-1">Cancel</button>
        </div>
      );
    }

    if (diagnosis.outcome === 'no_match') {
      return (
        <div className="flex flex-col gap-5">
          <div className="rounded-3xl overflow-hidden h-48">
            {photoDataUrl && <img src={photoDataUrl} alt="Scanned crop" className="w-full h-full object-cover" />}
          </div>
          <div className="bg-leaf-100/40 border border-leaf-100 rounded-2xl p-5 text-center">
            <p className="text-sm font-bold text-leaf-700 mb-1">No disease match found</p>
            <p className="text-2xl font-bold text-leaf-700 mb-2">No clear match in this scan</p>
            <p className="text-xs text-soil-700 max-w-xs mx-auto">
              {diagnosis.whatObserved}
            </p>
            <p className="text-[11px] text-soil-500 max-w-xs mx-auto mt-3">
              This scan did not find a disease match. It cannot confirm that the plant is disease-free. Keep monitoring your crop.
            </p>
          </div>
          <button onClick={resetAll} className="bg-leaf-600 hover:bg-leaf-700 text-white font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2">
            <RotateCcw className="h-3.5 w-3.5" /> Scan another
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-3xl bg-[#1d4b35]">
          {photoDataUrl && <img src={photoDataUrl} alt="Your scanned crop" className="h-52 w-full object-cover" />}
          <div className="p-5 text-white">
            <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-[#f2dfad]">Possible match · Not confirmed</span>
            <p className="mt-3 text-xs text-white/65">{selectedCrop?.name} · Crop health check</p>
            <h2 className="mt-1 text-2xl font-semibold">{diagnosis.simpleDiseaseName || diagnosis.diseaseName}</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/80">{diagnosis.diseaseExplanation || 'A plain-language explanation is not available for this disease label yet.'}</p>
            <div className="mt-4 border-t border-white/15 pt-3">
              <p className="text-[11px] text-white/65">Image-service match score — not diagnostic accuracy</p>
              <p className="mt-0.5 text-xl font-semibold">{diagnosis.confidence}%</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 ring-1 ring-[#e6e9df]">
          <p className="text-sm font-semibold text-[#24392b]">What to check on your plant</p>
          <p className="mt-2 text-sm leading-relaxed text-[#718074]">{diagnosis.whatObserved}</p>
          <p className="mt-3 border-t border-[#edf0e9] pt-3 text-xs leading-relaxed text-[#829084]">This is an image-based suggestion, not a confirmed diagnosis. Check whether the visible symptoms match before taking action.</p>
        </div>

        <div className="rounded-2xl bg-[#e7eddf] p-4 text-sm text-[#174432]" role="status">{carePlanStatus==='creating'?'Omulimi is creating your crop-care plan…':carePlanStatus==='created'?'Your crop-care plan and follow-up checks have been saved.':carePlanStatus==='error'?'The scan is ready, but the care plan could not be saved. Please try again later.':'Omulimi will prepare a care plan from this scan.'}</div>
        {carePlanId && <DiagnosisCarePanel planId={carePlanId} userId={userId}/>}
        {scannedAt && <p className="px-1 text-xs text-[#829084]">Scanned {new Date(scannedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · {districtName} District</p>}
        {carePlanId && selectedCrop && <DiagnosisKatoPanel planId={carePlanId} userId={userId} cropName={selectedCrop.name} districtName={districtName} issueName={diagnosis.simpleDiseaseName || diagnosis.diseaseName || 'Possible crop issue'} observations={diagnosis.whatObserved || 'No scan observations recorded'} confidence={diagnosis.confidence} weatherData={weatherData} weatherDistrictName={weatherDistrictName}/>}

        <button onClick={resetAll} className="text-xs font-semibold text-soil-400 py-1">Scan another</button>
      </div>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <div className="pt-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#66806c]">OMULIMI · CROP CARE</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#24382b]" style={{fontFamily:'Fraunces, Georgia, serif'}}>Check your crop</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#718074]">Take a photo of a plant to check for possible disease signs.</p>
      </div>
      <div className="rounded-3xl bg-[#174432] p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10"><Scan className="h-5 w-5 text-[#e5d6a8]" /></div>
          <div><p className="text-base font-semibold">Crop health check</p><p className="mt-0.5 text-xs text-white/70">Photo-based · Preliminary guidance</p></div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-white/80">Choose your crop, then take a clear photo of the affected leaf or plant part.</p>
        <button onClick={() => setView('cropSelect')} disabled={farmContextLoading || Boolean(farmContextError)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f3f0e5] py-3.5 text-sm font-semibold text-[#174432] disabled:cursor-not-allowed disabled:opacity-50"><Camera className="h-4 w-4" /> {farmContextLoading ? 'Loading your farm crops…' : 'Start crop check'}</button>
        {farmContextError && <div role="alert" className="mt-3 rounded-xl bg-white/10 p-3 text-xs text-white/85">{farmContextError} <button onClick={() => void loadFarmContext()} className="ml-1 underline">Try again</button></div>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-[#e8e9e1]"><Camera className="h-5 w-5 text-[#477653]" /><p className="mt-3 text-sm font-semibold text-[#24382b]">Use a clear photo</p><p className="mt-1 text-xs leading-relaxed text-[#829084]">Focus on one affected part in good daylight.</p></div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-[#e8e9e1]"><Lightbulb className="h-5 w-5 text-[#9a7a3d]" /><p className="mt-3 text-sm font-semibold text-[#24382b]">Check before acting</p><p className="mt-1 text-xs leading-relaxed text-[#829084]">Use results as guidance, not a confirmed diagnosis.</p></div>
      </div>
      <div className="rounded-2xl border border-[#e6e9df] bg-white p-4">
        <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-[#24392b]">Previous crop checks</h3><span className="text-[11px] text-[#879087]">{savedDiagnoses.length} saved</span></div>
        {deleteError && <p role="alert" className="mb-3 text-xs text-red-700">{deleteError}</p>}
        {savedDiagnoses.length === 0 ? <p className="text-xs text-[#829084]">Your saved crop checks will appear here.</p> :
          <div className="space-y-2">{savedDiagnoses.map(item => <div key={item.id} className="relative flex items-center gap-2 rounded-xl bg-[#f4f6f0] p-3">
            <button type="button" onClick={() => { setActiveSavedDiagnosis(item); setView('saved'); setOpenMenuId(null); }} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e7eddf] text-[#285b40]"><Sprout className="h-4 w-4"/></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#263b2d]">{item.issue_name}</span><span className="mt-1 block text-[11px] text-[#718074]">{item.crop_name} · {new Date(item.started_at).toLocaleDateString()}</span></span>
              <ChevronLeft className="h-4 w-4 rotate-180 shrink-0 text-[#879087]"/>
            </button>
            <div className="relative shrink-0">
              <button type="button" aria-label={`Options for ${item.issue_name}`} aria-haspopup="menu" aria-expanded={openMenuId === item.id} disabled={deletingId === item.id} onClick={() => setOpenMenuId(current => current === item.id ? null : item.id)} className="flex h-9 w-9 items-center justify-center rounded-full text-[#718074] hover:bg-[#e7eddf] disabled:opacity-50">
                {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreVertical className="h-5 w-5"/>}
              </button>
              {openMenuId === item.id && <div role="menu" className="absolute right-0 top-10 z-20 min-w-32 rounded-xl border border-[#e6e9df] bg-white p-1 shadow-lg">
                <button type="button" role="menuitem" onClick={() => void handleDeleteDiagnosis(item)} className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50">Delete</button>
              </div>}
            </div>
          </div>)}</div>}
      </div>
      <p className="text-center text-xs leading-relaxed text-[#879087]">Currently supported: maize, beans, coffee, banana, tomato and potato.</p>
    </section>
  );
}
