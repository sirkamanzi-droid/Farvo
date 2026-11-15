import { Farm, District } from '../types';

const storageKey = (userId: string) => `omulimi_farms:${userId}`;

export function loadFarms(userId: string): Farm[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const farms = JSON.parse(raw);
    return Array.isArray(farms) ? farms : [];
  } catch {
    return [];
  }
}

export function saveFarms(userId: string, farms: Farm[]): void {
  if (!userId) return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(farms));
  } catch {
    // Storage can be unavailable or full; the app remains usable for this session.
  }
}

export function createFarm(
  district: District,
  crop: string,
  existingCount: number,
): Farm {
  return {
    id: `farm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: `Farm ${existingCount + 1}`,
    district,
    crop,
  };
}
