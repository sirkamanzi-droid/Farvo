
import { Farm, District } from '../types';

const STORAGE_KEY = 'omulimi_farms';
const LEGACY_STORAGE_KEY = 'farvo_farms';

export function loadFarms(): Farm[] {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);

    if (raw === null) {
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);

      if (legacyRaw === null) return [];

      const legacyFarms = JSON.parse(legacyRaw);
      if (!Array.isArray(legacyFarms)) return [];

      localStorage.setItem(STORAGE_KEY, legacyRaw);
      raw = legacyRaw;
    }

    const farms = JSON.parse(raw);
    return Array.isArray(farms) ? farms : [];
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

export function createFarm(
  district: District,
  crop: string,
  existingCount: number,
): Farm {
  return {
    id: `farm-${Date.now()}`,
    label: `Farm ${existingCount + 1}`,
    district,
    crop,
  };
}
