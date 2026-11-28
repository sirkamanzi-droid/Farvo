import type { FarmPlotBoundary } from '../data/farms';

export type BoundaryPoint = {
  latitude: number;
  longitude: number;
  accuracyM: number;
  capturedAt: string;
};

export function distanceMetres(a: BoundaryPoint, b: BoundaryPoint) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function buildGpsBoundary(points: BoundaryPoint[]): FarmPlotBoundary {
  if (points.length < 3) throw new Error('Walk at least three different corners before finishing the boundary.');
  const first = points[0];
  const ring: [number, number][] = points.map(point => [point.longitude, point.latitude]);
  ring.push([first.longitude, first.latitude]);

  const meanLatitude = points.reduce((sum, point) => sum + point.latitude, 0) / points.length;
  const radians = Math.PI / 180;
  const scaleX = 111320 * Math.cos(meanLatitude * radians);
  const scaleY = 110540;
  const projected = points.map(point => ({
    x: point.longitude * scaleX,
    y: point.latitude * scaleY,
  }));
  let twiceArea = 0;
  let centroidX = 0;
  let centroidY = 0;
  for (let index = 0; index < projected.length; index++) {
    const current = projected[index];
    const next = projected[(index + 1) % projected.length];
    const cross = current.x * next.y - next.x * current.y;
    twiceArea += cross;
    centroidX += (current.x + next.x) * cross;
    centroidY += (current.y + next.y) * cross;
  }
  const planarArea = Math.abs(twiceArea / 2);
  const centroidLatitude = Math.abs(twiceArea) > 0.01
    ? centroidY / (3 * twiceArea) / scaleY
    : meanLatitude;
  const centroidLongitude = Math.abs(twiceArea) > 0.01
    ? centroidX / (3 * twiceArea) / scaleX
    : points.reduce((sum, point) => sum + point.longitude, 0) / points.length;

  let sphericalArea = 0;
  for (let index = 0; index < ring.length - 1; index++) {
    const [lon1, lat1] = ring[index];
    const [lon2, lat2] = ring[index + 1];
    sphericalArea += (lon2 - lon1) * radians *
      (2 + Math.sin(lat1 * radians) + Math.sin(lat2 * radians));
  }
  const areaSquareMetres = Math.abs(sphericalArea * 6371008.8 * 6371008.8 / 2);
  const areaAcres = areaSquareMetres / 4046.8564224;
  const areaHectares = areaSquareMetres / 10000;
  if (!Number.isFinite(planarArea) || !Number.isFinite(areaAcres) || areaAcres <= 0 ||
      !Number.isFinite(centroidLatitude) || !Number.isFinite(centroidLongitude)) {
    throw new Error('We could not calculate this boundary. Walk the plot again with a clearer GPS signal.');
  }
  return { coordinates: ring, centroidLatitude, centroidLongitude, areaAcres, areaHectares, mappingMethod: 'gps_walk' };
}
