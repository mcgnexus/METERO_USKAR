'use client';

import { useState } from 'react';
import { fmtN } from '@/components/llano/atoms';
import type { AgriculturalData } from '@/types/weather';

interface PhenologicalStage {
  name: string;
  kc: number;
  monthStart: number;
  monthEnd: number;
}

interface CropProfile {
  name: string;
  icon: string;
  category: 'fruto_seco' | 'hortaliza' | 'vid';
  soilTempMinC: number;
  gddBaseC: number;
  gddTarget: number;
  chillHoursMin: number | null;
  frostSensitive: boolean;
  kc: number;
  kcStages: PhenologicalStage[];
  plantingWindow: string;
  harvestWindow: string;
  irrigationMonths: number[];
  notes: string[];
}

const CROPS: CropProfile[] = [
  {
    name: 'Pistacho',
    icon: '🌰',
    category: 'fruto_seco',
    soilTempMinC: 12,
    gddBaseC: 10,
    gddTarget: 2500,
    chillHoursMin: 800,
    frostSensitive: true,
    kc: 0.75,
    kcStages: [
      { name: 'Inicial (brotación-hojas)', kc: 0.40, monthStart: 4, monthEnd: 5 },
      { name: 'Desarrollo (crecimiento)', kc: 0.70, monthStart: 5, monthEnd: 6 },
      { name: 'Media (llenado fruto)', kc: 1.05, monthStart: 6, monthEnd: 8 },
      { name: 'Final (maduración)', kc: 0.60, monthStart: 8, monthEnd: 9 },
    ],
    plantingWindow: 'Mar-Abr',
    harvestWindow: 'Sep-Oct',
    irrigationMonths: [4, 5, 6, 7, 8, 9],
    notes: [
      'Requiere 800-1200 horas-frío para romper dormancia',
      'Profundidad siembra: 5-8 cm',
      'Marco plantación: 6x6m a 8x8m',
      'pH óptimo: 7.0-8.0',
      'Tolera suelos salinos y calcáreos',
      'Entrada en producción: 5-7 años',
    ],
  },
  {
    name: 'Almendro',
    icon: '🌰',
    category: 'fruto_seco',
    soilTempMinC: 10,
    gddBaseC: 7,
    gddTarget: 2800,
    chillHoursMin: 400,
    frostSensitive: true,
    kc: 0.7,
    kcStages: [
      { name: 'Inicial (floración-cuajado)', kc: 0.35, monthStart: 3, monthEnd: 4 },
      { name: 'Desarrollo (crecimiento grano)', kc: 0.65, monthStart: 4, monthEnd: 5 },
      { name: 'Media (llenado grano)', kc: 1.05, monthStart: 5, monthEnd: 7 },
      { name: 'Final (endurecimiento)', kc: 0.50, monthStart: 7, monthEnd: 9 },
    ],
    plantingWindow: 'Nov-Feb (plantación)',
    harvestWindow: 'Ago-Sep',
    irrigationMonths: [3, 4, 5, 6, 7, 8, 9],
    notes: [
      'Requiere 400-600 horas-frío según variedad',
      'Profundidad siembra: 3-5 cm',
      'Marco plantación: 6x6m a 7x7m',
      'pH óptimo: 6.5-8.0',
      'Prefiere suelos francos bien drenados',
      'Entrada en producción: 3-4 años',
      'Variedades autoincompatibles requieren polinizador',
    ],
  },
  {
    name: 'Olivo',
    icon: '🫒',
    category: 'fruto_seco',
    soilTempMinC: 8,
    gddBaseC: 10,
    gddTarget: 2200,
    chillHoursMin: 200,
    frostSensitive: true,
    kc: 0.65,
    kcStages: [
      { name: 'Inicial (floración)', kc: 0.40, monthStart: 4, monthEnd: 5 },
      { name: 'Desarrollo (cuajado)', kc: 0.55, monthStart: 5, monthEnd: 6 },
      { name: 'Media (endurecimiento-veraison)', kc: 0.70, monthStart: 6, monthEnd: 8 },
      { name: 'Final (maduración)', kc: 0.45, monthStart: 8, monthEnd: 9 },
    ],
    plantingWindow: 'Nov-Feb (plantación)',
    harvestWindow: 'Nov-Dic',
    irrigationMonths: [4, 5, 6, 7, 8, 9],
    notes: [
      'Requiere 200-400 horas-frío para floración',
      'Profundidad plantación: mismo nivel que vivero',
      'Marco plantación: 6x6m a 8x8m (tradicional) o 4x1.5m (intensivo)',
      'pH óptimo: 6.5-8.5',
      'Tolera sequía pero responde bien al riego',
      'Entrada en producción: 3-5 años',
      'Poda anual para mantener producción',
    ],
  },
  {
    name: 'Tomate',
    icon: '🍅',
    category: 'hortaliza',
    soilTempMinC: 15,
    gddBaseC: 10,
    gddTarget: 1200,
    chillHoursMin: null,
    frostSensitive: true,
    kc: 1.15,
    kcStages: [
      { name: 'Inicial (trasplante-enraizamiento)', kc: 0.45, monthStart: 5, monthEnd: 5 },
      { name: 'Desarrollo (crecimiento vegetativo)', kc: 0.80, monthStart: 6, monthEnd: 6 },
      { name: 'Media (floración-cuajado-maduración)', kc: 1.15, monthStart: 7, monthEnd: 8 },
      { name: 'Final (recolección)', kc: 0.70, monthStart: 9, monthEnd: 9 },
    ],
    plantingWindow: 'Abr-May',
    harvestWindow: 'Jul-Sep',
    irrigationMonths: [5, 6, 7, 8, 9],
    notes: [
      'Profundidad siembra: 0.5-1 cm',
      'Trasplante cuando plántula tenga 4-6 hojas',
      'Marco plantación: 0.5x0.8m a 0.6x1m',
      'pH óptimo: 6.0-6.8',
      'Requiere entutorado (soporte vertical)',
      'Ciclo: 70-90 días desde trasplante',
      'Sensible a mildiu y oídio en alta humedad',
    ],
  },
  {
    name: 'Pepino',
    icon: '🥒',
    category: 'hortaliza',
    soilTempMinC: 15,
    gddBaseC: 10,
    gddTarget: 800,
    chillHoursMin: null,
    frostSensitive: true,
    kc: 1.0,
    kcStages: [
      { name: 'Inicial (siembra-enraizamiento)', kc: 0.50, monthStart: 5, monthEnd: 5 },
      { name: 'Desarrollo (crecimiento)', kc: 0.80, monthStart: 6, monthEnd: 6 },
      { name: 'Media (floración-cosecha)', kc: 1.00, monthStart: 7, monthEnd: 7 },
      { name: 'Final (cosecha)', kc: 0.65, monthStart: 8, monthEnd: 8 },
    ],
    plantingWindow: 'Abr-May',
    harvestWindow: 'Jun-Ago',
    irrigationMonths: [5, 6, 7, 8],
    notes: [
      'Profundidad siembra: 1-2 cm',
      'Marco plantación: 0.5x1m a 1x1.5m',
      'pH óptimo: 6.0-7.0',
      'Requiere entutorado o rastrero',
      'Ciclo: 50-70 días desde siembra',
      'Cosecha frecuente (cada 2-3 días)',
      'Sensible a oídio y mildiu',
    ],
  },
  {
    name: 'Patata',
    icon: '🥔',
    category: 'hortaliza',
    soilTempMinC: 8,
    gddBaseC: 4,
    gddTarget: 1100,
    chillHoursMin: null,
    frostSensitive: true,
    kc: 1.1,
    kcStages: [
      { name: 'Inicial ciclo 1 (siembra)', kc: 0.40, monthStart: 3, monthEnd: 3 },
      { name: 'Desarrollo ciclo 1', kc: 0.75, monthStart: 4, monthEnd: 4 },
      { name: 'Media ciclo 1 (tuberización)', kc: 1.10, monthStart: 5, monthEnd: 5 },
      { name: 'Final ciclo 1 (maduración)', kc: 0.65, monthStart: 6, monthEnd: 6 },
      { name: 'Inter-ciclo (barbecho/cosecha)', kc: 0.30, monthStart: 7, monthEnd: 7 },
      { name: 'Inicial ciclo 2 (siembra)', kc: 0.40, monthStart: 8, monthEnd: 8 },
      { name: 'Desarrollo ciclo 2', kc: 0.75, monthStart: 9, monthEnd: 9 },
      { name: 'Media ciclo 2 (tuberización)', kc: 1.10, monthStart: 10, monthEnd: 10 },
    ],
    plantingWindow: 'Feb-Mar / Jul-Ago',
    harvestWindow: 'Jun-Jul / Oct-Nov',
    irrigationMonths: [3, 4, 5, 6, 8, 9, 10],
    notes: [
      'Profundidad siembra: 10-15 cm',
      'Marco plantación: 0.3x0.7m',
      'pH óptimo: 5.5-6.5',
      'Requiere aporcado (cubrir tallo con tierra)',
      'Ciclo: 90-120 días',
      'Doble ciclo posible en clima mediterráneo',
      'Sensible a mildiu y escarabajo',
    ],
  },
  {
    name: 'Melón',
    icon: '🍈',
    category: 'hortaliza',
    soilTempMinC: 18,
    gddBaseC: 10,
    gddTarget: 1500,
    chillHoursMin: null,
    frostSensitive: true,
    kc: 0.9,
    kcStages: [
      { name: 'Inicial (siembra-enraizamiento)', kc: 0.40, monthStart: 5, monthEnd: 5 },
      { name: 'Desarrollo (crecimiento vegetativo)', kc: 0.70, monthStart: 6, monthEnd: 6 },
      { name: 'Media (floración-llenado fruto)', kc: 0.95, monthStart: 7, monthEnd: 8 },
      { name: 'Final (maduración-cosecha)', kc: 0.65, monthStart: 9, monthEnd: 9 },
    ],
    plantingWindow: 'Abr-May',
    harvestWindow: 'Jul-Sep',
    irrigationMonths: [5, 6, 7, 8, 9],
    notes: [
      'Profundidad siembra: 2-3 cm',
      'Marco plantación: 1x1.5m a 1.5x2m',
      'pH óptimo: 6.0-7.0',
      'Requiere acolchado plástico (mulching)',
      'Ciclo: 80-100 días',
      'Reduce riego 2 semanas antes de cosecha',
      'Sensible a oídio y fusarium',
    ],
  },
  {
    name: 'Sandía',
    icon: '🍉',
    category: 'hortaliza',
    soilTempMinC: 18,
    gddBaseC: 10,
    gddTarget: 1800,
    chillHoursMin: null,
    frostSensitive: true,
    kc: 0.9,
    kcStages: [
      { name: 'Inicial (siembra-enraizamiento)', kc: 0.40, monthStart: 5, monthEnd: 5 },
      { name: 'Desarrollo (crecimiento rastrero)', kc: 0.70, monthStart: 6, monthEnd: 6 },
      { name: 'Media (floración-llenado fruto)', kc: 0.95, monthStart: 7, monthEnd: 8 },
      { name: 'Final (maduración-cosecha)', kc: 0.65, monthStart: 9, monthEnd: 9 },
    ],
    plantingWindow: 'Abr-May',
    harvestWindow: 'Jul-Sep',
    irrigationMonths: [5, 6, 7, 8, 9],
    notes: [
      'Profundidad siembra: 2-3 cm',
      'Marco plantación: 1.5x2m a 2x3m',
      'pH óptimo: 6.0-7.0',
      'Requiere acolchado plástico (mulching)',
      'Ciclo: 90-120 días',
      'Reduce riego 2 semanas antes de cosecha',
      'Sensible a fusarium y oídio',
    ],
  },
  {
    name: 'Habichuela verde',
    icon: '🫘',
    category: 'hortaliza',
    soilTempMinC: 12,
    gddBaseC: 10,
    gddTarget: 600,
    chillHoursMin: null,
    frostSensitive: true,
    kc: 1.05,
    kcStages: [
      { name: 'Inicial ciclo 1 (siembra)', kc: 0.35, monthStart: 4, monthEnd: 4 },
      { name: 'Desarrollo ciclo 1', kc: 0.70, monthStart: 5, monthEnd: 5 },
      { name: 'Media ciclo 1 (cosecha)', kc: 1.05, monthStart: 6, monthEnd: 7 },
      { name: 'Final ciclo 1', kc: 0.85, monthStart: 8, monthEnd: 8 },
      { name: 'Inicial ciclo 2 (siembra)', kc: 0.35, monthStart: 9, monthEnd: 9 },
    ],
    plantingWindow: 'Mar-Jun / Jul-Ago',
    harvestWindow: 'May-Jul / Sep-Oct',
    irrigationMonths: [4, 5, 6, 7, 8, 9],
    notes: [
      'Profundidad siembra: 3-5 cm',
      'Marco plantación: 0.1x0.5m (enano) o 0.1x0.8m (trepador)',
      'pH óptimo: 6.0-7.0',
      'Fija nitrógeno atmosférico (no requiere fertilización N)',
      'Ciclo: 50-70 días',
      'Doble ciclo posible',
      'Cosecha frecuente para mantener producción',
    ],
  },
  {
    name: 'Vid',
    icon: '🍇',
    category: 'vid',
    soilTempMinC: 10,
    gddBaseC: 10,
    gddTarget: 1800,
    chillHoursMin: 200,
    frostSensitive: true,
    kc: 0.65,
    kcStages: [
      { name: 'Inicial (brotación-crecimiento)', kc: 0.30, monthStart: 4, monthEnd: 4 },
      { name: 'Desarrollo (floración-cuajado)', kc: 0.60, monthStart: 5, monthEnd: 6 },
      { name: 'Media (envero-maduración)', kc: 0.80, monthStart: 7, monthEnd: 8 },
      { name: 'Final (cosecha-senescencia)', kc: 0.55, monthStart: 9, monthEnd: 9 },
    ],
    plantingWindow: 'Nov-Mar (esqueje)',
    harvestWindow: 'Sep-Oct',
    irrigationMonths: [4, 5, 6, 7, 8, 9],
    notes: [
      'Requiere 200-400 horas-frío según variedad',
      'Profundidad plantación: 30-40 cm',
      'Marco plantación: 2x2.5m a 3x3m',
      'pH óptimo: 6.0-7.5',
      'Requiere poda anual (invierno y verano)',
      'Entrada en producción: 3-4 años',
      'Sensible a mildiu, oídio y botrytis',
    ],
  },
  {
    name: 'Calabaza',
    icon: '🎃',
    category: 'hortaliza',
    soilTempMinC: 15,
    gddBaseC: 10,
    gddTarget: 1200,
    chillHoursMin: null,
    frostSensitive: true,
    kc: 0.9,
    kcStages: [
      { name: 'Inicial (siembra-enraizamiento)', kc: 0.40, monthStart: 5, monthEnd: 5 },
      { name: 'Desarrollo (crecimiento rastrero)', kc: 0.70, monthStart: 6, monthEnd: 6 },
      { name: 'Media (floración-llenado fruto)', kc: 0.95, monthStart: 7, monthEnd: 8 },
      { name: 'Final (maduración-cosecha)', kc: 0.65, monthStart: 9, monthEnd: 9 },
    ],
    plantingWindow: 'Abr-May',
    harvestWindow: 'Sep-Oct',
    irrigationMonths: [5, 6, 7, 8, 9],
    notes: [
      'Profundidad siembra: 2-3 cm',
      'Marco plantación: 1.5x2m a 2x3m',
      'pH óptimo: 6.0-7.0',
      'Requiere espacio amplio (planta rastrera)',
      'Ciclo: 90-120 días',
      'Cosecha cuando pedúnculo se seca',
      'Sensible a oídio y mildiu',
    ],
  },
  {
    name: 'Calabacín',
    icon: '🥒',
    category: 'hortaliza',
    soilTempMinC: 15,
    gddBaseC: 10,
    gddTarget: 700,
    chillHoursMin: null,
    frostSensitive: true,
    kc: 0.85,
    kcStages: [
      { name: 'Inicial ciclo 1 (siembra)', kc: 0.40, monthStart: 4, monthEnd: 4 },
      { name: 'Desarrollo ciclo 1', kc: 0.70, monthStart: 5, monthEnd: 5 },
      { name: 'Media ciclo 1 (cosecha)', kc: 0.90, monthStart: 6, monthEnd: 7 },
      { name: 'Final ciclo 1', kc: 0.65, monthStart: 8, monthEnd: 8 },
      { name: 'Inicial ciclo 2 (siembra)', kc: 0.40, monthStart: 9, monthEnd: 9 },
    ],
    plantingWindow: 'Mar-May / Jul-Ago',
    harvestWindow: 'May-Jul / Sep-Oct',
    irrigationMonths: [4, 5, 6, 7, 8, 9],
    notes: [
      'Profundidad siembra: 2-3 cm',
      'Marco plantación: 1x1m a 1.5x1.5m',
      'pH óptimo: 6.0-7.0',
      'Ciclo: 50-70 días',
      'Doble ciclo posible en clima mediterráneo',
      'Cosecha frecuente (cada 2-3 días)',
      'Sensible a oídio',
    ],
  },
];

