'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type Audience = 'finca' | 'local' | 'entidad';

const OPTIONS: { id: Audience; label: string; hint: string; href: string }[] = [
  { id: 'finca', label: 'Tengo una finca', hint: 'Avisos y decisiones agrícolas', href: '/huescar' },
  { id: 'local', label: 'Tiempo local', hint: 'Previsión meteorológica', href: '/meteo' },
  { id: 'entidad', label: 'Entidad / profesional', hint: 'Capa científica y datos', href: '/motor-climatico' },
];

const STORAGE_KEY = 'meteo_audience';

function audienceForPath(pathname: string): Audience {
  if (pathname.startsWith('/motor-climatico')) return 'entidad';
  if (pathname.startsWith('/meteo')) return 'local';
  if (pathname.startsWith('/huescar')) return 'finca';
  return 'finca';
}

/**
 * Selector de público visible. Cada opción lleva a un recorrido distinto
 * (finca, tiempo local, entidad) usando rutas ya existentes, sin duplicar
 * contenido. Resalta la opción según la ruta actual y recuerda la última
 * elección en localStorage para futuras visitas.
 */
export function AudienceSwitcher({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const active = audienceForPath(pathname);
  const [saved, setSaved] = useState<Audience | null>(null);

  useEffect(() => {
    try {
      setSaved(localStorage.getItem(STORAGE_KEY) as Audience | null);
    } catch {
      /* localStorage no disponible */
    }
  }, []);

  function remember(id: Audience) {
    try {
      localStorage.setItem(STORAGE_KEY, id);
      setSaved(id);
    } catch {
      /* ignorar */
    }
  }

  return (
    <nav
      aria-label="¿Qué estás buscando?"
      className="rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"
    >
      <div className={`grid gap-1 ${compact ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {OPTIONS.map((opt) => {
          const isActive = active === opt.id || (saved === opt.id && active === 'finca' && opt.id === 'finca');
          return (
            <Link
              key={opt.id}
              href={opt.href}
              prefetch={false}
              onClick={() => remember(opt.id)}
              aria-current={active === opt.id ? 'true' : undefined}
              className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-center transition
                ${active === opt.id
                  ? 'bg-sky-700 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <span className="text-xs font-bold leading-tight sm:text-sm">{opt.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
