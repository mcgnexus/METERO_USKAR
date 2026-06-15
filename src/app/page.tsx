import Link from "next/link";

const featureCards = [
  {
    title: "Resumen operativo inmediato",
    copy: "Temperatura, riesgo de lluvia, viento y confianza del modelo en una sola vista pensada para decisiones rapidas.",
  },
  {
    title: "Modelo local explicable",
    copy: "Fusion de AEMET, Open-Meteo y miniestaciones locales con capa tecnica desplegable cuando hace falta justificar el dato.",
  },
  {
    title: "Salida publica e institucional",
    copy: "Misma base de datos para dashboard publico, widget del ayuntamiento y consola operativa del servicio.",
  },
];

const productMetrics = [
  { value: "3", label: "fuentes principales integradas" },
  { value: "2h", label: "de nowcasting operativo" },
  { value: "7d", label: "de prevision sintetizada" },
];

const productModules = [
  "Resumen meteorologico con KPIs y alertas",
  "Pronostico consolidado para publico y operativa",
  "Panel agricola y de estres termico ganadero",
  "Widget institucional listo para embebido",
];

export default function Home() {
  return (
    <div className="min-h-screen py-6 sm:py-8">
      <div className="app-shell">
        <header className="surface-card flex items-center justify-between rounded-[28px] px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">Metero</p>
            <p className="text-sm text-slate-600">SaaS meteorologico local para Huéscar</p>
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/meteo" className="cta-primary text-sm">
              Ver dashboard
            </Link>
          </nav>
        </header>

        <main className="space-y-8 py-8 sm:space-y-12 sm:py-10">
          <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
            <div className="surface-card-strong relative overflow-hidden rounded-[32px] px-6 py-8 sm:px-10 sm:py-12">
              <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top_right,_rgba(45,127,249,0.16),_transparent_52%)] lg:block" />
              <div className="relative max-w-2xl">
                <span className="eyebrow">Microclima local · Decision ready</span>
                <h1 className="section-title mt-6 text-[2.7rem] text-slate-950 sm:text-[4.5rem]">
                  Meteorologia local presentada como producto, no como tabla tecnica.
                </h1>
                <p className="section-copy mt-6 max-w-xl">
                  Centraliza observacion, prevision y alertas en una experiencia limpia para publico, ayuntamiento y operativa interna.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/meteo" className="cta-primary">
                    Abrir vista SaaS
                  </Link>
                  <Link href="/widget" className="cta-secondary">
                    Ver widget institucional
                  </Link>
                </div>
                <div className="mt-10 grid gap-3 sm:grid-cols-3">
                  {productMetrics.map((metric) => (
                    <div key={metric.label} className="metric-panel px-4 py-4">
                      <p className="text-2xl font-bold text-slate-950">{metric.value}</p>
                      <p className="mt-1 text-sm text-slate-600">{metric.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="surface-card overflow-hidden rounded-[32px] p-5 sm:p-6">
              <div className="soft-grid rounded-[24px] border border-white/70 bg-slate-950 px-5 py-5 text-white shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-sky-200">Resumen en vivo</p>
                    <h2 className="mt-2 text-3xl font-bold">Huéscar · 18.4°C</h2>
                  </div>
                  <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                    84% confianza
                  </span>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/8 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Lluvia estimada</p>
                    <p className="mt-2 text-2xl font-bold">Sin aviso</p>
                    <p className="mt-1 text-sm text-slate-300">Radar y nowcast a demanda, sin ocupar la vista principal.</p>
                  </div>
                  <div className="rounded-2xl bg-white/8 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Fuente principal</p>
                    <p className="mt-2 text-2xl font-bold">Fused stack</p>
                    <p className="mt-1 text-sm text-slate-300">AEMET + Open-Meteo + red local en un unico producto.</p>
                  </div>
                </div>
                <div className="mt-5 rounded-2xl bg-white p-4 text-slate-900">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Modulos incluidos</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {productModules.map((module) => (
                      <li key={module} className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        {module}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </aside>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            {featureCards.map((card) => (
              <article key={card.title} className="surface-card rounded-[28px] p-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Capa de producto</p>
                <h3 className="mt-3 text-2xl font-bold text-slate-950">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{card.copy}</p>
              </article>
            ))}
          </section>

          <section className="surface-card-strong rounded-[32px] px-6 py-8 sm:px-8">
            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div>
                <span className="eyebrow">Propuesta de valor</span>
                <h2 className="section-title mt-5 text-slate-950">Una interfaz mas cercana a una plataforma SaaS que a un panel tecnico bruto.</h2>
                <p className="section-copy mt-5">
                  La nueva direccion del producto prioriza jerarquia visual, menos parametros por defecto y detalle tecnico solo cuando aporta contexto real.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="metric-panel p-5">
                  <p className="text-sm font-semibold text-slate-500">Hero claro</p>
                  <p className="mt-2 text-lg font-bold text-slate-950">CTA principal hacia la vista SaaS</p>
                </div>
                <div className="metric-panel p-5">
                  <p className="text-sm font-semibold text-slate-500">Resumen primero</p>
                  <p className="mt-2 text-lg font-bold text-slate-950">KPIs y estado operativo antes del detalle</p>
                </div>
                <div className="metric-panel p-5">
                  <p className="text-sm font-semibold text-slate-500">Detalle bajo demanda</p>
                  <p className="mt-2 text-lg font-bold text-slate-950">Radar y transparencia tecnica como niveles opcionales</p>
                </div>
                <div className="metric-panel p-5">
                  <p className="text-sm font-semibold text-slate-500">Consistencia visual</p>
                  <p className="mt-2 text-lg font-bold text-slate-950">Tipografia, superficies y espaciado compartidos</p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
