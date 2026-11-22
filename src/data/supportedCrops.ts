export const SUPPORTED_CROPS = [
  { id: 'beans', name: 'Beans', emoji: '🫘' },
  { id: 'maize', name: 'Maize', emoji: '🌽' },
  { id: 'coffee', name: 'Coffee', emoji: '☕' },
  { id: 'banana', name: 'Banana/Matooke', emoji: '🍌' },
  { id: 'tomato', name: 'Tomato', emoji: '🍅' },
  { id: 'potato', name: 'Irish potato', emoji: '🥔' },
] as const;

export const SUPPORTED_CROP_NAMES = SUPPORTED_CROPS.map(crop => crop.name);
export const DEFAULT_CROP = 'Maize';
