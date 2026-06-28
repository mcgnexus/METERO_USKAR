import { HorasPageClient } from '@/components/HorasPageClient';
import { getHorasPageData } from '@/app/huescar/page-data-cache';

export const dynamic = 'force-dynamic';

export default async function HuescarHorasPage() {
  const pageData = await getHorasPageData();

  return (
    <HorasPageClient
      initialWeatherData={pageData.weather}
      initialForecastData={pageData.forecast}
    />
  );
}
