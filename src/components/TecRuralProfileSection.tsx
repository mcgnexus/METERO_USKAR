import Link from 'next/link';

const WHATSAPP_URL =
  'https://wa.me/34614242716?text=' +
  encodeURIComponent('Hola, quiero conocer las soluciones de TecRural para mi finca.');

export function TecRuralProfileSection() {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">Sobre TecRural</p>
      <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
        Meteo Huéscar está desarrollado por TecRural
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Tecnología, sensores y análisis de datos para ayudarte a tomar mejores decisiones sobre riego,
        heladas, cultivos y automatización.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-bold text-slate-900">Manuel Carrasco García</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Licenciado en Bioquímica, Técnico Superior en Análisis Químico y docente STEM con más de 20 años
            de experiencia en Matemáticas, Física, Química, Ciencias y Tecnología.
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-bold text-slate-900">Del prototipo al campo</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Desarrollo de estaciones meteorológicas, sensores ambientales y agrícolas, riego automático y
            dispositivos IoT con Arduino, ESP32, Wi-Fi, Bluetooth y LoRa.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" aria-label="Enlaces de TecRural">
        <a
          href="https://tecrural.es"
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-sky-700 px-4 py-2 text-xs font-bold text-white hover:bg-sky-800"
        >
          Web de TecRural
        </a>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
        >
          Hablar con TecRural
        </a>
        <Link
          href="/huescar/campo"
          prefetch={false}
          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          Servicios para agricultores
        </Link>
      </div>
    </section>
  );
}
