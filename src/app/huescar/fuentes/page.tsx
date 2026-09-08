import { getHuescarWeatherResponse } from '@/services/huescarWeatherService';
import { FuentesPageClient } from '@/components/FuentesPageClient';
import type { Metadata } from 'next';

export const revalidate = 300;
export const metadata: Metadata = { alternates: { canonical: '/huescar/fuentes' } };

export default async function HuescarFuentesPage() {
  const response = await getHuescarWeatherResponse();
  return <FuentesPageClient response={response} />;
}
