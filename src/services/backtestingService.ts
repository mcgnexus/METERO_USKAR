import { saveValidationDaily, getPoolInstance } from "@/lib/weatherStore";

interface RawMeasurementRow {
  source: string;
  variable: string;
  error: number | string;
  absolute_error: number | string;
  squared_error: number | string;
  hour: number | string;
  month: number | string;
}

interface RawMeasurement {
  source: string;
  variable: string;
  error: number;
  absolute_error: number;
  squared_error: number;
  hour: number;
  month: number;
}

function getHourBand(hour: number): string {
  if (hour < 7) return "madrugada";
  if (hour < 12) return "manana";
  if (hour < 18) return "mediodia";
  if (hour < 21) return "tarde";
  return "noche";
}

function getDayNightBand(hour: number): string {
  return (hour < 8 || hour >= 20) ? "noche" : "dia";
}

function getSeason(month: number): string {
  if (month >= 3 && month <= 5) return "primavera";
  if (month >= 6 && month <= 8) return "verano";
  if (month >= 9 && month <= 11) return "otono";
  return "invierno";
}

interface MetricGroup {
  errors: number[];
  absErrors: number[];
  sqErrors: number[];
}

function computeMetrics(group: MetricGroup): { mae: number; rmse: number; bias: number; count: number } {
  const count = group.errors.length;
  if (count === 0) return { mae: 0, rmse: 0, bias: 0, count: 0 };

  const bias = group.errors.reduce((sum, error) => sum + error, 0) / count;
  const mae = group.absErrors.reduce((sum, error) => sum + error, 0) / count;
  const rmse = Math.sqrt(group.sqErrors.reduce((sum, error) => sum + error, 0) / count);
  return { mae, rmse, bias, count };
}

export interface BacktestResult {
  date: string;
  rowsSaved: number;
}

export async function runDailyBacktest(targetDate?: Date): Promise<BacktestResult> {
  const date = targetDate ?? new Date(Date.now() - 86400000);
  const dateStr = date.toISOString().split("T")[0];

  const pool = getPoolInstance();
  let rows: RawMeasurementRow[] = [];

  try {
    const result = await pool.query<RawMeasurementRow>(
      `SELECT source, variable, error, absolute_error, squared_error,
              EXTRACT(HOUR FROM snapshot_id) AS hour,
              EXTRACT(MONTH FROM snapshot_id) AS month
       FROM source_measurements
       WHERE snapshot_id::date = $1::date`,
      [dateStr]
    );
    rows = result.rows ?? [];
  } catch {
    return { date: dateStr, rowsSaved: 0 };
  }

  if (rows.length === 0) {
    return { date: dateStr, rowsSaved: 0 };
  }

  const measurements: RawMeasurement[] = rows.map((row) => ({
    source: row.source,
    variable: row.variable,
    error: Number(row.error),
    absolute_error: Number(row.absolute_error),
    squared_error: Number(row.squared_error),
    hour: Number(row.hour),
    month: Number(row.month),
  }));

  const breakdowns = [{ hourBand: "all", season: "all" }] as const;
  const sources = [...new Set(measurements.map((measurement) => measurement.source))];
  const variables = [...new Set(measurements.map((measurement) => measurement.variable))];
  let rowsSaved = 0;

  for (const source of sources) {
    for (const variable of variables) {
      const subset = measurements.filter((measurement) => measurement.source === source && measurement.variable === variable);
      if (subset.length === 0) continue;

      for (const breakdown of breakdowns) {
        const filtered = breakdown.hourBand === "all"
          ? subset
          : subset.filter((measurement) => getHourBand(measurement.hour) === breakdown.hourBand);

        if (filtered.length === 0) continue;

        const hourBand = breakdown.hourBand;
        const seasons = breakdown.season === "all"
          ? [...new Set(filtered.map((measurement) => getSeason(measurement.month)))]
          : [breakdown.season];

        for (const season of seasons) {
          const seasonFiltered = season === "all"
            ? filtered
            : filtered.filter((measurement) => getSeason(measurement.month) === season);

          if (seasonFiltered.length === 0) continue;

          const seasonGroup: MetricGroup = {
            errors: seasonFiltered.map((measurement) => measurement.error),
            absErrors: seasonFiltered.map((measurement) => measurement.absolute_error),
            sqErrors: seasonFiltered.map((measurement) => measurement.squared_error),
          };

          const seasonMetrics = computeMetrics(seasonGroup);

          await saveValidationDaily({
            validationDate: dateStr,
            source,
            variable,
            hourBand,
            season,
            mae: Math.round(seasonMetrics.mae * 1000) / 1000,
            rmse: Math.round(seasonMetrics.rmse * 1000) / 1000,
            bias: Math.round(seasonMetrics.bias * 1000) / 1000,
            sampleCount: seasonMetrics.count,
          });
          rowsSaved++;
        }
      }

      for (const hourBand of ["madrugada", "manana", "mediodia", "tarde", "noche"] as const) {
        const hourBandFiltered = subset.filter((measurement) => getHourBand(measurement.hour) === hourBand);
        if (hourBandFiltered.length < 2) continue;

        const hourBandGroup: MetricGroup = {
          errors: hourBandFiltered.map((measurement) => measurement.error),
          absErrors: hourBandFiltered.map((measurement) => measurement.absolute_error),
          sqErrors: hourBandFiltered.map((measurement) => measurement.squared_error),
        };

        const hourBandMetrics = computeMetrics(hourBandGroup);

        await saveValidationDaily({
          validationDate: dateStr,
          source,
          variable,
          hourBand,
          season: "all",
          mae: Math.round(hourBandMetrics.mae * 1000) / 1000,
          rmse: Math.round(hourBandMetrics.rmse * 1000) / 1000,
          bias: Math.round(hourBandMetrics.bias * 1000) / 1000,
          sampleCount: hourBandMetrics.count,
        });
        rowsSaved++;
      }

      for (const dayNight of ["dia", "noche"] as const) {
        const dnFiltered = subset.filter((measurement) => getDayNightBand(measurement.hour) === dayNight);
        if (dnFiltered.length < 2) continue;

        const dnGroup: MetricGroup = {
          errors: dnFiltered.map((measurement) => measurement.error),
          absErrors: dnFiltered.map((measurement) => measurement.absolute_error),
          sqErrors: dnFiltered.map((measurement) => measurement.squared_error),
        };

        const dnMetrics = computeMetrics(dnGroup);

        await saveValidationDaily({
          validationDate: dateStr,
          source,
          variable,
          hourBand: dayNight,
          season: "all",
          mae: Math.round(dnMetrics.mae * 1000) / 1000,
          rmse: Math.round(dnMetrics.rmse * 1000) / 1000,
          bias: Math.round(dnMetrics.bias * 1000) / 1000,
          sampleCount: dnMetrics.count,
        });
        rowsSaved++;
      }
    }
  }

  return { date: dateStr, rowsSaved };
}

export async function runBacktestRange(daysBack: number = 7): Promise<{ processed: number; totalRows: number }> {
  let totalRows = 0;
  let processed = 0;

  for (let i = 1; i <= daysBack; i++) {
    const date = new Date(Date.now() - i * 86400000);
    const result = await runDailyBacktest(date);
    if (result.rowsSaved > 0) {
      processed++;
      totalRows += result.rowsSaved;
    }
  }

  return { processed, totalRows };
}
