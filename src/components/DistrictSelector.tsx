import React, { useState, useMemo } from 'react';
import { DISTRICTS, MAJOR_CROPS } from '../data/districts';
import { District } from '../types';
import { Search, MapPin, CheckCircle, ChevronRight, Sprout, Star } from 'lucide-react';

interface DistrictSelectorProps {
  selectedDistrict: District;
  setSelectedDistrict: (district: District) => void;
  selectedCrop: string;
  setSelectedCrop: (crop: string) => void;
}

export default function DistrictSelector({
  selectedDistrict,
  setSelectedDistrict,
  selectedCrop,
  setSelectedCrop,
}: DistrictSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<'All' | 'Central' | 'Eastern' | 'Northern' | 'Western'>('All');

  // Filter districts based on search term and region
  const filteredDistricts = useMemo(() => {
    return DISTRICTS.filter((district) => {
      const matchesSearch = district.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        district.mainCrops.some(crop => crop.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRegion = selectedRegion === 'All' || district.region === selectedRegion;
      return matchesSearch && matchesRegion;
    });
  }, [searchTerm, selectedRegion]);

  const regions: ('All' | 'Central' | 'Eastern' | 'Northern' | 'Western')[] = [
    'All',
    'Central',
    'Eastern',
    'Northern',
    'Western',
  ];

  return (
    <div className="bg-white rounded-2xl shadow-md border border-emerald-100 p-6 flex flex-col h-full" id="district-selector-container">
      {/* Title */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <MapPin className="text-emerald-600 h-5 w-5" />
          Select Ugandan District
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Select your local district to fetch localized meteorology and crop-specific advice.
        </p>
      </div>

      {/* Region Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-thin scrollbar-thumb-emerald-100" id="region-tabs">
        {regions.map((region) => (
          <button
            key={region}
            id={`region-tab-${region.toLowerCase()}`}
            onClick={() => setSelectedRegion(region)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              selectedRegion === region
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            {region}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative mb-4" id="search-input-wrapper">
        <input
          type="text"
          id="district-search-input"
          placeholder="Search by district name or crop..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
      </div>

      {/* District List */}
      <div 
        className="flex-1 overflow-y-auto max-h-[300px] lg:max-h-[350px] pr-1 space-y-2 scrollbar-thin scrollbar-thumb-slate-100"
        id="district-scroll-list"
      >
        {filteredDistricts.length > 0 ? (
          filteredDistricts.map((district) => {
            const isSelected = selectedDistrict.id === district.id;
            return (
              <button
                key={district.id}
                id={`district-item-${district.id}`}
                onClick={() => {
                  setSelectedDistrict(district);
                  // Automatically set crop to district's primary crop if current selected crop is not in its list
                  if (district.mainCrops.length > 0 && !district.mainCrops.includes(selectedCrop)) {
                    // Try to match a crop from the general MAJOR_CROPS list, otherwise take the first
                    const matchingCrop = district.mainCrops.find(c => MAJOR_CROPS.includes(c)) || district.mainCrops[0];
                    // Clean up crop name if it has parenthetical text like "Matooke (Bananas)" to match list
                    const foundInMajor = MAJOR_CROPS.find(mc => mc.startsWith(matchingCrop) || matchingCrop.startsWith(mc));
                    setSelectedCrop(foundInMajor || district.mainCrops[0]);
                  }
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                    : 'border-slate-100 bg-slate-50 hover:bg-slate-100/70 hover:border-slate-200'
                }`}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 text-sm truncate">{district.name}</span>
                    <span className="text-[10px] font-medium bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-100">
                      {district.region}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 truncate">
                    🌾 {district.mainCrops.join(', ')}
                  </div>
                </div>
                <div className="flex items-center">
                  {isSelected ? (
                    <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                </div>
              </button>
            );
          })
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm">
            No districts found. Try another search!
          </div>
        )}
      </div>

      {/* Crop Selector */}
      <div className="border-t border-slate-100 mt-5 pt-5" id="crop-selector-wrapper">
        <div className="flex items-center gap-2 mb-3">
          <Sprout className="text-emerald-600 h-5 w-5" />
          <h3 className="font-bold text-slate-800 text-sm">Target Farming Crop</h3>
        </div>
        
        {/* Quick select recommended crops for selected district */}
        <div className="mb-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
            Recommended for {selectedDistrict.name}:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {selectedDistrict.mainCrops.map((crop) => {
              // find match in major crops
              const majorCropMatch = MAJOR_CROPS.find(mc => mc.toLowerCase().includes(crop.toLowerCase().split(' ')[0]) || crop.toLowerCase().includes(mc.toLowerCase().split(' ')[0])) || crop;
              const isCropSelected = selectedCrop === majorCropMatch;
              return (
                <button
                  key={crop}
                  onClick={() => setSelectedCrop(majorCropMatch)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                    isCropSelected
                      ? 'bg-amber-500 text-white border-amber-500 font-medium'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Star className={`h-3 w-3 ${isCropSelected ? 'fill-white' : 'text-slate-400'}`} />
                  {crop}
                </button>
              );
            })}
          </div>
        </div>

        {/* Full crops list dropdown */}
        <div>
          <label htmlFor="crop-select" className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
            All Supported Crops:
          </label>
          <select
            id="crop-select"
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white text-slate-700"
          >
            {MAJOR_CROPS.map((crop) => (
              <option key={crop} value={crop}>
                {crop}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
