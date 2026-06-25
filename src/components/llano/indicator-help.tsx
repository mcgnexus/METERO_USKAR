'use client';

import type { ReactNode } from 'react';

export type IndicatorKey =
  | 'et0'
  | 'litersM2'
  | 'kc'
  | 'gdd'
  | 'chillHours'
  | 'vpd'
  | 'frostRisk'
  | 'confidence'
  | 'bias'
  | 'cape'
  | 'inversion'
  | 'orographic';

const HELP_TEXT: Record<IndicatorKey, string> = {
  et0: 'La ET0 estima la pérdida de agua por calor, sol, viento y sequedad. Sirve para calcular el riego orientativo.',
  litersM2: '1 L/m² equivale aproximadamente a 1 mm de agua. Si se recomiendan 70 L/m², equivale a unos 70 mm de riego repartido.',
  kc: 'El Kc adapta la ET0 al cultivo concreto. No consume lo mismo un olivo, un almendro, un pistacho o un huerto.',
  gdd: 'Los grados-día indican acumulación de calor útil para el desarrollo del cultivo.',
  chillHours: 'Las horas frío ayudan a estimar si frutales y cultivos leñosos están acumulando suficiente frío invernal.',
  vpd: 'El VPD mide la sequedad real del aire. Cuando es alto, la planta pierde más agua y aumenta el estrés hídrico.',
  frostRisk: 'Estimación del riesgo de que la temperatura baje a niveles dañinos para cultivos sensibles.',
  confidence: 'Indica la fiabilidad estimada del cálculo. Baja si faltan sensores, si los datos son antiguos o si hay mucha corrección del modelo.',
  bias: 'Corrección aplicada cuando el modelo suele desviarse respecto a estaciones o sensores locales.',
  cape: 'Indicador de inestabilidad atmosférica. Puede relacionarse con tormentas si hay humedad y condiciones favorables.',
  inversion: 'La inversión térmica ocurre cuando el aire frío queda acumulado en zonas bajas. Puede aumentar el riesgo de helada local.',
  orographic: 'El factor orográfico ajusta lluvia, viento o temperatura según relieve, altitud y exposición de cada zona.',
};

export function IndicatorHelp({ term, text }: { term?: IndicatorKey; text?: string }) {
  const body = text ?? (term ? HELP_TEXT[term] : null);
  if (!body) return null;

  return (
    <details className="group relative inline-block align-middle">
      <summary
        className="ml-1 inline-flex h-5 w-5 cursor-pointer list-none items-center justify-center rounded-full bg-slate-100 text-[11px] font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-sky-100 hover:text-sky-800"
        aria-label="Explicación del indicador"
      >
        ?
      </summary>
      <div className="absolute left-0 z-40 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-medium normal-case leading-5 tracking-normal text-slate-700 shadow-xl">
        {body}
      </div>
    </details>
  );
}

export function LabelWithHelp({ children, term, text, className = '' }: { children: ReactNode; term?: IndicatorKey; text?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span>{children}</span>
      <IndicatorHelp term={term} text={text} />
    </span>
  );
}
