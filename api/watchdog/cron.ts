import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createAdminDatabase, ingestApprovedFeeds } from '../_lib/watchdog';

export const config = { maxDuration: 30 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const secret = process.env.WATCHDOG_CRON_SECRET;
  const authorization = req.headers.authorization || '';
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!secret || !supplied || supplied.length !== secret.length) {
    return res.status(401).json({ error: 'Scheduled collection is not authorised.' });
  }
  let matched = 0;
  for (let i = 0; i < secret.length; i++) matched |= secret.charCodeAt(i) ^ supplied.charCodeAt(i);
  if (matched !== 0) return res.status(401).json({ error: 'Scheduled collection is not authorised.' });
  try {
    const result = await ingestApprovedFeeds(createAdminDatabase());
    return res.status(200).json({ ok: true, ...result, completedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Scheduled Watchdog collection failed:', error instanceof Error ? error.message : 'Unknown error');
    return res.status(500).json({ error: 'Scheduled collection failed.' });
  }
}
