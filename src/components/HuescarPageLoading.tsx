export function HuescarPageLoading({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="mx-auto max-w-lg px-4 pt-4 pb-24" aria-busy="true" aria-live="polite">
        <header className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Meteo Huéscar</p>
          <h1 className="mt-0.5 text-xl font-black text-slate-900">{title}</h1>
        </header>
        <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-sky-600" />
            Cargando previsión…
          </div>
          <div className="mt-5 space-y-3">
            <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
          </div>
        </section>
      </div>
    </div>
  );
}
