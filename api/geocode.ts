import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

type Address = Record<string, unknown>;

// Best-effort burst protection for warm serverless instances. Farm-level results
// are persisted, so normal use does not repeatedly call the public geocoder.
let lastLookupAt = 0;

async function requireFarmer(req: VercelRequest): Promise<boolean> {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!token || !url || !key) return false;
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.getUser(token);
  return !error && Boolean(data.user);
}

function label(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.normalize('NFKC').replace(/[<>\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, 100) : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    if (!(await requireFarmer(req))) {
      return res.status(401).json({ error: 'Please sign in to look up this farm location.' });
    }
    const lat = Number(req.query.latitude);
    const lon = Number(req.query.longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({ error: 'Valid coordinates are required.' });
    }

    if (Date.now() - lastLookupAt < 1100) {
      return res.status(429).json({ error: 'Please wait a moment before looking up another farm location.' });
    }
    lastLookupAt = Date.now();

    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    url.searchParams.set('zoom', '18');
    url.searchParams.set('addressdetails', '1');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'OmulimiFarmLocation/1.0 (+https://omulimiapp.vercel.app)',
        },
      });
    } finally {
      clearTimeout(timeout);
    }
    if (response.status === 404) return res.status(200).json({ found: false, provider: 'OpenStreetMap Nominatim' });
    if (!response.ok) {
      console.warn('Reverse geocoding provider returned:', response.status);
      return res.status(502).json({ error: 'Area names are temporarily unavailable. Your GPS coordinates are still valid.' });
    }
    const payload = await response.json() as { display_name?: unknown; address?: Address };
    const address = payload.address ?? {};
    return res.status(200).json({
      found: true,
      provider: 'OpenStreetMap Nominatim',
      displayName: label(payload.display_name),
      village: label(address.village) || label(address.hamlet),
      parish: label(address.parish),
      subcounty: label(address.subcounty),
      district: label(address.county) || label(address.district),
      region: label(address.state) || label(address.region),
      country: label(address.country),
    });
  } catch (error) {
    console.warn('Reverse geocoding unavailable:', error instanceof Error ? error.message : 'Unknown error');
    return res.status(502).json({ error: 'Area names are temporarily unavailable. Your GPS coordinates are still valid.' });
  }
}
