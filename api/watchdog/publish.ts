import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createAdminDatabase, createFarmerNotifications, requireOmulimiAdmin } from '../_lib/watchdog';

const CATEGORIES = ['threat','news','opportunity','market','research','environment'];
const SCOPES = ['global','national','region','district','local'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const auth = await requireOmulimiAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
  const itemId = typeof body.itemId === 'string' ? body.itemId : '';
  if (!itemId) return res.status(400).json({ error: 'An intelligence item ID is required.' });

  try {
    const db = createAdminDatabase();
    const { data: item, error: readError } = await db.from('agri_intelligence_items').select('*').eq('id', itemId).maybeSingle();
    if (readError) throw readError;
    if (!item) return res.status(404).json({ error: 'Intelligence item not found.' });

    const updates: Record<string, unknown> = { verification_status: 'verified', is_published: true };
    if (typeof body.summary === 'string') updates.summary = body.summary.slice(0, 1200);
    if (typeof body.category === 'string' && CATEGORIES.includes(body.category)) updates.category = body.category;
    if (typeof body.geographyScope === 'string' && SCOPES.includes(body.geographyScope)) updates.geography_scope = body.geographyScope;
    if (typeof body.region === 'string') updates.region = body.region.slice(0, 100);
    if (typeof body.district === 'string') updates.district = body.district.slice(0, 100);
    if (typeof body.confidence === 'number' && body.confidence >= 0 && body.confidence <= 1) updates.confidence = body.confidence;
    if (typeof body.expiresAt === 'string' && !Number.isNaN(Date.parse(body.expiresAt))) updates.expires_at = new Date(body.expiresAt).toISOString();
    if (Array.isArray(body.affectedCrops)) updates.affected_crops = body.affectedCrops.filter(value => typeof value === 'string').slice(0, 20);
    if (Array.isArray(body.affectedLivestock)) updates.affected_livestock = body.affectedLivestock.filter(value => typeof value === 'string').slice(0, 20);

    const { data: published, error: updateError } = await db.from('agri_intelligence_items').update(updates).eq('id', itemId).select('*').single();
    if (updateError) throw updateError;
    const notificationsCreated = await createFarmerNotifications(db, published);
    return res.status(200).json({ ok: true, itemId, notificationsCreated, published: true });
  } catch (error) {
    console.error('Could not publish agricultural intelligence item:', error instanceof Error ? error.message : 'Unknown error');
    return res.status(500).json({ error: 'The item could not be published. Check the source and farm matching data.' });
  }
}
