# ABGM1 implementation blueprint

Prepared: 2 November 2026. This is the implementation plan, not a claim that the features are implemented.

## Start here

1. [MASTER_PLAN.md](MASTER_PLAN.md) — canonical specification: scope, 24 gaps, 52 requirements, architecture/data/API contracts, 17 feature specifications, phase gates, testing and rollout.
2. [TASKS.csv](TASKS.csv) — 93 ordered work packages across 11 engineering phases, with dependencies, canonical owners/files, migration batches, acceptance evidence and external prerequisites.
3. [EXECUTION.md](EXECUTION.md) — current status, next task, evidence/decision templates and resume protocol.

Previous observation checkpoint (9 November 2026 IST): [observation persistence evidence](evidence/local-seo-observation-truth.json),81 isolated programs and unchanged029/50 schema. See EXECUTION for remaining gates and separate Git review delivery.

Current reliability continuation: [competitor commands and contract evidence](evidence/competitor-commands-and-contracts.json), [API compatibility review](API_COMPATIBILITY.md),83 isolated programs; phase gates remain open.

Latest security/integration checkpoint (10 November 2026 IST): [compatibility and boundaries](AUTH_AND_INTEGRATION_BOUNDARIES.md),86 isolated programs and unchanged schema. Phase gates remain open.

Latest knowledge checkpoint: [private sources and extraction](KNOWLEDGE_SOURCES.md), source schema030/51 and88 isolated programs. P04 foundations are in progress; phase gates remain open.

## Product outcome

One main agency account manages many client businesses. Each client has isolated source-backed website/PDF knowledge, branding, integrations, marketing and sales workflows. Shared CRM/conversation history connects inquiries and supported outbound to qualification, follow-up, appointments, outcomes and daily accountability. Routine actions run within approved rules; uncertain/sensitive decisions and new spending escalate. Billing expansion is excluded.

## Implementation order

| Engineering phase | Delivery |
|---|---|
| P00 | Baseline, hosting/runtime and migration evidence |
| P01 | Critical fixes, isolation, durable queue and action ledger |
| P02 | Canonical modules/contracts, auth and integration foundations |
| P03 | Persisted agency, clients, locations and scoped UX |
| P04 | Actual website/PDF ingestion, verified knowledge and onboarding |
| P05 | Google/Meta publishing, reviews, SEO, dynamic content/calendar and storefront |
| P06 | Deduplicated CRM, opportunities, inbox and delivery truth |
| P07 | Sales sequences, qualification, booking and retention |
| P08 | Selective B2B outbound, attribution, controlled optimization and integrations |
| P09 | Daily client/agency accountability, alerts, portals and responsive UX |
| P10 | Security, capacity, restore/rollback, staged release and handover |

These are dependency subdivisions of the six agreed product workstreams, not a change in product direction. Ledger instrumentation begins in P01; reporting is not retrofitted at the end. Contact consent/touchpoints and usage tracking are captured before follow-up and optimization features use them.

## How duplicate work is avoided

- Existing companies, leads, queue, publishing, scoring and provider foundations are extended through named owners.
- server.ts/App.tsx/db.ts receive immediate narrow safety fixes, then planned modular extraction; new features go into their own modules.
- Historical migrations stay frozen. New changes use forward migrations and versioned contracts.
- One plan is authoritative, one task index tracks work, one concise execution file carries context. No repeated rewriting of old status documents.
- Tests and live evidence decide completion. Optional provider blockers remain visible and do not block independent reporting work.

No production implementation, source edit, dependency change or deployment was performed while preparing this plan. The user should review product choices; implementation starts with P00-01 when instructed.

Campaign continuation: [CAMPAIGN_PERSISTENCE.md](CAMPAIGN_PERSISTENCE.md) records SQL/HTTP/client recovery fixes and remaining execution gates; phase acceptance is unchanged.

Website importer foundation: [WEBSITE_IMPORT.md](WEBSITE_IMPORT.md) describes the bounded snapshot transport and incomplete integration/acceptance gates.

Current registered website source workflow: schema031/51, private originals and URL/time provenance, review/search/retry and Knowledge UI. See WEBSITE_IMPORT.md; queue/history/conflict/hosting gates remain open.

Current source lifecycle history and durable daily source counts: [KNOWLEDGE_HISTORY.md](KNOWLEDGE_HISTORY.md). Schema031/51 unchanged; durable ingestion queue remains pending.
