'use client';

import Link from 'next/link';

export function ModelDisclosure() {
  return (
    <section className="surface-card rounded-[24px] p-5">
      <details className="dashboard-detail">
        <summary className="cursor-pointer">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Transparencia</p>
              <p className="mt-1 text-base font-black text-slate-900">Cómo se calcula lo que ves aquí</p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Desplegar
            </span>
          </div>
        </summary>
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-700">
          <p>
            Huescar cruza cuatro fuentes: tu miniestación (si está activa), las estaciones AEMET 5047E
            (Baza) y 5051X (San Clemente), las estaciones RIA 18/1 (Baza) y 18/2 (Puebla de Don Fadrique), y el modelo
            global Open-Meteo como respaldo y forecast.
          </p>
          <p>
            La temperatura se interpola entre Baza y San Clemente según el gradiente térmico real medido en cada
            momento. De día se usa el gradiente adiabático estándar (0.65 °C / 100 m). De noche, si hay inversión
            (San Clemente más cálido que Baza), se invierte el gradiente y se aplica drenaje catabático
            (hasta −5 °C) cuando el viento cae por debajo de 1.5 m/s.
          </p>
          <p>
            La presión se extrapola con la ecuación hipsométrica completa usando la temperatura local de Baza.
            La humedad se transporta conservando la presión de vapor real (Tetens-Magnus), con penalización
            automática del −15% cuando el viento en Baza viene del Oeste y la humedad supera el 90% (advección
            del Negratín bloqueada por el Cerro Jabalcón).
          </p>
          <p>
            El viento se asimila siempre desde Baza con un coeficiente de fricción de vega de 0.85 (la fricción
            del arbolado local). Puebla se descarta para viento porque está expuesta a ráfagas catabáticas de
            La Sagra que no representan la vega.
          </p>
          <p>
            La radiación se interpola entre las dos RIA por distancia inversa al cuadrado, con desplazamiento
            automático a Baza-pesada (70%) cuando la presión cae bajo 925 hPa o cuando Open-Meteo detecta
            nubosidad alta en la comarca (efecto Foehn).
          </p>
          <p className="rounded-[16px] border border-sky-200 bg-sky-50 p-3 text-sky-900">
            Cada 30 días se recalibra automáticamente el sesgo de Open-Meteo contra el modelo local
            (temperatura día/noche, humedad, viento, radiación) y se aplica al pronóstico de los próximos 7 días.
            Por eso el forecast 5d de esta página es distinto al de Open-Meteo puro.
          </p>
          <Link href="/motor-climatico" className="inline-flex items-center text-xs font-bold text-sky-700 hover:text-sky-900">
            Ver el motor climático completo →
          </Link>
        </div>
      </details>
    </section>
  );
}
