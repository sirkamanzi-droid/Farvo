# Omulimi Agricultural Intelligence Sources

This is the initial source registry for Omulimi's unified agricultural intelligence capability. It is a catalogue and permission-control layer, not a claim that every source is already being polled.

## Access states

- `approved`: the general source or dataset has a reuse route that appears suitable, but the specific endpoint, dataset licence, attribution and production access still need to be configured and checked.
- `review_required`: public information exists, but the official feed/API, automated access rules or dataset terms have not yet been confirmed.
- `permission_pending`: do not automate collection or AI processing until the publisher/provider grants the necessary permission or a suitable licence is obtained.
- `blocked`: do not ingest.

No source is enabled by default. A source must have a verified endpoint, documented access conditions, a polling interval and a named owner before it is activated.

## Seeded source registry

| Source | Category | Initial access state | Intended information |
|---|---|---|---|
| Uganda Media Centre | Government | Review required | Official announcements, programmes and agriculture-related news |
| MAAIF | Government | Review required | Agricultural policy, disease notices, programmes and statistics |
| NARO | Research | Review required | Ugandan research, crop/livestock innovations, training and opportunities |
| NIFAMIS | Government | Review required | Agriculture, crop/livestock statistics and advisory datasets |
| FEWS NET | Markets | Approved route; endpoint setup pending | Market prices, trade, food security and climate risk |
| FAO | Development/statistics | Approved route; dataset review pending | Agricultural statistics, livestock and food security |
| ICPAC | Climate | Review required | East African climate outlooks and early warnings |
| NASA Earthdata/GIBS | Earth observation | Approved route; dataset setup pending | Satellite observations and environmental indicators |
| NASA EONET | Earth observation | Approved metadata API; endpoint setup pending | Near-real-time natural-event metadata and event geometry |
| Copernicus Data Space | Earth observation | Approved route; dataset setup pending | Sentinel imagery and environmental observations |
| Daily Monitor | News | Permission pending | Ugandan news and business developments with agricultural relevance |
| New Vision | News | Permission pending | Ugandan news, agriculture and policy |
| BBC News | News | Permission pending | Africa and global developments relevant to farmers |
| Reuters | News | Permission pending | Business, commodities and international developments |
| CABI | Research | Permission pending | Crop protection, pests and plant disease knowledge |

## Ingestion rules

1. Prefer official APIs, documented open datasets and publisher-provided feeds.
2. Do not scrape or process publisher content where terms prohibit it.
3. Store source metadata, article title, canonical link, publication/retrieval dates and a short permitted summary; do not mirror full copyrighted articles.
4. Treat a news report as a lead. Consequential claims need corroboration from primary or independent credible sources.
5. Keep publication date separate from retrieval date. Expired opportunities and stale market prices must not be presented as current.
6. Match both geography and registered farm assets. A national alert can reach relevant farmers anywhere in Uganda; district/local alerts use their stated coverage. Crop and livestock matching are both required.
7. Satellite observations must retain dataset, acquisition date, spatial resolution and uncertainty. They are not proof of crop disease.
8. No source is allowed to publish directly to farmers without validation, deduplication and expiry checks.

## Current implementation boundary

The database now contains the source registry, evidence-item model and farm-scoped notification model. The app has an in-app notification drawer. An admin-protected RSS collector imports only explicitly enabled, approved publisher feeds into an unpublished review queue. An admin/MFA-protected publish endpoint requires verification notes and explicit geographic coverage, then matches the item against registered crops and livestock to create farm-scoped notifications. The first seeded sources are all disabled because actual feed/API endpoints and licences still need configuration. The MFA-protected Command Centre now includes source endpoint/access controls, an approved-feed collection action, an unpublished evidence review queue, and a verification/geography/asset publishing form. Source review actions are audited. NASA EONET v3 is registered separately from NASA Earthdata/GIBS and supported as a structured API adapter. It imports open natural-event records into the unpublished review queue with event IDs, categories, source attribution and geometry metadata. The geography is deliberately left for human review; NASA event geometry is not automatically converted into a farm-level diagnosis or district alert. FEWS NET's documented public REST API is registered but its market-series field mapping and Uganda dataset coverage still need validation before enabling ingestion. A secret-protected scheduled-run endpoint is available. A 256-bit bearer secret is stored in Supabase Vault, while only its SHA-256 hash is held in a service-role-only table. The hourly Supabase Cron job is registered in production but deliberately inactive until the Vercel runner is deployed and verified. Its database schedule is `0 * * * *` (top of each UTC hour). Watchdog Web Push delivery remains follow-on work. Existing crop-care push delivery remains separate.


## Scheduled collection

The production Supabase project runs `watchdog-collector`, a deployed Supabase Edge Function. It validates a random bearer secret against a SHA-256 hash stored in the service-role-only `watchdog_cron_auth` table. The original bearer secret is stored in Supabase Vault as `watchdog_cron_secret`.

The production Supabase Cron job `omulimi-watchdog-collection` is active on `0 * * * *` (at the start of every UTC hour). It calls the Edge Function directly through `pg_net`, so scheduled monitoring does not depend on a Vercel deployment.

The collector:
- Polls the approved, enabled NASA EONET v3 source using the Uganda screening bounding box (longitude 29.5–35.1, latitude -1.6–4.3).
- Polls approved, enabled RSS sources with HTTPS and publisher-domain validation, redirect checks, response-size limits and duplicate detection.
- Keeps all new evidence unpublished for administrator review. NASA event geometry is a screening signal, not proof of an exact district or agricultural impact.
- Expires stale intelligence hourly. Default expiry windows are 7 days for market items, 14 days for threats/environment items, 30 days for news/opportunities, and 180 days for research. Opportunity publication still requires a specific future closing/review date.

NASA EONET returned no events inside the Uganda screening bounds during the initial live test. This is a valid zero-result check, not a failed request. Its source is enabled and will be checked hourly. The separate NASA Earthdata/GIBS source remains disabled until a specific dataset and workflow are selected.

The Vercel `/api/watchdog/cron` endpoint remains in the repository but is not used by the active production schedule.
