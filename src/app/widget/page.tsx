'use client';

import WeatherDashboardAyto from '@/components/WeatherDashboardAyto';

export default function WidgetPage() {
  return (
    <div className="min-h-0 p-2 sm:p-4">
      <h1 className="text-base font-semibold text-[#1B3668] mb-4">
        Ayuntamiento de Huéscar - Meteorología
      </h1>
      <WeatherDashboardAyto />
    </div>
  );
}
