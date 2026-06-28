import { SemanaPageClient } from '@/components/SemanaPageClient';
import { getSemanaPageData } from '@/app/huescar/page-data-cache';

export const dynamic = 'force-dynamic';

export default async function HuescarSemanaPage() {
  const pageData = await getSemanaPageData();

  return (
    <SemanaPageClient
      initialWeatherData={pageData.weather}
      initialForecastData={pageData.forecast}
    />
  );
}
