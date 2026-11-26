import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createAdminDatabase, ingestApprovedFeeds, requireOmulimiAdmin } from '../_lib/watchdog';

export const config = { maxDuration: 30 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const auth = await requireOmulimiAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  try {
    const result = await ingestApprovedFeeds(createAdminDatabase());
    return res.status(200).json({ ok: true, ...result, note: 'Collected feed entries remain unpublished until a reviewer verifies them.' });
  } catch (error) {
    console.error('Agricultural intelligence ingestion failed:', error instanceof Error ? error.message : 'Unknown error');
    return res.status(500).json({ error: 'The source collection run could not be completed.' });
  }
}
