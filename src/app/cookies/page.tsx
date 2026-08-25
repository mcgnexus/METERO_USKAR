import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de cookies | Meteo Huéscar",
  description: "Información sobre cookies y tecnologías similares en Meteo Huéscar.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 text-slate-800">
      <Link href="/huescar" className="text-sm font-bold text-sky-700 hover:underline">← Volver a Meteo Huéscar</Link>
      <h1 className="mt-6 text-3xl font-black tracking-tight">Política de cookies</h1>
      <p className="mt-2 text-sm text-slate-500">Última actualización: 25 de agosto de 2026</p>

      <section className="mt-8 space-y-4 text-sm leading-7">
        <h2 className="text-xl font-bold">1. Qué son</h2>
        <p>Las cookies son pequeños archivos que un sitio guarda en el navegador. También se consideran tecnologías similares algunos identificadores técnicos almacenados por el navegador.</p>

        <h2 className="pt-4 text-xl font-bold">2. Tecnologías utilizadas</h2>
        <p><strong>Cookie técnica de administración:</strong> se utiliza únicamente en la zona privada para mantener la sesión de una persona autorizada. Es necesaria para prestar esa función y no se usa para seguimiento publicitario.</p>
        <p><strong>Notificaciones push:</strong> al activar las alertas, el navegador y el sistema operativo gestionan una suscripción técnica. No es una cookie; se guarda en el servidor para poder enviar las notificaciones que has solicitado y puede revocarse desde los ajustes del navegador.</p>
        <p><strong>Vercel Analytics:</strong> se utiliza para obtener métricas agregadas de uso y mejorar el servicio. Según la configuración del proveedor, no requiere cookies de seguimiento. Si esta configuración cambia, esta política se actualizará y se solicitará el consentimiento que corresponda.</p>

        <h2 className="pt-4 text-xl font-bold">3. Gestión y desactivación</h2>
        <p>Puedes bloquear o eliminar cookies desde la configuración de tu navegador. El bloqueo de la cookie de administración impedirá acceder a la consola privada, pero no afecta a la consulta pública del tiempo.</p>

        <h2 className="pt-4 text-xl font-bold">4. Contacto</h2>
        <p>Si tienes dudas sobre estas tecnologías, contacta con <strong>mcgtecrural@gmail.com</strong>. Para más información sobre tus datos, consulta la <Link href="/privacidad" className="font-semibold text-sky-700 hover:underline">política de privacidad</Link>.</p>
      </section>
    </main>
  );
}
