import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-500">
      <p className="font-semibold text-slate-700">Meteo Huéscar</p>
      <nav className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1" aria-label="Información legal">
        <Link className="hover:text-sky-700 hover:underline" href="/aviso-legal">Aviso legal</Link>
        <Link className="hover:text-sky-700 hover:underline" href="/privacidad">Privacidad</Link>
        <Link className="hover:text-sky-700 hover:underline" href="/cookies">Cookies</Link>
      </nav>
    </footer>
  );
}
