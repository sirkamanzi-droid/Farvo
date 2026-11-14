import React from 'react';
import { Farm } from '../types';
import { MapPin, Plus, ChevronDown } from 'lucide-react';

interface SkyHeroProps {
  farms: Farm[];
  activeFarm: Farm;
  onSelectFarm: (farm: Farm) => void;
  onAddFarm: () => void;
  onOpenDistrictPicker: () => void;
  onSelectCrop: (crop: string) => void;
  weatherCode: number;
  temperature: number;
  wasGeoDetected: boolean;
}

export default function SkyHero({ farms, activeFarm, onSelectFarm, onAddFarm, onOpenDistrictPicker, wasGeoDetected }: SkyHeroProps) {
  return (
    <section className="px-4 sm:px-6 pt-5 pb-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] font-bold tracking-[.16em] uppercase text-leaf-700">Local forecast</p>
          <h1 className="text-xl font-bold text-soil-900 mt-1">Weather Intelligence</h1>
        </div>
        <button onClick={onAddFarm} className="flex items-center gap-1 rounded-lg border border-[#ded5c3] bg-[#faf7ef] px-3 py-2 text-xs font-semibold text-leaf-700"><Plus className="h-3.5 w-3.5"/> Add farm</button>
      </div>
      {farms.length > 1 && <div className="flex gap-2 overflow-x-auto pb-2 mb-2">{farms.map(farm=><button key={farm.id} onClick={()=>onSelectFarm(farm)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${farm.id===activeFarm.id?'bg-[#174432] text-white':'bg-[#e7eddf] text-[#285b40]'}`}>{farm.label || farm.district.name}</button>)}</div>}
      <button onClick={onOpenDistrictPicker} className="flex w-full items-center justify-between rounded-xl border border-[#ded5c3] bg-[#faf7ef] px-3 py-3 text-left shadow-sm">
        <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-leaf-700"/><span><span className="block text-[10px] text-soil-400">YOUR FARM LOCATION</span><span className="block text-sm font-semibold text-soil-900">{activeFarm.district.name} District {wasGeoDetected?'· GPS':''}</span></span></span>
        <ChevronDown className="h-4 w-4 text-soil-500"/>
      </button>
    </section>
  );
}
