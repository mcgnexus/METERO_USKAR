import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de privacidad | Meteo Huéscar · TecRural",
  description: "Información sobre el tratamiento de datos personales y solicitudes de avisos agrícolas en Meteo Huéscar.",
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
        <p>Si solicitas avisos para una finca, trataremos el teléfono o WhatsApp, municipio, cultivo, intereses agrícolas y, si los facilitas, tu nombre y tramo de superficie. Estos datos se utilizan para atender tu solicitud, contactarte y definir avisos meteorológicos útiles para tu finca.</p>
        <p>Los avisos meteorológicos son comunicaciones solicitadas para informar sobre condiciones del tiempo y riesgos agrícolas, como heladas, lluvia, viento, calor o necesidades de riego. La publicidad o información comercial sobre servicios, sensores, diagnóstico agrícola o Terracía tiene una finalidad distinta y solo se enviará si marcas de forma separada la casilla comercial. No marcar esa casilla no impide recibir respuesta ni avisos solicitados.</p>
        <p>Las suscripciones push se utilizan exclusivamente para enviar avisos meteorológicos y resúmenes del tiempo. Puedes retirarlas desde la configuración de notificaciones del navegador o solicitando su eliminación.</p>
        <p>La zona de administración utiliza una cookie técnica de sesión para autenticar al personal autorizado. No se utiliza para publicidad.</p>

        <h2 className="pt-4 text-xl font-bold">3. Base jurídica y conservación</h2>
        <p>La base jurídica para atender la solicitud y enviar avisos meteorológicos es tu consentimiento expreso. La base jurídica de las comunicaciones comerciales es un consentimiento específico, separado y opcional. Ambos consentimientos son revocables en cualquier momento y la retirada no afecta a la licitud del tratamiento realizado anteriormente.</p>
        <p>En cada solicitud se registra la fecha del consentimiento y un identificador técnico protegido de la conexión, junto con las opciones aceptadas, para poder demostrar cuándo y cómo se obtuvo el consentimiento. Los datos de los formularios agrícolas se conservarán durante un máximo de 12 meses desde el último contacto, salvo obligación legal o relación activa que justifique otro plazo; se suprimirán o anonimizarán al finalizarlo. Los datos de suscripción push se conservan mientras permanezca activa y se eliminan cuando se solicita la baja o el navegador la invalida.</p>

        <h2 className="pt-4 text-xl font-bold">4. Proveedores y acceso</h2>
        <p>El servicio utiliza Vercel para alojamiento, ejecución y analítica agregada, y Neon/PostgreSQL para almacenar las solicitudes de avisos agrícolas, suscripciones push y eventos de uso. Los datos meteorológicos proceden de proveedores externos, pero no se les envían los datos identificativos del formulario.</p>
        <p>El acceso a los leads está limitado al titular de TecRural y a las personas autorizadas que necesiten gestionar las solicitudes. No se venden ni se ceden los datos para publicidad de terceros, salvo obligación legal o cuando sea necesario para prestar el servicio bajo las garantías contractuales correspondientes.</p>
        <p>Vercel Analytics se utiliza para métricas agregadas del sitio. Consulta la <Link href="/cookies" className="font-semibold text-sky-700 hover:underline">política de cookies</Link> para más información.</p>

        <h2 className="pt-4 text-xl font-bold">5. Bajas, derechos y reclamaciones</h2>
        <p>Para dejar de recibir avisos o publicidad, escribe a <strong>mcgtecrural@gmail.com</strong> indicando “BAJA” y el número de teléfono asociado, o solicita la baja por el mismo canal de contacto utilizado. También puedes retirar por separado el consentimiento meteorológico y el comercial.</p>
        <p>Puedes solicitar acceso, rectificación, supresión, oposición, limitación o portabilidad, así como retirar tu consentimiento, escribiendo a <strong>mcgtecrural@gmail.com</strong>. También puedes reclamar ante la Agencia Española de Protección de Datos.</p>
      </section>
    </main>
  );
}
