import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { loadFarmContext } from './_lib/farmContext';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authorization = req.headers.authorization || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!token || !supabaseUrl || !supabaseKey) {
      return res.status(401).json({ error: 'Please sign in to load farm information.' });
    }

    const farmIdValue = req.query.farmId;
    const farmId = typeof farmIdValue === 'string' ? farmIdValue.trim() : '';
    if (!farmId || farmId.length > 80) {
      return res.status(400).json({ error: 'A valid farm ID is required.' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return res.status(401).json({ error: 'Your session is invalid. Please sign in again.' });
    }

    const requestedSoilHistoryLimit = req.query.soilHistoryLimit;
    const soilHistoryLimit = requestedSoilHistoryLimit === '30' ? 30 : 5;
    const requestedCarePlanLimit = req.query.cropCarePlanLimit;
    const cropCarePlanLimit = requestedCarePlanLimit === '30' ? 30 : 10;
    const context = await loadFarmContext(supabase, authData.user.id, farmId, soilHistoryLimit, cropCarePlanLimit);
    if (!context) return res.status(404).json({ error: 'That farm is not available in your account.' });

    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json(context);
  } catch (error) {
    console.error('Farm context request failed:', error instanceof Error ? error.message : 'Unknown error');
    return res.status(503).json({ error: 'Farm information is temporarily unavailable. Please try again shortly.' });
  }
}
