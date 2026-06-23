'use client';

import { useState, useEffect } from 'react';
import { fmtN } from '@/components/llano/atoms';
import { AgricultureSection } from '@/components/llano/agriculture';
import { interpretTHI, interpretFrostRisk, interpretSoilTemp, interpretWindForTreatment, interpretETo } from '@/lib/interpretation';
import type { ClimateCalibrationPayload } from '@/hooks/useClimateCalibration';
import type { AgriculturalData, LivestockData, WeatherPayload } from '@/types/weather';

const LS_CROPS = 'meteo_favorite_crops';
const LS_ZONE = 'meteo_selected_zone';

type Profile = 'general' | 'agricultura' | 'ganaderia' | 'huerto';

const PROFILES: { id: Profile; icon: string; label: string }[] = [
  { id: 'general', icon: '👥', label: 'Población' },
  { id: 'agricultura', icon: '🌾', label: 'Agricultura' },
  { id: 'ganaderia', icon: '🐄', label: 'Ganadería' },
  { id: 'huerto', icon: '🥬', label: 'Huerto/Jardín' },
];

const QUICK_CROPS = ['Olivo', 'Almendro', 'Pistacho', 'Tomate', 'Vid', 'Huerto'];
const ZONES = ['Huéscar centro', 'La Sagra', 'Campo total', 'Zona norte'];

function loadCrops(): string[] {
  if (typeof window === 'undefined') return ['Olivo', 'Almendro'];
  try {
    const raw = localStorage.getItem(LS_CROPS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return ['Olivo', 'Almendro'];
}

function saveCrops(crops: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_CROPS, JSON.stringify(crops));
}

function loadZone(): string {
  if (typeof window === 'undefined') return 'Campo total';
  try {
    return localStorage.getItem(LS_ZONE) ?? 'Campo total';
  } catch { return 'Campo total'; }
}

function saveZone(zone: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_ZONE, zone);
}

