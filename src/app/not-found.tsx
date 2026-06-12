import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4">
      <h1 className="text-6xl font-bold text-slate-300 mb-4">404</h1>
      <p className="text-xl text-slate-600 mb-8">Página no encontrada</p>
      <Link
        href="/"
        className="px-6 py-3 rounded-lg bg-slate-800 text-white font-medium hover:bg-slate-700 transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
