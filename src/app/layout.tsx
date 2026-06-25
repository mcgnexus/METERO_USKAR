import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: "Meteo Huéscar | Tiempo local, alertas y previsión agrícola",
  description: "Consulta el tiempo local en Huéscar, alertas meteorológicas, previsión por horas, riesgo de heladas, recomendaciones de riego y datos agrícolas adaptados al microclima del Altiplano.",
  keywords: [
    "tiempo Huéscar", "meteorología Huéscar", "alertas Huéscar",
    "tiempo agrícola Huéscar", "riesgo heladas Huéscar", "riego olivo Huéscar",
    "previsión comarca Huéscar", "microclimas Huéscar",
    "Puebla de Don Fadrique", "Castril", "Galera", "Orce"
  ].join(", "),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Meteo Huéscar",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: [
      { url: "/icons/apple-icon-180.png", sizes: "180x180" },
      { url: "/icons/apple-icon-152.png", sizes: "152x152" },
    ],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  openGraph: {
    title: "Meteo Huéscar | Tiempo local y agrícola",
    description: "Previsión meteorológica local para Huéscar y comarca: tiempo actual, radar, avisos y datos agrícolas adaptados al microclima.",
    locale: "es_ES",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#1c426c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        <PwaRegister />
      </body>
    </html>
  );
}
