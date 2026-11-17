import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

async function requireFarmer(req: VercelRequest): Promise<boolean> {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!token || !supabaseUrl || !supabaseKey) return false;

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  return !error && Boolean(data.user);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!(await requireFarmer(req))) {
      return res.status(401).json({ error: 'Please sign in to view your farm weather.' });
    }

    const { latitude, longitude } = req.query;
    if (typeof latitude !== 'string' || typeof longitude !== 'string' ||
      !latitude.trim() || !longitude.trim()) {
      return res.status(400).json({ error: 'Latitude and longitude are required.' });
    }

    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) ||
      lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ error: 'Please provide valid farm coordinates.' });
    }

    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m,soil_temperature_6cm,soil_moisture_3_9cm,evapotranspiration',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration',
      timezone: 'Africa/Kampala',
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    let response: Response;
    try {
      response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      console.error('Open-Meteo request failed:', response.status);
      return res.status(502).json({ error: 'Weather provider is temporarily unavailable. Please try again.' });
    }

    const data = await response.json();
    const current = data?.current;
    const daily = data?.daily;
    if (!current || !daily || !Array.isArray(daily.time) ||
      !Array.isArray(daily.temperature_2m_max) ||
      !Array.isArray(daily.temperature_2m_min) ||
      !Array.isArray(daily.weather_code) ||
      !Number.isFinite(current.temperature_2m) ||
      !Number.isFinite(current.weather_code) ||
      typeof current.time !== 'string' ||
      daily.time.length === 0 ||
      daily.time.length !== daily.temperature_2m_max.length ||
      daily.time.length !== daily.temperature_2m_min.length ||
      daily.time.length !== daily.weather_code.length) {
      console.error('Open-Meteo returned an incomplete or invalid forecast.');
      return res.status(502).json({ error: 'Weather provider returned incomplete data. Please try again.' });
    }

    return res.status(200).json({
      elevation: data.elevation,
      timezone: data.timezone,
      current: {
        temperature: current.temperature_2m,
        apparentTemperature: current.apparent_temperature,
        rainfall: current.precipitation ?? current.rain,
        relativeHumidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        windDirection: current.wind_direction_10m,
        weatherCode: current.weather_code,
        soilTemperature: current.soil_temperature_6cm,
        soilMoisture: current.soil_moisture_3_9cm,
        evapotranspiration: current.evapotranspiration,
        time: current.time,
      },
      daily: daily.time.map((dateString: string, index: number) => ({
        date: dateString,
        maxTemp: daily.temperature_2m_max[index],
        minTemp: daily.temperature_2m_min[index],
        precipitation: daily.precipitation_sum?.[index] ?? null,
        precipitationProbability: daily.precipitation_probability_max?.[index] ?? null,
        windSpeedMax: daily.wind_speed_10m_max?.[index] ?? null,
        weatherCode: daily.weather_code[index],
        evapotranspiration: daily.et0_fao_evapotranspiration?.[index] ?? null,
      })),
    });
  } catch (error) {
    console.error('Weather API error:', error instanceof Error ? error.message : 'Unknown error');
    return res.status(502).json({
      error: error instanceof Error && error.name === 'AbortError'
        ? 'Weather provider took too long to respond. Please try again.'
        : 'Weather is temporarily unavailable. Please try again.',
    });
  }
}
