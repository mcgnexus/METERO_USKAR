import { AlertasPageClient } from '@/components/AlertasPageClient';
import { getHuescarWeatherResponse } from '@/services/huescarWeatherService';
import type { Metadata } from 'next';

export const revalidate = 300;
export const metadata: Metadata = { alternates: { canonical: '/huescar/alertas' } };

export default async function HuescarAlertasPage() {
  const response = await getHuescarWeatherResponse();

  return <AlertasPageClient response={response} />;
}
