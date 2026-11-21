import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 20 };

type SoilValue = {
  value: number;
  unit: string | null;
  lowerBound: number | null;
  upperBound: number | null;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function getIsdaToken(username: string, password: string) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const form = new URLSearchParams({ username, password });
  const response = await fetchWithTimeout('https://api.isda-africa.com/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: form.toString(),
  });
  if (!response.ok) throw new Error(`iSDAsoil login failed (${response.status}).`);
  const body = await response.json() as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new Error('iSDAsoil did not return an access token.');
  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + Math.min(Number(body.expires_in) || 3600, 3600) * 1000,
  };
  return cachedToken.value;
}

function numeric(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normaliseProperties(source: unknown): Record<string, SoilValue> {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {};
  const output: Record<string, SoilValue> = {};
  for (const [name, rawRows] of Object.entries(source as Record<string, unknown>)) {
    const row = Array.isArray(rawRows) ? rawRows[0] : rawRows;
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const item = row as Record<string, any>;
    const valueObject = item.value && typeof item.value === 'object' ? item.value : {};
    const value = numeric(valueObject.value ?? item.value);
    if (value === null) continue;
    const uncertaintyRows = Array.isArray(item.uncertainty) ? item.uncertainty : [];
    const uncertainty = uncertaintyRows.find((entry: any) =>
      entry && typeof entry === 'object' &&
      (numeric(entry.lower_bound) !== null || numeric(entry.upper_bound) !== null)
    );
    output[name] = {
      value,
      unit: typeof valueObject.unit === 'string' ? valueObject.unit :
        typeof item.unit === 'string' ? item.unit : null,
      lowerBound: numeric(uncertainty?.lower_bound),
      upperBound: numeric(uncertainty?.upper_bound),
    };
  }
  return output;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authorization = req.headers.authorization || '';
    const sessionToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!sessionToken || !supabaseUrl || !supabaseKey) {
      return res.status(401).json({ error: 'Please sign in to request soil data.' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${sessionToken}` } },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser(sessionToken);
    if (authError || !authData.user) {
      return res.status(401).json({ error: 'Your session is invalid. Please sign in again.' });
    }

    const lat = Number(req.query.latitude);
    const lon = Number(req.query.longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
        !Number.isFinite(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({ error: 'Valid farm coordinates are required.' });
    }

    const username = process.env.ISDA_SOIL_USERNAME;
    const password = process.env.ISDA_SOIL_PASSWORD;
    if (!username || !password) {
      return res.status(503).json({
        code: 'ISDA_CREDENTIALS_REQUIRED',
        error: 'iSDAsoil access has not been connected on the server yet.',
      });
    }

    const accessToken = await getIsdaToken(username, password);
    const url = new URL('https://api.isda-africa.com/isdasoil/v2/soilproperty');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    url.searchParams.set('depth', '0-20');
    const response = await fetchWithTimeout(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    if (!response.ok) {
      if (response.status === 401) cachedToken = null;
      const detail = await response.text().catch(() => '');
      console.error('iSDAsoil property request failed:', response.status, detail.slice(0, 300));
      return res.status(response.status === 404 ? 404 : 502).json({
        error: response.status === 404
          ? 'iSDAsoil has no mapped soil data for this location.'
          : 'iSDAsoil could not return soil data right now.',
      });
    }

    const payload = await response.json() as { property?: unknown };
    const properties = normaliseProperties(payload.property);
    if (!Object.keys(properties).length) {
      return res.status(404).json({ error: 'No usable iSDAsoil properties were returned for this location.' });
    }

    return res.status(200).json({
      provider: 'iSDAsoil',
      depth: '0-20 cm',
      resolution: 'approximately 30 m',
      classification: 'machine-learning model estimates, not laboratory measurements',
      latitude: lat,
      longitude: lon,
      properties,
    });
  } catch (error) {
    console.error('Soil data lookup failed:', error instanceof Error ? error.message : 'Unknown error');
    return res.status(502).json({ error: 'Soil data is temporarily unavailable. Please try again.' });
  }
}
