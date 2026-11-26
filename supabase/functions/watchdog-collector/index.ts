import { createClient } from "npm:@supabase/supabase-js@2";

type EonetGeometry = {
  date?: string | null;
  type?: string | null;
  coordinates?: unknown;
};

type EonetEvent = {
  id?: string;
  title?: string;
  description?: string | null;
  link?: string;
  categories?: Array<{ title?: string; id?: string }>;
  geometry?: EonetGeometry[];
  sources?: Array<{ id?: string; url?: string }>;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}";
const secretKeys = JSON.parse(secretKeysRaw) as Record<string, string>;
const adminKey = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

if (!supabaseUrl || !adminKey) {
  throw new Error("Supabase server configuration is incomplete.");
}

const db = createClient(supabaseUrl, adminKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return difference === 0;
}

function classify(text: string): "threat" | "news" | "opportunity" | "market" | "research" | "environment" {
  const lower = text.toLowerCase();
  if (/grant|funding|call for applications|training|workshop|subsid|scholarship|buyer|market access|programme opportunity/.test(lower)) return "opportunity";
  if (/outbreak|epidemic|pest|locust|disease|flood|drought|wildfire|volcano|severe storm|cyclone|landslide|dust storm/.test(lower)) return "threat";
  if (/market price|commodity price|farm-gate price|trade price|price update/.test(lower)) return "market";
  if (/research|study finds|new variety|new breed|trial results|scientists|discovery/.test(lower)) return "research";
  if (/climate|weather|rainfall|temperature|vegetation|environment/.test(lower)) return "environment";
  return "news";
}

function detectCrops(text: string) {
  const lower = text.toLowerCase();
  const terms: Record<string, string[]> = {
    maize: ["maize", "corn"], beans: ["beans", "bean"], coffee: ["coffee"],
    banana: ["banana", "matooke"], tomato: ["tomato"], potato: ["potato"],
    cassava: ["cassava"], rice: ["rice"],
  };
  return Object.entries(terms)
    .filter(([, values]) => values.some((term) => lower.includes(term)))
    .map(([crop]) => crop);
}


function coordinatesFrom(value: unknown, found: Array<[number, number]> = []): Array<[number, number]> {
  if (!Array.isArray(value)) return found;
  if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
    found.push([value[0], value[1]]);
    return found;
  }
  for (const child of value) coordinatesFrom(child, found);
  return found;
}

function isInsideUgandaScreeningBounds(geometry: EonetGeometry[]) {
  return geometry.some((point) =>
    coordinatesFrom(point.coordinates).some(([longitude, latitude]) =>
      longitude >= 29.5 && longitude <= 35.1 && latitude >= -1.6 && latitude <= 4.3
    )
  );
}

function detectLivestock(text: string) {
  const lower = text.toLowerCase();
  const terms: Record<string, string[]> = {
    cattle: ["cattle", "cow", "cows", "beef", "dairy"],
    goats: ["goat", "goats"], sheep: ["sheep"],
    poultry: ["poultry", "chicken", "chickens", "broiler", "layer"],
    pigs: ["pig", "pigs", "swine"], fish: ["fish", "aquaculture"],
    rabbits: ["rabbit", "rabbits"],
  };
  return Object.entries(terms)
    .filter(([, values]) => values.some((term) => lower.includes(term)))
    .map(([animal]) => animal);
}

function normalizedHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    url.hash = "";
    url.searchParams.sort();
    return url.toString();
  } catch {
    return null;
  }
}

function allowedFeedUrl(feedUrl: string, homepageUrl: string) {
  try {
    const feed = new URL(feedUrl);
    const homepage = new URL(homepageUrl);
    return feed.protocol === "https:" &&
      (feed.hostname === homepage.hostname || feed.hostname.endsWith(`.${homepage.hostname}`));
  } catch {
    return false;
  }
}

function nodeText(parent: Element, names: string[]) {
  for (const name of names) {
    const node = parent.getElementsByTagNameNS("*", name)[0] || parent.getElementsByTagName(name)[0];
    if (node?.textContent) return node.textContent.trim();
  }
  return "";
}

