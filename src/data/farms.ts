import { Farm, District } from '../types';

const STORAGE_KEY = 'farvo_farms';

export function loadFarms(): Farm[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFarms(farms: Farm[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(farms));
  } catch {
    // localStorage unavailable — fail silently.
  }
}

export function createFarm(district: District, crop: string, existingCount: number): Farm {
  return {
    id: `farm-${Date.now()}`,
    label: `Farm ${existingCount + 1}`,
    district,
    crop,
  };
}
