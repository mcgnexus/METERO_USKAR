export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function toDeg(rad: number): number {
  return rad * (180 / Math.PI);
}

export function bearing(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  const brng = (toDeg(Math.atan2(y, x)) + 360) % 360;
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(brng / 45) % 8;
  return dirs[index];
}

export const HUESCAR_COORDS = { lat: 37.8094, lon: -2.5392, elevation: 953 };

export const COMARCA_LOCATIONS = [
  { name: "Hu\u00E9scar", lat: 37.8094, lon: -2.5392, elevation: 953 },
  { name: "Castril", lat: 37.7961, lon: -2.7464, elevation: 890 },
  { name: "Castill\u00E9jar", lat: 37.7186, lon: -2.6489, elevation: 795 },
  { name: "Galera", lat: 37.7433, lon: -2.5514, elevation: 820 },
  { name: "Orce", lat: 37.7194, lon: -2.4772, elevation: 925 },
  { name: "Puebla de Don Fadrique", lat: 37.9583, lon: -2.4350, elevation: 1164 },
  { name: "La Hinojosa", lat: 37.7897, lon: -2.4286, elevation: 980 },
];
