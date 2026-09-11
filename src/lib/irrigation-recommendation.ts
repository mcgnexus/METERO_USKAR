export const MM_PER_LITER_M2 = 1;

export type RecommendationNature =
  | 'necesidad_teorica'
  | 'dosis_riego'
  | 'estimacion_pendiente_validacion';

export type ConfidenceLevel = 'alta' | 'media' | 'baja';

export type ParamStatus = 'disponible' | 'estimado' | 'no_disponible';

export type IrrigationInputParams = {
  crop?: string | null;
  phenologicalPhase?: string | null;
  areaM2?: number | null;
  soilType?: string | null;
  irrigationSystem?: string | null;
  soilMoisturePct?: number | null;
  soilMoistureObservedAt?: string | null;
  kc?: number | null;
  irrigationEfficiency?: number | null;
  et0Mm?: number | null;
  forecastRainMm?: number | null;
  effectiveRainMm?: number | null;
  horizonDays?: number | null;
  computedAt?: string | null;
  /** edad (horas) a partir de la cual la humedad del sensor se considera antigua */
  soilMoistureMaxAgeHours?: number;
  /** umbral de humedad del suelo (%) por debajo del cual se recomienda regar */
  soilMoistureThresholdPct?: number;
};

export type RecommendationParam = {
  label: string;
  value: string;
  status: ParamStatus;
};

export type IrrigationRecommendation = {
  nature: RecommendationNature;
  natureLabel: string;
  action: string;
  amount: {
    mm: number | null;
    litersPerM2: number | null;
    rangeMm: { min: number; max: number } | null;
    rangeLitersPerM2: { min: number; max: number } | null;
    totalVolume: { liters: number; cubicMeters: number } | null;
  };
  when: string;
  condition: string;
  why: string;
  dataUsed: RecommendationParam[];
  missingParams: string[];
  confidence: ConfidenceLevel;
  confidenceReasons: string[];
  warning: string;
  computedAt: string | null;
  horizonDays: number | null;
};

export const NO_VALUE = 'no disponible';

export function mmToLitersPerM2(mm: number): number {
  return mm * MM_PER_LITER_M2;
}

export function litersPerM2ToMm(liters: number): number {
  return liters / MM_PER_LITER_M2;
}

export function totalVolumeLiters(mm: number, areaM2: number): number {
  return mm * areaM2;
}

export function formatTotalVolume(volumeLiters: number): { liters: number; cubicMeters: number } {
  return {
    liters: Math.round(volumeLiters),
    cubicMeters: Math.round((volumeLiters / 1000) * 100) / 100,
  };
}

export function defaultIrrigationEfficiency(system: string | null | undefined): number | null {
  switch ((system ?? '').toLowerCase()) {
    case 'goteo':
      return 0.9;
    case 'aspersion':
    case 'aspersión':
      return 0.75;
    case 'surco':
    case 'gravedad':
      return 0.6;
    default:
      return null;
  }
}

