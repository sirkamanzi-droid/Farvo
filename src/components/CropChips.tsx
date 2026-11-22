import React from 'react';
import { SUPPORTED_CROPS } from '../data/supportedCrops';
import { Star } from 'lucide-react';

interface CropChipsProps {
  selectedCrop: string;
  onSelectCrop: (crop: string) => void;
}

export default function CropChips({ selectedCrop, onSelectCrop }: CropChipsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {SUPPORTED_CROPS.map((crop) => {
        const isSelected = selectedCrop === crop.name;
        return (
          <button key={crop.id} onClick={() => onSelectCrop(crop.name)} className={`shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full transition ${isSelected ? 'bg-gold-500 text-soil-900' : 'bg-parchment-50 text-soil-700 border border-parchment-200'}`}>
            <Star className={`h-3 w-3 ${isSelected ? 'fill-soil-900' : 'text-soil-400'}`} />
            {crop.name}
          </button>
        );
      })}
    </div>
  );
}
