# Omulimi Development Tasks

## Unified transformation status
- [x] Merge Kato farm-decision-context improvements (PR #18).
- [x] Add farm-location metadata foundation to the database.
- [x] Add farm crop and livestock record tables with owner-scoped RLS.
- [x] Build GPS-first farm creation during first sign-in and for every additional farm.
- [x] Add GPS recapture for existing farms that still have legacy district-centroid locations.
- [ ] Add reverse geocoding for village/parish/subcounty labels without replacing GPS coordinates.
- [x] Use saved GPS coordinates for Weather; prevent Soil Intelligence from silently using legacy district-centroid coordinates.
- [ ] Move disease scans and crop-care records fully onto selected-farm context.
- [ ] Build shared farm context API consumed by all intelligence capabilities.
- [ ] Build unified evidence/provenance model for watchdog discoveries and product catalogue.
- [ ] Build watchdog ingestion, relevance filtering and alert delivery.
- [ ] Build unified decision-support orchestration for Kato and module assessments.

## Engineering checks
- Preserve existing farmer records and feature functionality.
- Do not silently create a farm using a district centroid.
- Do not infer missing planting dates, growth stages, farm size, animal counts or treatments.
- Keep farmer/farm data protected by owner-scoped RLS.
- Test database ownership policies and frontend flows before marking work complete.
