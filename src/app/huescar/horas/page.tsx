import { HorasPageClient } from '@/components/HorasPageClient';
import { getHorasPageData } from '@/app/huescar/page-data-cache';
import type { Metadata } from 'next';

export const revalidate = 60;
export const metadata: Metadata = { alternates: { canonical: '/huescar/horas' } };

export default async function HuescarHorasPage() {
  const pageData = await getHorasPageData();

  return (
    <HorasPageClient
      initialWeatherData={pageData.weather}
      initialForecastData={pageData.forecast}
    />
  );
}
