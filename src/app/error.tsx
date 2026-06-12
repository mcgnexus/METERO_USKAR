'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4">
      <h1 className="text-3xl font-bold text-slate-700 mb-2">Algo salió mal</h1>
      <p className="text-slate-500 mb-8 text-center max-w-md">
        No se pudieron cargar los datos meteorológicos. Verifica tu conexión e intenta de nuevo.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 rounded-lg bg-slate-800 text-white font-medium hover:bg-slate-700 transition-colors"
      >
        Reintentar
      </button>
    </div>
  );
}