export function FieldTab({ climate, weather, agricultural, livestock }: {
  climate: ClimateCalibrationPayload;
  weather: WeatherPayload | null;
  agricultural: AgriculturalData | null;
  livestock: LivestockData | null;
}) {
  const [profile, setProfile] = useState<Profile>('agricultura');
  const [favoriteCrops, setFavoriteCrops] = useState<string[]>(loadCrops);
  const [zone, setZone] = useState<string>(loadZone);

  useEffect(() => { saveCrops(favoriteCrops); }, [favoriteCrops]);
  useEffect(() => { saveZone(zone); }, [zone]);

  const exotic = climate.exoticVariables;
  const airTemp = climate.calibration.realTemperatureC ?? climate.interpolation.estimatedTemperatureC;
  const soil10 = exotic.soilTemp10cmC;
  const humidity = climate.nodes.localStation?.humidityPct ?? climate.eto.inputs.humidityPct ?? weather?.current?.humidityPct;
  const windSpeed = climate.nodes.radiationWind.windSpeed2mKmh;

  const toggleCrop = (crop: string) => {
    setFavoriteCrops(prev =>
      prev.includes(crop) ? prev.filter(c => c !== crop) : [...prev, crop]
    );
  };

  return (
    <div className="space-y-4 pb-24">
      <section className="rounded-[22px] border border-slate-200 bg-white p-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Tu perfil</h2>
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
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-1.5">Zona</p>
          <div className="flex flex-wrap gap-1.5">
            {ZONES.map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => { setZone(z); }}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                  zone === z ? 'bg-sky-700 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
                aria-label={`Seleccionar zona ${z}`}
              >
                {z}
              </button>
            ))}
          </div>
        </div>
      </section>

      {profile === 'agricultura' && (
        <>
          <section className="rounded-[22px] border border-slate-200 bg-white p-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Mis cultivos</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_CROPS.map((crop) => (
                <button
                  key={crop}
                  type="button"
                  onClick={() => toggleCrop(crop)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    favoriteCrops.includes(crop)
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {crop}
                </button>
              ))}
            </div>
          </section>

          {agricultural && (
            <section className="rounded-[22px] border border-sky-200 bg-sky-50/80 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
                  {favoriteCrops.join(' / ')}
                </h2>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                  agricultural.workability.workable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {agricultural.workability.workable ? 'Suelo operable' : 'Labores no recomendadas'}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">ET0 semanal</p>
                  <p className="mt-1 text-xl font-black text-slate-900">{fmtN(agricultural.et0CumulativeMm, 1)} mm</p>
                  <p className="mt-1 text-xs leading-4 text-slate-600">{interpretETo(agricultural.et0CumulativeMm, 'semana').detail}</p>
                  <p className="text-xs font-bold text-sky-700">{interpretETo(agricultural.et0CumulativeMm, 'semana').action}</p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Riesgo helada</p>
                  <p className="mt-1 text-xl font-black text-slate-900">{agricultural.frostRisk48h === 'none' ? 'Sin riesgo' : agricultural.frostRisk48h}</p>
                  <p className="mt-1 text-xs leading-4 text-slate-600">{interpretFrostRisk(agricultural.frostRisk48h).detail}</p>
                  <p className="text-xs font-bold text-sky-700">{interpretFrostRisk(agricultural.frostRisk48h).action}</p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Suelo 10cm</p>
                  <p className="mt-1 text-xl font-black text-slate-900">{fmtN(soil10, 1)}°C</p>
                  <p className="mt-1 text-xs leading-4 text-slate-600">{interpretSoilTemp(soil10, '10cm').detail}</p>
                  <p className="text-xs font-bold text-sky-700">{interpretSoilTemp(soil10, '10cm').action}</p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Tratamientos</p>
                  <p className="mt-1 text-xl font-black text-slate-900">
                    {windSpeed <= 15 ? 'Apto' : windSpeed <= 25 ? 'Marginal' : 'No apto'}
                  </p>
                  <p className="mt-1 text-xs leading-4 text-slate-600">{interpretWindForTreatment(windSpeed).detail}</p>
                  <p className="text-xs font-bold text-sky-700">{interpretWindForTreatment(windSpeed).action}</p>
                </div>
              </div>

              {agricultural.recommendedIrrigationLitersM2 !== undefined && agricultural.recommendedIrrigationLitersM2 > 0 && (
                <div className="mt-4 rounded-xl bg-emerald-100 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">Riego recomendado</p>
                  <p className="mt-1 text-2xl font-black text-emerald-900">
                    {agricultural.recommendedIrrigationLitersM2.toFixed(1)} L/m²
                  </p>
                  <p className="mt-1 text-sm text-emerald-800">
                    Balance hídrico semanal. Ajusta por cultivo, fase fenológica y textura del suelo.
                  </p>
                </div>
              )}
            </section>
          )}

          {agricultural && (
            <AgricultureSection
              agricultural={agricultural}
              climate={climate}
              precipitacionSemanal={weather?.daily?.precipitationSumMm?.[0] ?? null}
            />
          )}

        </>
      )}

      {profile === 'ganaderia' && (
        <section className="rounded-[22px] border border-amber-200 bg-amber-50/80 p-5">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">🐄 Ganadería</h2>
          {livestock ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Estrés térmico</p>
                <p className="mt-1 text-2xl font-black text-amber-900">
                  {interpretTHI(livestock.thi ?? null).label}
                </p>
                <p className="mt-1 text-sm text-slate-600">THI: {livestock.thi?.toFixed(0) ?? '—'}</p>
                <p className="mt-2 text-sm font-semibold text-amber-800">{interpretTHI(livestock.thi ?? null).action}</p>
              </div>
              <div className="rounded-xl bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Condiciones actuales</p>
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
            <p className="mt-3 text-sm text-slate-500">Sin datos ganaderos disponibles.</p>
          )}
        </section>
      )}

      {profile === 'huerto' && (
        <section className="rounded-[22px] border border-emerald-200 bg-emerald-50/80 p-5">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">🥬 Huerto y jardín</h2>
          <div className="mt-4 space-y-4">
            <div className="rounded-xl bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Temperatura suelo 10cm</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{fmtN(soil10, 1)}°C</p>
              <p className="mt-1 text-sm text-slate-600">{interpretSoilTemp(soil10, '10cm').detail}</p>
              <p className="mt-1 text-sm font-semibold text-sky-700">{interpretSoilTemp(soil10, '10cm').action}</p>
            </div>
            <div className="rounded-xl bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Riego</p>
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
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">🌡️ Temperatura</p>
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
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Recomendación del día</p>
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