function parseFeedEntries(xml: string) {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (!document || document.getElementsByTagName("parsererror").length) {
    throw new Error("Publisher feed is not valid XML.");
  }
  const rssItems = Array.from(document.getElementsByTagName("item"));
  const atomEntries = Array.from(document.getElementsByTagNameNS("*", "entry"));
  return [...rssItems, ...atomEntries].slice(0, 40).map((entry) => {
    const title = nodeText(entry, ["title"]);
    const summary = nodeText(entry, ["description", "summary", "encoded", "content"])
      .replace(/<[^>]+>/g, " ").replace(/\\s+/g, " ").trim().slice(0, 500);
    const linkNode = entry.getElementsByTagNameNS("*", "link")[0] || entry.getElementsByTagName("link")[0];
    const rawLink = linkNode?.getAttribute("href") || linkNode?.textContent?.trim() || "";
    const dateText = nodeText(entry, ["pubDate", "published", "updated", "date"]);
    const parsed = dateText ? new Date(dateText) : null;
    return {
      title,
      summary,
      url: rawLink,
      publishedAt: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null,
    };
  }).filter((item) => item.title.length >= 5 && item.url);
}

async function collectApprovedRss() {
  const { data: sources, error } = await db.from("agri_sources")
    .select("id,source_key,name,homepage_url,feed_url,country_code")
    .eq("enabled", true)
    .eq("access_status", "approved")
    .in("access_method", ["rss", "licensed_feed"])
    .not("feed_url", "is", null)
    .limit(12);
  if (error) throw error;

  let checked = 0;
  let inserted = 0;
  let duplicates = 0;
  let failed = 0;

  for (let offset = 0; offset < (sources || []).length; offset += 3) {
    const batch = (sources || []).slice(offset, offset + 3);
    const results = await Promise.all(batch.map(async (source) => {
      try {
        if (!source.feed_url || !allowedFeedUrl(source.feed_url, source.homepage_url)) {
          throw new Error("Feed URL must use HTTPS and belong to the registered publisher domain.");
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        let response: Response;
        try {
          response = await fetch(source.feed_url, {
            headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }
        if (!response.ok) throw new Error(`Feed returned HTTP ${response.status}.`);
        if (!allowedFeedUrl(response.url, source.homepage_url)) {
          throw new Error("Feed redirected outside the registered publisher domain.");
        }
        const xml = await response.text();
        if (xml.length > 1_500_000) throw new Error("Feed response exceeded the 1.5 MB safety limit.");
        const entries = parseFeedEntries(xml);
        let sourceInserted = 0;
        let sourceDuplicates = 0;
        for (const entry of entries) {
          const canonicalUrl = normalizedHttpsUrl(entry.url);
          if (!canonicalUrl) continue;
          const combined = `${entry.title} ${entry.summary}`;
          const dedupeKey = await sha256Hex(canonicalUrl.toLowerCase());
          const { error: insertError } = await db.from("agri_intelligence_items").insert({
            source_id: source.id,
            source_name: source.name,
            title: entry.title.slice(0, 300),
            summary: entry.summary || null,
            canonical_url: canonicalUrl,
            category: classify(combined),
            geography_scope: source.country_code === "UG" ? "national" : "global",
            country_code: source.country_code || "UG",
            affected_crops: detectCrops(combined),
            affected_livestock: detectLivestock(combined),
            published_at: entry.publishedAt,
            verification_status: "unverified",
            evidence_type: "source_report",
            dedupe_key: dedupeKey,
            is_published: false,
            metadata: { ingestion_method: "rss", source_key: source.source_key },
          });
          if (insertError?.code === "23505") sourceDuplicates++;
          else if (insertError) throw insertError;
          else sourceInserted++;
        }
        await db.from("agri_sources").update({
          last_checked_at: new Date().toISOString(),
          last_success_at: new Date().toISOString(),
          last_error: null,
        }).eq("id", source.id);
        return { checked: 1, inserted: sourceInserted, duplicates: sourceDuplicates, failed: 0 };
      } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 500) : "RSS collection failed.";
        await db.from("agri_sources").update({
          last_checked_at: new Date().toISOString(),
          last_error: message,
        }).eq("id", source.id);
        return { checked: 1, inserted: 0, duplicates: 0, failed: 1 };
      }
    }));
    for (const result of results) {
      checked += result.checked;
      inserted += result.inserted;
      duplicates += result.duplicates;
      failed += result.failed;
    }
  }

  return { checked, inserted, duplicates, failed };
}

async function collectEonet() {
  const { data: source, error: sourceError } = await db
    .from("agri_sources")
    .select("id,api_base_url,access_status,enabled")
    .eq("source_key", "nasa_eonet")
    .maybeSingle();

  if (sourceError) throw sourceError;
  if (!source || !source.enabled || source.access_status !== "approved" || !source.api_base_url) {
    return { checked: 0, inserted: 0, duplicates: 0, skipped: true };
  }

  const base = new URL(source.api_base_url);
  if (
    base.protocol !== "https:" ||
    base.hostname !== "eonet.gsfc.nasa.gov" ||
    base.pathname.replace(/\/$/, "") !== "/api/v3"
  ) {
    throw new Error("NASA EONET API base URL is not an approved official endpoint.");
  }

  const endpoint = new URL("/api/v3/events", base.origin);
  endpoint.searchParams.set("status", "open");
  endpoint.searchParams.set("days", "30");
  endpoint.searchParams.set("limit", "100");
  endpoint.searchParams.set("bbox", "29.5,4.3,35.1,-1.6");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Omulimi-Agricultural-Intelligence/1.0 (+https://omulimiapp.vercel.app)",
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`NASA EONET returned HTTP ${response.status}.`);

    const payload = await response.json() as { events?: EonetEvent[] };
    const events = Array.isArray(payload.events) ? payload.events : [];
    let inserted = 0;
    let duplicates = 0;
    let skippedOutOfArea = 0;

    for (const event of events) {
      const id = typeof event.id === "string" ? event.id.trim() : "";
      const title = typeof event.title === "string" ? event.title.trim() : "";
      if (!id || title.length < 5) continue;

      const description = typeof event.description === "string" ? event.description.slice(0, 500) : "";
      const canonicalUrl = typeof event.link === "string" && event.link.startsWith("https://")
        ? event.link
        : `https://eonet.gsfc.nasa.gov/api/v3/events/${encodeURIComponent(id)}`;
      const categories = Array.isArray(event.categories)
        ? event.categories.map((category) => String(category.title || category.id || "")).filter(Boolean)
        : [];
      const fullGeometry = Array.isArray(event.geometry) ? event.geometry : [];
      if (!isInsideUgandaScreeningBounds(fullGeometry)) {
        skippedOutOfArea++;
        continue;
      }
      const geometry = fullGeometry.slice(-5).map((point) => ({
        date: point.date || null,
        type: point.type || null,
        coordinates: point.coordinates || null,
      }));
      const sources = Array.isArray(event.sources)
        ? event.sources.slice(0, 5).map((item) => ({ id: item.id || null, url: item.url || null }))
        : [];
      const dedupeKey = await sha256Hex(`nasa-eonet:${id}`);
      const combinedText = `${title} ${description} ${categories.join(" ")}`;
      const latestObservation = geometry.length ? geometry[geometry.length - 1].date : null;

      const { error: insertError } = await db.from("agri_intelligence_items").insert({
        source_id: source.id,
        source_name: "NASA EONET",
        title: title.slice(0, 300),
        summary: description || null,
        canonical_url: canonicalUrl,
        category: classify(combinedText),
        geography_scope: "national",
        country_code: "UG",
        affected_crops: detectCrops(combinedText),
        affected_livestock: [],
        published_at: latestObservation,
        verification_status: "unverified",
        evidence_type: "dataset_observation",
        dedupe_key: dedupeKey,
        is_published: false,
        metadata: {
          ingestion_method: "nasa_eonet_api",
          eonet_event_id: id,
          categories,
          geometry,
          sources,
          attribution: "NASA Earth Observatory Natural Event Tracker (EONET)",
          geographic_assignment: "Event geometry falls within the Uganda screening bounding box; reviewer must confirm exact administrative location and agricultural relevance before publication.",
          screening_bounds: { min_longitude: 29.5, max_longitude: 35.1, min_latitude: -1.6, max_latitude: 4.3 },
        },
      });

      if (insertError?.code === "23505") {
        duplicates++;
        const { data: existing, error: existingError } = await db.from("agri_intelligence_items")
          .select("id,metadata,is_published,verification_status")
          .eq("dedupe_key", dedupeKey)
          .maybeSingle();
        if (existingError) throw existingError;
        if (existing) {
          const refreshedMetadata = {
            ...(existing.metadata || {}),
            categories,
            geometry,
            sources,
            last_seen_at: new Date().toISOString(),
          };
          const refresh: Record<string, unknown> = { metadata: refreshedMetadata };
          if (!existing.is_published && existing.verification_status !== "disputed") {
            refresh.expires_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
            if (existing.verification_status === "expired") refresh.verification_status = "unverified";
          }
          const { error: refreshError } = await db.from("agri_intelligence_items").update(refresh).eq("id", existing.id);
          if (refreshError) throw refreshError;
        }
      } else if (insertError) throw insertError;
      else inserted++;
    }

    await db.from("agri_sources").update({
      last_checked_at: new Date().toISOString(),
      last_success_at: new Date().toISOString(),
      last_error: null,
    }).eq("id", source.id);

    return { checked: 1, inserted, duplicates, skippedOutOfArea, skipped: false };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "NASA EONET collection failed.";
    await db.from("agri_sources").update({
      last_checked_at: new Date().toISOString(),
      last_error: message,
    }).eq("id", source.id);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}


async function expireStaleItems() {
  const { data, error } = await db.from("agri_intelligence_items")
    .update({ verification_status: "expired", is_published: false })
    .not("expires_at", "is", null)
    .lte("expires_at", new Date().toISOString())
    .neq("verification_status", "expired")
    .select("id");
  if (error) throw error;
  return data?.length || 0;
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const authorization = request.headers.get("Authorization") || "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (supplied.length < 32 || supplied.length > 256) {
    return json({ error: "Scheduled collection is not authorised." }, 401);
  }

  try {
    const { data: credential, error } = await db
      .from("watchdog_cron_auth")
      .select("token_hash")
      .eq("id", true)
      .maybeSingle();

    if (error) throw error;
    if (!credential?.token_hash) return json({ error: "Scheduled collection is not configured." }, 503);

    const actualHash = await sha256Hex(supplied);
    if (!constantTimeEqual(actualHash, credential.token_hash)) {
      return json({ error: "Scheduled collection is not authorised." }, 401);
    }

    let eonet = { checked: 0, inserted: 0, duplicates: 0, skippedOutOfArea: 0 };
    let rss = { checked: 0, inserted: 0, duplicates: 0, failed: 0 };
    let failed = 0;
    try { eonet = await collectEonet(); }
    catch (error) { failed++; console.error("NASA EONET collection failed:", error instanceof Error ? error.message : "Unknown error"); }
    try { rss = await collectApprovedRss(); }
    catch (error) { failed++; console.error("Approved RSS collection failed:", error instanceof Error ? error.message : "Unknown error"); }
    let expired = 0;
    try { expired = await expireStaleItems(); }
    catch (error) { failed++; console.error("Intelligence expiry sweep failed:", error instanceof Error ? error.message : "Unknown error"); }
    return json({
      ok: failed === 0 && rss.failed === 0,
      checked: eonet.checked + rss.checked,
      inserted: eonet.inserted + rss.inserted,
      duplicates: eonet.duplicates + rss.duplicates,
      failed: failed + rss.failed,
      expired,
      skippedOutOfArea: eonet.skippedOutOfArea || 0,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Watchdog collector failed:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "Scheduled collection failed." }, 500);
  }
});
