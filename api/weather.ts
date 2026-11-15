import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { latitude, longitude } = req.query;
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!latitude || !longitude || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    res.status(400).json({ error: 'Latitude and Longitude are required.' });
    return;
  }
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m,soil_temperature_6cm,soil_moisture_3_9cm,evapotranspiration&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration&timezone=Africa/Kampala`;
  const response = await fetch(url);
  if (!response.ok) {
    res.status(502).json({ error: 'Weather provider is temporarily unavailable.' });
    return;
  }
  const data = await response.json();
  if (!data.current || !data.daily) {
    res.status(502).json({ error: 'Weather provider returned incomplete data.' });
    return;
  }
  const current = data.current;
  const daily = data.daily;
  res.json({
    elevation: data.elevation,
    timezone: data.timezone,
    current: {
      temperature: current.temperature_2m,
      apparentTemperature: current.apparent_temperature,
      rainfall: current.precipitation || current.rain || 0,
      relativeHumidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      weatherCode: current.weather_code,
      soilTemperature: current.soil_temperature_6cm || 25,
      soilMoisture: current.soil_moisture_3_9cm || 0.25,
      evapotranspiration: current.evapotranspiration || 0,
      time: current.time,
    },
    daily: daily.time.map((dateString: string, index: number) => ({
      date: dateString,
      maxTemp: daily.temperature_2m_max[index],
      minTemp: daily.temperature_2m_min[index],
      precipitation: daily.precipitation_sum[index] || 0,
      precipitationProbability: daily.precipitation_probability_max[index] || 0,
      windSpeedMax: daily.wind_speed_10m_max[index] || 0,
      weatherCode: daily.weather_code[index],
      soilTempAvg: (daily.temperature_2m_max[index] + daily.temperature_2m_min[index]) / 2 - 2,
      evapotranspiration: daily.et0_fao_evapotranspiration[index] || 0,
    })),
  });
}
