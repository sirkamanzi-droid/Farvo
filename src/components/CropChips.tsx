import React from 'react';
import { District } from '../types';
import { MAJOR_CROPS } from '../data/districts';
import { Star } from 'lucide-react';

interface CropChipsProps {
  district: District;
  selectedCrop: string;
  onSelectCrop: (crop: string) => void;
}

export default function CropChips({ district, selectedCrop, onSelectCrop }: CropChipsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {district.mainCrops.map((crop) => {
        const majorCropMatch = MAJOR_CROPS.find((mc) => mc.toLowerCase().includes(crop.toLowerCase().split(' ')[0]) || crop.toLowerCase().includes(mc.toLowerCase().split(' ')[0])) || crop;
        const isSelected = selectedCrop === majorCropMatch;
        return (
          <button key={crop} onClick={() => onSelectCrop(majorCropMatch)} className={`shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full transition ${isSelected ? 'bg-gold-500 text-soil-900' : 'bg-parchment-50 text-soil-700 border border-parchment-200'}`}>
            <Star className={`h-3 w-3 ${isSelected ? 'fill-soil-900' : 'text-soil-400'}`} />
            {crop}
          </button>
        );
      })}
    </div>
  );
}