type CropStatus = 'safe' | 'risk' | 'not_recommended';

interface DiagnosisItem {
  factor: string;
  status: 'ok' | 'warning' | 'critical';
  icon: string;
  detail: string;
  explanation: string;
  recommendation: string;
}

interface CropAssessment {
  crop: CropProfile;
  status: CropStatus;
  reasons: string[];
  diagnosis: DiagnosisItem[];
  waterNeed: string;
  gddProgress: string;
  irrigationMm: number | null;
  irrigationLitersM2: number | null;
  isIrrigationSeason: boolean;
  currentStage: PhenologicalStage | null;
  kcEffective: number;
}

function findCurrentStage(crop: CropProfile, month: number): PhenologicalStage | null {
  return crop.kcStages.find((s) => month >= s.monthStart && month <= s.monthEnd) ?? null;
}

function assessCrop(
  crop: CropProfile,
  soilTemp: number | null,
  gddCumulative: number | null,
  chillHours: number | null,
  frostRisk: AgriculturalData['frostRisk48h'],
  et0CumulativeMm: number | null,
  precipitacionSemanal: number | null
): CropAssessment {
  const reasons: string[] = [];
  const diagnosis: DiagnosisItem[] = [];
  let status: CropStatus = 'safe';

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const isIrrigationSeason = crop.irrigationMonths.includes(currentMonth);

  const currentStage = findCurrentStage(crop, currentMonth);
  const kcEffective = currentStage?.kc ?? crop.kc;

  let irrigationMm: number | null = null;
  let irrigationLitersM2: number | null = null;

  if (isIrrigationSeason && et0CumulativeMm !== null && precipitacionSemanal !== null) {
    const etc = et0CumulativeMm * kcEffective;
    const necesidad = etc - precipitacionSemanal;
    irrigationMm = Math.max(0, necesidad);
    irrigationLitersM2 = irrigationMm;
  }

  // Soil temperature check
  if (soilTemp !== null) {
    if (soilTemp < crop.soilTempMinC - 3) {
      status = 'not_recommended';
      reasons.push(`Suelo ${soilTemp.toFixed(1)}°C < ${crop.soilTempMinC}°C mínimo`);
      diagnosis.push({
        factor: 'Temperatura del suelo',
        status: 'critical',
        icon: '🌡️',
        detail: `El suelo está a ${soilTemp.toFixed(1)}°C, muy por debajo del mínimo de ${crop.soilTempMinC}°C`,
        explanation: `Este cultivo necesita al menos ${crop.soilTempMinC}°C en el suelo para germinar o desarrollarse. Con ${soilTemp.toFixed(1)}°C la semilla no germinará, las raíces no absorberán nutrientes y la planta puede entrar en shock.`,
        recommendation: `Retrasar siembra o trasplante hasta que el suelo alcance ${crop.soilTempMinC}°C. Si ya está plantado, cubrir con acolchado o tunelillo para elevar la temperatura.`,
      });
    } else if (soilTemp < crop.soilTempMinC) {
      status = 'risk';
      reasons.push(`Suelo ${soilTemp.toFixed(1)}°C cerca del mínimo (${crop.soilTempMinC}°C)`);
      diagnosis.push({
        factor: 'Temperatura del suelo',
        status: 'warning',
        icon: '🌡️',
        detail: `El suelo está a ${soilTemp.toFixed(1)}°C, justo por debajo del mínimo de ${crop.soilTempMinC}°C`,
        explanation: `La temperatura del suelo está en el límite. La germinación será lenta y desigual, el desarrollo se retrasará y la planta estará más expuesta a enfermedades de raíz.`,
        recommendation: `Esperar unos días a que el suelo se caliente, o usar acolchado plástico negro para captar radiación y elevar 2-3°C la temperatura del suelo.`,
      });
    } else {
      diagnosis.push({
        factor: 'Temperatura del suelo',
        status: 'ok',
        icon: '🌡️',
        detail: `Suelo a ${soilTemp.toFixed(1)}°C, por encima del mínimo de ${crop.soilTempMinC}°C`,
        explanation: `La temperatura del suelo es adecuada para este cultivo. La germinación y el desarrollo radicular se desarrollarán con normalidad.`,
        recommendation: 'No requiere acción. Mantener vigilancia si bajan bruscamente las temperaturas nocturnas.',
      });
    }
  } else {
    diagnosis.push({
      factor: 'Temperatura del suelo',
      status: 'ok',
      icon: '🌡️',
      detail: 'Sin dato de temperatura del suelo',
      explanation: 'No hay sensor de suelo activo. No se puede evaluar la idoneidad térmica para germinación.',
      recommendation: 'Consultar la temperatura del suelo en la sección de Capa Agronómica.',
    });
  }

  // Frost risk check
  if (crop.frostSensitive) {
    if (frostRisk === 'alta' || frostRisk === 'muy_alta') {
      status = 'not_recommended';
      reasons.push(`Riesgo de helada ${frostRisk} en 48h`);
      diagnosis.push({
        factor: 'Riesgo de helada',
        status: 'critical',
        icon: '❄️',
        detail: `Riesgo de helada ${frostRisk === 'muy_alta' ? 'muy alto' : 'alto'} en las próximas 48 horas`,
        explanation: `El pronóstico microclimático del llano indica temperaturas que pueden causar daño celular en este cultivo sensible. La helada puede quemar hojas, flores y frutos cuajados, y dañar el tallo.`,
        recommendation: frostRisk === 'muy_alta'
          ? 'Activar sistemas antihelada urgentes: riego por aspersión, estufas, velas o cubiertas flotantes. Si es posible, retrasar siembra hasta que pase el evento.'
          : 'Preparar protección: acolchado, cubiertas flotantes o microtúneles. Regar antes de la helada para aumentar inercia térmica del suelo.',
      });
    } else if (frostRisk === 'media') {
      if (status === 'safe') status = 'risk';
      reasons.push('Riesgo de helada medio en 48h');
      diagnosis.push({
        factor: 'Riesgo de helada',
        status: 'warning',
        icon: '❄️',
        detail: 'Riesgo de helada medio en las próximas 48 horas',
        explanation: 'Hay una posibilidad real de helada en zonas bajas o con inversión térmica. Este cultivo es sensible y podría sufrir daños leves si la temperatura baja durante la noche.',
        recommendation: 'Vigilar mínimas previstas. Tener preparada protección flotante o plástico. Evitar riego nocturno en las próximas noches.',
      });
    } else {
      diagnosis.push({
        factor: 'Riesgo de helada',
        status: 'ok',
        icon: '❄️',
        detail: 'Sin riesgo de helada en 48 horas',
        explanation: 'El pronóstico no muestra riesgo de helada para este cultivo en las próximas 48 horas.',
        recommendation: 'No requiere acción preventiva.',
      });
    }
  } else {
    diagnosis.push({
      factor: 'Riesgo de helada',
      status: 'ok',
      icon: '❄️',
      detail: 'Cultivo tolerante a helada',
      explanation: 'Este cultivo resiste heladas ligeras sin daño significativo.',
      recommendation: 'No requiere acción.',
    });
  }

  // Chill hours check (for pistachio and grapevine)
  if (crop.chillHoursMin !== null) {
    if (chillHours !== null && chillHours < crop.chillHoursMin) {
      if (status === 'safe') status = 'risk';
      reasons.push(`Horas-frío ${chillHours}h < ${crop.chillHoursMin}h necesarias`);
      const deficit = crop.chillHoursMin - chillHours;
      diagnosis.push({
        factor: 'Horas-frío',
        status: 'warning',
        icon: '🥶',
        detail: `Solo ${chillHours}h acumuladas, faltan ${deficit}h para el mínimo de ${crop.chillHoursMin}h`,
        explanation: `Este cultivo necesita acumular ${crop.chillHoursMin} horas de frío para romper la dormancia correctamente. Con menos horas-frío la brotación será irregular, la floración pobre y el cuajado del fruto deficiente.`,
        recommendation: 'No se puede compensar artificialmente. Para próximos años, valorar variedades de menor requerimiento en frío si el déficit es recurrente.',
      });
    } else {
      diagnosis.push({
        factor: 'Horas-frío',
        status: 'ok',
        icon: '🥶',
        detail: chillHours !== null
          ? `${chillHours}h acumuladas, mínimo requerido: ${crop.chillHoursMin}h`
          : `Requiere ${crop.chillHoursMin}h (sin dato actual)`,
        explanation: 'Las horas-frío son suficientes para una brotación uniforme y floración adecuada.',
        recommendation: 'No requiere acción.',
      });
    }
  }

  // Irrigation / water status
  if (isIrrigationSeason && irrigationLitersM2 !== null) {
    if (irrigationLitersM2 > 0) {
      diagnosis.push({
        factor: 'Balance hídrico',
        status: 'ok',
        icon: '💧',
        detail: `Necesita ${irrigationLitersM2.toFixed(1)} L/m² esta semana`,
        explanation: `Tras descontar la lluvia, el cultivo demanda riego. Kc actual: ${kcEffective.toFixed(2)} (${currentStage?.name ?? 'etapa media'}). El consumo se calcula como ETc = ETo × Kc − precipitación.`,
        recommendation: 'Repartir el riego en 2-3 sesiones si el suelo es arenoso. Priorizar riego en horas de baja evaporación (atardecer/noche).',
      });
    } else {
      diagnosis.push({
        factor: 'Balance hídrico',
        status: 'ok',
        icon: '💧',
        detail: 'La lluvia cubre la demanda hídrica',
        explanation: 'La precipitación reciente supera la evapotranspiración del cultivo, por lo que no necesita riego complementario.',
        recommendation: 'Suspender riego hasta que el suelo se seque. Vigilar encharcamiento si el suelo es arcilloso.',
      });
    }
  } else if (!isIrrigationSeason) {
    diagnosis.push({
      factor: 'Balance hídrico',
      status: 'ok',
      icon: '💧',
      detail: 'Fuera de temporada de riego',
      explanation: 'El cultivo está en dormancia o no requiere riego en esta época del año.',
      recommendation: 'No requiere riego. Preparar la instalación de riego para la próxima temporada.',
    });
  }

  // GDD progress
  const gddProgress = gddCumulative !== null
    ? `${gddCumulative.toFixed(0)} / ${crop.gddTarget} GDD (${((gddCumulative / crop.gddTarget) * 100).toFixed(0)}%)`
    : 'Sin datos GDD';

  if (gddCumulative !== null) {
    const gddPct = (gddCumulative / crop.gddTarget) * 100;
    if (gddPct >= 100) {
      diagnosis.push({
        factor: 'Grados día acumulados',
        status: 'ok',
        icon: '🔥',
        detail: `${gddCumulative.toFixed(0)} / ${crop.gddTarget} GDD (${gddPct.toFixed(0)}%) — ciclo completado`,
        explanation: 'El cultivo ha acumulado suficiente calor para completar su ciclo. La madurez fisiológica debería alcanzarse en los próximos días.',
        recommendation: 'Preparar cosecha. Vigilar parámetros de madurez (color, firmeza, azúcar).',
      });
    } else if (gddPct >= 50) {
      diagnosis.push({
        factor: 'Grados día acumulados',
        status: 'ok',
        icon: '🔥',
        detail: `${gddCumulative.toFixed(0)} / ${crop.gddTarget} GDD (${gddPct.toFixed(0)}%)`,
        explanation: 'El desarrollo avanza dentro de lo normal. El cultivo está en la segunda mitad de su acumulación térmica.',
        recommendation: 'Mantener riego y vigilancia fitosanitaria.',
      });
    } else {
      diagnosis.push({
        factor: 'Grados día acumulados',
        status: 'ok',
        icon: '🔥',
        detail: `${gddCumulative.toFixed(0)} / ${crop.gddTarget} GDD (${gddPct.toFixed(0)}%)`,
        explanation: 'El cultivo está en la primera mitad del ciclo. La acumulación de calor es temprana y no indica retraso.',
        recommendation: 'Mantener labores culturales y riego según etapa fenológica.',
      });
    }
  }

  const waterNeed = currentStage
    ? `Kc ${kcEffective.toFixed(2)} (${currentStage.name})`
    : `Kc ${kcEffective.toFixed(2)}`;

  if (reasons.length === 0) {
    reasons.push('Condiciones favorables');
  }

  return { crop, status, reasons, diagnosis, waterNeed, gddProgress, irrigationMm, irrigationLitersM2, isIrrigationSeason, currentStage, kcEffective };
}

