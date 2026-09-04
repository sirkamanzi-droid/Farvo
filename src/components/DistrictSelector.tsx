import React, { useState, useMemo } from 'react';
import { DISTRICTS, MAJOR_CROPS } from '../data/districts';
import { District } from '../types';
import { LocationStatus } from '../data/geolocation';
import { Search, MapPin, CheckCircle, ChevronRight, Sprout, Star, LocateFixed, Loader2 } from 'lucide-react';

interface DistrictSelectorProps {
  selectedDistrict: District;
  setSelectedDistrict: (district: District) => void;
  selectedCrop: string;
  setSelectedCrop: (crop: string) => void;
  onUseMyLocation: () => void;
  locationStatus: LocationStatus;
}

export default function DistrictSelector({ selectedDistrict, setSelectedDistrict, selectedCrop, setSelectedCrop, onUseMyLocation, locationStatus }: DistrictSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<'All' | 'Central' | 'Eastern' | 'Northern' | 'Western'>('All');

  const filteredDistricts = useMemo(() => {
    return DISTRICTS.filter((district) => {
      const matchesSearch = district.name.toLowerCase().includes(searchTerm.toLowerCase()) || district.mainCrops.some(crop => crop.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRegion = selectedRegion === 'All' || district.region === selectedRegion;
      return matchesSearch && matchesRegion;
    });
  }, [searchTerm, selectedRegion]);

  const regions: ('All' | 'Central' | 'Eastern' | 'Northern' | 'Western')[] = ['All', 'Central', 'Eastern', 'Northern', 'Western'];

  return (
    <div className="bg-parchment-50 rounded-2xl shadow-md border border-leaf-100 p-6 flex flex-col h-full" id="district-selector-container">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-soil-900 flex items-center gap-2"><MapPin className="text-leaf-600 h-5 w-5" />Select Ugandan District</h2>
        <p className="text-sm text-soil-400 mt-1">Select your local district to fetch localized meteorology and crop-specific advice.</p>
      </div>

      <button onClick={onUseMyLocation} disabled={locationStatus === 'detecting'} className="mb-4 flex items-center justify-center gap-2 bg-leaf-600 hover:bg-leaf-700 disabled:opacity-60 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition shadow-sm">
        {locationStatus === 'detecting' ? (<><Loader2 className="h-4 w-4 animate-spin" /> Detecting your location...</>) : (<><LocateFixed className="h-4 w-4" /> Use My Location</>)}
      </button>
      {(locationStatus === 'denied' || locationStatus === 'unsupported') && (
        <p className="text-[11px] text-clay-600 -mt-2 mb-4">Location access wasn't available — pick your district below instead.</p>
      )}

      <div className="flex gap-1 overflow-x-auto pb-2 mb-4" id="region-tabs">
        {regions.map((region) => (
          <button key={region} onClick={() => setSelectedRegion(region)} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${selectedRegion === region ? 'bg-leaf-600 text-white shadow-sm' : 'bg-parchment-200 text-leaf-700 hover:bg-leaf-100'}`}>{region}</button>
        ))}
      </div>

      <div className="relative mb-4">
        <input type="text" placeholder="Search by district name or crop..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-parchment-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-600 focus:border-transparent" />
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-soil-400" />
      </div>

      <div className="flex-1 overflow-y-auto max-h-[300px] lg:max-h-[350px] pr-1 space-y-2">
        {filteredDistricts.length > 0 ? filteredDistricts.map((district) => {
          const isSelected = selectedDistrict.id === district.id;
          return (
            <button key={district.id} onClick={() => {
              setSelectedDistrict(district);
              if (district.mainCrops.length > 0 && !district.mainCrops.includes(selectedCrop)) {
                const matchingCrop = district.mainCrops.find(c => MAJOR_CROPS.includes(c)) || district.mainCrops[0];
                const foundInMajor = MAJOR_CROPS.find(mc => mc.startsWith(matchingCrop) || matchingCrop.startsWith(mc));
                setSelectedCrop(foundInMajor || district.mainCrops[0]);
              }
            }} className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between ${isSelected ? 'border-leaf-600 bg-parchment-200/50 shadow-sm' : 'border-parchment-100 bg-parchment-50 hover:bg-parchment-100/70 hover:border-parchment-200'}`}>
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-soil-900 text-sm truncate">{district.name}</span>
                  <span className="text-[10px] font-medium bg-parchment-50 text-soil-400 px-1.5 py-0.5 rounded border border-parchment-100">{district.region}</span>
                </div>
                <div className="text-xs text-soil-400 mt-1 truncate">🌾 {district.mainCrops.join(', ')}</div>
              </div>
              {isSelected ? <CheckCircle className="h-5 w-5 text-leaf-600 shrink-0" /> : <ChevronRight className="h-4 w-4 text-soil-400 shrink-0" />}
            </button>
          );
        }) : <div className="text-center py-8 text-soil-400 text-sm">No districts found. Try another search!</div>}
      </div>

      <div className="border-t border-parchment-100 mt-5 pt-5">
        <div className="flex items-center gap-2 mb-3"><Sprout className="text-leaf-600 h-5 w-5" /><h3 className="font-bold text-soil-900 text-sm">Target Farming Crop</h3></div>
        <div className="mb-3">
          <span className="text-[11px] font-semibold text-soil-400 uppercase tracking-wider block mb-1.5">Recommended for {selectedDistrict.name}:</span>
          <div className="flex flex-wrap gap-1.5">
            {selectedDistrict.mainCrops.map((crop) => {
              const majorCropMatch = MAJOR_CROPS.find(mc => mc.toLowerCase().includes(crop.toLowerCase().split(' ')[0]) || crop.toLowerCase().includes(mc.toLowerCase().split(' ')[0])) || crop;
              const isCropSelected = selectedCrop === majorCropMatch;
              return (
                <button key={crop} onClick={() => setSelectedCrop(majorCropMatch)} className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${isCropSelected ? 'bg-gold-500 text-white border-gold-500 font-medium' : 'bg-parchment-50 border-parchment-200 text-soil-700 hover:bg-parchment-100'}`}>
                  <Star className={`h-3 w-3 ${isCropSelected ? 'fill-white' : 'text-soil-400'}`} />{crop}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-soil-400 uppercase tracking-wider block mb-1.5">All Supported Crops:</label>
          <select value={selectedCrop} onChange={(e) => setSelectedCrop(e.target.value)} className="w-full px-3 py-2 border border-parchment-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-leaf-600 focus:border-transparent bg-parchment-50 text-soil-900">
            {MAJOR_CROPS.map((crop) => <option key={crop} value={crop}>{crop}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
