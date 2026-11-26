# Omulimi Development Tasks

## Unified transformation status
- [x] Merge Kato farm-decision-context improvements (PR #18).
- [x] Add farm-location metadata foundation to the database.
- [x] Add farm crop and livestock record tables with owner-scoped RLS.
- [x] Build GPS-first farm creation during first sign-in and for every additional farm.
- [x] Add GPS recapture for existing farms that still have legacy district-centroid locations.
- [x] Add optional reverse-geocoded village/parish/subcounty labels without replacing GPS coordinates; labels are explicitly approximate and source-attributed.
- [x] Use saved GPS coordinates for Weather; prevent Soil Intelligence from silently using legacy district-centroid coordinates.
- [x] Scope disease scan history and newly created crop-care records to the selected farm; preserve the farm used when a scan starts.
- [x] Give Kato the selected farm's saved GPS metadata, administrative labels, farm size, registered crops, and registered livestock; keep missing asset details explicitly unknown.
- [x] Build a shared owner-scoped farm context resolver and authenticated endpoint; wire Kato to the shared resolver.
- [ ] Migrate all intelligence capabilities to consume the shared farm context contract.
- [x] Create the initial agricultural source registry with access/permission states and source provenance fields.
- [x] Create the agricultural intelligence evidence-item model and farm-scoped notification records with owner-scoped RLS.
- [x] Add an in-app notification drawer in the existing Omulimi header (no separate Watchdog page).
- [x] Add an admin-protected RSS ingestion endpoint for approved, explicitly enabled feeds; new entries remain unpublished for review.
- [x] Add an admin-only publishing endpoint requiring verification notes and explicit geographic scope; match published items against registered crops and livestock.
- [ ] Verify and configure approved source endpoints and licences before enabling ingestion.
- [ ] Add source review and publishing controls to Command Centre.
- [ ] Add non-RSS adapters for approved APIs and datasets, with source-specific validation and freshness rules.
- [ ] Add scheduled ingestion and stale-item/opportunity expiry automation.
- [ ] Connect Watchdog notifications to Web Push using the existing PWA subscription infrastructure.
- [ ] Build unified decision-support orchestration for Kato and module assessments.

## Engineering checks
- Preserve existing farmer records and feature functionality.
- Do not silently create a farm using a district centroid.
- Do not infer missing planting dates, growth stages, farm size, animal counts or treatments.
- Keep farmer/farm data protected by owner-scoped RLS.
- Test database ownership policies and frontend flows before marking work complete.
