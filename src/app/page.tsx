import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Meteo agrícola Huéscar | Avisos para fincas | TecRural",
  description: "Previsión meteorológica y agrícola para Huéscar y el Altiplano de Granada. Consulta lluvia, viento, heladas, riego y cultivos. Recibe avisos personalizados de TecRural.",
  alternates: { canonical: "/" },
};

export default function Home() {
  redirect("/huescar");
}
