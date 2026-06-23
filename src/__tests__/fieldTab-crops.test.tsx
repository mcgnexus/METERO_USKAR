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

function selectedLabel(): HTMLElement {
  const heading = [...document.querySelectorAll('h2')].find((el) =>
    el.textContent?.includes(' / ') || ['Olivo', 'Almendro', 'Pistacho', 'Tomate', 'Vid', 'Huerto'].some((crop) =>
      el.textContent?.includes(crop),
    ),
  );
  expect(heading).not.toBeNull();
  return heading as HTMLElement;
}

describe('FieldTab crop selectors', () => {
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

  it('permite seleccionar y deseleccionar cultivos con los botones', () => {
    renderFieldTab();

    expect(selectedLabel().textContent).toContain('Olivo / Almendro');

    const crops = ['Pistacho', 'Tomate', 'Vid', 'Huerto'];
    for (const crop of crops) {
      const button = [...document.querySelectorAll('button')].find(
        (el) => el.textContent?.trim() === crop,
      ) as HTMLButtonElement | undefined;
      expect(button).toBeTruthy();

      act(() => {
        button!.click();
      });

      expect(selectedLabel().textContent).toContain(crop);
    }

    const pistachoButton = [...document.querySelectorAll('button')].find(
      (el) => el.textContent?.trim() === 'Pistacho',
    ) as HTMLButtonElement | undefined;

    act(() => {
      pistachoButton!.click();
    });

    expect(selectedLabel().textContent).not.toContain('Pistacho');
  });
});
