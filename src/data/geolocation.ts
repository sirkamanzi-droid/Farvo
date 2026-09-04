import { District } from '../types';

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestDistrict(latitude: number, longitude: number, districts: District[]): District {
  let nearest = districts[0];
  let minDist = Infinity;
  for (const d of districts) {
    const dist = distanceKm(latitude, longitude, d.latitude, d.longitude);
    if (dist < minDist) {
      minDist = dist;
      nearest = d;
    }
  }
  return nearest;
}

export type LocationStatus = 'idle' | 'detecting' | 'success' | 'denied' | 'unsupported' | 'error';

export function detectNearestDistrict(districts: District[]): Promise<{ district: District; status: LocationStatus }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject('unsupported' as LocationStatus);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearest = findNearestDistrict(position.coords.latitude, position.coords.longitude, districts);
        resolve({ district: nearest, status: 'success' });
      },
      (err) => {
        reject(err.code === err.PERMISSION_DENIED ? ('denied' as LocationStatus) : ('error' as LocationStatus));
      },
      { timeout: 8000, maximumAge: 600000 }
    );
  });
}
