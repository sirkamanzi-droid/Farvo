import React, { useState, useMemo } from 'react';
import { DISTRICTS } from '../data/districts';
import { District } from '../types';
import { Search, MapPin, CheckCircle, ChevronRight, X, LocateFixed, Loader2 } from 'lucide-react';
import { LocationStatus } from '../data/geolocation';

interface DistrictPickerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDistrict: District;
  onSelect: (district: District) => void;
  onUseMyLocation: () => void;
  locationStatus: LocationStatus;
}

export default function DistrictPicker({ isOpen, onClose, selectedDistrict, onSelect, onUseMyLocation, locationStatus }: DistrictPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<'All' | 'Central' | 'Eastern' | 'Northern' | 'Western'>('All');

  const filteredDistricts = useMemo(() => {
    return DISTRICTS.filter((d) => {
      const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.mainCrops.some((c) => c.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRegion = selectedRegion === 'All' || d.region === selectedRegion;
      return matchesSearch && matchesRegion;
    });
  }, [searchTerm, selectedRegion]);

  const regions: ('All' | 'Central' | 'Eastern' | 'Northern' | 'Western')[] = ['All', 'Central', 'Eastern', 'Northern', 'Western'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-soil-900/50" onClick={onClose} />
      <div className="relative bg-parchment-50 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[80vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-parchment-100 shrink-0">
          <h2 className="text-base font-bold text-soil-900 flex items-center gap-2"><MapPin className="text-leaf-600 h-4 w-4" /> Select District</h2>
          <button onClick={onClose} className="text-soil-400 hover:text-soil-900"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4 pb-2 shrink-0">
          <button onClick={onUseMyLocation} disabled={locationStatus === 'detecting'} className="mb-3 w-full flex items-center justify-center gap-2 bg-leaf-600 hover:bg-leaf-700 disabled:opacity-60 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition">
            {locationStatus === 'detecting' ? (<><Loader2 className="h-4 w-4 animate-spin" /> Detecting...</>) : (<><LocateFixed className="h-4 w-4" /> Use My Location</>)}
          </button>
          <div className="flex gap-1 overflow-x-auto pb-2 mb-2">
            {regions.map((region) => (
              <button key={region} onClick={() => setSelectedRegion(region)} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedRegion === region ? 'bg-leaf-600 text-white' : 'bg-parchment-200 text-leaf-700'}`}>{region}</button>
            ))}
          </div>
          <div className="relative">
            <input type="text" placeholder="Search district or crop..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-parchment-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-600 bg-white" />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-soil-400" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {filteredDistricts.length > 0 ? filteredDistricts.map((d) => {
            const isSelected = selectedDistrict.id === d.id;
            return (
              <button key={d.id} onClick={() => { onSelect(d); onClose(); }} className={`w-full text-left p-3 rounded-xl border flex items-center justify-between ${isSelected ? 'border-leaf-600 bg-parchment-200/50' : 'border-parchment-100 bg-white hover:bg-parchment-100/70'}`}>
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-soil-900 text-sm truncate">{d.name}</span>
                    <span className="text-[10px] font-medium bg-parchment-50 text-soil-400 px-1.5 py-0.5 rounded border border-parchment-100">{d.region}</span>
                  </div>
                  <div className="text-xs text-soil-400 mt-1 truncate">🌾 {d.mainCrops.join(', ')}</div>
                </div>
                {isSelected ? <CheckCircle className="h-5 w-5 text-leaf-600 shrink-0" /> : <ChevronRight className="h-4 w-4 text-soil-400 shrink-0" />}
              </button>
            );
          }) : <div className="text-center py-8 text-soil-400 text-sm">No districts found.</div>}
        </div>
      </div>
    </div>
  );
}
