export type AdviceStatus = "good" | "caution" | "bad" | "neutral";

export type Advice = {
  status: AdviceStatus;
  title: string;
  label: string;
  message: string;
  reason?: string;
};

export type AdviceContext = {
  tempC: number;
  feelsLikeC: number;
  humidityPct: number | null;
  windSpeedKmh: number;
  windGustKmh: number | null;
  precipitationProbPct: number | null;
  precipitationMm: number | null;
  cloudCoverPct: number | null;
  weatherCode: number;
  isDaytime: boolean;
  month: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
};
