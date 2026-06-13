'use client';

import WeatherDashboardAyto from '@/components/WeatherDashboardAyto';

export default function WidgetPage() {
  return (
    <div className="min-h-0 p-2 sm:p-4 bg-white text-[#1B3668]">
      <h1 className="text-base font-bold text-[#1B3668] mb-4 border-b border-[#e8e4d8] pb-2">
        Ayuntamiento de Huéscar - Meteorología
      </h1>
      <WeatherDashboardAyto />
    </div>
  );
}
