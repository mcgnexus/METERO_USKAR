'use client';

import { useState, type ReactNode } from 'react';

export type DashboardTab = 'forecast' | 'operations' | 'technical';

const dashboardTabLabels: Record<DashboardTab, string> = {
  forecast: 'Pronostico',
  operations: 'Operativa',
  technical: 'Tecnico',
};

export function TabButton({
  tab,
  activeTab,
  onClick,
}: {
  tab: DashboardTab;
  activeTab: DashboardTab;
  onClick: (tab: DashboardTab) => void;
}) {
  const active = activeTab === tab;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={`dashboard-panel-${tab}`}
      id={`dashboard-tab-${tab}`}
      className="dashboard-tab"
      data-active={String(active)}
      onClick={() => onClick(tab)}
    >
      {dashboardTabLabels[tab]}
    </button>
  );
}

export function TabSystem({
  activeTab,
  onChange,
  panels,
}: {
  activeTab: DashboardTab;
  onChange: (tab: DashboardTab) => void;
  panels: Record<DashboardTab, ReactNode>;
}) {
  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2 rounded-full bg-slate-100 p-2" role="tablist" aria-label="Secciones del panel meteorologico">
        <TabButton tab="forecast" activeTab={activeTab} onClick={onChange} />
        <TabButton tab="operations" activeTab={activeTab} onClick={onChange} />
        <TabButton tab="technical" activeTab={activeTab} onClick={onChange} />
      </div>

      <div className="mt-6">{panels[activeTab]}</div>
    </>
  );
}

export function DashboardDetail({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <details
      className="dashboard-detail rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer" aria-expanded={open}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">{eyebrow}</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">{title}</h3>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            {open ? 'Ocultar' : 'Desplegar'}
          </span>
        </div>
      </summary>
      <div className="mt-4 border-t border-slate-100 pt-4">{children}</div>
    </details>
  );
}
