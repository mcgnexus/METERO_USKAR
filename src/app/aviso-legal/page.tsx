import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aviso legal | Meteo Huéscar",
  description: "Información legal de Meteo Huéscar.",
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
        <p>Este sitio web es Meteo Huéscar, disponible en <strong>meteo.tecrural.es</strong>.</p>
        <p>Titular: <strong>Manuel Carrasco García</strong>. El domicilio y NIF se facilitarán cuando sean legalmente necesarios. Contacto: <strong>mcgtecrural@gmail.com</strong>.</p>

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
