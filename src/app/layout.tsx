import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "Meteo Huéscar — Tiempo local",
  description: "Previsión meteorológica local para Huéscar y comarca: tiempo actual, radar, avisos y datos agrícolas.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Meteo Huéscar",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#1c426c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
        <PwaRegister />
      </body>
    </html>
  );
}
