import type { SourceHealth, SourceObservation } from "@/types/weather";

export type DataQualityLevel = "buena" | "media" | "baja";
export type AemetStatus = "disponible" | "degradada" | "sin_datos";
export type LocalStationsStatus = "configuradas" | "degradadas" | "no_configuradas";

export type DataQualitySummary = {
  quality: DataQualityLevel;
  primarySource: "OPEN_METEO" | "AEMET" | "LOCAL_STATIONS" | "NONE";
  aemet: AemetStatus;
  localStations: LocalStationsStatus;
  activeSourceCount: number;
  explanation: string;
};

const FRESH_MINUTES = 120;
const DEGRADED_MINUTES = 240;

export function qualityLabel(quality: DataQualityLevel): string {
  switch (quality) {
    case "buena": return "Buena";
    case "media": return "Media";
    case "baja": return "Baja";
  }
}

export function primarySourceLabel(primarySource: DataQualitySummary["primarySource"]): string {
  switch (primarySource) {
    case "OPEN_METEO": return "Open-Meteo";
    case "AEMET": return "AEMET";
    case "LOCAL_STATIONS": return "Miniestaciones";
    case "NONE": return "Sin fuente";
  }
}

export function aemetStatusLabel(aemet: AemetStatus): string {
  switch (aemet) {
    case "disponible": return "Datos disponibles";
    case "degradada": return "Datos degradados";
    case "sin_datos": return "Sin datos disponibles";
  }
}

export function localStationsStatusLabel(status: LocalStationsStatus): string {
  switch (status) {
    case "configuradas": return "Configuradas";
    case "degradadas": return "Degradadas";
    case "no_configuradas": return "No configuradas";
  }
}

function sourceStatusFromHealth(source: string, health: SourceHealth[]): "OK" | "DEGRADED" | "ERROR" | null {
  const entry = health.find((h) => h.source === source);
  return entry?.status ?? null;
}

function sourceActive(source: SourceObservation): boolean {
  return source.status === "OK" || source.status === "Retrasada";
}

export function buildDataQualitySummary(
  sourceHealth: SourceHealth[],
  sources: SourceObservation[],
): DataQualitySummary {
  const aemetObs = sources.find((s) => s.source === "AEMET");
  const omObs = sources.find((s) => s.source === "OPEN_METEO");
  const localObs = sources.find((s) => s.source === "LOCAL_STATIONS");

  const aemetHealthStatus = sourceStatusFromHealth("AEMET", sourceHealth);
  const localHealthStatus = sourceStatusFromHealth("LOCAL_STATIONS", sourceHealth);

  let aemet: AemetStatus = "sin_datos";
  if (aemetObs) {
    aemet = sourceActive(aemetObs) ? "disponible" : "degradada";
  } else if (aemetHealthStatus === "OK") {
    aemet = "disponible";
  } else if (aemetHealthStatus === "DEGRADED") {
    aemet = "degradada";
  }

  let localStations: LocalStationsStatus = "no_configuradas";
  if (localObs) {
    localStations = sourceActive(localObs) ? "configuradas" : "degradadas";
  } else if (localHealthStatus === "OK") {
    localStations = "configuradas";
  } else if (localHealthStatus === "DEGRADED") {
    localStations = "degradadas";
  }

  const activeSources = sources.filter(sourceActive);

  let primarySource: DataQualitySummary["primarySource"] = "NONE";
  if (omObs) primarySource = "OPEN_METEO";
  else if (aemetObs) primarySource = "AEMET";
  else if (localObs) primarySource = "LOCAL_STATIONS";

  const mainSource = omObs ?? aemetObs ?? localObs ?? null;
  const age = mainSource?.dataAgeMinutes ?? Infinity;

  let quality: DataQualityLevel;
  if (activeSources.length === 0 || age === Infinity) {
    quality = "baja";
  } else if (age <= FRESH_MINUTES) {
    quality = "buena";
  } else if (age <= DEGRADED_MINUTES) {
    quality = "media";
  } else {
    quality = "baja";
  }

  const explanation = buildExplanation(quality, primarySource, aemet, localStations, age, activeSources.length);

  return {
    quality,
    primarySource,
    aemet,
    localStations,
    activeSourceCount: activeSources.length,
    explanation,
  };
}

function buildExplanation(
  quality: DataQualityLevel,
  primarySource: DataQualitySummary["primarySource"],
  aemet: AemetStatus,
  localStations: LocalStationsStatus,
  age: number,
  activeSourceCount: number,
): string {
  if (activeSourceCount === 0) return "No hay datos disponibles en este momento.";

  const parts: string[] = [];
  parts.push(
    `Fuente principal: ${primarySourceLabel(primarySource)}${age < Infinity ? ` (hace ${Math.round(age)} min)` : ""}.`
  );

  if (aemet === "sin_datos") parts.push("AEMET sin datos disponibles.");
  else if (aemet === "degradada") parts.push("AEMET con datos degradados.");
  else parts.push("AEMET con datos disponibles.");

  if (localStations === "no_configuradas") parts.push("Estaciones locales no configuradas.");
  else if (localStations === "degradadas") parts.push("Estaciones locales degradadas.");
  else parts.push("Estaciones locales configuradas.");

  parts.push(`Calidad de los datos: ${qualityLabel(quality).toLowerCase()}.`);
  return parts.join(" ");
}
