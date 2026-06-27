'use client';

export type TabId = 'hoy' | 'horas' | 'semana' | 'campo' | 'alertas';

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'hoy', icon: '🏠', label: 'Hoy' },
  { id: 'horas', icon: '🕒', label: 'Horas' },
  { id: 'semana', icon: '📅', label: 'Semana' },
  { id: 'campo', icon: '🌱', label: 'Campo' },
  { id: 'alertas', icon: '⚠️', label: 'Alertas' },
];

export function NavBottom({ active, onChange, alertCount }: {
  active: TabId;
  onChange: (tab: TabId) => void;
  alertCount?: number;
}) {
  return (
    <nav role="tablist" className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-lg shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="mx-auto flex max-w-lg items-center justify-around px-1 pb-safe-bottom">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          const showBadge = tab.id === 'alertas' && alertCount && alertCount > 0;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              onClick={() => onChange(tab.id)}
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
            </button>
          );
        })}
      </div>
    </nav>
  );
}
