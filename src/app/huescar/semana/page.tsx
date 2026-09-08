import { SemanaPageClient } from '@/components/SemanaPageClient';
import { getHuescarWeatherResponse } from '@/services/huescarWeatherService';
import type { Metadata } from 'next';

export const revalidate = 300;
export const metadata: Metadata = { alternates: { canonical: '/huescar/semana' } };

export default async function HuescarSemanaPage() {
  const response = await getHuescarWeatherResponse();

  return <SemanaPageClient response={response} />;
}
