import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de privacidad | Meteo Huéscar",
  description: "Política de privacidad y protección de datos de Meteo Huéscar.",
  alternates: { canonical: "/privacidad" },
};

export default function PrivacidadPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 text-slate-800">
      <Link href="/huescar" className="text-sm font-bold text-sky-700 hover:underline">← Volver a Meteo Huéscar</Link>
      <h1 className="mt-6 text-3xl font-black tracking-tight">Política de privacidad</h1>
      <p className="mt-2 text-sm text-slate-500">Última actualización: 25 de agosto de 2026</p>

      <section className="mt-8 space-y-4 text-sm leading-7">
        <h2 className="text-xl font-bold">1. Responsable</h2>
        <p>El responsable del tratamiento es <strong>Manuel Carrasco García</strong>. Contacto: <strong>mcgtecrural@gmail.com</strong>.</p>

        <h2 className="pt-4 text-xl font-bold">2. Datos tratados y finalidades</h2>
        <p>El sitio puede tratar datos técnicos de navegación necesarios para prestar el servicio y mantener su seguridad. Si activas las notificaciones, se guarda la suscripción push, que incluye el endpoint del navegador y las claves técnicas necesarias para enviar avisos. No se solicita nombre, teléfono ni ubicación precisa para activar este servicio.</p>
        <p>Si solicitas avisos para una finca, trataremos tu nombre, teléfono o WhatsApp, municipio, cultivo, tramo de superficie e intereses agrícolas para responder a la solicitud y ofrecerte avisos meteorológicos adaptados. La información comercial solo se enviará si marcas expresamente su casilla.</p>
        <p>Las suscripciones push se utilizan exclusivamente para enviar avisos meteorológicos y resúmenes del tiempo. Puedes retirarlas desde la configuración de notificaciones del navegador o solicitando su eliminación.</p>
        <p>La zona de administración utiliza una cookie técnica de sesión para autenticar al personal autorizado. No se utiliza para publicidad.</p>

        <h2 className="pt-4 text-xl font-bold">3. Base jurídica y conservación</h2>
        <p>La base jurídica para las notificaciones y la atención de solicitudes agrícolas es tu consentimiento, que puedes retirar en cualquier momento. Los datos de los formularios agrícolas se conservarán durante un máximo de 12 meses desde el último contacto, salvo que exista una obligación legal o una relación activa que justifique otro plazo. Los datos de suscripción push se conservan mientras permanezca activa y se eliminan cuando se solicita la baja o el navegador la invalida.</p>

        <h2 className="pt-4 text-xl font-bold">4. Proveedores</h2>
        <p>El servicio puede utilizar Vercel para alojamiento y analítica, Neon/PostgreSQL para almacenar suscripciones y proveedores de datos meteorológicos. Estos proveedores actúan conforme a sus propias condiciones y garantías de protección de datos.</p>
        <p>Vercel Analytics se utiliza para métricas agregadas del sitio. Consulta la <Link href="/cookies" className="font-semibold text-sky-700 hover:underline">política de cookies</Link> para más información.</p>

        <h2 className="pt-4 text-xl font-bold">5. Derechos</h2>
        <p>Puedes solicitar acceso, rectificación, supresión, oposición, limitación o portabilidad, así como retirar tu consentimiento, escribiendo a <strong>mcgtecrural@gmail.com</strong>. También puedes reclamar ante la Agencia Española de Protección de Datos.</p>
      </section>
    </main>
  );
}
