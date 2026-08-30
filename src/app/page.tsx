import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  redirect("/huescar");
}
