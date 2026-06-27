'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type TabId = 'hoy' | 'horas' | 'semana' | 'campo' | 'alertas';

const TABS: { id: TabId; icon: string; label: string; href: string }[] = [
  { id: 'hoy', icon: '🏠', label: 'Hoy', href: '/huescar' },
  { id: 'horas', icon: '🕒', label: 'Horas', href: '/huescar/horas' },
  { id: 'semana', icon: '📅', label: 'Semana', href: '/huescar/semana' },
  { id: 'campo', icon: '🌱', label: 'Campo', href: '/huescar/campo' },
  { id: 'alertas', icon: '⚠️', label: 'Alertas', href: '/huescar/alertas' },
];

export function NavBottom({ alertCount }: { alertCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-lg shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="mx-auto flex max-w-lg items-center justify-around px-1 pb-safe-bottom">
        {TABS.map((tab) => {
          const isActive = tab.id === 'hoy'
            ? pathname === '/huescar'
            : pathname.startsWith(tab.href);
          const showBadge = tab.id === 'alertas' && alertCount && alertCount > 0;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-label={tab.label}
              className={`relative flex flex-col items-center gap-0.5 py-2.5 px-3 min-w-0 min-h-[52px] transition-colors
                ${isActive ? 'text-sky-800' : 'text-slate-600 hover:text-slate-800'}`}
            >
              <span className="relative text-xl leading-none">
                {tab.icon}
                {showBadge && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white leading-none">
                    {alertCount}
                  </span>
                )}
              </span>
              <span className={`text-[10px] font-bold leading-tight tracking-tight ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute -top-px left-1/4 right-1/4 h-0.5 rounded-full bg-sky-700" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
