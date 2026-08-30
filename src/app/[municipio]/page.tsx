import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchOpenMeteoForecast, type ForecastDay } from '@/services/openMeteoForecastService';
import { getMunicipality, MUNICIPALITIES } from '@/config/municipalities';

export const revalidate = 300;

export function generateStaticParams() {
  return MUNICIPALITIES.map(({ slug }) => ({ municipio: slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ municipio: string }> }) {
  const { municipio } = await params;
  const location = getMunicipality(municipio);
  if (!location) return {};
  return { title: `Meteo agrícola ${location.name} | Avisos para fincas | TecRural`, description: `Previsión meteorológica y agrícola para ${location.name}, Granada. Consulta lluvia, viento, heladas, riego y cultivos. Recibe avisos personalizados de TecRural.`, alternates: { canonical: `/${location.slug}` }, openGraph: { title: `Meteo agrícola ${location.name} | Avisos para fincas | TecRural`, description: `Previsión meteorológica y agrícola para ${location.name}. Recibe avisos personalizados de TecRural.`, url: `/${location.slug}` } };
}

function dayLabel(date: string, index: number): string {
  if (index === 0) return 'Hoy';
  if (index === 1) return 'Mañana';
  return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' }).format(new Date(`${date}T12:00:00Z`));
}

function alertsFor(day: ForecastDay): string[] {
  const alerts: string[] = [];
  if ((day.dailySummary.tempMinC ?? 99) <= 2) alerts.push('Posible helada: vigila cultivos sensibles y zonas bajas.');
  if ((day.dailySummary.tempMaxC ?? 0) >= 36) alerts.push('Calor intenso: revisa riego y evita las horas centrales.');
  if ((day.dailySummary.windMeanKmh ?? 0) >= 25) alerts.push('Viento destacado: comprueba las condiciones antes de tratar.');
  return alerts;
}

export default async function MunicipalityPage({ params }: { params: Promise<{ municipio: string }> }) {
  const { municipio } = await params;
  const location = getMunicipality(municipio);
  if (!location) notFound();
  const forecast = await fetchOpenMeteoForecast(location.latitude, location.longitude, location.elevationM, 5);
  const days = forecast?.forecastDays ?? [];
  const alerts = days.flatMap(alertsFor);

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-8 text-slate-900 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8"><Link href="/huescar" className="text-xs font-bold text-sky-700 hover:underline">← Meteo Huéscar</Link><p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Meteo local · {location.province}</p><h1 className="mt-2 text-3xl font-black sm:text-5xl">El tiempo en {location.name}</h1><p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{location.localText}</p></header>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">Previsión local</p><h2 className="mt-1 text-2xl font-black">Próximos 5 días</h2></div><p className="text-xs text-slate-500">Open-Meteo · {location.elevationM} m</p></div>{days.length > 0 ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{days.map((day, index) => <article key={day.date} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold capitalize text-slate-600">{dayLabel(day.date, index)}</p><p className="mt-3 text-2xl font-black">{day.dailySummary.tempMaxC?.toFixed(0) ?? '—'}° <span className="text-sm font-semibold text-sky-700">/ {day.dailySummary.tempMinC?.toFixed(0) ?? '—'}°</span></p><p className="mt-2 text-xs text-slate-600">Sol: {day.dailySummary.radiationTotalMJm2?.toFixed(1) ?? '—'} MJ/m²</p><p className="mt-1 text-xs text-slate-600">Viento medio: {day.dailySummary.windMeanKmh?.toFixed(0) ?? '—'} km/h</p></article>)}</div> : <p className="mt-5 text-sm text-slate-500">La previsión no está disponible temporalmente.</p>}</section>
        <section className="mt-5 grid gap-5 lg:grid-cols-2"><div className="rounded-3xl border border-amber-200 bg-amber-50 p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">Alertas</p><h2 className="mt-1 text-xl font-black text-amber-950">Qué vigilar</h2><div className="mt-3 space-y-2 text-sm leading-6 text-amber-950">{alerts.slice(0, 4).map((alert) => <p key={alert}>⚠️ {alert}</p>)}{days.length > 0 && alerts.length === 0 && <p>No se detectan señales destacadas con estos umbrales.</p>}{days.length === 0 && <p>Consulta de nuevo en unos minutos para actualizar las alertas.</p>}</div></div><div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Agricultura</p><h2 className="mt-1 text-xl font-black text-emerald-950">Una previsión para decidir</h2><p className="mt-3 text-sm leading-6 text-emerald-950">{location.agriculturalText}</p></div></section>
        <section className="mt-5 rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 sm:p-7"><h2 className="text-xl font-black text-emerald-950">¿Quieres avisos para tu finca en {location.name}?</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-900/80">TecRural puede ayudarte a definir avisos de helada, calor, lluvia, viento y riego según tu cultivo.</p><div className="mt-4 flex flex-wrap gap-2"><Link href={`/huescar/contacto?municipio=${encodeURIComponent(location.name)}`} className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">Quiero avisos para mi finca</Link><Link href="/huescar/campo" className="rounded-full border border-emerald-300 bg-white px-5 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-50">Ver soluciones para agricultores</Link></div></section>
        <nav className="mt-8 border-t border-slate-200 pt-5" aria-label="Otros municipios"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Previsión en otros municipios</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-sky-700">{MUNICIPALITIES.filter((item) => item.slug !== location.slug).map((item) => <Link key={item.slug} href={`/${item.slug}`} className="hover:underline">{item.name}</Link>)}</div></nav>
      </div>
    </main>
  );
}
