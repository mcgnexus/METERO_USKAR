import { CampoPageClient } from '@/components/CampoPageClient';
import { getHuescarWeatherResponse } from '@/services/huescarWeatherService';
import type { Metadata } from 'next';

export const revalidate = 300;
export const metadata: Metadata = { alternates: { canonical: '/huescar/campo' } };

export default async function HuescarCampoPage() {
  const response = await getHuescarWeatherResponse();

  return <CampoPageClient response={response} />;
}