function statusTone(status: CropStatus): string {
  if (status === 'safe') return 'border-emerald-200 bg-emerald-50/60';
  if (status === 'risk') return 'border-amber-200 bg-amber-50/60';
  return 'border-rose-200 bg-rose-50/60';
}

function statusBadge(status: CropStatus): string {
  if (status === 'safe') return 'bg-emerald-100 text-emerald-800';
  if (status === 'risk') return 'bg-amber-100 text-amber-800';
  return 'bg-rose-100 text-rose-800';
}

function statusLabel(status: CropStatus): string {
  if (status === 'safe') return 'Favorable';
  if (status === 'risk') return 'Precaución';
  return 'No recomendado';
}

function CropIcon({ crop, size = 'md' }: { crop: CropProfile; size?: 'md' | 'lg' }) {
  const className = size === 'lg' ? 'h-14 w-14' : 'h-8 w-8';

  if (crop.name === 'Almendro') {
    return (
      <svg className={className} viewBox="0 0 512 512" role="img" aria-label="Almendra">
        <ellipse
          cx="336"
          cy="288"
          rx="112"
          ry="225"
          transform="rotate(31 336 288)"
          fill="#A7583B"
        />
        <path
          d="M238 184c60-67 168-116 238-106-24 28-50 58-77 91-63 77-128 161-175 245-8-56-7-144 14-230z"
          fill="#8B3B2F"
          opacity="0.55"
        />
        <path
          d="M295 201c50-49 117-94 181-123-33 37-68 79-103 125-47 62-90 128-126 195 7-60 22-129 48-197z"
          fill="#6F2C25"
          opacity="0.55"
        />
        <path
          d="M243 238c72-71 154-135 233-160-54 58-113 128-168 205-32 45-61 91-84 135 2-56 8-118 19-180z"
          fill="#D77855"
          opacity="0.16"
        />
        <ellipse
          cx="164"
          cy="256"
          rx="144"
          ry="256"
          fill="#CF614C"
        />
        <path
          d="M164 0c37 54 73 152 73 256S201 458 164 512c84 0 144-115 144-256S248 0 164 0z"
          fill="#B95443"
        />
        <path
          d="M164 0C97 65 78 160 78 256s19 191 86 256c-91 0-144-115-144-256S73 0 164 0z"
          fill="#D46651"
        />
        <path
          d="M164 0c14 62 25 149 25 256s-11 194-25 256c46-36 70-132 70-256S210 36 164 0z"
          fill="#E07A61"
          opacity="0.55"
        />
        <path
          d="M164 0c-14 62-25 149-25 256s11 194 25 256c-46-36-70-132-70-256S118 36 164 0z"
          fill="#B54D3D"
          opacity="0.42"
        />
        <path
          d="M164 0v512"
          stroke="#8D4633"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M118 28c-35 74-48 149-48 228s13 154 48 228"
          fill="none"
          stroke="#984634"
          strokeWidth="14"
          strokeLinecap="round"
          opacity="0.75"
        />
        <path
          d="M210 28c35 74 48 149 48 228s-13 154-48 228"
          fill="none"
          stroke="#984634"
          strokeWidth="14"
          strokeLinecap="round"
          opacity="0.75"
        />
      </svg>
    );
  }

  if (crop.name === 'Calabacín') {
    return (
      <svg className={className} viewBox="0 0 512 512" role="img" aria-label="Calabacín">
        <rect x="152" y="8" width="48" height="64" rx="2" fill="#63B51F" />
        <path d="M120 88c0-22 18-40 40-40h32c22 0 40 18 40 40v8H120v-8z" fill="#86C43A" />
        <path
          d="M240 88c-6 0-104 0-112 0c-31 14-48 39-48 66v34c0 118 62 207 145 272c44 35 98 45 144 42c47-4 73-31 61-86c-8-38-34-76-82-103c-48-28-75-61-75-141c0-35-11-64-33-84z"
          fill="#409B45"
        />
        <path
          d="M239 88c21 21 32 50 33 85c2 79 28 111 76 139c49 29 76 66 84 105c7 33 0 56-18 70c25-19 33-53 2-105c-18-30-42-50-75-68c-46-25-68-62-68-142c0-34-11-63-34-84z"
          fill="#2F8737"
          opacity="0.55"
        />
        <path
          d="M80 156c0-28 17-54 48-68c-22 43-15 145 16 217c25 59 70 116 133 148c-19-3-37-10-52-22C142 366 80 277 80 188v-32z"
          fill="#48A64D"
          opacity="0.75"
        />
        <path
          d="M156 92c-31 48-34 161 29 245"
          fill="none"
          stroke="#74C47A"
          strokeWidth="16"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M196 92c-20 37-20 140 76 213"
          fill="none"
          stroke="#74C47A"
          strokeWidth="16"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path
          d="M224 390c22 19 48 32 80 39"
          fill="none"
          stroke="#2E8234"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <circle cx="200" cy="392" r="8" fill="#2E8234" />
        <circle cx="380" cy="444" r="12" fill="#2E8234" />
        <path d="M120 88h112c-2-22-19-39-41-40h-31c-22 0-40 18-40 40z" fill="#7FC438" />
      </svg>
    );
  }

  if (crop.name === 'Habichuela verde') {
    return (
      <svg className={className} viewBox="0 0 512 512" role="img" aria-label="Habichuela verde">
        <path
          d="M453 50c11 148-26 260-110 337c-54 50-121 82-190 92c-30 4-41-17-68-16c23-12 33-31 55-42c43-21 104-13 173-74c78-69 110-173 107-295z"
          fill="#0AA86E"
        />
        <path
          d="M453 50c11 148-26 260-110 337c-54 50-121 82-190 92c-30 4-41-17-68-16c97-8 178-45 237-108c66-71 95-171 93-300z"
          fill="#078A5C"
          opacity="0.55"
        />
        <path
          d="M420 57c0 124-35 220-104 288c-46 45-100 73-162 86"
          fill="none"
          stroke="#1EBB83"
          strokeWidth="18"
          strokeLinecap="round"
          opacity="0.35"
        />
        <path
          d="M374 117c-55 111-127 190-219 238c-44 23-73 28-95 45c-18 14-26 25-60 30c29-10 40-25 52-49c11-22 29-27 55-38c119-52 203-124 264-234z"
          fill="#27B987"
        />
        <path
          d="M371 109c-52 100-122 176-209 226c-33 19-70 36-104 46c101-52 202-139 286-277z"
          fill="#5DC59B"
          opacity="0.7"
        />
        <path
          d="M318 254c-40 46-88 84-145 114c-34 18-65 30-91 37"
          fill="none"
          stroke="#16A971"
          strokeWidth="16"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M451 49c-2-11-8-26-5-37c3-11 18-16 27-8c9 8 6 25 7 36c10 3 17 11 19 23c-14 8-31 9-48 7z"
          fill="#9BE07A"
        />
        <path
          d="M370 117c3-12 13-39 22-42c20-6 31 12 22 28c-5 8-9 14-11 23c7 2 12 8 12 15c-13 5-29 1-45-10c-6-4-5-10 0-14z"
          fill="#9BE07A"
        />
        <path
          d="M453 50c14 2 28 1 40-5c5 6 7 12 7 18c-14 8-32 9-49 7z"
          fill="#83CE62"
        />
      </svg>
    );
  }

  if (crop.name !== 'Pistacho') {
    return <span className={size === 'lg' ? 'text-5xl' : 'text-2xl'}>{crop.icon}</span>;
  }

  return (
    <svg className={className} viewBox="0 0 52.782 52.782" role="img" aria-label="Pistacho">
      <path
        fill="#7FB047"
        d="M51.99,12.09c-1.164-0.301-2.942-0.329-5.275,0.077c0.523-1.615,1.411-3.687,1.925-4.802
        c0.58-1.26,0.866-2.948-0.071-3.913c-0.784-0.804-2.085-0.829-3.868-0.068c-0.686,0.292-1.35,0.603-1.981,0.897
        c-0.695,0.324-1.363,0.633-1.963,0.871c0.251-1.87,0.198-3.336-0.067-4.36l-0.205-0.791l-0.815,0.042
        c-1.885,0.099-12.41,4.615-15.125,5.819c-5.11,2.266-9.633,5.34-13.442,9.139l-0.075,0.075
        c-2.581,2.578-4.875,5.341-6.854,8.269c-4.454,7.638-5.351,16.298-2.666,25.738c0.067,0.237,0.124,0.434,0.163,0.587
        l0.147,0.57l0.72,0.72l0.571,0.147c0.153,0.04,0.35,0.096,0.586,0.163c3.537,1.007,6.963,1.51,10.272,1.51
        c5.521,0,10.711-1.402,15.523-4.21c2.87-1.942,5.633-4.236,8.218-6.824l0.069-0.069c3.798-3.809,6.873-8.33,9.139-13.441
        c1.204-2.715,5.72-13.238,5.819-15.125l0.043-0.816L51.99,12.09z"
      />
      <path
        fill="#F2D2A9"
        d="M5.868,24.41c1.872-2.766,4.084-5.43,6.575-7.917l0.074-0.075c3.635-3.625,7.955-6.561,12.84-8.727
        c5.418-2.402,11.26-4.735,13.544-5.438c0.065,0.881-0.002,2.084-0.27,3.586l-0.104,0.522c-0.146,0.733-0.331,1.493-0.552,2.277
        c-0.014,0.05-0.029,0.1-0.043,0.15c-0.094,0.327-0.195,0.659-0.302,0.994c-0.036,0.112-0.073,0.226-0.111,0.34
        c-0.097,0.294-0.198,0.591-0.304,0.892c-0.049,0.139-0.101,0.281-0.153,0.423c-0.109,0.299-0.221,0.599-0.34,0.904
        c-0.051,0.13-0.105,0.264-0.157,0.396c-0.134,0.336-0.27,0.673-0.415,1.015c-0.034,0.08-0.07,0.162-0.105,0.243
        c-0.321,0.748-0.67,1.512-1.043,2.29L35,16.286l-0.151,0.312c-0.422,0.868-0.857,1.722-1.308,2.568
        c-0.002,0.003-0.003,0.006-0.005,0.009c-0.451,0.846-0.918,1.682-1.402,2.516c-1.025,1.514-2.16,2.993-3.378,4.434
        c-1.008,1.191-2.07,2.358-3.198,3.484c-0.086,0.086-0.184,0.183-0.286,0.283C21.975,33.102,7.548,46.102,3.338,48.194
        C2.317,44.569-0.179,34.785,5.868,24.41z"
      />
      <path
        fill="#9A6B37"
        d="M45.092,27.425c-2.167,4.886-5.103,9.206-8.727,12.84l-0.074,0.074c-2.489,2.491-5.153,4.704-7.861,6.539
        C18.375,52.742,8.917,50.633,5.001,49.56c1.136-0.682,2.622-1.759,4.281-3.054c4.64-3.558,10.425-8.747,14.092-12.122
        c1.83-1.672,3.166-2.928,3.599-3.362c2.581-2.578,4.875-5.341,6.854-8.269c0.463-0.795,0.893-1.567,1.304-2.327
        c0.087-0.162,0.172-0.326,0.258-0.488c0.348-0.655,0.678-1.297,0.989-1.925c0.037-0.074,0.077-0.146,0.113-0.221
        c0.702-0.336,1.396-0.657,2.075-0.952c0.079-0.034,0.158-0.069,0.236-0.102c2.42-1.037,4.691-1.81,6.772-2.297l0.492-0.115
        c2.122-0.452,3.587-0.492,4.459-0.434C49.818,16.187,47.49,22.018,45.092,27.425z"
      />
      <path fill="#5F7F2E" d="M16.461,19.312c0.262,0,0.524-0.103,0.721-0.307c2.202-2.288,4.679-4.187,7.361-5.641c0.485-0.263,0.666-0.87,0.403-1.355c-0.263-0.485-0.87-0.664-1.356-0.402c-2.864,1.552-5.505,3.575-7.85,6.012c-0.383,0.398-0.371,1.031,0.027,1.414C15.962,19.219,16.212,19.312,16.461,19.312z" />
      <path fill="#5F7F2E" d="M29.338,10.695c0.16,0,0.322-0.038,0.473-0.119l0.212-0.115c0.799-0.432,1.555-0.839,2.331-1.146c0.514-0.204,0.765-0.785,0.561-1.299c-0.204-0.512-0.786-0.764-1.298-0.561c-0.885,0.352-1.728,0.807-2.543,1.246l-0.21,0.113c-0.486,0.263-0.668,0.869-0.406,1.355C28.637,10.504,28.982,10.695,29.338,10.695z" />
      <path fill="#7A4A24" d="M4.656,42.342c0.19,0.299,0.514,0.463,0.845,0.463c0.184,0,0.369-0.051,0.536-0.156c0.466-0.296,0.604-0.914,0.307-1.381c-0.65-1.022-0.313-4.367,0.133-6.416c0.118-0.54-0.224-1.073-0.764-1.19c-0.537-0.117-1.072,0.223-1.19,0.763C4.313,35.382,3.335,40.265,4.656,42.342z" />
    </svg>
  );
}

