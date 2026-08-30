import { ContactoFunnel } from '@/components/ContactoFunnel';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contacto — Meteo Huéscar',
  description: 'Contacta con TecRural para avisos agrícolas personalizados, riego, heladas, sensores y servicios para tu finca.',
  alternates: { canonical: '/huescar/contacto' },
};

export default function HuescarContactoPage() {
  return <ContactoFunnel />;
}
