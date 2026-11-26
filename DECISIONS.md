# Omulimi Architectural Decisions

## 001 — Product Rebrand
Status: Active
The product is Omulimi. User-facing branding uses Omulimi; technical identifiers change only when safe.

## 002 — One Unified Intelligence
Status: Accepted
Omulimi is one product and one shared intelligence context. Weather, Soil, Disease, Livestock, Market, Research, Product Intelligence, the Watchdog and Kato are capabilities within it—not separate AI products. Specialised models/APIs may operate behind the scenes, but farm identity, evidence and farmer experience are unified.

## 003 — Farm-Centred Identity
Status: Accepted
Location and production records belong to each farm, not to the farmer account globally. A farmer can own multiple farms. Each new farm captures its own location and registers its own crops and livestock. GPS coordinates are the geographic source of truth; administrative place names are descriptive labels.

## 004 — Farmer-Initiated and Proactive Intelligence
Status: Accepted
Farmers can initiate disease scans, soil assessments and questions whenever they choose. Omulimi also monitors credible external information and notifies farmers when developments are relevant to their farms. Neither mode replaces the other.

## 005 — Farm Asset Data Model
Status: Implemented (database foundation)
The farms table remains the parent. Multiple crop records live in farm_crops and animal records in farm_livestock. Legacy farms.crop remains temporarily for backward compatibility.

## 006 — Agricultural Intelligence Source Registry
Status: Implemented (initial foundation)
Omulimi monitors agricultural threats, news, opportunities, market developments, research and environmental information. Sources have explicit access and permission states. No source is enabled until its actual endpoint and commercial reuse conditions are checked. News reports are evidence leads, not automatically verified facts.

## 007 — Watchdog Is Background Intelligence
Status: Accepted
The Watchdog runs in the background and its alerts appear through the existing notification interface. It is not a separate page or standalone chatbot. Notifications are matched using both farm geography and registered crops/livestock. Nationally relevant alerts are not restricted to the district where a report originated.