export function defaultKcForCrop(crop: string | null | undefined): number | null {
  switch ((crop ?? '').toLowerCase()) {
    case 'olivo':
    case 'olivar':
      return 0.7;
    case 'almendro':
      return 0.75;
    case 'pistacho':
      return 0.8;
    case 'vid':
      return 0.65;
    case 'tomate':
      return 0.85;
    default:
      return null;
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function isMissing(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === 'number' && !Number.isFinite(v));
}

function isOld(observedAt: string | null | undefined, maxAgeHours: number, now: Date): boolean {
  if (!observedAt) return true;
  const t = Date.parse(observedAt);
  if (Number.isNaN(t)) return true;
  return now.getTime() - t > maxAgeHours * 3600 * 1000;
}

export function computeNetIrrigationNeedMm(params: {
  et0Mm: number;
  kc: number;
  effectiveRainMm?: number | null;
  irrigationEfficiency?: number | null;
}): number {
  const etc = params.et0Mm * params.kc;
  const net = etc - (params.effectiveRainMm ?? 0);
  const efficiency = params.irrigationEfficiency ?? 1;
  if (net <= 0) return 0;
  return round1(net / efficiency);
}

export function buildIrrigationRecommendation(
  input: IrrigationInputParams
): IrrigationRecommendation {
  const now = new Date();
  const maxAgeHours = input.soilMoistureMaxAgeHours ?? 48;
  const threshold = input.soilMoistureThresholdPct ?? null;

  const missingParams: string[] = [];
  const confidenceReasons: string[] = [];

  const cropAvailable = !isMissing(input.crop) && String(input.crop).trim() !== '';
  const kcProvided = !isMissing(input.kc);
  const systemAvailable = !isMissing(input.irrigationSystem) && String(input.irrigationSystem).trim() !== '';
  const moistureAvailable = !isMissing(input.soilMoisturePct) && !isOld(input.soilMoistureObservedAt, maxAgeHours, now);
  const et0Available = !isMissing(input.et0Mm);

  if (!cropAvailable) missingParams.push('cultivo');
  if (!kcProvided) missingParams.push('Kc');
  if (!systemAvailable) missingParams.push('sistema de riego');
  if (isMissing(input.soilMoisturePct)) missingParams.push('humedad del suelo');
  else if (!moistureAvailable) missingParams.push('humedad del suelo reciente');
  if (isMissing(input.areaM2)) missingParams.push('superficie');
  if (isMissing(input.soilType)) missingParams.push('tipo de suelo');
  if (isMissing(input.effectiveRainMm) && isMissing(input.forecastRainMm)) missingParams.push('lluvia prevista');
  if (!et0Available) missingParams.push('ET0');

  let confidence: ConfidenceLevel;
  const score =
    (cropAvailable ? 1 : 0) +
    (kcProvided ? 1 : 0) +
    (systemAvailable ? 1 : 0) +
    (moistureAvailable ? 1 : 0) +
    (et0Available ? 1 : 0);
  if (score >= 5) confidence = 'alta';
  else if (score >= 3) confidence = 'media';
  else confidence = 'baja';

  if (!moistureAvailable) {
    confidenceReasons.push('Sin humedad de suelo verificada: la necesidad es teórica.');
  }
  if (!cropAvailable || !kcProvided) {
    confidenceReasons.push('Sin cultivo/Kc confirmado: no se aplica coeficiente de cultivo.');
  }
  if (isOld(input.soilMoistureObservedAt, maxAgeHours, now) && !isMissing(input.soilMoisturePct)) {
    confidenceReasons.push('El dato de humedad del suelo es antiguo.');
  }

  const kc = kcProvided ? (input.kc as number) : null;
  const efficiency =
    input.irrigationEfficiency ??
    (systemAvailable ? defaultIrrigationEfficiency(input.irrigationSystem) : null);

  let netNeedMm: number | null = null;
  if (et0Available && kc !== null) {
    netNeedMm = computeNetIrrigationNeedMm({
      et0Mm: input.et0Mm as number,
      kc,
      effectiveRainMm: input.effectiveRainMm ?? null,
      irrigationEfficiency: efficiency,
    });
  }

  let moistureBlocks: boolean | null = null;
  if (moistureAvailable && threshold !== null) {
    moistureBlocks = (input.soilMoisturePct as number) >= threshold;
  }

  let nature: RecommendationNature;
  let natureLabel: string;
  if (netNeedMm === null) {
    nature = 'estimacion_pendiente_validacion';
    natureLabel = 'Estimación pendiente de validación en campo';
  } else if (!moistureAvailable) {
    nature = 'necesidad_teorica';
    natureLabel = 'Necesidad teórica (balance ETc − lluvia efectiva)';
  } else {
    nature = 'dosis_riego';
    natureLabel = 'Dosis de riego orientativa';
  }

  const rangeMm =
    netNeedMm !== null && netNeedMm > 0
      ? { min: Math.round(netNeedMm * 0.85 * 10) / 10, max: Math.round(netNeedMm * 1.2 * 10) / 10 }
      : null;
  const rangeLitersPerM2 = rangeMm ? { min: rangeMm.min, max: rangeMm.max } : null;
  const totalVolume =
    netNeedMm !== null && !isMissing(input.areaM2) && (input.areaM2 as number) > 0
      ? formatTotalVolume(totalVolumeLiters(netNeedMm, input.areaM2 as number))
      : null;

  const cropText = cropAvailable ? String(input.crop) : 'cultivo no confirmado';
  const horizonText = !isMissing(input.horizonDays) ? `los próximos ${input.horizonDays} días` : 'el horizonte indicado';

  let action: string;
  let condition: string;
  if (netNeedMm === null) {
    action =
      'No se emite recomendación de riego: faltan parámetros imprescindibles (ET0 o cultivo/Kc). Completa los datos de la parcela para obtener una estimación.';
    condition = 'Indeterminado hasta disponer de ET0, cultivo y Kc.';
  } else if (netNeedMm <= 0) {
    action = `No se necesita riego extra para ${cropText} en ${horizonText}: la lluvia efectiva cubre la demanda estimada (ETc).`;
    condition = 'Válido salvo que el suelo esté visualmente seco o el cultivo esté en fase crítica.';
  } else if (moistureBlocks === true) {
    action = `No riegas de momento: el sensor indica humedad suficiente (${round1(input.soilMoisturePct as number)}% ≥ umbral ${threshold}%).`;
    condition = 'Revisa el sensor en 24–48 h o tras cambios de temperatura.';
  } else if (moistureBlocks === false) {
    action = `Aporta ${rangeMm!.min}–${rangeMm!.max} mm entre las 21:00 y las 06:00 para ${cropText} en ${horizonText}.`;
    condition = `Aplica solo si la parcela no registra humedad suficiente (umbral ${threshold}%).`;
  } else {
    action = `Aporta ${rangeMm!.min}–${rangeMm!.max} mm (${rangeMm!.min}–${rangeMm!.max} L/m²) entre las 21:00 y las 06:00 si la parcela no registra humedad suficiente.`;
    condition = 'Necesidad teórica: confirma con tacto, sonda o sensor antes de regar.';
  }

  const when = netNeedMm !== null && netNeedMm > 0 ? 'Entre las 21:00 y las 06:00 (menor evaporación).' : 'No aplicable.';

  const et0Text = et0Available ? `${round1(input.et0Mm as number)} mm` : NO_VALUE;
  const etcText = kc !== null && et0Available ? `${round1((input.et0Mm as number) * kc)} mm` : NO_VALUE;
  const effectiveRainText =
    input.effectiveRainMm != null ? `${round1(input.effectiveRainMm)} mm` : input.forecastRainMm != null ? `${round1(input.forecastRainMm)} mm previstos (efectiva ${NO_VALUE})` : NO_VALUE;

  const why =
    netNeedMm !== null && netNeedMm > 0
      ? `ET0 ${et0Text} × Kc ${kc !== null ? kc.toFixed(2) : NO_VALUE} = ETc ${etcText}; menos lluvia efectiva (${effectiveRainText}); dividido por eficiencia de riego ${efficiency !== null ? `${Math.round(efficiency * 100)}%` : NO_VALUE}.`
      : `ET0 ${et0Text}; ETc ${etcText}; lluvia efectiva ${effectiveRainText}.`;

  const dataUsed: RecommendationParam[] = [
    { label: 'Cultivo', value: cropAvailable ? String(input.crop) : NO_VALUE, status: cropAvailable ? 'disponible' : 'no_disponible' },
    { label: 'Fase fenológica', value: input.phenologicalPhase ?? NO_VALUE, status: input.phenologicalPhase ? 'disponible' : 'no_disponible' },
    { label: 'Kc', value: kc !== null ? kc.toFixed(2) : NO_VALUE, status: kcProvided ? 'disponible' : kc === null && cropAvailable ? 'estimado' : 'no_disponible' },
    { label: 'ET0', value: et0Text, status: et0Available ? 'disponible' : 'no_disponible' },
    { label: 'ETc', value: etcText, status: etcText !== NO_VALUE ? 'disponible' : 'no_disponible' },
    { label: 'Lluvia efectiva usada', value: effectiveRainText, status: input.effectiveRainMm != null ? 'disponible' : input.forecastRainMm != null ? 'estimado' : 'no_disponible' },
    { label: 'Eficiencia de riego', value: efficiency !== null ? `${Math.round(efficiency * 100)}%` : NO_VALUE, status: efficiency !== null ? (input.irrigationEfficiency != null ? 'disponible' : 'estimado') : 'no_disponible' },
    { label: 'Humedad del suelo', value: moistureAvailable ? `${round1(input.soilMoisturePct as number)}%` : isMissing(input.soilMoisturePct) ? NO_VALUE : 'dato antiguo', status: moistureAvailable ? 'disponible' : 'no_disponible' },
    { label: 'Sistema de riego', value: systemAvailable ? String(input.irrigationSystem) : NO_VALUE, status: systemAvailable ? 'disponible' : 'no_disponible' },
    { label: 'Tipo de suelo', value: input.soilType ?? NO_VALUE, status: input.soilType ? 'disponible' : 'no_disponible' },
    { label: 'Superficie', value: !isMissing(input.areaM2) ? `${input.areaM2} m²` : NO_VALUE, status: !isMissing(input.areaM2) ? 'disponible' : 'no_disponible' },
    { label: 'Umbral de humedad', value: threshold !== null ? `${threshold}%` : NO_VALUE, status: threshold !== null ? 'disponible' : 'no_disponible' },
    { label: 'Horizonte', value: !isMissing(input.horizonDays) ? `${input.horizonDays} días` : NO_VALUE, status: !isMissing(input.horizonDays) ? 'disponible' : 'no_disponible' },
    { label: 'Fecha de cálculo', value: input.computedAt ?? now.toISOString(), status: 'disponible' },
  ];

  const warningBits: string[] = [
    'Esta recomendación orienta y debe contrastarse con la parcela.',
  ];
  if (!moistureAvailable) warningBits.push('No hay sensor de humedad operativo o reciente: valida el estado real del suelo.');
  if (!cropAvailable || !kcProvided) warningBits.push('Sin cultivo confirmado no se aplica coeficiente de cultivo: no es una dosis universal.');
  const warning = warningBits.join(' ');

  return {
    nature,
    natureLabel,
    action,
    amount: {
      mm: netNeedMm,
      litersPerM2: netNeedMm,
      rangeMm,
      rangeLitersPerM2,
      totalVolume,
    },
    when,
    condition,
    why,
    dataUsed,
    missingParams,
    confidence,
    confidenceReasons,
    warning,
    computedAt: input.computedAt ?? now.toISOString(),
    horizonDays: input.horizonDays ?? null,
  };
}
