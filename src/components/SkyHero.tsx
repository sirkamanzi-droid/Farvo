import React from 'react';
import { Farm } from '../types';
import { MapPin, Plus, ChevronDown, Trash2 } from 'lucide-react';

interface SkyHeroProps {
  farms: Farm[];
  activeFarm: Farm;
  onSelectFarm: (farm: Farm) => void;
  onAddFarm: () => void;
  onOpenDistrictPicker: () => void;
  onSelectCrop: (crop: string) => void;
  onDeleteFarm: () => void;
  weatherCode: number;
  temperature: number;
  wasGeoDetected: boolean;
}

export default function SkyHero({ farms, activeFarm, onSelectFarm, onAddFarm, onOpenDistrictPicker, onSelectCrop, onDeleteFarm, wasGeoDetected }: SkyHeroProps) {
  return (
    <section className="px-4 sm:px-6 pt-5 pb-3">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-semibold text-leaf-700">Weather</p>
          <h1 className="mt-1 text-2xl font-bold text-soil-900">Your local forecast</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onAddFarm} aria-label="Add farm" className="flex h-10 w-10 items-center justify-center rounded-full bg-leaf-100 text-leaf-700"><Plus className="h-5 w-5"/></button>
          {farms.length>1&&<button onClick={onDeleteFarm} title="Remove selected farm" aria-label="Remove selected farm" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff1ed] text-rose-700"><Trash2 className="h-4 w-4"/></button>}
        </div>
      </div>
      {farms.length > 1 && <div className="flex gap-2 overflow-x-auto pb-2 mb-2">{farms.map(farm=><button key={farm.id} onClick={()=>onSelectFarm(farm)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${farm.id===activeFarm.id?'bg-[#174432] text-white':'bg-[#e7eddf] text-[#285b40]'}`}>{farm.label || farm.district.name}</button>)}</div>}
      <button onClick={onOpenDistrictPicker} className="flex w-full items-center justify-between rounded-xl bg-[#faf7ef] px-4 py-3 text-left">
        <span className="flex items-center gap-3"><MapPin className="h-5 w-5 text-leaf-700"/><span><span className="block text-xs text-soil-500">Farm location</span><span className="block text-sm font-semibold text-soil-900">{activeFarm.district.name} District{wasGeoDetected?' · GPS':''}</span></span></span>
        <ChevronDown className="h-4 w-4 text-soil-500"/>
      </button>
      <label className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-[#faf7ef] px-4 py-3">
        <span className="text-xs font-medium text-soil-600">Your crop</span>
        <select
          aria-label="Select your crop"
          value={activeFarm.crop}
          onChange={event => onSelectCrop(event.target.value)}
          className="max-w-[65%] rounded-lg border-0 bg-transparent py-1 text-right text-sm font-semibold text-soil-900 focus:outline-none focus:ring-2 focus:ring-leaf-600"
        >
          {[...new Set([activeFarm.crop, ...activeFarm.district.mainCrops])].map(crop => (
            <option key={crop} value={crop}>{crop}</option>
          ))}
        </select>
      </label>
    </section>
  );
}
