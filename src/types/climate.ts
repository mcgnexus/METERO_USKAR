export type ClimateNodeSource = "AEMET" | "OPEN_METEO" | "LOCAL_STATION";
export type ClimateNodeStatus = "OK" | "FALLBACK" | "MISSING";

export interface ClimateNode {
  source: ClimateNodeSource;
  stationId: string;
  name: string;
  time: string;
  temperatureC: number | null;
  humidityPct: number | null;
  pressureHPa?: number | null;
  elevationM: number;
  status: ClimateNodeStatus;
}

export interface RadiationWindReading {
  source: "OPEN_METEO" | "RIA_BLEND";
  time: string;
  solarRadiationWm2: number;
  windSpeed2mKmh: number;
  et0DailyMm?: number | null;
  stationName?: string;
  status: "OK" | "FALLBACK";
  radiationBlend?: {
    bazaWeight: number;
    pueblaWeight: number;
    foehnDetected: boolean;
    anticyclone: boolean;
    cloudCoverPct: number | null;
    bazaPressureHPa: number | null;
    bazaRadiationMJm2: number | null;
    pueblaRadiationMJm2: number | null;
  };
  windSource?: "baza_ria" | "puebla_ria_reduced" | "blended_baza_priority" | "open_meteo";
  cloudCoverPct?: number | null;
}

export interface ClimateCalibrationPayload {
  location: { id: string; name: string; lat: number; lon: number; elevation: number };
  generatedAt: string;
  nodes: {
    baza: ClimateNode;
    sanClemente: ClimateNode;
    localStation: ClimateNode | null;
    radiationWind: RadiationWindReading;
  };
  interpolation: {
    inversionDetected: boolean;
    dynamicGradientCPerM: number;
    dynamicGradientCPer100m: number;
    estimatedTemperatureC: number;
    formula: string;
  };
  dewPoint: {
    dewPointC: number | null;
    frostRisk: "none" | "media" | "alta" | "muy_alta" | "unknown";
    blackFrostRisk: boolean;
  };
  eto: {
    etoHourlyMm: number | null;
    method: "FAO56_HOURLY_PM";
    inputs: {
      temperatureC: number | null;
      humidityPct: number | null;
      pressureKPa: number | null;
      solarRadiationWm2: number;
      netRadiationMJm2h: number;
      windSpeed2mMs: number;
    };
  };
  calibration: {
    realTemperatureC: number | null;
    residualC: number | null;
    residualDefinition: "estimated_minus_real";
    canTrainModel: boolean;
  };
  microclimate: {
    hourMadrid: number;
    isNighttime: boolean;
    inversionConditions: boolean;
    windSpeed2mMs: number;
    coldAirDrainageC: number;
    urbanHeatIslandC: number;
    totalCorrectionC: number;
    rawInterpolatedTempC: number;
    reservoirHumidityReductionPct: number;
    rainfallFoehnFactor: number;
    windGustReductionFactor: number;
  };
  extrapolation: {
    sourceStation: "Baza 5047E";
    sourceElevationM: number;
    targetElevationM: number;
    deltaZ: number;
    rawTemperatureC: number;
    pressureHPa: number;
    pressureMethod: "barometric_from_baza_aemet" | "barometric_from_estimated_baza" | "standard_atmosphere";
    humidityPct: number | null;
    humidityMethod:
      | "vapor_conservation_from_baza_aemet"
      | "vapor_conservation_from_estimated_baza"
      | "negratin_advection_corrected"
      | "unavailable";
    negratínPenaltyApplied: boolean;
    bazaWindDirectionDeg: number | null;
    bazaWindDirectionSource: "open_meteo" | "unavailable";
  };
  exoticVariables: {
    cloudCoverPct: number | null;
    soilTemp10cmC: number | null;
    soilTemp40cmC: number | null;
    source: "open_meteo" | "unavailable";
  };
  quality: { confidencePct: number; warnings: string[] };
  persisted?: boolean;
}
