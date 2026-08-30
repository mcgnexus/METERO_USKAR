import { SemanaPageClient } from '@/components/SemanaPageClient';
import { getSemanaPageData } from '@/app/huescar/page-data-cache';
import type { Metadata } from 'next';

export const revalidate = 60;
export const metadata: Metadata = { alternates: { canonical: '/huescar/semana' } };

export default async function HuescarSemanaPage() {
  const pageData = await getSemanaPageData();

  return (
    <SemanaPageClient
      initialWeatherData={pageData.weather}
      initialForecastData={pageData.forecast}
    />
  );
}
