import type { WeatherPayload } from '@/types/weather';
import type { PulseAlarm } from '@/components/llano/alarms-logic';
import type { AgroClimatologyPayload } from '@/services/agroClimatologyService';

const FROST_LABEL: Record<string, string> = {
  muy_alta: 'MUY ALTO',
  alta: 'ALTO',
  media: 'MEDIO',
  none: 'BAJO',
};

const FROST_EMOJI: Record<string, string> = {
  muy_alta: '\u2744\uFE0F\u2744\uFE0F',
  alta: '\u2744\uFE0F',
  media: '\u{1F321}\uFE0F',
  none: '\u2705',
};

const PEST_LABEL: Record<string, string> = {
  alto: 'alto',
  medio: 'medio',
  bajo: 'bajo',
};

function weekRange(): string {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) =>
    d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

  return `${fmt(monday)} al ${fmt(sunday)}`;
}

function weatherIcon(code: number): string {
  if (code <= 1) return '\u2600\uFE0F';
  if (code <= 3) return '\u26C5';
  if (code <= 49) return '\uD83C\uDF2B\uFE0F';
  if (code <= 59) return '\uD83C\uDF27\uFE0F';
  if (code <= 69) return '\u2744\uFE0F';
  if (code <= 79) return '\uD83C\uDF28\uFE0F';
  if (code <= 82) return '\uD83C\uDF27\uFE0F';
  if (code <= 86) return '\u2744\uFE0F';
  return '\u26A1';
}

export function buildWeeklyNewsletter(
  weather: WeatherPayload,
  alarms: PulseAlarm[],
  agro: AgroClimatologyPayload | null,
): string {
  const daily = weather.daily;
  const agri = weather.agricultural;
  const lines: string[] = [];

  lines.push(`\u{1F33E} Bolet\u00EDn del Campo \u2014 semana del ${weekRange()}`);
  lines.push('');

  if (daily && daily.temperatureMinC.length > 0) {
    const tmin = Math.min(...daily.temperatureMinC.slice(0, 7));
    const tmax = Math.max(...daily.temperatureMaxC.slice(0, 0 + 7));
    const totalPrecip = daily.precipitationSumMm.slice(0, 7).reduce((s, v) => s + v, 0);
    const rainDays = daily.precipitationProbabilityPct.slice(0, 7).filter((p) => p >= 40).length;

    lines.push(`\uD83C\uDF21\uFE0F ${tmin.toFixed(0)}\u00B0C m\u00EDn \u00B7 ${tmax.toFixed(0)}\u00B0C m\u00E1x`);

    if (totalPrecip > 0.5) {
      lines.push(`\u2614 Lluvia prevista: ${totalPrecip.toFixed(1)} mm en ${rainDays} d\u00EDas`);
    } else {
      lines.push(`\u2614 Sin lluvia significativa esta semana`);
    }

    lines.push('');

    const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const forecastLine = daily.time.slice(0, 7).map((_, i) => {
      const icon = weatherIcon(daily.weatherCode[i] ?? 0);
      const tminDay = daily.temperatureMinC[i]?.toFixed(0) ?? '?';
      const tmaxDay = daily.temperatureMaxC[i]?.toFixed(0) ?? '?';
      return `${dayLabels[i]}${icon}${tminDay}/${tmaxDay}`;
    }).join(' \u00B7 ');
    lines.push(forecastLine);
    lines.push('');
  }

  if (agri) {
    const frostRisk = agri.frostRisk48h;
    lines.push(`${FROST_EMOJI[frostRisk] ?? '\u2753'} Riesgo de helada 48h: ${FROST_LABEL[frostRisk] ?? frostRisk}`);

    if (frostRisk !== 'none') {
      const frostAlarms = alarms.filter((a) =>
        a.level === 'critico' || a.level === 'precaucion'
      ).filter((a) =>
        a.title.toLowerCase().includes('helada') || a.title.toLowerCase().includes('hielo')
      );
      if (frostAlarms.length > 0) {
        lines.push(`   \u2192 ${frostAlarms[0].message}`);
      }
    }
    lines.push('');

    if (agri.recommendedIrrigationLitersM2 && agri.recommendedIrrigationLitersM2 > 0) {
      lines.push(`\uD83D\uDCA7 Riego recomendado: ${agri.recommendedIrrigationLitersM2} L/m\u00B2`);
    } else {
      lines.push(`\uD83D\uDCA7 Riego: no necesario esta semana (balance h\u00EDdrico positivo)`);
    }

    lines.push(`\uD83C\uDF21\uFE0F Grados-d\u00EDa acumulados: ${agri.gddCumulative.toFixed(0)} GDD`);

    if (agri.pestRisk) {
      const { repiloRisk, oliveFlyRisk } = agri.pestRisk;
      if (repiloRisk !== 'bajo' || oliveFlyRisk !== 'bajo') {
        const parts: string[] = [];
        if (repiloRisk !== 'bajo') parts.push(`repilo: ${PEST_LABEL[repiloRisk]}`);
        if (oliveFlyRisk !== 'bajo') parts.push(`mosca: ${PEST_LABEL[oliveFlyRisk]}`);
        lines.push(`\uD83D\uDC1B Plagas: ${parts.join(' \u00B7 ')}`);
      }
    }
    lines.push('');
  }

  if (agro) {
    const w = agro.waterBalance;
    const deficit = w.deficitMmThisMonth > 0;
    lines.push(`\uD83D\uDCA7 Balance h\u00EDdrico: ${deficit ? 'd\u00E9ficit' : 'super\u00E1vit'} ${Math.abs(w.deficitMmThisMonth).toFixed(0)} mm (${w.monthLabel})`);
    lines.push(`   Lluvia mes: ${w.precipitationMmThisMonth.toFixed(1)} mm \u00B7 ET0 mes: ${w.et0MmThisMonth.toFixed(1)} mm`);

    if (agro.chill.chillHoursAccumulated > 0) {
      lines.push(`\u{1F976} Horas fr\u00EDo acumuladas: ${agro.chill.chillHoursAccumulated} h (${agro.chill.chillProgressPct}% del objetivo)`);
    }
    lines.push('');
  }

  const criticalAlarms = alarms.filter((a) => a.level === 'critico');
  if (criticalAlarms.length > 0) {
    lines.push(`\u26A0\uFE0F ALERTAS ACTIVAS:`);
    criticalAlarms.forEach((a) => {
      lines.push(`   \u2022 ${a.title}: ${a.message}`);
    });
    lines.push('');
  }

  lines.push(`\uD83D\uDCCA Ver detalle: meteo.tecrural.es/huescar/campo`);
  lines.push(`\u2500\u2500 TecRural \u00B7 Manuel 614 24 27 16`);

  return lines.join('\n');
}
