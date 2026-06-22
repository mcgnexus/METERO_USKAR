import type { CurrentWeather, DailyWeather, HourlyWeather } from "@/types/weather";

export type CrossRiskLevel = "muy_favorable" | "favorable" | "moderado" | "desfavorable" | "desconocido";

export interface RaifCrossEvaluation {
  plaga: string;
  riskLevel: CrossRiskLevel;
  explanation: string;
  factors: { label: string; value: string; favorable: boolean }[];
}

interface WeatherContext {
  current: CurrentWeather;
  hourly: HourlyWeather;
  daily: DailyWeather;
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function hoursAbove(hourly: HourlyWeather, hoursAhead: number, predicate: (t: number, h: number, p: number) => boolean): number {
  let count = 0;
  for (let i = 0; i < Math.min(hoursAhead, hourly.time.length); i++) {
    if (predicate(hourly.temperatureC[i], hourly.humidityPct[i], hourly.precipitationMm[i])) count++;
  }
  return count;
}

function evaluateMildiu(ctx: WeatherContext): RaifCrossEvaluation {
  const hum = ctx.current.humidityPct;
  const temp = ctx.current.temperatureC;
  const rainToday = ctx.daily.precipitationSumMm[0] ?? 0;
  const humAbove90 = hoursAbove(ctx.hourly, 24, (_t, h, _p) => h > 90);
  const favorable = hum > 90 && temp >= 15 && temp <= 25 && (rainToday > 0 || humAbove90 >= 6);
  const moderate = hum > 85 && temp >= 10 && temp <= 28;

  return {
    plaga: "mildiu",
    riskLevel: favorable ? "muy_favorable" : moderate ? "favorable" : "desfavorable",
    explanation: favorable
      ? "Humedad muy alta (>90%) y temperaturas óptimas (15-25°C) con lluvia o rocío prolongado. Condiciones ideales para mildiu."
      : moderate
        ? "Humedad elevada y temperaturas moderadas. Riesgo presente pero no óptimo."
        : "Condiciones meteorológicas actuales no favorecen el desarrollo de mildiu.",
    factors: [
      { label: "Humedad actual", value: `${hum.toFixed(0)}%`, favorable: hum > 85 },
      { label: "Temperatura actual", value: `${temp.toFixed(1)}°C`, favorable: temp >= 15 && temp <= 25 },
      { label: "Lluvia hoy", value: `${rainToday.toFixed(1)} mm`, favorable: rainToday > 0 },
      { label: "Horas humedad >90% (24h)", value: `${humAbove90}h`, favorable: humAbove90 >= 6 },
    ],
  };
}

function evaluateCribadoAlmendro(ctx: WeatherContext): RaifCrossEvaluation {
  const hum = ctx.current.humidityPct;
  const temp = ctx.current.temperatureC;
  const humContinuous = hoursAbove(ctx.hourly, 24, (_t, h, _p) => h > 70);
  const tempOk = temp >= 20 && temp <= 25;
  const favorable = humContinuous >= 8 && tempOk;
  const moderate = humContinuous >= 4 && temp >= 15 && temp <= 28;

  return {
    plaga: "cribado_del_almendro",
    riskLevel: favorable ? "muy_favorable" : moderate ? "favorable" : "desfavorable",
    explanation: favorable
      ? "8-12h de humedad continua (>70%) con temperaturas de 20-25°C. Condiciones óptimas para cribado del almendro."
      : moderate
        ? "Humedad moderada y temperaturas templadas. Riesgo presente."
        : "Condiciones actuales no favorecen el cribado del almendro.",
    factors: [
      { label: "Temperatura actual", value: `${temp.toFixed(1)}°C`, favorable: temp >= 20 && temp <= 25 },
      { label: "Horas humedad >70% (24h)", value: `${humContinuous}h`, favorable: humContinuous >= 8 },
      { label: "Humedad actual", value: `${hum.toFixed(0)}%`, favorable: hum > 70 },
    ],
  };
}

function evaluateRepiloOlivo(ctx: WeatherContext): RaifCrossEvaluation {
  const hum = ctx.current.humidityPct;
  const temp = ctx.current.temperatureC;
  const rainToday = ctx.daily.precipitationSumMm[0] ?? 0;
  const favorable = hum > 95 && temp >= 10 && temp <= 20 && rainToday > 0;
  const moderate = hum > 90 && temp >= 8 && temp <= 22;

  return {
    plaga: "repilo",
    riskLevel: favorable ? "muy_favorable" : moderate ? "favorable" : "desfavorable",
    explanation: favorable
      ? "Humedad extrema (>95%), temperaturas frescas (10-20°C) y lluvias. Condiciones muy favorables para repilo."
      : moderate
        ? "Humedad alta y temperaturas frescas. Riesgo moderado."
        : "Condiciones desfavorables para repilo del olivo.",
    factors: [
      { label: "Humedad actual", value: `${hum.toFixed(0)}%`, favorable: hum > 90 },
      { label: "Temperatura actual", value: `${temp.toFixed(1)}°C`, favorable: temp >= 10 && temp <= 20 },
      { label: "Lluvia hoy", value: `${rainToday.toFixed(1)} mm`, favorable: rainToday > 0 },
    ],
  };
}

function evaluateAntracnosis(ctx: WeatherContext): RaifCrossEvaluation {
  const hum = ctx.current.humidityPct;
  const temp = ctx.current.temperatureC;
  const rainToday = ctx.daily.precipitationSumMm[0] ?? 0;
  const favorable = hum > 90 && temp >= 20 && temp <= 28 && rainToday > 0;
  const moderate = hum > 85 && temp >= 18 && temp <= 30;

  return {
    plaga: "antracnosis",
    riskLevel: favorable ? "muy_favorable" : moderate ? "favorable" : "desfavorable",
    explanation: favorable
      ? "Humedad alta, temperaturas cálidas (20-28°C) y lluvias. Condiciones óptimas para antracnosis."
      : moderate
        ? "Humedad y temperatura moderadamente favorables. Vigilar."
        : "Condiciones actuales no favorecen la antracnosis.",
    factors: [
      { label: "Humedad actual", value: `${hum.toFixed(0)}%`, favorable: hum > 85 },
      { label: "Temperatura actual", value: `${temp.toFixed(1)}°C`, favorable: temp >= 20 && temp <= 28 },
      { label: "Lluvia hoy", value: `${rainToday.toFixed(1)} mm`, favorable: rainToday > 0 },
    ],
  };
}

function evaluateMoscaOlivo(ctx: WeatherContext): RaifCrossEvaluation {
  const temp = ctx.current.temperatureC;
  const hum = ctx.current.humidityPct;
  const tMax = ctx.daily.temperatureMaxC[0] ?? temp;
  const favorable = temp >= 15 && temp <= 25 && hum >= 40 && hum <= 80;
  const moderate = temp >= 10 && temp <= 35 && hum >= 30;
  const inhibited = tMax > 35 || temp < 10;

  return {
    plaga: "mosca_del_olivo",
    riskLevel: inhibited ? "desfavorable" : favorable ? "favorable" : moderate ? "moderado" : "desfavorable",
    explanation: inhibited
      ? `Temperaturas extremas (máx ${tMax.toFixed(0)}°C o actual ${temp.toFixed(0)}°C) inhiben la actividad de la mosca.`
      : favorable
        ? "Temperaturas de 15-25°C con humedad moderada. Condiciones favorables para mosca del olivo."
        : "Condiciones no óptimas para la actividad de la mosca del olivo.",
    factors: [
      { label: "Temperatura actual", value: `${temp.toFixed(1)}°C`, favorable: temp >= 15 && temp <= 25 },
      { label: "Temperatura máxima hoy", value: `${tMax.toFixed(1)}°C`, favorable: tMax <= 35 },
      { label: "Humedad actual", value: `${hum.toFixed(0)}%`, favorable: hum >= 40 && hum <= 80 },
    ],
  };
}

function evaluateMonilia(ctx: WeatherContext): RaifCrossEvaluation {
  const hum = ctx.current.humidityPct;
  const temp = ctx.current.temperatureC;
  const favorable = hum > 90 && temp >= 15 && temp <= 25;
  const moderate = hum > 85 && temp >= 10 && temp <= 28;

  return {
    plaga: "monilia",
    riskLevel: favorable ? "muy_favorable" : moderate ? "favorable" : "desfavorable",
    explanation: favorable
      ? "Humedad alta y temperaturas suaves (15-25°C). Riesgo muy alto de monilia en floración."
      : moderate
        ? "Condiciones moderadamente favorables. Monitorear parcelas en floración."
        : "Condiciones desfavorables para monilia.",
    factors: [
      { label: "Humedad actual", value: `${hum.toFixed(0)}%`, favorable: hum > 90 },
      { label: "Temperatura actual", value: `${temp.toFixed(1)}°C`, favorable: temp >= 15 && temp <= 25 },
    ],
  };
}

function evaluateAvispillaAlmendro(ctx: WeatherContext): RaifCrossEvaluation {
  const temp = ctx.current.temperatureC;
  const tMax = ctx.daily.temperatureMaxC[0] ?? temp;
  const favorable = tMax > 15 && temp > 12;
  const moderate = tMax > 12;

  return {
    plaga: "avispilla_del_almendro",
    riskLevel: favorable ? "favorable" : moderate ? "moderado" : "desfavorable",
    explanation: favorable
      ? "Temperaturas primaverales superiores a 15°C. Posible emergencia de adultos. Tratamiento óptimo al detectar primeras emergencias."
      : moderate
        ? "Temperaturas templadas. Vigilar posibles emergencias."
        : "Temperaturas demasiado bajas para emergencia de avispilla.",
    factors: [
      { label: "Temperatura actual", value: `${temp.toFixed(1)}°C`, favorable: temp > 12 },
      { label: "Temperatura máxima hoy", value: `${tMax.toFixed(1)}°C`, favorable: tMax > 15 },
    ],
  };
}

function evaluateBarrenillo(ctx: WeatherContext): RaifCrossEvaluation {
  const temp = ctx.current.temperatureC;
  const tMax = ctx.daily.temperatureMaxC[0] ?? temp;
  const month = new Date().getMonth() + 1;
  const favorable = temp >= 18 && temp <= 30 && month >= 4 && month <= 9;
  const moderate = temp >= 15 && temp <= 32;

  return {
    plaga: "barrenillo",
    riskLevel: favorable ? "favorable" : moderate ? "moderado" : "desfavorable",
    explanation: favorable
      ? "Temperaturas templadas y época de actividad (abril-septiembre). Ciclo activo de barrenillo."
      : moderate
        ? "Temperatura templada. Vigilar acumulación térmica."
        : "Temperaturas o época del año desfavorables para barrenillo.",
    factors: [
      { label: "Temperatura actual", value: `${temp.toFixed(1)}°C`, favorable: temp >= 18 && temp <= 30 },
      { label: "Temperatura máxima hoy", value: `${tMax.toFixed(1)}°C`, favorable: tMax >= 18 && tMax <= 30 },
      { label: "Mes", value: `${month}`, favorable: month >= 4 && month <= 9 },
    ],
  };
}

function evaluateCaracoles(ctx: WeatherContext): RaifCrossEvaluation {
  const hum = ctx.current.humidityPct;
  const temp = ctx.current.temperatureC;
  const rainToday = ctx.daily.precipitationSumMm[0] ?? 0;
  const month = new Date().getMonth() + 1;
  const favorable = hum > 85 && temp > 10 && rainToday > 0 && (month >= 3 && month <= 6);
  const moderate = hum > 80 && temp > 8 && rainToday > 0;

  return {
    plaga: "caracoles_y_babosas",
    riskLevel: favorable ? "muy_favorable" : moderate ? "favorable" : "desfavorable",
    explanation: favorable
      ? "Humedad alta, lluvias, temperaturas >10°C y primavera. Época crítica para caracoles y babosas."
      : moderate
        ? "Humedad y lluvias presentes. Riesgo moderado."
        : "Condiciones desfavorables para caracoles y babosas.",
    factors: [
      { label: "Humedad actual", value: `${hum.toFixed(0)}%`, favorable: hum > 80 },
      { label: "Temperatura actual", value: `${temp.toFixed(1)}°C`, favorable: temp > 10 },
      { label: "Lluvia hoy", value: `${rainToday.toFixed(1)} mm`, favorable: rainToday > 0 },
      { label: "Mes", value: `${month}`, favorable: month >= 3 && month <= 6 },
    ],
  };
}

function evaluateThripsMoscaBlanca(ctx: WeatherContext): RaifCrossEvaluation {
  const temp = ctx.current.temperatureC;
  const hum = ctx.current.humidityPct;
  const favorable = temp > 25 && hum < 60;
  const moderate = temp > 20 && hum < 70;

  return {
    plaga: "thrips_parvispinus",
    riskLevel: favorable ? "muy_favorable" : moderate ? "favorable" : "desfavorable",
    explanation: favorable
      ? "Temperaturas cálidas (>25°C) y baja humedad relativa. Condiciones óptimas para thrips y mosca blanca."
      : moderate
        ? "Temperaturas cálidas y humedad moderada. Riesgo presente."
        : "Condiciones desfavorables para thrips y mosca blanca.",
    factors: [
      { label: "Temperatura actual", value: `${temp.toFixed(1)}°C`, favorable: temp > 25 },
      { label: "Humedad actual", value: `${hum.toFixed(0)}%`, favorable: hum < 60 },
    ],
  };
}

function evaluateCotonet(ctx: WeatherContext): RaifCrossEvaluation {
  const temp = ctx.current.temperatureC;
  const hum = ctx.current.humidityPct;
  const favorable = temp >= 20 && temp <= 30 && hum >= 40 && hum <= 70;
  const moderate = temp >= 18 && temp <= 32 && hum >= 30;

  return {
    plaga: "cotonet",
    riskLevel: favorable ? "favorable" : moderate ? "moderado" : "desfavorable",
    explanation: favorable
      ? "Temperaturas de 20-30°C y humedad moderada. Clima cálido favorable para cotonet."
      : moderate
        ? "Condiciones templadas. Vigilar poblaciones."
        : "Condiciones desfavorables para cotonet.",
    factors: [
      { label: "Temperatura actual", value: `${temp.toFixed(1)}°C`, favorable: temp >= 20 && temp <= 30 },
      { label: "Humedad actual", value: `${hum.toFixed(0)}%`, favorable: hum >= 40 && hum <= 70 },
    ],
  };
}

function evaluateXylella(ctx: WeatherContext): RaifCrossEvaluation {
  const temp = ctx.current.temperatureC;
  const tMax = ctx.daily.temperatureMaxC[0] ?? temp;
  const month = new Date().getMonth() + 1;
  const favorable = tMax > 25 && (month >= 4 && month <= 9);
  const moderate = tMax > 20;

  return {
    plaga: "xylella_fastidiosa",
    riskLevel: favorable ? "favorable" : moderate ? "moderado" : "desfavorable",
    explanation: favorable
      ? "Temperaturas >25°C y vectores (cercópidos) activos en primavera-verano. Riesgo de propagación de Xylella."
      : moderate
        ? "Temperaturas templadas. Vigilar presencia de vectores."
        : "Temperaturas bajas. Bajo riesgo de actividad vectorial.",
    factors: [
      { label: "Temperatura máxima hoy", value: `${tMax.toFixed(1)}°C`, favorable: tMax > 25 },
      { label: "Temperatura actual", value: `${temp.toFixed(1)}°C`, favorable: temp > 20 },
      { label: "Mes", value: `${month}`, favorable: month >= 4 && month <= 9 },
    ],
  };
}

const EVALUATORS: Record<string, (ctx: WeatherContext) => RaifCrossEvaluation> = {
  mildiu: evaluateMildiu,
  cribado_del_almendro: evaluateCribadoAlmendro,
  repilo: evaluateRepiloOlivo,
  antracnosis: evaluateAntracnosis,
  mosca_del_olivo: evaluateMoscaOlivo,
  monilia: evaluateMonilia,
  avispilla_del_almendro: evaluateAvispillaAlmendro,
  barrenillo: evaluateBarrenillo,
  caracoles_y_babosas: evaluateCaracoles,
  thrips_parvispinus: evaluateThripsMoscaBlanca,
  cotonet: evaluateCotonet,
  xylella_fastidiosa: evaluateXylella,
};

export function evaluateRaifAlert(
  plaga: string,
  weather: { current: CurrentWeather; hourly: HourlyWeather; daily: DailyWeather }
): RaifCrossEvaluation {
  const evaluator = EVALUATORS[plaga.toLowerCase().replace(/\s+/g, "_")];
  if (!evaluator) {
    return {
      plaga,
      riskLevel: "desconocido",
      explanation: "No hay modelo de cruce meteorológico disponible para esta plaga.",
      factors: [],
    };
  }
  return evaluator(weather);
}

export function crossEvaluateAll(
  plagas: string[],
  weather: { current: CurrentWeather; hourly: HourlyWeather; daily: DailyWeather }
): RaifCrossEvaluation[] {
  return plagas.map((p) => evaluateRaifAlert(p, weather));
}

export function crossEvaluateRaifAlerts(
  alerts: { id: string; plaga: string }[],
  weather: { current: CurrentWeather; hourly: HourlyWeather; daily: DailyWeather }
): Map<string, RaifCrossEvaluation> {
  const map = new Map<string, RaifCrossEvaluation>();
  for (const alert of alerts) {
    map.set(alert.id, evaluateRaifAlert(alert.plaga, weather));
  }
  return map;
}
