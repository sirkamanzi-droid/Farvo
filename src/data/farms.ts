import { supabase } from '../lib/supabase';
import { DISTRICTS } from './districts';
import { Farm, District } from '../types';

const legacyStorageKey = (userId: string) => `omulimi_farms:${userId}`;
const temporaryFarmId = () => `farm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

type FarmRow = {
  id: string;
  label: string;
  crop: string;
  district_id: string;
  district_name: string;
  region: District['region'];
  latitude: number;
  longitude: number;
  location_accuracy_m: number | null;
  location_source: 'phone_gps' | 'manual_pin' | 'legacy_district';
  location_captured_at: string | null;
};

function fromRow(row: FarmRow): Farm {
  const knownDistrict = DISTRICTS.find((district) => district.id === row.district_id);
  const district: District = knownDistrict ?? {
    id: row.district_id,
    name: row.district_name,
    region: row.region,
    latitude: row.latitude,
    longitude: row.longitude,
    mainCrops: [],
    description: '',
  };
  return {
    id: row.id, label: row.label, crop: row.crop, district,
    latitude: Number(row.latitude), longitude: Number(row.longitude),
    locationAccuracyM: row.location_accuracy_m,
    locationSource: row.location_source || 'legacy_district',
    locationCapturedAt: row.location_captured_at,
  };
}

function toRow(userId: string, farm: Farm) {
  return {
    user_id: userId,
    label: farm.label.trim().slice(0, 60) || 'Farm',
    crop: farm.crop.trim().slice(0, 80),
    district_id: farm.district.id,
    district_name: farm.district.name,
    region: farm.district.region,
    latitude: farm.latitude ?? farm.district.latitude,
    longitude: farm.longitude ?? farm.district.longitude,
    location_accuracy_m: farm.locationAccuracyM ?? null,
    location_source: farm.locationSource ?? 'legacy_district',
    location_captured_at: farm.locationCapturedAt ?? null,
  };
}

export async function fetchFarms(userId: string): Promise<Farm[]> {
  const { data, error } = await supabase
    .from('farms')
    .select('id,label,crop,district_id,district_name,region,latitude,longitude,location_accuracy_m,location_source,location_captured_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => fromRow(row as FarmRow));
}

export async function insertFarm(userId: string, farm: Farm): Promise<Farm> {
  const { data, error } = await supabase
    .from('farms')
    .insert(toRow(userId, farm))
    .select('id,label,crop,district_id,district_name,region,latitude,longitude,location_accuracy_m,location_source,location_captured_at')
    .single();
  if (error) throw error;
  return fromRow(data as FarmRow);
}

export async function updateFarm(userId: string, farm: Farm): Promise<Farm> {
  const { data, error } = await supabase
    .from('farms')
    .update(toRow(userId, farm))
    .eq('id', farm.id)
    .eq('user_id', userId)
    .select('id,label,crop,district_id,district_name,region,latitude,longitude,location_accuracy_m,location_source,location_captured_at')
    .single();
  if (error) throw error;
  return fromRow(data as FarmRow);
}

export function loadLegacyFarms(userId: string): Farm[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(legacyStorageKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): Farm[] => {
      if (!item || typeof item !== 'object') return [];
      const legacy = item as Partial<Farm>;
      const districtId = legacy.district?.id;
      const district = DISTRICTS.find((candidate) => candidate.id === districtId);
      if (!district || typeof legacy.crop !== 'string' || !legacy.crop.trim()) return [];
      return [{
        id: temporaryFarmId(),
        label: typeof legacy.label === 'string' ? legacy.label : 'Farm',
        crop: legacy.crop.trim().slice(0, 80),
        district,
      }];
    });
  } catch {
    return [];
  }
}

export async function importLegacyFarms(userId: string): Promise<number> {
  const legacyFarms = loadLegacyFarms(userId);
  if (legacyFarms.length === 0) return 0;
  const rows = legacyFarms.map((farm) => toRow(userId, farm));
  const { error } = await supabase.from('farms').insert(rows);
  if (error) throw error;
  try {
    localStorage.removeItem(legacyStorageKey(userId));
  } catch {
    // Keep the cloud copy even if browser storage cannot be cleared.
  }
  return legacyFarms.length;
}

export function createFarm(district: District, crop: string, existingCount: number): Farm {
  return {
    id: crypto.randomUUID(),
    label: `Farm ${existingCount + 1}`,
    district,
    crop,
  };
}

export async function saveFarmAssets(
  userId: string,
  farmId: string,
  crops: string[],
  livestock: Array<{ species: string; animalCount: number | null }>
): Promise<void> {
  if (crops.length > 0) {
    const { error } = await supabase.from('farm_crops').insert(crops.map(cropName => ({
      user_id: userId, farm_id: farmId, crop_name: cropName,
    })));
    if (error) throw error;
  }
  if (livestock.length > 0) {
    const { error } = await supabase.from('farm_livestock').insert(livestock.map(item => ({
      user_id: userId, farm_id: farmId, species: item.species, animal_count: item.animalCount,
    })));
    if (error) throw error;
  }
}

export async function deleteFarm(userId: string, farmId: string): Promise<void> {
  const { error } = await supabase
    .from('farms')
    .delete()
    .eq('id', farmId)
    .eq('user_id', userId);
  if (error) throw error;
}
