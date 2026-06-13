import { saveValidationDaily, getPoolInstance } from "@/lib/weatherStore";

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
  const n = group.errors.length;
  if (n === 0) return { mae: 0, rmse: 0, bias: 0, count: 0 };
  const bias = group.errors.reduce((s, e) => s + e, 0) / n;
  const mae = group.absErrors.reduce((s, e) => s + e, 0) / n;
  const rmse = Math.sqrt(group.sqErrors.reduce((s, e) => s + e, 0) / n);
  return { mae, rmse, bias, count: n };
}

export interface BacktestResult {
  date: string;
  rowsSaved: number;
}

export async function runDailyBacktest(targetDate?: Date): Promise<BacktestResult> {
  const date = targetDate ?? new Date(Date.now() - 86400000);
  const dateStr = date.toISOString().split("T")[0];

  const pool = getPoolInstance();
  let rows: any[] = [];

  try {
    const result = await pool.query(
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

  const measurements: RawMeasurement[] = rows.map((r: any) => ({
    source: r.source,
    variable: r.variable,
    error: Number(r.error),
    absolute_error: Number(r.absolute_error),
    squared_error: Number(r.squared_error),
    hour: Number(r.hour),
    month: Number(r.month),
  }));

  const breakdowns = [
    { hourBand: "all", season: "all" },
  ];

  const sources = [...new Set(measurements.map((m) => m.source))];
  const variables = [...new Set(measurements.map((m) => m.variable))];
  let rowsSaved = 0;

  for (const source of sources) {
    for (const variable of variables) {
      const subset = measurements.filter(
        (m) => m.source === source && m.variable === variable
      );
      if (subset.length === 0) continue;

      for (const br of breakdowns) {
        const filtered = br.hourBand === "all"
          ? subset
          : subset.filter((m) => getHourBand(m.hour) === br.hourBand);

        if (filtered.length === 0) continue;

        const group: MetricGroup = {
          errors: filtered.map((m) => m.error),
          absErrors: filtered.map((m) => m.absolute_error),
          sqErrors: filtered.map((m) => m.squared_error),
        };

        const metrics = computeMetrics(group);

        const hourBand = br.hourBand;
        const seasons = br.season === "all"
          ? [...new Set(filtered.map((m) => getSeason(m.month)))]
          : [br.season];

        for (const season of seasons) {
          const seasonFiltered = season === "all"
            ? filtered
            : filtered.filter((m) => getSeason(m.month) === season);

          if (seasonFiltered.length === 0) continue;

          const seasonGroup: MetricGroup = {
            errors: seasonFiltered.map((m) => m.error),
            absErrors: seasonFiltered.map((m) => m.absolute_error),
            sqErrors: seasonFiltered.map((m) => m.squared_error),
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

      for (const hb of ["madrugada", "manana", "mediodia", "tarde", "noche"]) {
        const hbFiltered = subset.filter((m) => getHourBand(m.hour) === hb);
        if (hbFiltered.length < 2) continue;

        const hbGroup: MetricGroup = {
          errors: hbFiltered.map((m) => m.error),
          absErrors: hbFiltered.map((m) => m.absolute_error),
          sqErrors: hbFiltered.map((m) => m.squared_error),
        };

        const hbMetrics = computeMetrics(hbGroup);

        await saveValidationDaily({
          validationDate: dateStr,
          source,
          variable,
          hourBand: hb,
          season: "all",
          mae: Math.round(hbMetrics.mae * 1000) / 1000,
          rmse: Math.round(hbMetrics.rmse * 1000) / 1000,
          bias: Math.round(hbMetrics.bias * 1000) / 1000,
          sampleCount: hbMetrics.count,
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
