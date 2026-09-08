import { getHuescarWeatherResponse } from '@/services/huescarWeatherService';
import { HoyPageClient } from '@/components/HoyPageClient';
import type { Metadata } from 'next';

export const revalidate = 300;
export const metadata: Metadata = {
  title: 'Meteo agrícola Huéscar | Avisos para fincas | TecRural',
  description: 'Previsión meteorológica y agrícola para Huéscar y el Altiplano de Granada. Consulta lluvia, viento, heladas, riego y cultivos. Recibe avisos personalizados de TecRural.',
  alternates: { canonical: '/huescar' },
  openGraph: {
    title: 'Meteo agrícola Huéscar | Avisos para fincas | TecRural',
    description: 'Previsión meteorológica y agrícola para Huéscar y el Altiplano de Granada. Consulta lluvia, viento, heladas, riego y cultivos. Recibe avisos personalizados de TecRural.',
    url: '/huescar',
  },
};

export default async function HuescarHoyPage() {
  const response = await getHuescarWeatherResponse();

  return <HoyPageClient response={response} />;
}
