import { fetchAEMETObservations } from "@/services/aemetClient";
import { fetchComarcaWeather } from "@/services/comarcaService";
import { fetchObservationLayer } from "@/services/layerObservation";
import type { ComarcaEstimation, SourceObservation } from "@/types/weather";

export async function fetchComarcaLayer(
  aemetTemp: number | null,
  aemetHumidity: number | null,
  aemetTime: Date | null
): Promise<ComarcaEstimation[] | null> {
  try {
    let aemetObs: SourceObservation | null = null;
    if (aemetTemp !== null && aemetTime !== null) {
      aemetObs = {
        source: "AEMET",
        locationName: "Huéscar-Embalse de San Clemente",
        time: aemetTime.toISOString(),
        observationPeriod: "current",
        dataAgeMinutes: (Date.now() - aemetTime.getTime()) / 60000,
        qualityScore: 1.0,
        status: "OK",
        temperatureC: aemetTemp,
        humidityPct: aemetHumidity ?? 50,
        precipitationMm: 0,
        windSpeedKmh: 0,
        windGustKmh: 0,
      } as SourceObservation;
    } else {
      const observationLayer = await fetchObservationLayer().catch(() => null);
      const correctedAemet = observationLayer?.sources.find((source) => source.source === "AEMET") ?? null;
      if (correctedAemet) {
        aemetObs = correctedAemet;
      } else {
        const aemetResult = await fetchAEMETObservations().catch(() => ({ observations: [] }));
        if (aemetResult.observations.length > 0) {
          aemetObs = aemetResult.observations[0];
        }
      }
    }

    return await fetchComarcaWeather(aemetObs);
  } catch {
    return null;
  }
}
