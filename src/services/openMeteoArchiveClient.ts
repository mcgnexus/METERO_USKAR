export interface ArchiveDay {
  date: string;
  temperatureMean: number;
  temperatureMax: number;
  temperatureMin: number;
  humidityMean: number;
  precipitationSum: number;
  windSpeedMean: number;
}

export async function fetchArchiveData(
  lat: number,
  lon: number,
  daysBack: number = 45
): Promise<ArchiveDay[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const url =
    `https://archive-api.open-meteo.com/v1/archive?` +
    `latitude=${lat}&longitude=${lon}` +
    `&start_date=${fmt(startDate)}&end_date=${fmt(endDate)}` +
    `&daily=temperature_2m_mean,temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,precipitation_sum,wind_speed_10m_mean` +
    `&timezone=Europe/Madrid`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo Archive API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.daily) return [];

  const days: ArchiveDay[] = [];
  for (let i = 0; i < data.daily.time.length; i++) {
    days.push({
      date: data.daily.time[i],
      temperatureMean: data.daily.temperature_2m_mean?.[i] ?? 0,
      temperatureMax: data.daily.temperature_2m_max?.[i] ?? 0,
      temperatureMin: data.daily.temperature_2m_min?.[i] ?? 0,
      humidityMean: data.daily.relative_humidity_2m_mean?.[i] ?? 0,
      precipitationSum: data.daily.precipitation_sum?.[i] ?? 0,
      windSpeedMean: data.daily.wind_speed_10m_mean?.[i] ?? 0,
    });
  }

  return days;
}
