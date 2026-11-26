import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash, timingSafeEqual } from 'node:crypto';
import { createAdminDatabase, ingestApprovedFeeds } from '../_lib/watchdog';

export const config = { maxDuration: 30 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const authorization = req.headers.authorization || '';
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!supplied || supplied.length < 32 || supplied.length > 256) {
    return res.status(401).json({ error: 'Scheduled collection is not authorised.' });
  }
  try {
    const db = createAdminDatabase();
    const { data: credential, error: credentialError } = await db.from('watchdog_cron_auth').select('token_hash').eq('id', true).maybeSingle();
    if (credentialError) throw credentialError;
    if (!credential?.token_hash) return res.status(503).json({ error: 'Scheduled collection has not been configured.' });
    const actual = createHash('sha256').update(supplied).digest();
    const expected = Buffer.from(credential.token_hash, 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return res.status(401).json({ error: 'Scheduled collection is not authorised.' });
    }
    const result = await ingestApprovedFeeds(db);
    return res.status(200).json({ ok: true, ...result, completedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Scheduled Watchdog collection failed:', error instanceof Error ? error.message : 'Unknown error');
    return res.status(500).json({ error: 'Scheduled collection failed.' });
  }
}
