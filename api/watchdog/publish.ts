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
  const verificationNotes = typeof body.verificationNotes === 'string' ? body.verificationNotes.trim() : '';
  if (verificationNotes.length < 20 || verificationNotes.length > 1200) return res.status(400).json({ error: 'Add verification notes (20–1,200 characters) before publishing.' });
  if (typeof body.geographyScope !== 'string' || !SCOPES.includes(body.geographyScope)) return res.status(400).json({ error: 'Choose the correct geographic coverage before publishing.' });
  if (body.geographyScope === 'region' && typeof body.region !== 'string') return res.status(400).json({ error: 'A region is required for a regional alert.' });
  if ((body.geographyScope === 'district' || body.geographyScope === 'local') && typeof body.district !== 'string') return res.status(400).json({ error: 'A district is required for district or local coverage.' });
  if (body.geographyScope === 'local' && (typeof body.localArea !== 'string' || !body.localArea.trim())) return res.status(400).json({ error: 'A village, parish or subcounty is required for local coverage.' });
  if (body.category === 'opportunity' && (typeof body.expiresAt !== 'string' || Number.isNaN(Date.parse(body.expiresAt)) || Date.parse(body.expiresAt) <= Date.now())) return res.status(400).json({ error: 'A future closing or review date is required for opportunities.' });

  try {
    const db = createAdminDatabase();
    const { data: item, error: readError } = await db.from('agri_intelligence_items').select('*').eq('id', itemId).maybeSingle();
    if (readError) throw readError;
    if (!item) return res.status(404).json({ error: 'Intelligence item not found.' });
    if (!item.source_id) return res.status(400).json({ error: 'This item has no registered source and cannot be published.' });
    const { data: source, error: sourceError } = await db.from('agri_sources').select('access_status').eq('id', item.source_id).maybeSingle();
    if (sourceError) throw sourceError;
    if (source?.access_status !== 'approved') return res.status(403).json({ error: 'This source is not approved for Omulimi ingestion and publication.' });

    const updates: Record<string, unknown> = { verification_status: 'verified', is_published: true, geography_scope: body.geographyScope, metadata: { ...(item.metadata || {}), reviewed_by: auth.userId, reviewed_at: new Date().toISOString(), verification_notes: verificationNotes, ...(typeof body.localArea === 'string' ? { local_area: body.localArea.trim().slice(0, 120) } : {}) } };
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
