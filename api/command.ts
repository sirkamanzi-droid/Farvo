import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const fail = (res: VercelResponse, status: number, message: string) => res.status(status).json({ error: message });
const noStore = (res: VercelResponse) => { res.setHeader('Cache-Control', 'no-store, max-age=0'); res.setHeader('Pragma', 'no-cache'); };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  noStore(res);
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const publishable = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  // Public endpoint exposes only the current farmer-facing announcement.
  if (req.method === 'GET' && req.query.view === 'public-config') {
    if (!url || !secret) return res.status(200).json({ announcement: '' });
    const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.from('admin_settings').select('value').eq('key', 'command_centre').maybeSingle();
    if (error) return res.status(200).json({ announcement: '' });
    const value = data?.value as { announcement?: unknown } | null;
    return res.status(200).json({ announcement: typeof value?.announcement === 'string' ? value.announcement.slice(0, 240) : '' });
  }

  if (req.method !== 'GET' && req.method !== 'PATCH') {
    res.setHeader('Allow', 'GET, PATCH');
    return fail(res, 405, 'Method not allowed.');
  }
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const adminId = process.env.OMULIMI_ADMIN_USER_ID;
  if (!token || !url || !publishable) return fail(res, 401, 'Sign in to continue.');
  if (!secret || !adminId) return fail(res, 503, 'Command Centre server configuration is incomplete.');

  // Verify the Supabase JWT and exact immutable Auth user ID before using service-role access.
  const auth = createClient(url, publishable, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await auth.auth.getUser(token);
  if (authError || !authData.user) return fail(res, 401, 'Your session is invalid. Sign in again.');
  if (authData.user.id !== adminId) return fail(res, 403, 'This account is not authorised to use Command Centre.');
  const { data: claimsData, error: claimsError } = await auth.auth.getClaims(token);
  if (claimsError || claimsData?.claims?.aal !== 'aal2') {
    return res.status(403).json({ error: 'Complete your authenticator verification to access Command Centre.', code: 'MFA_REQUIRED' });
  }

  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const audit = async (action: string, targetType: string, targetId: string | null, details: Record<string, unknown>) => {
    const { error } = await db.from('admin_audit_logs').insert({
      actor_user_id: authData.user.id, action, target_type: targetType, target_id: targetId, details,
    });
    if (error) throw error;
  };

  try {
    if (req.method === 'GET') {
      const view = typeof req.query.view === 'string' ? req.query.view : 'overview';
      if (view === 'overview') {
        const [farmers, cooperatives, farms, soils, chats, recent] = await Promise.all([
          db.from('profiles').select('*', { count: 'exact', head: true }),
          db.from('cooperatives').select('*', { count: 'exact', head: true }),
          db.from('farms').select('*', { count: 'exact', head: true }),
          db.from('soil_assessments').select('*', { count: 'exact', head: true }),
          db.from('kato_conversations').select('*', { count: 'exact', head: true }),
          db.from('profiles').select('id,full_name,farmer_code,cooperative_id,created_at').order('created_at', { ascending: false }).limit(8),
        ]);
        const error = [farmers, cooperatives, farms, soils, chats, recent].find(result => result.error)?.error;
        if (error) throw error;
        return res.status(200).json({
          counts: { farmers: farmers.count || 0, cooperatives: cooperatives.count || 0, farms: farms.count || 0, soilAssessments: soils.count || 0, katoConversations: chats.count || 0 },
          recentFarmers: recent.data || [],
        });
      }
      if (view === 'farmers') {
        const [profiles, coops] = await Promise.all([
          db.from('profiles').select('id,full_name,farmer_code,cooperative_id,created_at').order('created_at', { ascending: false }).limit(250),
          db.from('cooperatives').select('id,name'),
        ]);
        if (profiles.error) throw profiles.error;
        if (coops.error) throw coops.error;
        const names = new Map((coops.data || []).map(item => [item.id, item.name]));
        return res.status(200).json({ farmers: (profiles.data || []).map(item => ({ ...item, cooperativeName: names.get(item.cooperative_id) || 'Unavailable' })) });
      }
      if (view === 'cooperatives') {
        const [coops, profiles] = await Promise.all([
          db.from('cooperatives').select('id,name,is_active,created_at').order('created_at', { ascending: false }),
          db.from('profiles').select('cooperative_id'),
        ]);
        if (coops.error) throw coops.error;
        if (profiles.error) throw profiles.error;
        const counts = new Map<string, number>();
        for (const profile of profiles.data || []) counts.set(profile.cooperative_id, (counts.get(profile.cooperative_id) || 0) + 1);
        return res.status(200).json({ cooperatives: (coops.data || []).map(item => ({ ...item, farmerCount: counts.get(item.id) || 0 })) });
      }
      if (view === 'settings') {
        const { data, error } = await db.from('admin_settings').select('value').eq('key', 'command_centre').maybeSingle();
        if (error) throw error;
        return res.status(200).json({ settings: data?.value || { announcement: '' } });
      }
      if (view === 'activity') {
        const { data, error } = await db.from('admin_audit_logs').select('id,action,target_type,target_id,details,created_at').order('created_at', { ascending: false }).limit(100);
        if (error) throw error;
        return res.status(200).json({ activity: data || [] });
      }
      return fail(res, 400, 'Unknown Command Centre view.');
    }

    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    if (body.action === 'update-announcement') {
      if (typeof body.announcement !== 'string' || body.announcement.length > 240) return fail(res, 400, 'Announcement must be 240 characters or fewer.');
      const { data: current, error: readError } = await db.from('admin_settings').select('value').eq('key', 'command_centre').maybeSingle();
      if (readError) throw readError;
      const announcement = body.announcement.trim();
      const currentValue = current?.value && typeof current.value === 'object' ? current.value as Record<string, unknown> : {};
      const { error } = await db.from('admin_settings').upsert({ key: 'command_centre', value: { ...currentValue, announcement }, updated_by: authData.user.id, updated_at: new Date().toISOString() });
      if (error) throw error;
      await audit('updated_announcement', 'app_settings', 'command_centre', { announcementLength: announcement.length });
      return res.status(200).json({ success: true, announcement });
    }
    if (body.action === 'set-cooperative-status') {
      if (typeof body.cooperativeId !== 'string' || typeof body.isActive !== 'boolean') return fail(res, 400, 'A cooperative and valid status are required.');
      const { data, error } = await db.from('cooperatives').update({ is_active: body.isActive }).eq('id', body.cooperativeId).select('id,name,is_active').maybeSingle();
      if (error) throw error;
      if (!data) return fail(res, 404, 'Cooperative not found.');
      await audit(body.isActive ? 'activated_cooperative' : 'deactivated_cooperative', 'cooperative', data.id, { name: data.name, isActive: data.is_active });
      return res.status(200).json({ success: true, cooperative: data });
    }
    return fail(res, 400, 'Unknown Command Centre action.');
  } catch (error) {
    console.error('Command Centre request failed:', error instanceof Error ? error.message : 'Unknown error');
    return fail(res, 500, 'The request could not be completed. Please try again.');
  }
}
