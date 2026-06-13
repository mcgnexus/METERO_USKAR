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
  { name: "Casco urbano", lat: 37.8094, lon: -2.5392, elevation: 960, type: "URBAN", description: "Hu\u00E9scar, n\u00FAcleo urbano principal" },
  { name: "Barrio de la Cruz", lat: 37.8109934, lon: -2.5285428, elevation: 935, type: "URBAN", description: "Barrio reconocido en OSM como neighbourhood" },
  { name: "Barrio del Carmen", lat: 37.8040392, lon: -2.5292455, elevation: 935, type: "URBAN", description: "Barrio reconocido en OSM como neighbourhood" },
  { name: "Barrio de las Santas", lat: 37.8129377, lon: -2.5276842, elevation: 933, type: "URBAN", description: "Barrio reconocido en OSM como neighbourhood" },
  { name: "Barrio del Bar\u00F3n", lat: 37.8173081, lon: -2.5269069, elevation: 940, type: "URBAN", description: "Barrio reconocido en OSM como neighbourhood" },
  { name: "Barrio Nuevo", lat: 37.8078456, lon: -2.5283534, elevation: 935, type: "URBAN", description: "N\u00FAcleo reconocido en OSM como hamlet" },
  { name: "Barrio Nuevo de San Clemente", lat: 37.8153793, lon: -2.5253022, elevation: 963, type: "URBAN", description: "N\u00FAcleo reconocido en OSM como hamlet" },
  { name: "Fuencaliente", lat: 37.7994343, lon: -2.5407610, elevation: 927, type: "VEGA", description: "Top\u00F3nimo local asociado a zona h\u00FAmeda/manantial" },
  { name: "Los Llanos", lat: 37.8048318, lon: -2.5971388, elevation: 958, type: "SECANO", description: "Paraje reconocido en OSM como locality" },
  { name: "La Parra", lat: 37.8478264, lon: -2.6596302, elevation: 1024, type: "SECANO", description: "N\u00FAcleo rural reconocido en OSM como hamlet" },
  { name: "Duda", lat: 37.8356165, lon: -2.6705498, elevation: 1007, type: "SECANO", description: "N\u00FAcleo rural reconocido en OSM como hamlet" },
  { name: "Canal de San Clemente", lat: 37.8921535, lon: -2.6416406, elevation: 1079, type: "RESERVOIR", description: "N\u00FAcleo junto al sistema de San Clemente" },
  { name: "Cerro Lancha", lat: 37.9045796, lon: -2.5626440, elevation: 1294, type: "MONTE", description: "Paraje elevado reconocido en OSM como locality" },
  { name: "La Losa", lat: 37.9705559, lon: -2.6152501, elevation: 1469, type: "MONTE", description: "Paraje de alta cota reconocido en OSM como locality" },
];
