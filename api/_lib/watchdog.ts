import type { VercelRequest } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

export function createAdminDatabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error('Watchdog server configuration is incomplete.');
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function requireOmulimiAdmin(req: VercelRequest) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  const adminId = process.env.OMULIMI_ADMIN_USER_ID;
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!url || !key || !adminId || !token) return { ok: false as const, status: 401, error: 'Sign in to continue.' };
  const auth = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return { ok: false as const, status: 401, error: 'Your session is invalid. Sign in again.' };
  if (data.user.id !== adminId) return { ok: false as const, status: 403, error: 'This account is not authorised.' };
  const { data: claims, error: claimsError } = await auth.auth.getClaims(token);
  if (claimsError || claims?.claims?.aal !== 'aal2') return { ok: false as const, status: 403, error: 'Complete authenticator verification to continue.' };
  return { ok: true as const, userId: data.user.id };
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function textTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<(?:[\\w.-]+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${tag}\\s*>`, 'i'));
  return match ? decodeXml(match[1]).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

function entryLink(xml: string) {
  const atom = xml.match(/<(?:[\w.-]+:)?link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
  if (atom?.[1]) return decodeXml(atom[1]).trim();
  return textTag(xml, 'link');
}

function plainSummary(value: string) {
  return decodeXml(value.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

function classify(title: string, summary: string): 'threat' | 'news' | 'opportunity' | 'market' | 'research' | 'environment' {
  const text = `${title} ${summary}`.toLowerCase();
  if (/grant|funding|call for applications|training|workshop|subsid|scholarship|buyer|market access|programme opportunity/.test(text)) return 'opportunity';
  if (/outbreak|epidemic|pest|locust|disease|flood|drought|invasion|crop failure/.test(text)) return 'threat';
  if (/market price|commodity price|farm-gate price|trade price|price update/.test(text)) return 'market';
  if (/research|study finds|new variety|new breed|trial results|scientists|discovery/.test(text)) return 'research';
  if (/climate|rainfall|weather|temperature|vegetation|soil moisture|environment/.test(text)) return 'environment';
  return 'news';
}

const CROP_TERMS: Record<string, string[]> = {
  maize: ['maize','corn'], beans: ['beans','bean'], coffee: ['coffee'], banana: ['banana','matooke'],
  tomato: ['tomato'], potato: ['potato'], cassava: ['cassava'], rice: ['rice'],
};
const LIVESTOCK_TERMS: Record<string, string[]> = {
  cattle: ['cattle','cow','cows','beef','dairy'], goats: ['goat','goats'], sheep: ['sheep'],
  poultry: ['poultry','chicken','chickens','broiler','layer'], pigs: ['pig','pigs','swine'],
  fish: ['fish','aquaculture'], rabbits: ['rabbit','rabbits'],
};

function detectAssets(text: string) {
  const lower = text.toLowerCase();
  return {
    crops: Object.entries(CROP_TERMS).filter(([, terms]) => terms.some(term => lower.includes(term))).map(([name]) => name),
    livestock: Object.entries(LIVESTOCK_TERMS).filter(([, terms]) => terms.some(term => lower.includes(term))).map(([name]) => name),
  };
}

function feedEntries(xml: string) {
  const matches = [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi)];
  return matches.slice(0, 40).map(match => {
    const body = match[2];
    const title = textTag(body, 'title');
    const summary = plainSummary(textTag(body, 'description') || textTag(body, 'summary') || textTag(body, 'content'));
    const url = entryLink(body);
    const dateText = textTag(body, 'pubDate') || textTag(body, 'published') || textTag(body, 'updated');
    const parsedDate = dateText ? new Date(dateText) : null;
    return { title, summary, url, publishedAt: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null };
  }).filter(item => item.title.length >= 5 && item.url);
}

function normalizedUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    url.hash = '';
    url.searchParams.sort();
    return url.toString();
  } catch { return null; }
}

function allowedFeedUrl(feedUrl: string, homepageUrl: string) {
  try {
    const feed = new URL(feedUrl);
    const home = new URL(homepageUrl);
    return feed.protocol === 'https:' && (feed.hostname === home.hostname || feed.hostname.endsWith(`.${home.hostname}`));
  } catch { return false; }
}


async function ingestNasaEonet(db: SupabaseClient) {
  const { data: source, error } = await db.from('agri_sources').select('id,api_base_url,access_status,enabled').eq('source_key','nasa_earthdata').maybeSingle();
  if (error) throw error;
  if (!source || !source.enabled || source.access_status !== 'approved' || !source.api_base_url) return { checked:0, inserted:0, duplicates:0, failed:0 };
  const base = new URL(source.api_base_url);
  if (base.protocol !== 'https:' || base.hostname !== 'eonet.gsfc.nasa.gov' || base.pathname.replace(/\/$/,'') !== '/api/v3') throw new Error('NASA EONET API base URL is not an approved endpoint.');
  const endpoint = new URL('/api/v3/events',base.origin);
  endpoint.searchParams.set('status','open'); endpoint.searchParams.set('days','30'); endpoint.searchParams.set('limit','100');
  const controller = new AbortController(); const timeout = setTimeout(()=>controller.abort(),12000);
  try {
    const response = await fetch(endpoint,{headers:{Accept:'application/json','User-Agent':'Omulimi-Agricultural-Intelligence/1.0 (+https://omulimiapp.vercel.app)'},signal:controller.signal});
    if (!response.ok) throw new Error(`NASA EONET returned HTTP ${response.status}.`);
    const payload = await response.json() as {events?:Array<Record<string,any>>};
    const events = Array.isArray(payload.events)?payload.events:[];
    let inserted=0,duplicates=0;
    for (const event of events) {
      const title=typeof event.title==='string'?event.title.trim():'';
      if(title.length<5||!event.id) continue;
      const canonicalUrl=typeof event.link==='string'&&event.link.startsWith('https://')?event.link:`https://eonet.gsfc.nasa.gov/api/v3/events/${encodeURIComponent(String(event.id))}`;
      const description=typeof event.description==='string'?event.description.slice(0,500):'';
      const categoryNames=Array.isArray(event.categories)?event.categories.map((c:any)=>String(c.title||c.id||'')).filter(Boolean):[];
      const geometry=Array.isArray(event.geometry)?event.geometry.slice(-5).map((g:any)=>({date:g.date||null,type:g.type||null,coordinates:g.coordinates||null})):[];
      const assets=detectAssets(`${title} ${description} ${categoryNames.join(' ')}`);
      const dedupeKey=createHash('sha256').update(`nasa-eonet:${String(event.id)}`).digest('hex');
      const {error:insertError}=await db.from('agri_intelligence_items').insert({
        source_id:source.id,source_name:'NASA EONET',title:title.slice(0,300),summary:description||null,canonical_url:canonicalUrl,
        category:classify(title,description),geography_scope:'global',country_code:'UG',affected_crops:assets.crops,affected_livestock:assets.livestock,
        published_at:geometry[0]?.date||null,verification_status:'unverified',evidence_type:'dataset_observation',dedupe_key,is_published:false,
        metadata:{ingestion_method:'nasa_eonet_api',eonet_event_id:String(event.id),categories:categoryNames,geometry,attribution:'NASA Earth Observatory Natural Event Tracker (EONET)',geographic_assignment:'Not assigned; reviewer must confirm relevance and coverage.'}
      });
      if(insertError?.code==='23505')duplicates++; else if(insertError)throw insertError; else inserted++;
    }
    await db.from('agri_sources').update({last_checked_at:new Date().toISOString(),last_success_at:new Date().toISOString(),last_error:null}).eq('id',source.id);
    return {checked:1,inserted,duplicates,failed:0};
  } catch(e) {
    const message=e instanceof Error?e.message.slice(0,500):'NASA EONET collection failed.';
    await db.from('agri_sources').update({last_checked_at:new Date().toISOString(),last_error:message}).eq('id',source.id);
    return {checked:1,inserted:0,duplicates:0,failed:1};
  } finally {clearTimeout(timeout);}
}

