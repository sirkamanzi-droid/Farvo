# Omulimi Architecture

## Product model
Omulimi is one unified agricultural intelligence product. Weather, soil, crop disease, livestock, markets, research, products, alerts and Kato are capabilities and data sources within one shared farm context—not independent products or separate farmer identities.

## Current application structure
- Frontend: React 19 + TypeScript + Vite.
- Backend: Express server entry (server.ts) plus Vercel API handlers in api/.
- Database/auth: Supabase Postgres and Supabase Auth.
- Deployment: Vercel.
- Existing AI integration: Kato API in api/chat.ts; crop disease and soil analysis endpoints in api/.
- Existing farm context: farms table, with farm-scoped Kato conversations, soil assessments and crop-care plans.

## Unified farm identity foundation
- farms remains the parent record for each farm and its precise coordinates.
- GPS coordinates are distinct from the administrative district label. A district centroid must never overwrite captured farm coordinates.
- farm_crops stores multiple crops, planting dates, varieties, growth stages and crop-specific notes per farm.
- farm_livestock stores species, breeds, counts, production purpose and animal records per farm.
- Existing farms.crop remains a compatibility field while current screens migrate to the multi-crop model.
- Existing farms are preserved. Their location source defaults to legacy_district until the farmer captures a precise location.

## Shared intelligence direction
- All modules read authorised information from the selected farm context.
- Assessments and observations are stored with farm ownership, timestamps and source/provenance.
- A single decision-support layer assembles relevant evidence for Kato and proactive alerts.
- Watchdog discoveries are stored once and routed to relevant farm/module experiences after relevance and source checks.

## Safety and data quality
- GPS accuracy is recorded; village-level precision cannot be guaranteed on every device or in every environment.
- Reverse-geocoded village/parish/subcounty names are labels, not substitutes for coordinates.
- Satellite products enrich environmental understanding; they do not replace phone GPS for exact farm positioning.
- Estimated soil/satellite/weather values must be labelled with source, timestamp, spatial resolution and uncertainty.
