import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createAdminDatabase, requireOmulimiAdmin } from '../_lib/watchdog';

const noStore = (res: VercelResponse) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
};

function validFeedUrl(value: unknown, homepage: string) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const feed = new URL(value.trim());
    const home = new URL(homepage);
    if (feed.protocol !== 'https:' || !(feed.hostname === home.hostname || feed.hostname.endsWith('.' + home.hostname))) return null;
    return feed.toString();
  } catch { return null; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  noStore(res);
  if (req.method !== 'GET' && req.method !== 'PATCH') {
    res.setHeader('Allow', 'GET, PATCH');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const auth = await requireOmulimiAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  try {
    const db = createAdminDatabase();
    if (req.method === 'GET') {
      const [sources, items] = await Promise.all([
        db.from('agri_sources').select('id,source_key,name,source_kind,homepage_url,feed_url,api_base_url,access_method,access_status,commercial_use_notes,enabled,last_checked_at,last_success_at,last_error').order('name'),
        db.from('agri_intelligence_items').select('id,source_id,source_name,title,summary,canonical_url,category,geography_scope,country_code,region,district,affected_crops,affected_livestock,published_at,retrieved_at,verification_status,evidence_type,expires_at,confidence,metadata,created_at').eq('is_published', false).in('verification_status', ['unverified','corroborating']).order('published_at', { ascending: false, nullsFirst: false }).limit(100),
      ]);
      if (sources.error) throw sources.error;
      if (items.error) throw items.error;
      return res.status(200).json({ sources: sources.data || [], items: items.data || [] });
    }

    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    if (body.action === 'update-source') {
      const sourceId = typeof body.sourceId === 'string' ? body.sourceId : '';
      if (!sourceId) return res.status(400).json({ error: 'A source ID is required.' });
      const { data: source, error: readError } = await db.from('agri_sources').select('id,homepage_url').eq('id', sourceId).maybeSingle();
      if (readError) throw readError;
      if (!source) return res.status(404).json({ error: 'Source not found.' });

      const accessStatus = typeof body.accessStatus === 'string' ? body.accessStatus : undefined;
      if (accessStatus && !['review_required','permission_pending','approved','blocked'].includes(accessStatus)) {
        return res.status(400).json({ error: 'Invalid source permission status.' });
      }
      const feedUrl = body.feedUrl === undefined ? undefined : validFeedUrl(body.feedUrl, source.homepage_url);
      if (body.feedUrl !== undefined && body.feedUrl !== '' && !feedUrl) {
        return res.status(400).json({ error: 'Feed URL must use HTTPS and belong to the registered publisher domain.' });
      }
      const requestedEnabled = typeof body.enabled === 'boolean' ? body.enabled : undefined;
      const nextStatus = accessStatus || undefined;
      if (requestedEnabled && (nextStatus ? nextStatus !== 'approved' : accessStatus !== 'approved')) {
        const effectiveStatus = nextStatus || (await db.from('agri_sources').select('access_status').eq('id', sourceId).single()).data?.access_status;
        if (effectiveStatus !== 'approved') return res.status(403).json({ error: 'Approve the source access terms before enabling collection.' });
      }
      const update: Record<string, unknown> = {};
      if (accessStatus) update.access_status = accessStatus;
      if (body.feedUrl !== undefined) update.feed_url = feedUrl || null;
      if (typeof body.commercialUseNotes === 'string') update.commercial_use_notes = body.commercialUseNotes.slice(0, 1200);
      if (requestedEnabled !== undefined) update.enabled = requestedEnabled && (nextStatus || (await db.from('agri_sources').select('access_status').eq('id', sourceId).single()).data?.access_status) === 'approved' && Boolean(feedUrl || body.feedUrl === undefined);
      if (accessStatus && accessStatus !== 'approved') update.enabled = false;
      const { data, error } = await db.from('agri_sources').update(update).eq('id', sourceId).select('id,source_key,name,source_kind,homepage_url,feed_url,access_method,access_status,commercial_use_notes,enabled,last_checked_at,last_success_at,last_error').single();
      if (error) throw error;
      await db.from('admin_audit_logs').insert({ actor_user_id: auth.userId, action: 'watchdog_source_updated', target_type: 'agri_source', target_id: sourceId, details: { access_status: update.access_status, enabled: update.enabled, feed_url_changed: body.feedUrl !== undefined } });
      return res.status(200).json({ ok: true, source: data });
    }
    return res.status(400).json({ error: 'Unknown review action.' });
  } catch (error) {
    console.error('Watchdog review request failed:', error instanceof Error ? error.message : 'Unknown error');
    return res.status(500).json({ error: 'The Watchdog review request could not be completed.' });
  }
}