export async function ingestApprovedFeeds(db: SupabaseClient) {
  const { data: sources, error } = await db.from('agri_sources')
    .select('id,source_key,name,homepage_url,feed_url,country_code,access_status,enabled')
    .eq('enabled', true).eq('access_status', 'approved').not('feed_url', 'is', null).limit(20);
  if (error) throw error;

  let checked = 0, inserted = 0, duplicates = 0, failed = 0;
  for (const source of sources || []) {
    checked++;
    try {
      if (!allowedFeedUrl(source.feed_url, source.homepage_url)) throw new Error('Feed URL must use HTTPS and belong to the registered publisher domain.');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);
      let response: Response;
      try {
        response = await fetch(source.feed_url, {
          headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml', 'User-Agent': 'Omulimi-Agricultural-Intelligence/1.0 (+https://omulimiapp.vercel.app)' },
          signal: controller.signal,
        });
      } finally { clearTimeout(timeout); }
      if (!response.ok) throw new Error(`Feed returned HTTP ${response.status}.`);
      if (!allowedFeedUrl(response.url, source.homepage_url)) throw new Error('Feed redirected outside the registered publisher domain.');
      const xml = await response.text();
      if (xml.length > 1_500_000) throw new Error('Feed response exceeded the 1.5 MB safety limit.');
      const entries = feedEntries(xml);
      for (const entry of entries) {
        const canonicalUrl = normalizedUrl(entry.url);
        if (!canonicalUrl) continue;
        const assets = detectAssets(`${entry.title} ${entry.summary}`);
        const dedupeKey = createHash('sha256').update(canonicalUrl.toLowerCase()).digest('hex');
        const { error: insertError } = await db.from('agri_intelligence_items').insert({
          source_id: source.id,
          source_name: source.name,
          title: entry.title.slice(0, 300),
          summary: entry.summary || null,
          canonical_url: canonicalUrl,
          category: classify(entry.title, entry.summary),
          geography_scope: source.country_code === 'UG' ? 'national' : 'global',
          country_code: source.country_code || 'UG',
          affected_crops: assets.crops,
          affected_livestock: assets.livestock,
          published_at: entry.publishedAt,
          verification_status: 'unverified',
          evidence_type: 'source_report',
          dedupe_key: dedupeKey,
          is_published: false,
          metadata: { ingestion_method: 'rss', source_key: source.source_key },
        });
        if (insertError?.code === '23505') duplicates++;
        else if (insertError) throw insertError;
        else inserted++;
      }
      await db.from('agri_sources').update({ last_checked_at: new Date().toISOString(), last_success_at: new Date().toISOString(), last_error: null }).eq('id', source.id);
    } catch (sourceError) {
      failed++;
      const message = sourceError instanceof Error ? sourceError.message.slice(0, 500) : 'Unknown feed error';
      await db.from('agri_sources').update({ last_checked_at: new Date().toISOString(), last_error: message }).eq('id', source.id);
    }
  }
  const nasa = await ingestNasaEonet(db);
  return { checked: checked + nasa.checked, inserted: inserted + nasa.inserted, duplicates: duplicates + nasa.duplicates, failed: failed + nasa.failed };
}

