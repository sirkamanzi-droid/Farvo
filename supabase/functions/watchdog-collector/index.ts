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
  if (/flood|drought|wildfire|volcano|severe storm|cyclone|landslide|dust storm/.test(lower)) return "threat";
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

      if (insertError?.code === "23505") duplicates++;
      else if (insertError) throw insertError;
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

    const result = await collectEonet();
    return json({ ok: true, ...result, completedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Watchdog collector failed:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "Scheduled collection failed." }, 500);
  }
});
