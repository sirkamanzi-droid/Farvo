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

The production Supabase project has the hourly job registered through pg_cron + pg_net. The shared bearer secret is stored in Supabase Vault under `watchdog_cron_secret`; do not copy it into source control or client code. The job is currently inactive because Vercel has not accepted the deployment yet. After the endpoint is live and returns the expected unauthorised response to a request without a bearer token, activate the existing job:

```sql
select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'omulimi-watchdog-collection'),
  active := true
);

-- The existing job's command is shown below for reference:
-- select cron.schedule(
--   'omulimi-watchdog-collection',
--   '0 * * * *',
--   $
  select net.http_post(
    url := 'https://omulimiapp.vercel.app/api/watchdog/cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'watchdog_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
--   $
-- );
```

The endpoint checks the bearer token against the stored hash before running ingestion. Once activated, the Cron job runs at the start of every hour (UTC); inspect `cron.job_run_details` for execution history. Only explicitly enabled and approved sources are collected.