function normalise(value: unknown) {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ') : '';
}

function geographyMatches(farm: any, item: any) {
  if (item.geography_scope === 'global' || item.geography_scope === 'national') return true;
  if (item.geography_scope === 'region') return normalise(farm.region) === normalise(item.region);
  if (item.geography_scope === 'district') return normalise(farm.district_name) === normalise(item.district);
  if (item.geography_scope === 'local') {
    if (item.district && normalise(farm.district_name) !== normalise(item.district)) return false;
    const localArea = normalise(item.metadata?.local_area);
    if (!localArea) return false;
    return [farm.village, farm.parish, farm.subcounty].some(value => normalise(value) === localArea);
  }
  return false;
}

function assetsMatch(farm: any, crops: any[], livestock: any[], item: any) {
  const farmCrops = crops.filter(row => row.farm_id === farm.id).map(row => normalise(row.crop_name));
  if (!farmCrops.length && farm.crop) farmCrops.push(normalise(farm.crop));
  const farmAnimals = livestock.filter(row => row.farm_id === farm.id).map(row => normalise(row.species));
  const wantedCrops = (item.affected_crops || []).map(normalise);
  const wantedAnimals = (item.affected_livestock || []).map(normalise);
  if (!wantedCrops.length && !wantedAnimals.length) return farmCrops.length > 0 || farmAnimals.length > 0;
  const cropMatch = farmCrops.some(name => wantedCrops.some(wanted => name === wanted || name.includes(wanted) || wanted.includes(name)));
  const animalMatch = farmAnimals.some(name => wantedAnimals.some(wanted => name === wanted || name.includes(wanted) || wanted.includes(name)));
  return cropMatch || animalMatch;
}

export async function createFarmerNotifications(db: SupabaseClient, item: any) {
  const { data: farms, error: farmsError } = await db.from('farms')
    .select('id,user_id,label,crop,region,district_name,village,parish,subcounty');
  if (farmsError) throw farmsError;
  const farmIds = (farms || []).map(farm => farm.id);
  if (!farmIds.length) return 0;
  const [cropResult, animalResult] = await Promise.all([
    db.from('farm_crops').select('farm_id,crop_name').eq('is_active', true).in('farm_id', farmIds),
    db.from('farm_livestock').select('farm_id,species').eq('is_active', true).in('farm_id', farmIds),
  ]);
  if (cropResult.error) throw cropResult.error;
  if (animalResult.error) throw animalResult.error;

  const matches = (farms || []).filter(farm => geographyMatches(farm, item) && assetsMatch(farm, cropResult.data || [], animalResult.data || [], item));
  if (!matches.length) return 0;
  const records = matches.map(farm => {
    const farmCropNames = (cropResult.data || []).filter(row => row.farm_id === farm.id).map(row => row.crop_name);
    const farmAnimalNames = (animalResult.data || []).filter(row => row.farm_id === farm.id).map(row => row.species);
    const relevantAssets = [...farmCropNames, ...farmAnimalNames];
    const geographicLabel = item.geography_scope === 'national' ? 'national coverage' : item.geography_scope === 'global' ? 'global relevance' : [item.region, item.district, item.metadata?.local_area].filter(Boolean).join(', ');
    return {
      user_id: farm.user_id,
      farm_id: farm.id,
      item_id: item.id,
      relevance_reason: `Matched ${relevantAssets.length ? relevantAssets.join(', ') : farm.crop} with ${geographicLabel || 'the farm location'}.`,
    };
  });
  const { data, error } = await db.from('farmer_notifications')
    .upsert(records, { onConflict: 'user_id,farm_id,item_id', ignoreDuplicates: true })
    .select('id');
  if (error) throw error;
  return data?.length || 0;
}
