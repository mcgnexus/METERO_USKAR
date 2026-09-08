import { HorasPageClient } from '@/components/HorasPageClient';
import { getHuescarWeatherResponse } from '@/services/huescarWeatherService';
import type { Metadata } from 'next';

export const revalidate = 300;
export const metadata: Metadata = { alternates: { canonical: '/huescar/horas' } };

export default async function HuescarHorasPage() {
  const response = await getHuescarWeatherResponse();

  return <HorasPageClient response={response} />;
}
