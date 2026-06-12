import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
      <main className="flex flex-col flex-1 items-center justify-center px-4 py-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
          Observatorio Meteorológico de Huéscar
        </h1>
        <p className="text-lg text-slate-300 mb-12 max-w-xl">
          Datos meteorológicos en tiempo real, predicciones y alertas para Huéscar y su comarca
        </p>
        <div className="flex flex-col sm:flex-row gap-6">
          <Link
            href="/meteo"
            className="px-8 py-4 rounded-xl bg-white text-slate-900 font-semibold text-lg shadow-lg hover:bg-slate-100 transition-colors"
          >
            Dashboard Público
          </Link>
          <Link
            href="/widget"
            className="px-8 py-4 rounded-xl border-2 border-white/30 text-white font-semibold text-lg hover:bg-white/10 transition-colors"
          >
            Widget Ayuntamiento
          </Link>
        </div>
      </main>
      <footer className="py-6 text-center text-sm text-slate-500">
        METERO · Datos agregados de AEMET y Open-Meteo
      </footer>
    </div>
  );
}
