import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Observatorio Meteorológico de Huéscar",
  description: "Datos meteorológicos en tiempo real para Huéscar y su comarca",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
