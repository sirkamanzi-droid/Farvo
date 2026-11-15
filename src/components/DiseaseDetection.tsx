import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Lightbulb, ChevronLeft, Search, Check, Scan, Loader2, RotateCcw } from 'lucide-react';

interface Crop {
  id: string;
  name: string;
  emoji: string;
}

const CROPS: Crop[] = [
  { id: 'maize', name: 'Maize', emoji: '🌽' },
  { id: 'beans', name: 'Beans', emoji: '🫘' },
  { id: 'coffee', name: 'Coffee', emoji: '☕' },
  { id: 'banana', name: 'Banana', emoji: '🍌' },
  { id: 'tomato', name: 'Tomato', emoji: '🍅' },
  { id: 'potato', name: 'Potato', emoji: '🥔' },
];



type DiseaseView = 'home' | 'cropSelect' | 'capture' | 'analyzing' | 'result';

interface Diagnosis {
  outcome: 'disease' | 'healthy' | 'no_match' | 'uncertain';
  diseaseName?: string;\n  simpleDiseaseName?: string;\n  diseaseExplanation?: string;
  confidence: number;
  severity?: 'Low' | 'Moderate' | 'High';
  affectedPart?: string;
  whatObserved?: string;
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
    // Stage 1: identify the plant
    const plantResponse = await fetch('/api/plant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    const scientificName = bestPlant.scientificName
      .toLowerCase()
      .trim();

    // Stage 2: compare the identified species with the selected crop.
    // Keep this conservative: unsupported or unmatched crops are not diagnosed.
    const cropMatches: Record<string, string[]> = {
      maize: ['zea mays'],
      beans: ['phaseolus vulgaris'],
      coffee: ['coffea arabica'],
      banana: ['musa × paradisiaca', 'musa x paradisiaca', 'musa acuminata', 'musa balbisiana'],
      tomato: ['solanum lycopersicum'],
      potato: ['solanum tuberosum'],
    };

    const acceptedNames = cropMatches[cropId] ?? [];
    const cropMatchesPlant = acceptedNames.some(
      (name) =>
        scientificName === name ||
        scientificName.startsWith(`${name} `)
    );

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

    // Stage 3: only after crop validation, request disease identification.
    const diseaseResponse = await fetch('/api/disease', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const isGenericResult =
      match.name === 'ZZXXZZ' ||
      /\bunclassified\b|\bunknown (?:parasitic )?pathogen\b|^viruses?$|^fungi?$|^bacteria?$|^pests?$/.test(normalizedDiseaseLabel);

    if (isGenericResult) {
      return {
        outcome: 'uncertain',
        confidence: 0,
        whatObserved:
          'We identified the crop, but could not identify a specific disease from this photo. Try a clearer close-up of the affected area.',
      };
    }

    const confidence = Math.round(match.score * 100);

    // Temporary conservative gate, not a clinically or scientifically validated threshold.
    if (confidence < 30) {
      return {
        outcome: 'uncertain',
        confidence,
        whatObserved:
          'The plant was identified, but the service did not provide a strong enough match to show. This does not mean the plant is healthy. Try another clear photo or ask an agricultural extension officer.',
      };
    }

    return {
      outcome: 'disease',
      diseaseName: match.description || match.name || 'Possible plant disease',
      confidence,
      whatObserved:
        `The photo was identified as ${bestPlant.scientificName}. This is a possible disease match, not a confirmed diagnosis. Check the visible symptoms before taking action.`,
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
  onGetTreatmentAdvice,
}: {
  onGetTreatmentAdvice: (question: string) => void;
}) {
  const [view, setView] = useState<DiseaseView>('home');
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<number>(0);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhotoDataUrl(dataUrl);
      setView('analyzing');
      setCheckedSteps(0);
      runAnalysisSequence(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function runAnalysisSequence(dataUrl: string) {
    const delays = [400, 900, 1400];
    delays.forEach((delay, idx) => {
      setTimeout(() => setCheckedSteps(idx + 1), delay);
    });

    const cropId = selectedCrop?.id || 'maize';
    const result = await computeDiagnosis(cropId, dataUrl);

    const minimumDisplayTime = 1800;
    setTimeout(() => {
      setDiagnosis(result);
      setView('result');
    }, minimumDisplayTime);
  }

  const filteredCrops = CROPS.filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (view === 'cropSelect') {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <button onClick={() => setView('home')} className="text-soil-400 hover:text-soil-900">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-base font-bold text-soil-900">What crop is this?</h2>
        </div>
        <p className="text-xs text-soil-400 -mt-3">Select a crop currently covered by the preliminary disease-check service.</p>

        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for a crop..."
            className="w-full pl-9 pr-4 py-2.5 border border-parchment-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-600 bg-parchment-50"
          />
          <Search className="absolute left-3 top-3 h-4 w-4 text-soil-400" />
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {filteredCrops.map((crop) => {
            const isSelected = selectedCrop?.id === crop.id;
            return (
              <button
                key={crop.id}
                onClick={() => {
                  setSelectedCrop(crop);
                }}
                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-center ${isSelected ? 'border-leaf-600 bg-leaf-100/40' : 'border-parchment-100 bg-parchment-50'}`}
              >
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-leaf-600 flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
                <span className="text-xl">{crop.emoji}</span>
                <span className="text-[11px] font-semibold text-soil-900">{crop.name}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            if (!selectedCrop) return;
            setView('capture');
          }}
          disabled={!selectedCrop}
          className="mt-2 bg-leaf-600 disabled:bg-parchment-200 disabled:text-soil-400 hover:bg-leaf-700 text-white font-bold text-sm py-3 rounded-xl transition"
        >
          Continue →
        </button>
      </div>
    );
  }

  if (view === 'capture') {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <button onClick={() => setView('cropSelect')} className="text-soil-400 hover:text-soil-900">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-base font-bold text-soil-900">Add a photo</h2>
        </div>
        <p className="text-xs text-soil-400 -mt-3">Checking <span className="font-semibold text-leaf-700">{selectedCrop?.name}</span> for signs of disease.</p>

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelected} className="hidden" />
        <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFileSelected} className="hidden" />

        <div className="flex flex-col gap-3">
          <button onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-3.5 bg-parchment-50 border border-parchment-100 rounded-2xl p-4 text-left">
            <div className="h-12 w-12 rounded-xl bg-leaf-600 flex items-center justify-center shrink-0">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-soil-900">Take a photo</div>
              <div className="text-xs text-soil-400">Opens your camera</div>
            </div>
          </button>
          <button onClick={() => galleryInputRef.current?.click()} className="flex items-center gap-3.5 bg-parchment-50 border border-parchment-100 rounded-2xl p-4 text-left">
            <div className="h-12 w-12 rounded-xl bg-leaf-100 flex items-center justify-center shrink-0">
              <ImageIcon className="h-5 w-5 text-leaf-700" />
            </div>
            <div>
              <div className="text-sm font-bold text-soil-900">Upload from gallery</div>
              <div className="text-xs text-soil-400">Choose an existing photo</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (view === 'analyzing') {
    const steps = ['Checking for visible symptoms', 'Comparing with known diseases', 'Estimating confidence level'];
    return (
      <div className="flex flex-col gap-5">
        <div className="relative rounded-3xl overflow-hidden h-64">
          {photoDataUrl && <img src={photoDataUrl} alt="Captured leaf" className="w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-soil-900/50 flex flex-col items-center justify-center gap-3 text-center px-6">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
            <p className="text-sm font-bold text-white">Analyzing your photo...</p>
            <p className="text-xs text-parchment-100">This may take a few seconds.</p>
          </div>
        </div>
        <div className="bg-parchment-50 border border-parchment-100 rounded-2xl p-4 flex flex-col gap-2.5">
          {steps.map((step, idx) => (
            <div key={step} className="flex items-center gap-2.5">
              {checkedSteps > idx ? (
                <Check className="h-4 w-4 text-leaf-600 shrink-0" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-parchment-200 shrink-0" />
              )}
              <span className={`text-xs ${checkedSteps > idx ? 'text-soil-900 font-semibold' : 'text-soil-400'}`}>{step}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'result' && diagnosis) {
    const resetAll = () => { setView('home'); setSelectedCrop(null); setPhotoDataUrl(null); setDiagnosis(null); };

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
            <p className="text-sm font-bold text-leaf-700 mb-1">✓ No visible disease signs detected</p>
            <p className="text-2xl font-bold text-leaf-700 mb-2">Looks healthy</p>
            <p className="text-xs text-soil-700 max-w-xs mx-auto">
              {diagnosis.whatObserved}
            </p>
            <p className="text-[11px] text-soil-500 max-w-xs mx-auto mt-3">
              This photo check cannot confirm that the whole plant is 100% disease-free. Keep monitoring your crop.
            </p>
          </div>
          <button onClick={resetAll} className="bg-leaf-600 hover:bg-leaf-700 text-white font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2">
            <RotateCcw className="h-3.5 w-3.5" /> Scan another
          </button>
        </div>
      );
    }

    const severityBg = diagnosis.severity === 'High' ? 'bg-rose-600' : diagnosis.severity === 'Moderate' ? 'bg-clay-600' : 'bg-gold-500';
    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-3 items-start">
          <div className="h-24 w-24 rounded-2xl overflow-hidden shrink-0">
            {photoDataUrl && <img src={photoDataUrl} alt="Captured leaf" className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1 min-w-0">
            <span className="inline-block bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5">● Possible match — unconfirmed</span>
            <div className="text-xs text-soil-500">Provider label</div>
            <div className="text-sm font-semibold text-soil-700">{diagnosis.diseaseName}</div>
            <div className="text-lg font-bold text-soil-900 mt-1">{diagnosis.simpleDiseaseName || diagnosis.diseaseName}</div>
            <div className="text-xs text-soil-400 mt-1">Provider match score (not accuracy)</div>
            <div className="text-base font-bold text-soil-900">{diagnosis.confidence}%</div>
            <div className="w-full bg-parchment-200 h-2 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-leaf-600 rounded-full" style={{ width: `${diagnosis.confidence}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-parchment-50 border border-parchment-100 rounded-xl p-2.5 text-center">
            <div className="text-[10px] text-soil-400 font-semibold uppercase">Crop</div>
            <div className="text-xs font-bold text-soil-900 mt-0.5">{selectedCrop?.name}</div>
          </div>
          <div className="bg-parchment-50 border border-parchment-100 rounded-xl p-2.5 text-center">
            <div className="text-[10px] text-soil-400 font-semibold uppercase">Affected part</div>
            <div className="text-xs font-bold text-soil-900 mt-0.5">{diagnosis.affectedPart || 'Not assessed'}</div>
          </div>
          <div className="bg-parchment-50 border border-parchment-100 rounded-xl p-2.5 text-center">
            <div className="text-[10px] text-soil-400 font-semibold uppercase">Severity</div>
            <div className={`text-xs font-bold text-white mt-0.5 rounded px-1.5 py-0.5 inline-block ${severityBg}`}>{diagnosis.severity || 'Not assessed'}</div>
          </div>
        </div>

        <div className="bg-parchment-50 border border-parchment-100 rounded-2xl p-4">
          <div className="text-xs font-bold text-soil-900 mb-1.5">What this disease means</div>
          <p className="text-xs text-soil-700 leading-relaxed">{diagnosis.diseaseExplanation || 'A plain-language explanation is not available for this disease label yet.'}</p>
          <div className="border-t border-[#e4dac7] mt-3 pt-3">
            <div className="text-[10px] font-bold uppercase tracking-wide text-soil-500 mb-1">Scan details</div>
            <p className="text-xs text-soil-500 leading-relaxed">{diagnosis.whatObserved}</p>
          </div>
        </div>

        <div className="bg-leaf-100/30 border border-leaf-100 rounded-2xl p-4">
          <div className="text-xs font-bold text-soil-900 mb-1">Next step</div>
          <p className="text-[11px] text-soil-500 leading-relaxed">Compare the result with the symptoms visible on your crop. Kato can help you understand the possible match and what to check next.</p>
        </div>

        <button
          onClick={() => {
            if (!selectedCrop || !diagnosis || diagnosis.outcome !== 'disease') return;
            const question = `I scanned a ${selectedCrop.name} plant in Omulimi. The possible diagnosis is ${diagnosis.diseaseName ?? 'an unknown disease'} with a ${diagnosis.confidence}% match. Observations: ${diagnosis.whatObserved ?? 'No additional observations recorded'}. Please help me assess this result, explain practical immediate steps for a Ugandan smallholder farmer, and ask follow-up questions if needed. Do not treat the scan as a confirmed diagnosis.`;
            onGetTreatmentAdvice(question);
          }}
          className="bg-leaf-700 hover:bg-leaf-800 text-white font-bold text-sm py-3 rounded-xl transition"
        >
          Talk to Kato about treatment →
        </button>
        <button onClick={resetAll} className="text-xs font-semibold text-soil-400 py-1">Scan another</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-soil-900" style={{ fontFamily: 'Fraunces, serif' }}>Disease Detection</h2>
        <p className="text-sm text-soil-400 mt-2">Check selected crops for possible disease signs. Results are preliminary and may be wrong.</p>
      </div>

      <div
        className="relative overflow-hidden rounded-3xl h-48 bg-cover bg-center"
        style={{ backgroundImage: 'url(/disease-hero.jpg)', backgroundColor: '#4A6B3A' }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-16 w-16 border-2 border-white/80 rounded-2xl flex items-center justify-center">
            <Scan className="h-7 w-7 text-white" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 bg-parchment-50 rounded-3xl shadow-md border border-leaf-100 p-4">
        <button onClick={() => setView('cropSelect')} className="flex items-center gap-3.5 text-left p-2">
          <div className="h-14 w-14 rounded-2xl bg-leaf-600 flex items-center justify-center shrink-0">
            <Camera className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-base font-bold text-soil-900">Take a photo</div>
            <div className="text-xs text-soil-400 mt-0.5">Use your camera to capture the affected part of your plant.</div>
          </div>
        </button>

        <div className="h-px bg-parchment-100" />

        <button onClick={() => setView('cropSelect')} className="flex items-center gap-3.5 text-left p-2">
          <div className="h-14 w-14 rounded-2xl bg-leaf-100 flex items-center justify-center shrink-0">
            <ImageIcon className="h-6 w-6 text-leaf-700" />
          </div>
          <div>
            <div className="text-base font-bold text-soil-900">Upload from gallery</div>
            <div className="text-xs text-soil-400 mt-0.5">Choose a photo from your phone.</div>
          </div>
        </button>
      </div>

      <div className="bg-leaf-100/40 border border-leaf-100 rounded-2xl p-4 flex gap-3">
        <Lightbulb className="h-5 w-5 text-leaf-700 shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-bold text-soil-900 mb-1">For best results:</div>
          <div className="text-xs text-soil-700 leading-relaxed">Capture the affected part clearly, use good lighting and avoid blurry photos.</div>
        </div>
      </div>


    </div>
  );
}
