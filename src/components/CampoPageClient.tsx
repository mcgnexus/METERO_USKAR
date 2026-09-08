'use client';

import { useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { NavBottom } from '@/components/NavBottom';
import { buildAlarms } from '@/components/llano/alarms-logic';
import { SectionTitle } from '@/components/common/SectionTitle';
import { TecRuralCtaBanner } from '@/components/TecRuralCtaBanner';
import { UpdatedAtNote } from '@/components/common/UpdatedAtNote';
import { NoDataState } from '@/components/common/NoDataState';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import type { HuescarWeatherResponse } from '@/types/weather-response';
import type { AgriculturalData } from '@/types/weather';

const FieldTab = dynamic(() => import('@/components/llano/field-tab').then((m) => ({ default: m.FieldTab })), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />,
});

const RaifPanel = dynamic(() => import('@/components/llano/RaifPanel').then((m) => ({ default: m.RaifPanel })), {
  ssr: false,
  loading: () => <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />,
});

const CropRequirements = dynamic(() => import('@/components/llano/crop-requirements').then((m) => ({ default: m.CropRequirements })), {
  ssr: false,
  loading: () => <div className="h-60 animate-pulse rounded-2xl bg-slate-100" />,
});

export function CampoPageClient({ response }: { response: HuescarWeatherResponse }) {
  const cd = response.climate;
  const wd = response.weather;
  const track = useTrackEvent();
  useEffect(() => { track('field_page_viewed'); }, [track]);

  const alarms = useMemo(() => {
    if (!cd) return [];
    return buildAlarms(cd, {
      daily: wd?.daily,
      weather: wd,
      agricultural: wd?.agricultural,
    });
  }, [cd, wd]);

  const cropData = useMemo(() => {
    if (!cd) return null;
    const soilTemp = cd.exoticVariables.soilTemp10cmC ?? null;
    const frostRisk: AgriculturalData['frostRisk48h'] = wd?.agricultural?.frostRisk48h ?? 'none';
    const et0CumulativeMm = wd?.agricultural?.et0CumulativeMm ?? null;
    const precipitacionSemanal = wd?.daily?.precipitationSumMm
      ? wd.daily.precipitationSumMm.slice(0, 7).reduce((a, b) => a + (b ?? 0), 0)
      : null;
    return { soilTemp, frostRisk, et0CumulativeMm, precipitacionSemanal };
  }, [cd, wd]);

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="mx-auto max-w-6xl px-4 pt-4 lg:pt-20" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom) + 16px)' }}>
        <header className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">🌾 Meteo Huéscar Campo</p>
          <h1 className="mt-0.5 text-xl font-black text-slate-900">Campo</h1>
          <UpdatedAtNote response={response} />
        </header>

        {cd ? (
          <div className="space-y-5">
            <section>
              <SectionTitle>🚨 Avisos fitosanitarios (RAIF)</SectionTitle>
              <RaifPanel weather={wd} />
            </section>

            {cropData && (
              <section>
                <SectionTitle>🌱 Estado de cultivos</SectionTitle>
                <CropRequirements
                  agricultural={wd?.agricultural ?? null}
                  soilTemp={cropData.soilTemp}
                  frostRisk={cropData.frostRisk}
                  et0CumulativeMm={cropData.et0CumulativeMm}
                  precipitacionSemanal={cropData.precipitacionSemanal}
                />
              </section>
            )}

            <section>
              <SectionTitle>📊 Datos del campo</SectionTitle>
              <FieldTab
                climate={cd}
                weather={wd}
                agricultural={wd?.agricultural ?? null}
                livestock={wd?.livestock ?? null}
                alarms={alarms}
              />
            </section>
          </div>
        ) : (
          <NoDataState
            emoji="🌾"
            title="Datos de campo no disponibles"
            message="El motor climático no ha devuelto datos agrícolas en esta consulta. El resto de la app sigue disponible."
          />
        )}

        <div className="mt-5">
          <TecRuralCtaBanner context="campo" />
        </div>
      </div>
      <NavBottom weatherAlertCount={alarms.length} />
    </div>
  );
}
