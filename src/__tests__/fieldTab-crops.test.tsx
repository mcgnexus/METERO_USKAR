// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { FieldTab } from '@/components/llano/field-tab';

vi.mock('@/components/llano/agriculture', () => ({
  AgricultureSection: () => <div data-testid="agriculture-stub" />,
}));

const climate = {
  calibration: { realTemperatureC: 12 },
  interpolation: { estimatedTemperatureC: 12 },
  exoticVariables: { soilTemp10cmC: 14 },
  nodes: {
    localStation: { humidityPct: 50 },
    radiationWind: { windSpeed2mKmh: 10 },
  },
  eto: { inputs: { humidityPct: 50 } },
} as any;

const agricultural = {
  workability: { workable: true, reasons: [] },
  et0CumulativeMm: 12,
  frostRisk48h: 'none',
  gddCumulative: 100,
  chillHours: 20,
  recommendedIrrigationLitersM2: 0,
} as any;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

function renderFieldTab() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(
      <FieldTab
        climate={climate}
        weather={null}
        agricultural={agricultural}
        livestock={null}
      />,
    );
  });
  return container;
}

describe('FieldTab profile selectors', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.localStorage.clear();
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
  });

  it('permite seleccionar el perfil de ganadería', () => {
    renderFieldTab();

    const agricultureButton = [...document.querySelectorAll('button')].find(
      (el) => el.textContent?.includes('Agricultura'),
    ) as HTMLButtonElement | undefined;
    const livestockButton = [...document.querySelectorAll('button')].find(
      (el) => el.textContent?.includes('Ganadería'),
    ) as HTMLButtonElement | undefined;

    expect(agricultureButton).toBeTruthy();
    expect(livestockButton).toBeTruthy();
    expect(agricultureButton?.className).toContain('bg-sky-700');

    act(() => livestockButton?.click());

    expect(livestockButton?.className).toContain('bg-sky-700');
    expect(agricultureButton?.className).toContain('bg-slate-100');
  });
});
