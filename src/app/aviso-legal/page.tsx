import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aviso legal | Meteo Huéscar · TecRural",
  description: "Datos identificativos y condiciones de uso de Meteo Huéscar, proyecto de TecRural.",
  alternates: { canonical: "/aviso-legal" },
};

export default function AvisoLegalPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 text-slate-800">
      <Link href="/huescar" className="text-sm font-bold text-sky-700 hover:underline">← Volver a Meteo Huéscar</Link>
      <h1 className="mt-6 text-3xl font-black tracking-tight">Aviso legal</h1>
      <p className="mt-2 text-sm text-slate-500">Última actualización: 25 de agosto de 2026</p>

      <section className="mt-8 space-y-4 text-sm leading-7">
        <h2 className="text-xl font-bold">1. Titular del sitio</h2>
        <p>Este sitio web es Meteo Huéscar, proyecto desarrollado por <strong>TecRural</strong> y disponible en <strong>meteo.tecrural.es</strong>.</p>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p><strong>Nombre o denominación:</strong> TecRural · Manuel Carrasco García</p>
          <p><strong>Domicilio:</strong> Barrio Los Reyes 113, 18830 Huéscar (Granada)</p>
          <p><strong>NIF:</strong> 76143911L</p>
          <p><strong>Correo electrónico:</strong> <a className="font-semibold text-sky-700 underline" href="mailto:mcgtecrural@gmail.com">mcgtecrural@gmail.com</a></p>
        </div>
        <p>Los datos identificativos adicionales que resulten exigibles por la actividad desarrollada se incorporarán y mantendrán actualizados conforme a la normativa aplicable.</p>
        <p>Esta información se facilita de acuerdo con el artículo 10 de la <a className="font-semibold text-sky-700 underline" href="https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758" target="_blank" rel="noreferrer">Ley 34/2002, de Servicios de la Sociedad de la Información y del Comercio Electrónico (LSSI-CE)</a>.</p>

        <h2 className="pt-4 text-xl font-bold">2. Objeto y condiciones de uso</h2>
        <p>Meteo Huéscar ofrece información meteorológica, agrícola y de alertas con finalidad meramente informativa. Los datos pueden contener errores, retrasos o interrupciones y no sustituyen las fuentes oficiales ni las indicaciones de los servicios de emergencia.</p>
        <p>La persona usuaria se compromete a utilizar el sitio de forma lícita y a no interferir en su funcionamiento.</p>

        <h2 className="pt-4 text-xl font-bold">3. Propiedad intelectual</h2>
        <p>Los contenidos, diseño, código y elementos distintivos del sitio están protegidos por la normativa aplicable. La reutilización o reproducción no autorizada queda prohibida, salvo los usos permitidos por la ley.</p>

        <h2 className="pt-4 text-xl font-bold">4. Responsabilidad</h2>
        <p>El titular no garantiza la disponibilidad permanente ni se responsabiliza de los daños derivados del uso de predicciones o recomendaciones meteorológicas. Las decisiones relacionadas con seguridad, salud, transporte o actividades agrícolas deben basarse en fuentes oficiales actualizadas.</p>

        <h2 className="pt-4 text-xl font-bold">5. Contacto</h2>
        <p>Para consultas sobre este sitio: <strong>mcgtecrural@gmail.com</strong>.</p>
      </section>
    </main>
  );
}
