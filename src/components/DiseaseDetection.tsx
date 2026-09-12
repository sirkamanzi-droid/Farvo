import React, { useState } from 'react';
import { Camera, Image as ImageIcon, Lightbulb, ChevronLeft, Search, Check, Scan } from 'lucide-react';

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
  { id: 'cassava', name: 'Cassava', emoji: '🌾' },
  { id: 'rice', name: 'Rice', emoji: '🌾' },
];

interface RecentScan {
  id: string;
  cropName: string;
  diseaseName: string;
  severity: 'Low' | 'Moderate' | 'High' | 'Healthy';
  date: string;
}

const MOCK_RECENT_SCANS: RecentScan[] = [];

type DiseaseView = 'home' | 'cropSelect' | 'nextStepStub';

const severityColor = (severity: RecentScan['severity']) => {
  switch (severity) {
    case 'Healthy': return 'bg-leaf-600';
    case 'Low': return 'bg-leaf-600';
    case 'Moderate': return 'bg-clay-600';
    case 'High': return 'bg-rose-600';
  }
};

export default function DiseaseDetection() {
  const [view, setView] = useState<DiseaseView>('home');
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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
        <p className="text-xs text-soil-400 -mt-3">Select the crop for a more accurate diagnosis.</p>

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
                onClick={() => setSelectedCrop(crop)}
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
          onClick={() => selectedCrop && setView('nextStepStub')}
          disabled={!selectedCrop}
          className="mt-2 bg-leaf-600 disabled:bg-parchment-200 disabled:text-soil-400 hover:bg-leaf-700 text-white font-bold text-sm py-3 rounded-xl transition"
        >
          Continue →
        </button>
      </div>
    );
  }

  if (view === 'nextStepStub') {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
        <div className="h-14 w-14 rounded-2xl bg-leaf-100 flex items-center justify-center">
          <Camera className="h-6 w-6 text-leaf-600" />
        </div>
        <p className="text-sm font-semibold text-soil-900">Camera capture is next up</p>
        <p className="text-xs text-soil-400 max-w-xs">
          You picked <span className="font-semibold text-leaf-700">{selectedCrop?.name}</span>. The photo capture and AI diagnosis step isn't built yet — that's the next piece we add.
        </p>
        <button onClick={() => { setView('home'); setSelectedCrop(null); }} className="mt-2 text-xs font-semibold text-leaf-600 border border-leaf-100 px-4 py-2 rounded-lg">
          Back to Disease Detection
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="relative overflow-hidden rounded-3xl -mx-4 sm:mx-0" style={{ background: 'linear-gradient(160deg, #E8F0E0 0%, #A8C89A 45%, #4A6B3A 100%)' }}>
        <div className="px-6 pt-6 pb-24 relative">
          <h2 className="text-2xl font-bold text-soil-900" style={{ fontFamily: 'Fraunces, serif' }}>Disease Detection</h2>
          <p className="text-sm text-soil-700 mt-2 max-w-xs">Find out what's affecting your crops and get AI-powered solutions.</p>
          <div className="absolute right-8 bottom-8 h-16 w-16 border-2 border-white/70 rounded-2xl flex items-center justify-center">
            <Scan className="h-7 w-7 text-white" />
          </div>
        </div>
      </div>

      <div className="-mt-16 flex flex-col gap-3 bg-parchment-50 rounded-3xl shadow-md border border-leaf-100 p-4 relative z-10">
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

      <div>
        <h3 className="text-xs font-bold text-soil-400 uppercase tracking-wider mb-2.5">Recent scans</h3>
        {MOCK_RECENT_SCANS.length === 0 ? (
          <div className="text-center py-8 text-xs text-soil-400 bg-parchment-50/50 rounded-xl border border-parchment-100">
            No scans yet — your first check will show up here.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {MOCK_RECENT_SCANS.map((scan) => (
              <div key={scan.id} className="flex items-center gap-2.5 bg-parchment-50 rounded-xl p-2.5 border border-parchment-100">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-leaf-600 to-leaf-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-soil-900 truncate">{scan.diseaseName}</div>
                  <div className="text-[10px] text-soil-400">{scan.date}, {scan.cropName}</div>
                </div>
                <span className={`${severityColor(scan.severity)} text-white text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0`}>{scan.severity}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
