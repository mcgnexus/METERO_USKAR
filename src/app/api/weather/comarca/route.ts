import { NextResponse } from "next/server";
import { getComarcaEstimations, saveComarcaEstimations } from "@/lib/weatherStore";
import { fetchComarcaLayer } from "@/services/layerComarca";

const STALE_MS = 60 * 60 * 1000;

export async function GET(): Promise<NextResponse> {
  const dbEntry = await getComarcaEstimations();
  if (dbEntry) {
    const age = Date.now() - new Date(dbEntry.reference_date).getTime();
    if (age < STALE_MS) {
      return NextResponse.json(dbEntry.payload);
    }
  }

  const freshData = await fetchComarcaLayer(null, null, null);
  const today = new Date().toISOString().split("T")[0];
  await saveComarcaEstimations(today, { data: freshData });
  return NextResponse.json({ data: freshData });
}