function CropModal({ assessment, onClose, soilTemp, chillHours }: {
  assessment: CropAssessment;
  onClose: () => void;
  soilTemp: number | null;
  chillHours: number | null;
}) {
  const a = assessment;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className={`max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border p-6 ${statusTone(a.status)}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <CropIcon crop={a.crop} size="lg" />
            <div>
              <h2 className="text-2xl font-black text-slate-950">{a.crop.name}</h2>
              <p className="text-sm text-slate-600 capitalize">{a.crop.category}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${statusBadge(a.status)}`}>
              {statusLabel(a.status)}
            </span>
            <button
              onClick={onClose}
              className="rounded-full bg-slate-200 p-2 text-slate-700 hover:bg-slate-300"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <section>
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-sky-700">Condiciones actuales</h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white/80 p-3">
                <p className="text-xs text-slate-600">Temperatura suelo</p>
                <p className="text-lg font-black text-slate-950">{fmtN(soilTemp, 1)}°C</p>
                <p className="text-xs text-slate-500">Mínimo requerido: {a.crop.soilTempMinC}°C</p>
              </div>
              <div className="rounded-xl bg-white/80 p-3">
                <p className="text-xs text-slate-600">GDD acumulados</p>
                <p className="text-lg font-black text-slate-950">{a.gddProgress}</p>
                <p className="text-xs text-slate-500">Base: {a.crop.gddBaseC}°C</p>
              </div>
              {a.crop.chillHoursMin !== null && (
                <div className="rounded-xl bg-white/80 p-3">
                  <p className="text-xs text-slate-600">Horas-frío</p>
                  <p className="text-lg font-black text-slate-950">{fmtN(chillHours, 0)}h</p>
                  <p className="text-xs text-slate-500">Mínimo requerido: {a.crop.chillHoursMin}h</p>
                </div>
              )}
              <div className="rounded-xl bg-white/80 p-3">
                <p className="text-xs text-slate-600">Riesgo helada 48h</p>
                <p className="text-lg font-black text-slate-950">
                  {a.crop.frostSensitive ? 'Sensible' : 'Tolerante'}
                </p>
                <p className="text-xs text-slate-500">
                  {a.crop.frostSensitive ? 'Requiere protección' : 'Resiste heladas ligeras'}
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-sky-700">Riego</h3>
            <div className="mt-2 space-y-2">
              {a.isIrrigationSeason && a.irrigationLitersM2 !== null ? (
                <div className="rounded-xl bg-sky-50 p-4">
                  <p className="text-xs font-bold text-sky-900">Riego semanal recomendado</p>
                  <p className="text-2xl font-black text-sky-700">
                    {a.irrigationLitersM2 > 0
                      ? `${a.irrigationLitersM2.toFixed(1)} L/m²`
                      : 'No requiere (lluvia suficiente)'}
                  </p>
                  <p className="mt-1 text-xs text-sky-600">
                    Kc: {a.kcEffective.toFixed(2)} · {a.currentStage?.name ?? 'sin etapa'} ·
                    ETc = ETo × Kc · Riego = ETc - precipitación
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-100 p-4">
                  <p className="text-sm font-bold text-slate-700">Dormancia</p>
                  <p className="text-xs text-slate-600">Sin riego activo (fuera de temporada)</p>
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-sky-700">Coeficientes Kc por etapa fenológica</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {a.crop.kcStages.map((s, i) => (
                <div key={i} className={`rounded-xl p-3 ${s.monthStart === a.currentStage?.monthStart && s.monthEnd === a.currentStage?.monthEnd ? 'bg-sky-100 ring-1 ring-sky-300' : 'bg-white/60'}`}>
                  <p className="text-xs font-bold text-slate-800">{s.name}</p>
                  <p className="text-lg font-black text-slate-950">Kc {s.kc.toFixed(2)}</p>
                  <p className="text-[10px] text-slate-500">Meses {s.monthStart}-{s.monthEnd}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-sky-700">Ventanas fenológicas</h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-white/80 p-3">
                <p className="text-xs text-slate-600">Siembra</p>
                <p className="text-sm font-bold text-slate-950">{a.crop.plantingWindow}</p>
              </div>
              <div className="rounded-xl bg-white/80 p-3">
                <p className="text-xs text-slate-600">Cosecha</p>
                <p className="text-sm font-bold text-slate-950">{a.crop.harvestWindow}</p>
              </div>
              <div className="rounded-xl bg-white/80 p-3">
                <p className="text-xs text-slate-600">Riego activo</p>
                <p className="text-sm font-bold text-slate-950">
                  {a.crop.irrigationMonths.length > 0
                    ? `${a.crop.irrigationMonths[0]}-${a.crop.irrigationMonths[a.crop.irrigationMonths.length - 1]}`
                    : 'Todo el año'}
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-sky-700">Diagnóstico del estado: {statusLabel(a.status)}</h3>
            <div className="mt-2 space-y-3">
              {a.diagnosis.map((d, i) => (
                <div key={i} className={`rounded-2xl border p-4 ${d.status === 'critical' ? 'border-rose-200 bg-rose-50' : d.status === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{d.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-slate-950">{d.factor}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${d.status === 'critical' ? 'bg-rose-200 text-rose-900' : d.status === 'warning' ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'}`}>
                          {d.status === 'critical' ? 'Crítico' : d.status === 'warning' ? 'Atención' : 'OK'}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm font-bold text-slate-800">{d.detail}</p>
                      <p className="mt-1.5 text-xs leading-5 text-slate-600">{d.explanation}</p>
                      {d.status !== 'ok' && (
                        <div className="mt-2 rounded-lg bg-white/70 p-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Acción</p>
                          <p className="mt-0.5 text-xs leading-5 text-slate-700">{d.recommendation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-sky-700">Notas agronómicas</h3>
            <div className="mt-2 rounded-xl bg-white/80 p-3">
              <ul className="space-y-1 text-sm text-slate-700">
                {a.crop.notes.map((note, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-slate-400">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export function CropRequirements({ agricultural, soilTemp, frostRisk, et0CumulativeMm, precipitacionSemanal }: {
  agricultural: AgriculturalData | null;
  soilTemp: number | null;
  frostRisk: AgriculturalData['frostRisk48h'];
  et0CumulativeMm: number | null;
  precipitacionSemanal: number | null;
}) {
  const [expandedCrop, setExpandedCrop] = useState<string | null>(null);
  const gdd = agricultural?.gddCumulative ?? null;
  const chillHours = agricultural?.chillHours ?? null;

  const assessments = CROPS.map((crop) =>
    assessCrop(crop, soilTemp, gdd, chillHours, frostRisk, et0CumulativeMm, precipitacionSemanal)
  );

  const safeCount = assessments.filter((a) => a.status === 'safe').length;
  const riskCount = assessments.filter((a) => a.status === 'risk').length;
  const notRecommendedCount = assessments.filter((a) => a.status === 'not_recommended').length;

  const expandedAssessment = expandedCrop ? assessments.find((a) => a.crop.name === expandedCrop) : null;

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Requerimientos de cultivos</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">Estado actual por cultivo</h3>
          <p className="mt-1 text-sm text-slate-600">
            {safeCount} favorables · {riskCount} precaución · {notRecommendedCount} no recomendados
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {assessments.map((a) => (
          <article
            key={a.crop.name}
            className={`cursor-pointer rounded-[20px] border p-4 transition-all hover:shadow-lg ${statusTone(a.status)}`}
            onClick={() => setExpandedCrop(a.crop.name)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CropIcon crop={a.crop} />
                <div>
                  <p className="text-sm font-black text-slate-950">{a.crop.name}</p>
                </div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadge(a.status)}`}>
                {statusLabel(a.status)}
              </span>
            </div>

            <div className="mt-3 space-y-1 text-xs text-slate-700">
              <p>
                <span className="font-bold">Suelo:</span> {fmtN(soilTemp, 1)}°C / mín {a.crop.soilTempMinC}°C
              </p>
              {a.currentStage && (
                <p>
                  <span className="font-bold">Etapa:</span> {a.currentStage.name}
                </p>
              )}
              {a.isIrrigationSeason && a.irrigationLitersM2 !== null && (
                <p className="mt-2 rounded-lg bg-sky-50 p-2">
                  <span className="font-bold text-sky-900">Riego:</span>
                  <span className="ml-1 text-sky-700">
                    {a.irrigationLitersM2 > 0
                      ? `${a.irrigationLitersM2.toFixed(1)} L/m²`
                      : 'Lluvia suficiente'}
                  </span>
                </p>
              )}
              {!a.isIrrigationSeason && (
                <p className="mt-2 rounded-lg bg-slate-100 p-2 text-slate-600">
                  <span className="font-bold">Dormancia</span>
                </p>
              )}
            </div>
          </article>
        ))}
      </div>

      {expandedAssessment && (
        <CropModal
          assessment={expandedAssessment}
          onClose={() => setExpandedCrop(null)}
          soilTemp={soilTemp}
          chillHours={chillHours}
        />
      )}
    </div>
  );
}
