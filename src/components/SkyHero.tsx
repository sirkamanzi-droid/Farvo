import React from 'react';
import { Farm } from '../types';
import { getSkyTheme } from '../data/skyTheme';
import { MapPin, Plus, ChevronDown } from 'lucide-react';
import CropChips from './CropChips';

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

export default function SkyHero({ farms, activeFarm, onSelectFarm, onAddFarm, onOpenDistrictPicker, onSelectCrop, weatherCode, temperature, wasGeoDetected }: SkyHeroProps) {
  const sky = getSkyTheme(weatherCode);
  return (
    <div className="relative overflow-hidden rounded-b-3xl px-4 pt-6 pb-5" style={{ background: sky.gradient }}>
      <div className="absolute rounded-full" style={{ top: 34, right: 36, width: 80, height: 36, borderRadius: 20, background: sky.cloudColor }} />
      <div className="absolute rounded-full" style={{ top: 24, right: 52, width: 46, height: 46, background: sky.cloudColor }} />
      <div className="absolute" style={{ top: 70, left: 16, width: 56, height: 24, borderRadius: 16, background: sky.cloudColor, opacity: 0.7 }} />
      {sky.showSun && <div className="absolute rounded-full" style={{ top: 14, right: 18, width: 34, height: 34, background: '#F5D77E', opacity: 0.9 }} />}

      <div className="relative flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-soil-900 uppercase tracking-wide">My farms</span>
        <button onClick={onAddFarm} className="flex items-center gap-1 text-[11px] text-soil-900 bg-white/40 px-2 py-1 rounded-lg font-medium"><Plus className="h-3.5 w-3.5" />Add</button>
      </div>
      <div className="relative flex gap-1.5 overflow-x-auto mb-4 pb-1">
        {farms.map((farm) => {
          const isActive = farm.id === activeFarm.id;
          return (
            <button key={farm.id} onClick={() => onSelectFarm(farm)} className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition ${isActive ? 'bg-soil-900 text-parchment-100' : 'bg-white/40 text-soil-900'}`}>{farm.district.name}</button>
          );
        })}
      </div>

      <div className="relative mb-3">
        <button onClick={onOpenDistrictPicker} className="flex items-center gap-1.5 text-xs font-semibold text-soil-900 bg-white/50 px-2.5 py-1.5 rounded-lg">
          <MapPin className="h-3.5 w-3.5" />
          {activeFarm.district.name} · {activeFarm.label}
          {wasGeoDetected && <span className="ml-1 bg-white/60 text-leaf-700 text-[9px] font-semibold px-1.5 py-0.5 rounded">GPS</span>}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <div className="text-4xl font-semibold text-soil-900 mt-2">{Math.round(temperature)}°<span className="text-base font-normal">C</span></div>
        <div className="text-xs font-medium text-soil-900">{sky.label}</div>
      </div>

      <div className="relative"><CropChips district={activeFarm.district} selectedCrop={activeFarm.crop} onSelectCrop={onSelectCrop} /></div>
    </div>
  );
}
