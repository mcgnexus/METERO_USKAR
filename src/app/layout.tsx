import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  metadataBase: new URL("https://meteo.tecrural.es"),
  title: "Meteo agrícola Huéscar | Avisos para fincas | TecRural",
  description: "Previsión meteorológica y agrícola para Huéscar y el Altiplano de Granada. Consulta lluvia, viento, heladas, riego y cultivos. Recibe avisos personalizados de TecRural.",
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
    title: "Meteo agrícola Huéscar | Avisos para fincas | TecRural",
    description: "Previsión meteorológica y agrícola para Huéscar y el Altiplano de Granada. Consulta lluvia, viento, heladas, riego y cultivos. Recibe avisos personalizados de TecRural.",
    siteName: "Meteo Huéscar · TecRural",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Meteo Huéscar",
      },
    ],
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
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
