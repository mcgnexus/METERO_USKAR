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

export const HUESCAR_URBAN_CENTER = {
  name: "Huéscar ciudad",
  lat: 37.8094,
  lon: -2.5392,
  elevation: 953,
};

export const AEMET_HUESCAR_5051X = {
  id: "5051X",
  name: "AEMET 5051X Huéscar",
  lat: 37.861389,
  lon: -2.652778,
  elevation: 1101,
  nearReservoir: true,
  reservoirDistanceKm: 0.28,
};

export const PANTANO_SAN_CLEMENTE = {
  name: "Pantano de San Clemente",
  lat: 37.860763009894654,
  lon: -2.6497118917245626,
  type: "reservoir",
};

export const COMARCA_LOCATIONS = [
  { name: "Hu\u00E9scar", lat: 37.8094, lon: -2.5392, elevation: 953 },
  { name: "Castril", lat: 37.7961, lon: -2.7464, elevation: 890 },
  { name: "Castill\u00E9jar", lat: 37.7186, lon: -2.6489, elevation: 795 },
  { name: "Galera", lat: 37.7433, lon: -2.5514, elevation: 820 },
  { name: "Orce", lat: 37.7194, lon: -2.4772, elevation: 925 },
  { name: "Puebla de Don Fadrique", lat: 37.9583, lon: -2.4350, elevation: 1164 },
  { name: "La Hinojosa", lat: 37.7897, lon: -2.4286, elevation: 980 },
];

export type ZoneType = "URBAN" | "VEGA" | "SECANO" | "MONTE" | "RESERVOIR";

export const HUESCAR_ZONES: { name: string; lat: number; lon: number; elevation: number; type: ZoneType; description: string }[] = [
  { name: "Casco urbano", lat: 37.8094, lon: -2.5392, elevation: 953, type: "URBAN", description: "Centro de Hu\u00E9scar, isla de calor urbana" },
  { name: "Vega del Guadalent\u00EDn", lat: 37.7950, lon: -2.5350, elevation: 920, type: "VEGA", description: "Huerta y regad\u00EDo al sur del casco urbano" },
  { name: "El Altiplano Norte", lat: 37.8350, lon: -2.5100, elevation: 1000, type: "SECANO", description: "Campos de secano y cereal al norte" },
  { name: "Sierra de Hu\u00E9scar", lat: 37.8450, lon: -2.5800, elevation: 1150, type: "MONTE", description: "Monte mediterr\u00E1neo y pinares" },
  { name: "Entorno Pantano San Clemente", lat: 37.8608, lon: -2.6497, elevation: 1095, type: "RESERVOIR", description: "Zona de influencia del embalse" },
  { name: "La Encarnaci\u00F3n", lat: 37.7850, lon: -2.5000, elevation: 940, type: "VEGA", description: "Zona arqueol\u00F3gica y agr\u00EDcola de regad\u00EDo" },
  { name: "Campos del Este", lat: 37.8100, lon: -2.4900, elevation: 970, type: "SECANO", description: "Secano olivarero y cerealista al este" },
  { name: "Cerro del Castell\u00F3n", lat: 37.8220, lon: -2.5600, elevation: 1050, type: "MONTE", description: "Elevaci\u00F3n rocosa con matorral" },
];
