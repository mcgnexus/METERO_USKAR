'use client';

import { useState } from 'react';
import { fmtN } from '@/components/llano/atoms';
import { IndicatorHelp } from '@/components/llano/indicator-help';
import { levelClass, type PulseAlarm } from '@/components/llano/alarms-logic';
import { interpretTHI, interpretFrostRisk, interpretSoilTemp, interpretWindForTreatment, interpretETo } from '@/lib/interpretation';
import type { ClimateCalibrationPayload } from '@/hooks/useClimateCalibration';
import type { AgriculturalData, LivestockData, WeatherPayload } from '@/types/weather';

type Profile = 'general' | 'agricultura' | 'ganaderia' | 'huerto';

const PROFILES: { id: Profile; icon: string; label: string }[] = [
  { id: 'general', icon: '👥', label: 'Población' },
  { id: 'agricultura', icon: '🌾', label: 'Agricultura' },
  { id: 'ganaderia', icon: '🐄', label: 'Ganadería' },
  { id: 'huerto', icon: '🥬', label: 'Huerto/Jardín' },
];

export function FieldTab({ climate, weather, agricultural, livestock, alarms }: {
  climate: ClimateCalibrationPayload;
  weather: WeatherPayload | null;
  agricultural: AgriculturalData | null;
  livestock: LivestockData | null;
  alarms?: PulseAlarm[];
}) {
  const [profile, setProfile] = useState<Profile>('agricultura');

  const exotic = climate.exoticVariables;
  const airTemp = climate.calibration.realTemperatureC ?? climate.interpolation.estimatedTemperatureC;
  const soil10 = exotic.soilTemp10cmC;
  const humidity = climate.nodes.localStation?.humidityPct ?? climate.eto.inputs.humidityPct ?? weather?.current?.humidityPct;
  const windSpeed = climate.nodes.radiationWind.windSpeed2mKmh;

  return (
    <div className="space-y-4 pb-24">
      {alarms && alarms.length > 0 && (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50/90 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rose-700">🔔 Alertas activas</p>
          <div className="mt-2 space-y-1">
            {alarms.filter(a => a.level === 'critico' || a.level === 'precaucion').slice(0, 4).map((a) => (
              <p key={a.title} className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${levelClass(a.level)}`}>
                {a.level === 'critico' ? '🚨' : '⚠️'} {a.title}
              </p>
            ))}
            {alarms.length > 4 && (
              <p className="text-xs font-bold text-rose-600">+{alarms.length - 4} más · Revisa la pestaña Alertas</p>
            )}
          </div>
        </div>
      )}
      <section className="rounded-[22px] border border-slate-200 bg-white p-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-700">Tu perfil</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {PROFILES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProfile(p.id)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                profile === p.id
                  ? 'bg-sky-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p.icon} {p.label}
            </button>
            ))}
        </div>
      </section>

      {profile === 'agricultura' && (
        <>
          {agricultural && (() => {
            const irrigation = agricultural.recommendedIrrigationLitersM2 ?? null;
            const frost = interpretFrostRisk(agricultural.frostRisk48h);
            const treatment = interpretWindForTreatment(windSpeed);
            const heatStress = airTemp >= 36
              ? { label: 'Alto', tone: 'rose', action: 'Evita labores en horas centrales y revisa riego.' }
              : airTemp >= 32
                ? { label: 'Medio', tone: 'amber', action: 'Trabaja temprano o al final del día.' }
                : { label: 'Bajo', tone: 'emerald', action: 'Sin estrés térmico destacable.' };
            const canDo = [
              agricultural.workability.workable ? 'Puedes hacer labores ligeras si el suelo está en tempero.' : 'Prioriza observación y evita entrar con maquinaria pesada.',
              windSpeed <= 15 ? 'Tratamientos posibles si la etiqueta del producto lo permite.' : 'Revisa el viento antes de cualquier tratamiento.',
              irrigation !== null && irrigation > 0 ? 'Comprueba humedad del suelo antes de regar.' : 'Mantén riego normal salvo parcelas muy secas.',
            ];
            const avoid = [
              airTemp >= 32 ? 'Evita labores al sol entre 12:00 y 18:00.' : 'Evita decisiones irreversibles si cambia el tiempo.',
              windSpeed > 20 ? 'No trates con viento fuerte o racheado.' : 'No trates sin revisar previsión de viento.',
              agricultural.frostRisk48h !== 'none' ? 'Evita riegos o labores que aumenten daño por helada.' : 'No fuerces riego si el suelo conserva humedad.',
            ];

            return (
              <>
                <section className="rounded-[24px] border border-sky-200 bg-sky-50/90 p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Resumen ejecutivo</h2>
                      <p className="mt-1 text-sm text-slate-600">Lo importante del campo para decidir en 10 segundos.</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${agricultural.workability.workable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {agricultural.workability.workable ? 'Operable' : 'No operar'}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <ExecutiveTile
                      label="Riego"
                      value={irrigation !== null && irrigation > 0 ? `${fmtN(irrigation, 1)} L/m²` : 'Sin extra'}
                      detail={interpretETo(agricultural.et0CumulativeMm, 'semana').action}
                      tone={irrigation !== null && irrigation > 0 ? 'sky' : 'emerald'}
                      help="et0"
                    />
                    <ExecutiveTile
                      label="Helada"
                      value={agricultural.frostRisk48h === 'none' ? 'Sin riesgo' : frost.label}
                      detail={frost.action}
                      tone={agricultural.frostRisk48h === 'none' ? 'emerald' : 'rose'}
                      help="frostRisk"
                    />
                    <ExecutiveTile
                      label="Tratamientos"
                      value={windSpeed <= 15 ? 'Apto' : windSpeed <= 25 ? 'Precaución' : 'Evitar'}
                      detail={treatment.action}
                      tone={windSpeed <= 15 ? 'emerald' : windSpeed <= 25 ? 'amber' : 'rose'}
                    />
                    <ExecutiveTile
                      label="Estrés térmico"
                      value={heatStress.label}
                      detail={heatStress.action}
                      tone={heatStress.tone as 'emerald' | 'amber' | 'rose'}
                    />
                  </div>
                </section>

                <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-700">Acciones de hoy</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <ActionBox title="Qué hacer" tone="emerald" items={canDo} />
                    <ActionBox title="Qué evitar" tone="rose" items={avoid} />
                  </div>
                </section>

                <details className="rounded-[22px] border border-slate-200 bg-white p-5">
                  <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.18em] text-slate-700">Detalles técnicos</summary>
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700">Suelo superficial</p>
                        <p className="mt-1 text-xl font-black text-slate-900">{fmtN(soil10, 1)}°C</p>
                        <p className="mt-1 text-xs leading-4 text-slate-600">{interpretSoilTemp(soil10, '10cm').detail}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700">ET0 semanal<IndicatorHelp term="et0" /></div>
                        <p className="mt-1 text-xl font-black text-slate-900">{fmtN(agricultural.et0CumulativeMm, 1)} mm</p>
                        <p className="mt-1 text-xs leading-4 text-slate-600">{interpretETo(agricultural.et0CumulativeMm, 'semana').detail}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700">GDD<IndicatorHelp term="gdd" /></div>
                        <p className="mt-1 text-xl font-black text-slate-900">{fmtN(agricultural.gddCumulative, 0)}</p>
                        <p className="mt-1 text-xs leading-4 text-slate-600">Calor útil acumulado para desarrollo del cultivo.</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700">Horas-frío<IndicatorHelp term="chillHours" /></div>
                        <p className="mt-1 text-xl font-black text-slate-900">{fmtN(agricultural.chillHours, 0)} h</p>
                        <p className="mt-1 text-xs leading-4 text-slate-600">Frío útil reciente para leñosos en reposo.</p>
                      </div>
                    </div>
                    {agricultural.workability.reasons.length > 0 && (
                      <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">
                        <p className="font-bold">Motivos operativos</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                          {agricultural.workability.reasons.map((reason, index) => <li key={index}>{reason}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              </>
            );
          })()}

        </>
      )}

      {profile === 'ganaderia' && (
        <section className="rounded-[22px] border border-amber-200 bg-amber-50/80 p-5">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">🐄 Ganadería</h2>
          {livestock ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700">Estrés térmico</p>
                <p className="mt-1 text-2xl font-black text-amber-900">
                  {interpretTHI(livestock.thi ?? null).label}
                </p>
                <p className="mt-1 text-sm text-slate-600">THI: {livestock.thi?.toFixed(0) ?? '—'}</p>
                <p className="mt-2 text-sm font-semibold text-amber-800">{interpretTHI(livestock.thi ?? null).action}</p>
              </div>
              <div className="rounded-xl bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700">Condiciones actuales</p>
                <div className="mt-2 space-y-1 text-sm text-slate-700">
                  <p>🌡️ Temperatura: {fmtN(airTemp, 1)}°C</p>
                  <p>💧 Humedad: {humidity != null ? `${humidity.toFixed(0)}%` : '—'}</p>
                  <p>💨 Viento: {windSpeed.toFixed(0)} km/h</p>
                </div>
              </div>
              <div className="rounded-xl bg-amber-100 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-700">Recomendación</p>
                <p className="mt-2 text-sm leading-6 text-amber-900">
                  {livestock.thi !== undefined && livestock.thi >= 80
                    ? 'Asegura sombra densa, agua fresca y abundante. Evita manejo y traslados en horas centrales. Vigila animales jóvenes y viejos por signos de estrés como jadeo intenso o salivación.'
                    : livestock.thi !== undefined && livestock.thi >= 72
                    ? 'Proporciona sombra y agua fresca. Vigila evolución si la temperatura sigue subiendo.'
                    : 'Condiciones térmicas adecuadas para el ganado. Sin precauciones especiales.'}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-700">Sin datos ganaderos disponibles.</p>
          )}
        </section>
      )}

      {profile === 'huerto' && (
        <section className="rounded-[22px] border border-emerald-200 bg-emerald-50/80 p-5">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">🥬 Huerto y jardín</h2>
          <div className="mt-4 space-y-4">
            <div className="rounded-xl bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700">Temperatura suelo 10cm</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{fmtN(soil10, 1)}°C</p>
              <p className="mt-1 text-sm text-slate-600">{interpretSoilTemp(soil10, '10cm').detail}</p>
              <p className="mt-1 text-sm font-semibold text-sky-700">{interpretSoilTemp(soil10, '10cm').action}</p>
            </div>
            <div className="rounded-xl bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700">Riego</p>
              {agricultural?.recommendedIrrigationLitersM2 !== undefined && agricultural.recommendedIrrigationLitersM2 > 0 ? (
                <>
                  <p className="mt-1 text-2xl font-black text-sky-700">{agricultural.recommendedIrrigationLitersM2.toFixed(1)} L/m²</p>
                  <p className="mt-1 text-sm text-slate-600">Recomendación general para la semana.</p>
                </>
              ) : (
                <p className="mt-1 text-lg font-bold text-emerald-700">No requiere riego adicional</p>
              )}
            </div>
            <div className="rounded-xl bg-emerald-100 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">Tareas recomendadas</p>
              <ul className="mt-2 space-y-1 text-sm text-emerald-900">
                {soil10 !== null && soil10 >= 15 && <li>🌱 Buena temperatura para siembra de hortícolas de verano</li>}
                {soil10 !== null && soil10 < 15 && <li>🌱 Suelo aún frío para siembras sensibles. Esperar o usar semillero protegido</li>}
                {humidity != null && humidity < 30 && <li>💧 Humedad ambiente baja. Acolchar para retener humedad en el suelo</li>}
                {windSpeed > 20 && <li>💨 Viento fuerte. Proteger plantas jóvenes y revisar tutores</li>}
                <li>🔍 Revisar presencia de plagas en hojas y tallos</li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {profile === 'general' && (
        <section className="rounded-[22px] border border-sky-200 bg-sky-50/80 p-5">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">👥 Para hoy</h2>
          <div className="mt-4 space-y-4">
            <div className="rounded-xl bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700">🌡️ Temperatura</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{fmtN(airTemp, 1)}°C</p>
              <p className="mt-1 text-sm text-slate-600">
                {airTemp >= 30
                  ? 'Tarde muy calurosa. Mejor salir temprano o al anochecer. Lleva agua si vas a caminar.'
                  : airTemp >= 20
                  ? 'Temperatura agradable. Buen día para actividades al aire libre.'
                  : airTemp >= 10
                  ? 'Día fresco. Lleva chaqueta si sales.'
                  : 'Día frío. Abrígate bien.'}
              </p>
            </div>
            <div className="rounded-xl bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700">Recomendación del día</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {airTemp >= 35
                  ? 'Evita salir en horas centrales. Mantente hidratado. Usa protección solar y gorra.'
                  : airTemp >= 30
                  ? 'Limita el esfuerzo físico al mediodía. Busca la sombra y bebe agua con frecuencia.'
                  : airTemp >= 25
                  ? 'Día caluroso. Disfruta del buen tiempo pero protégete del sol.'
                  : airTemp >= 15
                  ? 'Día ideal para estar al aire libre. Aprovecha para pasear, hacer deporte o trabajar fuera.'
                  : airTemp >= 5
                  ? 'Día fresco. Bueno para actividades activas. Abrígate si estás parado.'
                  : 'Día frío. Si sales, varias capas de ropa. Precaución con hielo en la calle.'}
              </p>
            </div>
            {weather?.alerts && weather.alerts.length > 0 && (
              <div className="rounded-xl bg-rose-100 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-rose-700">Alertas activas</p>
                <p className="mt-1 text-sm text-rose-900">
                  {weather.alerts.length} aviso(s) oficial(es) activo(s) en la comarca. Consulta la pestaña Alertas.
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function ExecutiveTile({ label, value, detail, tone, help }: {
  label: string;
  value: string;
  detail: string;
  tone: 'sky' | 'emerald' | 'amber' | 'rose';
  help?: 'et0' | 'frostRisk';
}) {
  const toneClass = {
    sky: 'border-sky-200 bg-sky-50 text-sky-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    rose: 'border-rose-200 bg-rose-50 text-rose-900',
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700">
        {label}<IndicatorHelp term={help} />
      </div>
      <p className="mt-1 text-xl font-black">{value}</p>
      <p className="mt-1 text-xs leading-4 text-slate-700">{detail}</p>
    </div>
  );
}

function ActionBox({ title, items, tone }: { title: string; items: string[]; tone: 'emerald' | 'rose' }) {
  const toneClass = tone === 'emerald'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
    : 'border-rose-200 bg-rose-50 text-rose-900';

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-sm font-black">{title}</p>
      <ul className="mt-2 space-y-2 text-sm leading-5">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2">
            <span className="mt-0.5 font-black">{tone === 'emerald' ? '✓' : '!'}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
