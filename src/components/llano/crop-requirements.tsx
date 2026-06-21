'use client';

import { fmtN } from '@/components/llano/atoms';
import type { AgriculturalData } from '@/types/weather';

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
  plantingWindow: string;
  harvestWindow: string;
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
    plantingWindow: 'Mar-Abr',
    harvestWindow: 'Sep-Oct',
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
    plantingWindow: 'Abr-May',
    harvestWindow: 'Jul-Sep',
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
    plantingWindow: 'Abr-May',
    harvestWindow: 'Jun-Ago',
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
    plantingWindow: 'Feb-Mar / Jul-Ago',
    harvestWindow: 'Jun-Jul / Oct-Nov',
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
    plantingWindow: 'Abr-May',
    harvestWindow: 'Jul-Sep',
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
    plantingWindow: 'Abr-May',
    harvestWindow: 'Jul-Sep',
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
    plantingWindow: 'Mar-Jun / Jul-Ago',
    harvestWindow: 'May-Jul / Sep-Oct',
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
    plantingWindow: 'Nov-Mar (esqueje)',
    harvestWindow: 'Sep-Oct',
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
    plantingWindow: 'Abr-May',
    harvestWindow: 'Sep-Oct',
  },
  {
    name: 'Calabacín',
    icon: '🥬',
    category: 'hortaliza',
    soilTempMinC: 15,
    gddBaseC: 10,
    gddTarget: 700,
    chillHoursMin: null,
    frostSensitive: true,
    kc: 0.85,
    plantingWindow: 'Mar-May / Jul-Ago',
    harvestWindow: 'May-Jul / Sep-Oct',
  },
];

type CropStatus = 'safe' | 'risk' | 'not_recommended';

interface CropAssessment {
  crop: CropProfile;
  status: CropStatus;
  reasons: string[];
  waterNeed: string;
  gddProgress: string;
}

function assessCrop(
  crop: CropProfile,
  soilTemp: number | null,
  airTemp: number | null,
  gddCumulative: number | null,
  chillHours: number | null,
  frostRisk: AgriculturalData['frostRisk48h']
): CropAssessment {
  const reasons: string[] = [];
  let status: CropStatus = 'safe';

  // Soil temperature check
  if (soilTemp !== null) {
    if (soilTemp < crop.soilTempMinC - 3) {
      status = 'not_recommended';
      reasons.push(`Suelo ${soilTemp.toFixed(1)}°C < ${crop.soilTempMinC}°C mínimo`);
    } else if (soilTemp < crop.soilTempMinC) {
      status = 'risk';
      reasons.push(`Suelo ${soilTemp.toFixed(1)}°C cerca del mínimo (${crop.soilTempMinC}°C)`);
    }
  }

  // Frost risk check
  if (crop.frostSensitive && (frostRisk === 'alta' || frostRisk === 'muy_alta')) {
    status = 'not_recommended';
    reasons.push(`Riesgo de helada ${frostRisk} en 48h`);
  } else if (crop.frostSensitive && frostRisk === 'media') {
    if (status === 'safe') status = 'risk';
    reasons.push('Riesgo de helada medio en 48h');
  }

  // Chill hours check (for pistachio and grapevine)
  if (crop.chillHoursMin !== null && chillHours !== null && chillHours < crop.chillHoursMin) {
    if (status === 'safe') status = 'risk';
    reasons.push(`Horas-frío ${chillHours}h < ${crop.chillHoursMin}h necesarias`);
  }

  // GDD progress
  const gddProgress = gddCumulative !== null
    ? `${gddCumulative.toFixed(0)} / ${crop.gddTarget} GDD (${((gddCumulative / crop.gddTarget) * 100).toFixed(0)}%)`
    : 'Sin datos GDD';

  // Water need estimate (Kc * ETo weekly)
  const waterNeed = `Kc ${crop.kc.toFixed(2)}`;

  if (reasons.length === 0) {
    reasons.push('Condiciones favorables');
  }

  return { crop, status, reasons, waterNeed, gddProgress };
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

export function CropRequirements({ agricultural, soilTemp, airTemp, frostRisk }: {
  agricultural: AgriculturalData | null;
  soilTemp: number | null;
  airTemp: number | null;
  frostRisk: AgriculturalData['frostRisk48h'];
}) {
  const gdd = agricultural?.gddCumulative ?? null;
  const chillHours = agricultural?.chillHours ?? null;

  const assessments = CROPS.map((crop) =>
    assessCrop(crop, soilTemp, airTemp, gdd, chillHours, frostRisk)
  );

  const safeCount = assessments.filter((a) => a.status === 'safe').length;
  const riskCount = assessments.filter((a) => a.status === 'risk').length;
  const notRecommendedCount = assessments.filter((a) => a.status === 'not_recommended').length;

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
          <article key={a.crop.name} className={`rounded-[20px] border p-4 ${statusTone(a.status)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{a.crop.icon}</span>
                <div>
                  <p className="text-sm font-black text-slate-950">{a.crop.name}</p>
                  <p className="text-[10px] text-slate-500 capitalize">{a.crop.category}</p>
                </div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadge(a.status)}`}>
                {statusLabel(a.status)}
              </span>
            </div>

            <div className="mt-3 space-y-1.5 text-xs text-slate-700">
              <p>
                <span className="font-bold">Suelo:</span> {fmtN(soilTemp, 1)}°C / mín {a.crop.soilTempMinC}°C
              </p>
              <p>
                <span className="font-bold">GDD:</span> {a.gddProgress}
              </p>
              {a.crop.chillHoursMin !== null && (
                <p>
                  <span className="font-bold">Horas-frío:</span> {fmtN(chillHours, 0)}h / {a.crop.chillHoursMin}h
                </p>
              )}
              <p>
                <span className="font-bold">Agua:</span> {a.waterNeed}
              </p>
              <p>
                <span className="font-bold">Siembra:</span> {a.crop.plantingWindow}
              </p>
            </div>

            {a.reasons.length > 0 && (
              <div className="mt-3 rounded-xl bg-white/60 p-2 text-[11px] leading-4 text-slate-600">
                {a.reasons.map((r, i) => (
                  <p key={i} className="flex gap-1">
                    <span className={a.status === 'safe' ? 'text-emerald-600' : a.status === 'risk' ? 'text-amber-600' : 'text-rose-600'}>•</span>
                    <span>{r}</span>
                  </p>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
