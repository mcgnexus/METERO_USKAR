import { ContactoFunnel } from '@/components/ContactoFunnel';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Contacto — Meteo Huéscar',
  description: 'Contacta con TecRural para avisos agrícolas personalizados, riego, heladas, sensores y servicios para tu finca.',
};

export default function HuescarContactoPage() {
  return <ContactoFunnel />;
}
