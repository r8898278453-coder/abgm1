# ABGM1 implementation blueprint

Latest grouped sales delivery (12 November2026 IST): [SALES_TEN_AREA_BATCH.md](SALES_TEN_AREA_BATCH.md) records ten connected CRM/sales/reporting work areas, exact implemented workflows and remaining parent criteria. Schema037/70, next038; historical001–036 unchanged. Current counts are generated in [STATUS.md](STATUS.md). No parent/phase or production promotion.

Latest durable-render delivery (12 November2026 IST): [DURABLE_REELS.md](DURABLE_REELS.md) supersedes earlier memory-queue/asset-approval pending notes. Schema036/64, next037; SQL recovery/cancellation, isolated resource-bounded worker, asset approval revisions and browser recovery are implemented. Rendering remains default off; Hostinger capability and full phase gates remain open. [STATUS.md](STATUS.md) gives current counts.

Latest continuation: [RENDER_INPUT_BOUNDARIES.md](RENDER_INPUT_BOUNDARIES.md) covers twelve connected rendering controls, actual local PNG smoke and explicit pending durable reel queue/asset approval. Current counts: [STATUS.md](STATUS.md).

Current security/policy checkpoint (12 November2026 IST): [SECURITY_POLICY_GROUP.md](SECURITY_POLICY_GROUP.md) records035/63 (next036), opt-in cookie/epoch security, canonical aliases, PKCE/refresh groundwork and client goals/shared admissions. P02-05/P02-06/P04-05 are locally accepted; seven other targets remain partial. Historical001–034 unchanged; no phase, provider activation or deployment accepted. Older schema/status notes below describe earlier checkpoints; STATUS.md is current.

Current local acceptance (12 November2026 IST): [ACCEPTANCE_TEN.md](ACCEPTANCE_TEN.md) accepts the original criteria for P02-01, P03-01/04/06 and P04-01/02/03/04/07/08 after the complete13-step matrix. These decisions supersede older in-progress notes for those tasks only. Schema034/60 unchanged. Full phase/hosting/provider/production gates and explicitly separate extension limits remain open; generated STATUS.md is current.

Saved onboarding continuation — 12 November2026 IST: [ONBOARDING_WORKFLOWS.md](ONBOARDING_WORKFLOWS.md) documents server resume/atomic completion, canonical source/website review, saved-only integration metadata and preserved legacy-text intake. [DELIVERY_AND_PENDING.md](DELIVERY_AND_PENDING.md) separates delivered scope and pending packages. Schema034/60 unchanged; current task counts are generated in STATUS.md; no phase/deployment acceptance.

Current ten-workflow continuation (12 November2026 IST): [AGENCY_TEAM_WORKFLOWS.md](AGENCY_TEAM_WORKFLOWS.md) records real team/assignment UI, scoped assignment revocation, location revision edits, persisted agency name, client search and bounded role changes. Schema034/60 unchanged; current counts/prerequisites in STATUS.md. This is child-deliverable progress, not full-parent/phase acceptance or deployment.

Current grouped-delivery checkpoint:034_agency_security_foundation /60 tables, next035;001–033 unchanged. Eleven linked work packages are in progress with exact scope/compatibility/limits in BATCH_10_AGENCY_SECURITY.md; STATUS.md gives current counts. Earlier schema totals below are historical. No production action.


Current implementation status: [STATUS.md](STATUS.md) is generated from all93 tracker entries, phase states and dependencies. Refresh with npm run docs:status; verify with npm run docs:check. Reviewed-fact checkpoint033/52 added reviewed business facts; [KNOWLEDGE_FACTS.md](KNOWLEDGE_FACTS.md) documents scope/limits. No phase or production deployment is accepted by this checkpoint.


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

Current source pipeline: schema032/51 and durable queue/worker recovery with private originals, source history and unapproved outcomes. [KNOWLEDGE_INGESTION_QUEUE.md](KNOWLEDGE_INGESTION_QUEUE.md) records runtime/hosting requirements and remaining import/fact/agency gates.

Durable website-run continuation (11 November2026 IST): background202 admission, existing worker, atomic page/source-job/result groups, no-page/partial history, scoped cancellation and client/lease/site fencing. Schema032/51 unchanged. See WEBSITE_IMPORT.md and evidence/durable-website-imports.json. Shared budgets/site/fact/agency/hosting gates remain open; task/phase acceptance unchanged.

Website-import daily accountability now adds five distinct run-transition counts and three current import backlog fields through the existing report/UI/CSV/digest. Commit is snapshot persistence, not extraction/approval; retry counts can overlap. See WEBSITE_IMPORT_REPORTING.md. Full agency/reporting phase gates remain open.

12 November2026 consumer checkpoint: reviewed structured facts now guide authorized chat, review-reply and marketing drafts with conflict/stale-context checks and private attempt records. Outputs still require review; this does not connect every autonomous/sales workflow. See KNOWLEDGE_DRAFTS.md and generated STATUS.md. Schema033/52 unchanged.
