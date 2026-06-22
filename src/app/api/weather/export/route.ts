import { fetchOpenMeteoForecast } from "@/services/openMeteoForecastService";
import { getOpenMeteoBias } from "@/services/biasCorrectionService";
import { fetchAgroClimatology } from "@/services/agroClimatologyService";

const LLANO = { lat: 37.8094, lon: -2.5392, elevation: 953 };

export const dynamic = "force-dynamic";
export const revalidate = 0;

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "forecast";
  const days = Math.min(16, Math.max(1, parseInt(url.searchParams.get("days") || "14", 10)));

  const [forecast, bias, agro] = await Promise.all([
    fetchOpenMeteoForecast(LLANO.lat, LLANO.lon, LLANO.elevation, days),
    getOpenMeteoBias(),
    fetchAgroClimatology(LLANO.lat, LLANO.lon, LLANO.elevation),
  ]);

  if (!forecast) {
    return new Response("Forecast unavailable", { status: 503 });
  }

  const biasTemp = bias.temperatureAll.toFixed(2);
  const biasHum = bias.humidityAll.toFixed(2);

  let csv = "";

  if (format === "hourly" || format === "full") {
    csv += "# DATOS HORARIOS - Observatorio Huéscar (Llano)\n";
    csv += `# Lat: ${LLANO.lat}, Lon: ${LLANO.lon}, Elev: ${LLANO.elevation}m\n`;
    csv += `# Bias correccion: Temp ${biasTemp}°C, Humedad ${biasHum}%\n`;
    csv += `# Generado: ${new Date().toISOString()}\n`;
    csv += "fecha_hora,temperatura_C,humedad_%,punto_rocio_C,deficit_presion_vapor_kPa,presion_hPa,radiacion_Wm2,radiacion_directa_Wm2,radiacion_difusa_Wm2,viento_10m_kmh,nubosidad_%,visibilidad_m,uv,cape_Jkg,es_dia,temp_suelo_10cm_C,temp_suelo_40cm_C,humedad_suelo_0_1cm,humedad_suelo_1_3cm,humedad_suelo_3_9cm,humedad_suelo_9_27cm,humedad_suelo_27_81cm\n";

    for (const day of forecast.forecastDays) {
      for (const h of day.hours) {
        const row = [
          h.time,
          h.temperatureC,
          h.humidityPct,
          h.dewPointC,
          h.vapourPressureDeficitKPa,
          h.pressureHPa,
          h.solarRadiationWm2,
          h.directRadiationWm2,
          h.diffuseRadiationWm2,
          h.windSpeed10mKmh,
          h.cloudCoverPct,
          h.visibilityM,
          h.uvIndex,
          h.capeJkg,
          h.isDay === null ? "" : h.isDay ? "1" : "0",
          h.soilTemp10cmC,
          h.soilTemp40cmC,
          h.soilMoisture0To1cm,
          h.soilMoisture1To3cm,
          h.soilMoisture3To9cm,
          h.soilMoisture9To27cm,
          h.soilMoisture27To81cm,
        ];
        csv += row.map(csvEscape).join(",") + "\n";
      }
    }
  }

  if (format === "daily" || format === "forecast" || format === "full") {
    if (csv) csv += "\n";
    csv += "# RESUMEN DIARIO\n";
    csv += "fecha,temp_min_C,temp_max_C,temp_media_C,humedad_media_%,punto_rocio_C,deficit_vapor_kPa,viento_media_kmh,radiacion_total_MJm2,nubosidad_media_%,visibilidad_media_m,uv_max,cape_max_Jkg,temp_suelo_10cm_C,temp_suelo_40cm_C,humedad_suelo_0_1cm,humedad_suelo_9_27cm,et0_mm\n";

    for (const day of forecast.forecastDays) {
      const s = day.dailySummary;
      const row = [
        day.date,
        s.tempMinC,
        s.tempMaxC,
        s.tempMeanC,
        s.humidityMeanPct,
        s.dewPointMeanC,
        s.vapourPressureDeficitMeanKPa,
        s.windMeanKmh,
        s.radiationTotalMJm2,
        s.cloudCoverMeanPct,
        s.visibilityMeanM,
        s.uvIndexMax,
        s.capeMaxJkg,
        s.soilTemp10cmMeanC,
        s.soilTemp40cmMeanC,
        s.soilMoisture0To1cmMean,
        s.soilMoisture9To27cmMean,
        s.et0TotalMm,
      ];
      csv += row.map(csvEscape).join(",") + "\n";
    }
  }

  if ((format === "agro" || format === "full") && agro) {
    if (csv) csv += "\n";
    csv += "# AGRO-CLIMATOLOGIA\n";
    csv += `ultima_helada,${csvEscape(agro.frost.lastFrostDate)}\n`;
    csv += `dias_sin_helada,${csvEscape(agro.frost.daysSinceLastFrost)}\n`;
    csv += `noches_heladas_temporada,${csvEscape(agro.frost.totalFrostNightsThisSeason)}\n`;
    csv += `horas_frio_acumuladas,${csvEscape(agro.chill.chillHoursAccumulated)}\n`;
    csv += `chill_portions,${csvEscape(agro.chill.chillPortionsAccumulated)}\n`;
    csv += `lluvia_mes_mm,${csvEscape(agro.waterBalance.precipitationMmThisMonth)}\n`;
    csv += `lluvia_anual_mm,${csvEscape(agro.waterBalance.precipitationMmThisYear)}\n`;
    csv += `et0_mes_mm,${csvEscape(agro.waterBalance.et0MmThisMonth)}\n`;
    csv += `balance_hidrico_mes_mm,${csvEscape(agro.waterBalance.deficitMmThisMonth)}\n`;
    csv += `balance_hidrico_temporada_mm,${csvEscape(agro.waterBalance.deficitMmThisSeason)}\n`;
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `huescar-meteo-${format}-${dateStr}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
