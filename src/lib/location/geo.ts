export type LatLng = [number, number];

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Distance between two points in metres. */
export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Compass bearing from a to b in degrees (0 = north). */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const y = Math.sin(rad(b[1] - a[1])) * Math.cos(rad(b[0]));
  const x =
    Math.cos(rad(a[0])) * Math.sin(rad(b[0])) -
    Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(rad(b[1] - a[1]));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Closest point on a polyline to p (local flat approximation, fine for city scale). */
export function nearestOnPolyline(
  p: LatLng,
  line: LatLng[]
): { index: number; point: LatLng; distanceM: number; alongM: number } {
  if (line.length === 0) return { index: 0, point: p, distanceM: 0, alongM: 0 };
  if (line.length === 1)
    return { index: 0, point: line[0], distanceM: haversineM(p, line[0]), alongM: 0 };
  const kx = Math.cos(rad(p[0]));
  let best = { index: 0, point: line[0], distanceM: Infinity, alongM: 0 };
  let acc = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i];
    const b = line[i + 1];
    const ax = a[1] * kx, ay = a[0];
    const bx = b[1] * kx, by = b[0];
    const px = p[1] * kx, py = p[0];
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const pt: LatLng = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const d = haversineM(p, pt);
    const segLen = haversineM(a, b);
    if (d < best.distanceM) {
      best = { index: i, point: pt, distanceM: d, alongM: acc + segLen * t };
    }
    acc += segLen;
  }
  return best;
}

export function polylineLengthM(line: LatLng[]): number {
  let total = 0;
  for (let i = 0; i < line.length - 1; i++) total += haversineM(line[i], line[i + 1]);
  return total;
}

export function mapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}
