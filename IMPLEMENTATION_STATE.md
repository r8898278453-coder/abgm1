# Implementation State

20 November 2026 IST. P07-05 advances with default-off automatic Calendar channel renewal, atomic replacement, durable Google-side stops, and ambiguous-response recovery that preserves established channels and exact polling. Migration 061 adds lifecycle jobs. Live Google OAuth, callback and pilot acceptance remain open. Tracker 62 validated, 15 in progress, 15 planned and one blocked. See CALENDAR_PUSH.md.

20 November 2026 IST. P07-05 advances with scoped Google Calendar push registration, renewal eligibility, local disable, expiry, durable duplicate and order protection, and a bounded wake-up for exact event polling. Migration 060 adds the Calendar channel table. Live Google OAuth, public callback acceptance, and the P07-08 pilot remain open. Tracker 62 validated, 15 in progress, 15 planned and one blocked. See CALENDAR_PUSH.md.

20 November 2026 IST. P07-05 advances with default-off Calendar reconciliation through the existing dispatcher, with durable leases, capped backoff, actor scope rechecks, exact CRM revisions and IST change and availability reporting. Migration 059 extends the existing Calendar intent table. Live Google OAuth, Google push subscriptions and the P07-08 pilot remain open. Tracker 62 validated, 15 in progress, 15 planned and one blocked. See CALENDAR_RECONCILIATION.md.

20 November 2026 IST. P07-05 advances with operator-triggered Google Calendar refresh for exact tracked events and a pre-send reminder check. Verified external reschedules and cancellations append a CRM revision, stop old reminders and enter the IST Sales report. Unconfirmed event reads defer tracked reminder sends. Live Google access, automatic Calendar change subscriptions and P07-08 pilot remain open. Tracker 62 validated, 15 in progress, 15 planned and one blocked. See CALENDAR_EXTERNAL_OBSERVATIONS.md.

20 November 2026 IST. P07-05 advances with booking-bound customer WhatsApp reminder reviews, IST scheduling, revision and consent checks, and separate review and provider acceptance reporting. The existing exact-message approval and sender controls are reused. Live provider acceptance and the appointment pilot remain open. Tracker 62 validated, 15 in progress, 15 planned and one blocked. See APPOINTMENT_REMINDER_WORKFLOW.md.

20 November 2026 IST. P07-05 advances with scoped Google Calendar reschedule and cancellation, conditional event writes, exact recovery, optional Calendar popup reminders, and separate IST Sales activity for verified changes. Migration 058 extends the existing intent ledger. Calendar writes default off. Live Google acceptance, customer reminder delivery and the appointment pilot remain open. Tracker 62 validated, 15 in progress, 15 planned and one blocked. See CALENDAR_CREATE_AND_RECOVERY.md.

20 November 2026 IST. P07-05 advances with operator-initiated Calendar creation, tenant-scoped conflict checks, durable duplicate protection, and provider verification that stops CRM inquiry follow-ups. The IST Sales report includes verified bookings and pending confirmations. Migration 057 brings the canonical schema to 103 tables. Calendar creation defaults off. Provider reschedule, cancellation and reminders, live OAuth and the appointment pilot remain open. Tracker 62 validated, 15 in progress, 15 planned and one blocked. See CALENDAR_CREATE_AND_RECOVERY.md.

20 November 2026 IST. P07-05 advances with per-client Google Calendar credentials, FreeBusy observations, exact confirmed event verification, IST form integration and role/credential change checks. Provider calendar writes, reminders, live OAuth and the appointment pilot remain open. Tracker 62 validated, 15 in progress, 15 planned and one blocked. See CALENDAR_READ_VERIFICATION.md.

20 November 2026 IST. P07-04 met local acceptance for the inquiry exit and send-race criteria. Versioned CRM appointment evidence cancels pending follow-up and prevents old workflows from resuming. P07-05 advances with operator-recorded confirmation, reschedule and cancellation. Live calendar availability, provider-created appointments, reminders and the P07-08 pilot remain open. Tracker 62 validated, 15 in progress, 15 planned and one blocked. Schema 056 and 102 canonical tables. See BOOKING_EVIDENCE_AND_FOLLOWUPS.md.

20 November 2026 IST. Google account, location and review batch advances P05-01, P05-04 and P01-05. Exact scoped reads, complaint review, pre-write checks, verified reply read-back, tenant-safe concurrent Places dedupe and explicit unconfirmed import warnings are implemented. Live OAuth and complete review workflow acceptance remain open. Tracker 61 validated, 15 in progress, 16 planned and one blocked. See GOOGLE_REVIEW_ACCESS_AND_SYNC.md.

20 November 2026 IST. P05-11 and P06-08 met local acceptance. Google post dispatch reports unavailable before a provider attempt, Content Studio opens without an invented offer, and Integrations shows unavailable tenant email. Publishing, signed intake, receipts, consent, dedupe and approved WhatsApp reply contracts were verified in fixtures. Live provider evidence remains open. Tracker 61 validated, 13 in progress, 18 planned and one blocked. See MARKETING_CHANNEL_ACCEPTANCE.md.

20 November 2026 IST. P09-07 and P09-08 met local acceptance. The workspace navigation collapses at mobile widths and the report and reply review use the available space. The three-client SQL and HTTP fixture verified separate dental clinic and manufacturing counts, an empty client and assigned-viewer access. Tracker 59 validated, 14 in progress, 19 planned and one blocked. See MOBILE_ACCOUNTABILITY_ACCEPTANCE.md.

20 November 2026 IST. Local agency and knowledge acceptance completed for P03-07 and P04-09. The tracker records 57 validated, 15 in progress, 20 planned and one blocked. Explicit role and empty-client checks, persisted locations, image-only and mixed PDF classification, source lifecycle and approved workflow context were verified. See AGENCY_KNOWLEDGE_ACCEPTANCE.md.

Agency operations group —20 November2026 IST: overview model4/16 metrics adds saved connection verification/expiry signals, fresh database role checks and authorized per-client capacity/declared-cost drill-down, exact private DTOs, currency-separated amounts, safe unknown-health/revenue states and on-demand390px UI. Original P09-02 locally validated; tracker55 validated/15 in_progress/22 planned/1 blocked of93. Schema055/101, next056 and frozen report V4 unchanged. No migration, production write, deployment, provider call or billing work. See AGENCY_OPERATIONS_DRILLDOWN.md and evidence/agency-operations-drilldown.json. Hosting, universal RBAC/accessibility and other phase gates remain open.

Attribution boundary V2 group —20 November2026 IST: versioned first/last evidence snapshots, exact sorted record provenance, untimed-history withholding, strict tie/revision/count validation and private CSV/UI integration. See ATTRIBUTION_BOUNDARY_V2.md. P08-05 remains in_progress; tracker54/16/22/1 unchanged. No migration, production change, provider request or billing work.

OAuth recovery group —20 November2026 IST: atomic active-client state admission, context-bound encrypted PKCE state, copied-ciphertext refusal, archive/revocation settlement fences, strict refresh token/snapshot validation and explicit stale-owner-safe lease release. See OAUTH_REFRESH_RECOVERY.md. P02-07 remains in_progress; tracker54/16/22/1 unchanged. No migration, provider exchange, deployment or production changes.

Developer interoperability group —20 November2026 IST:35 connected slices add client/scoped expiring API keys, hash-only secrets, one-time issuance, stable creation receipts, rotation/revocation, SQL minute limits, canonical contacts/IST sales/event readers, encrypted metadata-webhook subscriptions, atomic CRM event outbox, signed bounded DNS-pinned HTTPS delivery, same-event retries/dead letters/stale-worker recovery and existing budgeted scheduler integration. Original P08-07 locally validated; tracker54 validated/16 in_progress/22 planned/1 blocked of93. Forward055/101 tables, next056; historical001–054/frozen V4 unchanged. Read-only API and selected CRM events only; email/MCP/other modules and hosting/provider/pilot/phase gates remain pending. Webhook delivery defaults off; no production changes, deployment, real external delivery/send or model spend. Billing excluded; rendering default off. See DEVELOPER_ACCESS.md, DEVELOPER_ACCESS_BATCHES.csv and evidence/developer-access.json.

CRM identity and inbox group —19 November2026 IST: reversible tenant-local contact links, immutable replay commands, ambiguity review/backfill, bounded grouped threads, encrypted private files and explicit verified WhatsApp media import delivered together. Original P06-01/P06-06 locally validated; P06-08 remains in_progress. Tracker53 validated/16 in_progress/23 planned/1 blocked of93. Forward054/97 tables, next055; historical001–053 and frozen report V4 unchanged. Evidence: CRM_IDENTITY_AND_INBOX.md, CRM_IDENTITY_BATCHES.csv and evidence/crm-identity-and-inbox.json. Supported email remains unavailable; hosting/provider activation, remaining original criteria and production rollout stay pending. No deployment, production DB write, real send or model spend; billing excluded and rendering default off.

Local marketing evidence group —19 November2026 IST: 22 connected functional slices repair calculated profile/rating/reply/summary truth and canonical fresh rank inputs, add exact selected Place-ID matching, bounded provider JSON/latency, atomic rank history/profile/revision/audit, source/actor/archive fences, comparable baselines, stale competitor protection and three-keyword partial batches with continuation. Original P05-02/P05-03 locally validated against unchanged acceptance. Tracker51 validated/17 in_progress/24 planned/1 blocked of93. Schema053/93, next054 and frozen V4 unchanged. Actual Google OAuth, review/post publishing, Meta, hosting/provider acceptance and remaining tasks stay pending. See LOCAL_MARKETING_EVIDENCE.md, LOCAL_MARKETING_BATCHES.csv and evidence/local-marketing-evidence.json. No production changes, real scans/sends, rendering activation, billing or model spend.

Channel/workflow recovery group —19 November2026 IST: signed exact-attempt WhatsApp callback/receipt correlation closes UNKNOWN acceptance without resend; atomic receipt/intake/audit rollback, receipt-before-HTTP settlement, private inbox evidence, non-stealing worker recovery, idempotent terminal bookkeeping and failed-delivery successor cancellation added. Original P06-02/P06-03/P06-05/P07-03 locally validated against unchanged criteria. Tracker49 validated/17 in_progress/26 planned/1 blocked of93; schema053/93, next054 and frozen V4 unchanged. Supported WhatsApp scope only; tenant email, cross-channel inbox, booking and remaining original tasks stay pending. See CHANNEL_WORKFLOW_RECOVERY.md and evidence/channel-workflow-recovery.json. No production/provider activation, deployment, billing or real sends/spend.

Five-original-task readiness group —19 November2026 IST: P01-09/P05-10/P10-03/P10-05/P10-06 locally validated together after UI truth repairs, protected live snapshot controls, configurable credential-free verified-origin storefront intake, measured timer/bundle improvement, one17-area/all93-task capability manifest, current handover/competitor evidence and clean-source review-only artifact/diff/runbook packaging.149 isolated default programs, complete disposable MariaDB10.11.19, nine distinct targeted browsers, TypeScript/build,277 routes/51 registrations/no collisions and source/docs/capability/frontend guards passed. Tracker45 validated/21 in_progress/26 planned/1 blocked of93. Schema053/93, next054/frozen V4 unchanged; no migration. Source comparison and package preparation do not establish deployed baseline, rollback compatibility or production acceptance; executionAllowed=false. See GROUPED_READINESS_DELIVERY.md, GROUPED_READINESS_BATCHES.csv, CAPABILITIES.md, CANARY_RUNBOOK.md and evidence/grouped-readiness.json. Hosting/provider/pilot/phase gates remain; no deployment, production DB write, model spend or real customer/provider send. Public competitor HTTP reads and Git review operations only. Billing excluded; render/send defaults remain off.

Fulfillment-gated retention —19 November2026 IST:15 connected slices add separately declared primary service completion, private normalized-contact binding,1/7/30-day eligibility, per-event/contact cooldown across duplicate leads, reviewed repeat-business preset, canonical queue/context/final-permit checks, atomic revoke/opt-out exits, primary invalidation, exact latest-receipt recovery and scoped IST evidence UI. Nested deal/fulfillment/handoff receipts are omitted from canonical wire responses; primary audit keeps outcome metadata.145 isolated regressions plus final contract/SQL checks, full disposable MariaDB10.11.19, three targeted browser workflows, TypeScript/build,277 routes/50 registrations/no collisions,53 migration-source/docs and frontend guards pass. P07-06 locally validated; tracker40 validated/23 in_progress/29 planned/1 blocked of93. Schema053/93, next054/frozen V4 unchanged; no migration. Prerequisite booking/channel/phase and hosting/provider/pilot gates remain open. Explicit reviewed enrollment only; no autonomous completion scanner, deployment, production DB write, real send or model spend. Billing excluded; rendering default off. See RETENTION_FULFILLMENT.md, RETENTION_BATCHES.csv and evidence/retention-fulfillment.json.

Grounded qualification and routed handoff —19 November2026 IST:15 connected slices add six industry question packs with sector context, exact approved-catalog matching, explainable declared readiness/unknown escalation, durable specialist routing and assignee-only accept/resolve, cancellation/history, current role/knowledge/policy fences, replay/lost-ACK recovery, canonical audit and a current-person pending queue. Existing qualification/policy/knowledge stores reused; no new migration.144 isolated regressions, full disposable MariaDB10.11.19, three distinct targeted browsers, TypeScript/build,275 routes/50 registrations/no collisions and source/docs/frontend guards pass. P07-01 locally validated; tracker39 validated/24 in_progress/29 planned/1 blocked of93. Schema053/93, next054/frozen V4 unchanged. No prerequisite phase, provider/hosting or production acceptance. P07-06 retention and broader reporting remain pending. See QUALIFICATION_HANDOFFS.md, QUALIFICATION_HANDOFF_BATCHES.csv and evidence/qualification-handoffs.json. Billing excluded; rendering default off; no deployment, production DB write, real provider send or model spend.

Multiple-deal group —19 November2026 IST: canonical primary plus five independent additional deals, shared parent/per-deal revisions, close/reopen reasons, next actions/IST due time, bounded replay receipts, atomic audit, legacy quick-stage protection, scoped manual portfolio and private CSV/UI added. Existing source/cost/daily backlog stays contact/primary scoped; additional deal saves reuse canonical audit events. No migration;053/93, next054/frozen V4 unchanged. Final validation:143 credential-isolated default programs, full disposable MariaDB10.11.19 suite (including lost commit ACK recovery and strict authenticated HTTP),4 distinct targeted browser workflows, TypeScript/build,271 routes/50 registrations/no collisions, migration-source/docs and frontend budget guards passed. P06-07 locally validated; tracker38 validated/25 in_progress/29 planned/1 blocked of93. No prerequisite phase or live deployment accepted. See MULTIPLE_DEALS.md and evidence/multiple-deals.json. No production/model/provider actions; rendering default off and billing excluded.

Original-task grouped closure —18 November2026 IST:20 original work packages audited against unchanged criteria;9 locally validated (P01-02,P03-03,P03-05,P05-08,P05-09,P07-02,P07-07,P09-03,P09-04),11 retain explicit real gaps. Tracker now37 validated/26 in_progress/29 planned/1 blocked of93. Includes new focused client-pack navigation, removal of simulated sidebar ACTIVE/94%/footfall, final legacy Ads/Telegram archive checks, creative output authority/asset recheck and measured three-worker render admission max1. 142 isolated regressions,31/31 browsers and full disposable MariaDB053/93 passed. No phase/hosting/provider activation accepted. See ORIGINAL_TASK_CLOSURE_REVIEW.md, ORIGINAL_TASK_CLOSURE_REVIEW.csv and evidence/original-task-closure-review.json. Rendering/default-off transport flags, billing and production deployment unchanged.

Attachment final verification —18 November2026 IST:141 isolated regression programs, full disposable MariaDB053/93 and3 targeted browser workflows passed. Actual engine with fully intercepted transports verified stable HTTPS photo payload, Instagram revocation blocking its second step, mocked Facebook success with strict SQL timestamps and already-published no resend. Empty SQL published lookup and ISO timestamp bugs repaired. Eight-way attach replay/audit rollback/lost-ACK detach, proof corruption, current approval/bytes and immutable snapshots covered. TypeScript/build,267 routes/50 registrations,53-source/doc guards pass; normal App closure583053 raw/168878 gzip bytes. No actual provider/model/customer send, deployment or production DB write. Tracker28/35/29/1 unchanged. See evidence/calendar-photo-attachments.json.

Calendar photo attachment —18 November2026 IST: explicit mapped photo attach/detach with post/plan CAS, canonical pending-approval transition and append-only full binding proofs added. Original text snapshots remain unchanged. Scheduling/provider-boundary approval/byte checks and bounded content-addressed HTTPS delivery preparation reuse canonical publishing; no send occurs during attachment. No migration; schema053/93, next054/frozen V4 unchanged. Plan manifest cap32KiB; total revisions64 unchanged. See CALENDAR_PHOTO_ATTACHMENTS.md and evidence/calendar-photo-attachments.json. P05-07/P05-08 remain in_progress; tracker28/35/29/1 unchanged. Live hosting/provider/GBP and broader strategy/retention acceptance remain pending; no billing/render activation/deployment.

Photo-guidance final verification —18 November2026 IST:140 isolated regression programs, full disposable MariaDB053/93 suite and3 targeted browser workflows (calendar/lazyFeatures/workspaceIsolation) passed. Invalid refs/changed bytes stop admission before model use; revocation during callback yields PHOTO_REVIEW_REQUIRED/no snapshot; renewed exact references save text-only posts with image_url NULL. Lost-ACK guidance recovery and explicit same-byte reuse controls verified. TypeScript/build,265 routes/50 registrations,53-source/doc guards pass; normal App closure583053 raw/168882 gzip bytes. Schema/tracker28/35/29/1 unchanged; no production actions. See evidence/calendar-photo-guidance.json.

Calendar photo guidance —18 November2026 IST: immutable per-topic approved photo IDs/revisions/hashes, explicit same-byte reuse permission, inspected page-only picker and confirmation added. Same-client approval/current bytes checked at plan creation and mapped generation admission/settlement; revoked/changed output is withheld. Recorded approval freshness is separate from current bytes. Successful posts remain text-only drafts; no implicit attachment/render/publication. Existing plan/approval/model/writer engines reused, no migration. Schema053/93, next054/frozen V4 unchanged. See CALENDAR_PHOTO_GUIDANCE.md and evidence/calendar-photo-guidance.json. P05-07/P05-08 remain in_progress; tracker28/35/29/1 unchanged. Actual media-use binding/publication-time validation and broader strategy remain pending.

Inspected-library final verification —18 November2026 IST:139 isolated regression programs, full disposable MariaDB053/93 suite and3 targeted browser workflows (assetLibrary/lazyFeatures/renderOperations) passed. Exact duplicate/default selection, changed/revoked/missing files,10+3 pagination/cursor invalidation, fresh actor refusal and uint64 exhaustion covered. Focused HTTP auth/query/no-store checks pass. TypeScript/build,265 routes/50 registrations, migration-source/doc guards pass; normal App closure583013 raw/168856 gzip bytes. Browser registry29 is not a claim of a fresh29-fixture run. Schema and tracker28/35/29/1 unchanged; no production actions. See evidence/inspected-asset-library.json.

Inspected asset library —18 November2026 IST: on-demand10-file pages distinguish stored approval/current bytes, observed exact duplicates and possibly stale recorded approval matches; private CSV, metadata-bound cursors and post-inspection authority/catalog rechecks added. New default render selection deduplicates approved photo hashes; existing approval writer rechecks fresh SQL authority and handles exact uint64 exhaustion. No migration; schema053/93, next054 and frozen V4 unchanged. See INSPECTED_ASSET_LIBRARY.md, INSPECTED_ASSET_BATCHES.csv and evidence/inspected-asset-library.json. P05-07/P05-09 remain in_progress; tracker28 validated/35 in_progress/29 planned/1 blocked of93. No rendering activation, deletion, billing, deployment or real model/provider sends.

Reviewed strategy verification —18 November2026 IST:138 credential-isolated regression programs, full disposable MariaDB053/93 suite and3 distinct targeted browser workflows (calendar/root2 of2; final calendar/lazy2 of2) passed. Strict contract/legacy hash, effective fact revision/fingerprint, brand refusal/no snapshot, explicit retry and private lexical preview checks included. TypeScript/build and264 route declarations/50 registrations pass; full normal App closure583013 raw/168861 gzip bytes remains within budgets. No new migration or restore rehearsal; prior053 export evidence retained. Tracker28/35/29/1 of93 unchanged; P05-08 remains in_progress. See evidence/reviewed-calendar-strategy.json. No production/model/provider actions.

Reviewed calendar strategy —18 November2026 IST: optional audience/tone/objective and vocabulary preferences, explicit current approved service/offer fact selections, exact revision/fingerprint binding, immutable strategy detail, Unicode avoided-phrase save gate and read-only saved-topic lexical preview added. Existing knowledge/model/budget/draft/plan engines reused; no migration. Schema053/93, next054 and frozen V4 unchanged. See REVIEWED_CALENDAR_STRATEGY.md, REVIEWED_CALENDAR_BATCHES.csv and evidence/reviewed-calendar-strategy.json. P05-08 remains in_progress; tracker28 validated/35 in_progress/29 planned/1 blocked of93. Full autonomous strategy, offer validity/festivals, semantic/asset deduplication and hosting/provider acceptance remain open; no billing, render activation, deployment or real sends/spend.

Saved-plan final verification —18 November2026 IST:137 isolated regression programs,28 browser workflows (first5 plus remaining23 serial runs), complete disposable MariaDB053/93 and uploaded-export restore passed. Original business rows/ledger preserved; bundled replay READY/applied0. TypeScript/build,262 route declarations/50 registrations, migration-source and document guards passed. Full normal App closure583013 raw/168862 gzip bytes is within existing budgets. Browser resource timing instrumentation was expanded after its default buffer filled; corrected lazy-feature check passed. P05-08 remains in progress; no phase/live promotion. Evidence: docs/implementation/evidence/saved-calendar-plans.json.

Saved calendar plans —18 November2026 IST:30 connected functional slices add immutable batch definitions, durable slot admission, normalized topic claims, first-text snapshots, append-only revisions, explicit retries and cancellation/recovery fences. Forward053/93 canonical tables; next054; frozen V4 unchanged. See SAVED_CALENDAR_PLANS.md, SAVED_CALENDAR_BATCHES.csv and evidence/saved-calendar-plans.json. P05-08 remains in progress; tracker28 validated/35 in progress/29 planned/1 blocked of93. Semantic/asset deduplication, festival/offer/audience strategy, full media governance and hosting/provider acceptance remain open. Rendering stays default off; billing, deployment and real sends/spend unchanged.

Client calendar verification —18 November2026 IST:final136 credential-isolated programs,28/28 serial browser workflows and full disposable MariaDB suite passed. Canonical review/reschedule/cancel,8-way save/approval races, lost-ACK recovery, sealed-key race, UTC/IST month boundary and exact uint64 exhaustion verified. TypeScript/build,253 route declarations/49 registrations and frontend583016 raw/168864 gzip bytes pass existing guards. Schema052/90 unchanged; next053. Tracker28 validated/35 in progress/29 planned/1 blocked; P05-08 remains in progress. See CLIENT_CALENDAR_WORKFLOWS.md and evidence/client-calendar-workflows.json. Rendering default off; billing/provider sends/deployment unchanged.

Client calendar group —18 November2026 IST:26 connected slices replace fixed draft dates and stale prop state with a current scoped IST calendar, chosen cadence, goal-bound text draft receipts, exact lost-ACK recovery, durable request sealing and canonical review/approval/reschedule/cancel actions. UNKNOWN dispatch states remain blocked. Schema052/90 unchanged; next053. P05-08 is in progress; batch strategy/festival/content-history and phase/live scope remain open. See CLIENT_CALENDAR_WORKFLOWS.md, CLIENT_CALENDAR_BATCHES.csv and evidence/client-calendar-workflows.json. No live AI/provider calls, render activation, billing or deployment changes.

Source/outcome verification —18 November2026 IST:135 credential-isolated regression programs,27/27 serial browser workflows and complete disposable native MariaDB suite passed. Recorded first/last ambiguity, opportunity revisions, declared cost integrity/voids,5001-row history withholding and private HTTP/CSV/current-client fences verified. TypeScript/build,248 route declarations/48 registrations and frontend583058 raw/168878 gzip bytes pass existing guards. Schema052/90 unchanged; next053. Tracker28 validated/34 in progress/30 planned/1 blocked; no parent/phase/live promotion. See SOURCE_OUTCOME_TRUTH.md and evidence/source-outcome-truth.json. Billing/provider sends/deployment unchanged.

Source/outcome truth group —18 November2026 IST:24 connected slices repair budget-as-spend, invoice-label verification, tenant/source/lifecycle and campaign wire/badge errors; add read-only known-interaction source models, current opportunity revisions and exact separate declared currency totals. Schema052/90 unchanged; next053. P08-05/P01-05/P01-09 remain in progress; no phase/live promotion. See SOURCE_OUTCOME_TRUTH.md, SOURCE_OUTCOME_BATCHES.csv and evidence/source-outcome-truth.json. Billing and provider sends unchanged.

Final report-portal evidence —18 November2026 IST: uploaded SQL export rehearsed only in a disposable database; original rows and ledger preserved, bundled replay READY/applied0 through052/90. Final build580834 raw/168135 gzip bytes includes the normal App closure and is within existing budgets. Current tracker28/34/30/1 of93. All release/hosting/provider gates remain separate; no production writes, publish or real messages.

Client report portal verification —18 November2026 IST:26 functional slices;134 isolated regression programs,26/26 serial browser workflows plus exact-content recovery recheck, native MariaDB fresh/upgrade/index/width/CAS/privacy/recovery matrix passed. Forward052/90; frozen V4 unchanged; next053. P09-05 optional approved-report scope locally validated;28 validated/34 in progress/30 planned/1 blocked. Sharing is off. Full daily reconciliation, external content approvals, providers and phase/hosting/live gates remain open. Evidence: CLIENT_REPORT_PORTAL.md and evidence/client-report-portal.json. No deployment or real sends/spend.

Client report portal group (18 November2026 IST):26 connected functional slices add source-bound drafts, private-note redaction, exact-version approvals, encrypted expiring/revocable share links, anonymous mobile reports and key/hash-based recovery. Forward052/90; frozen V4 unchanged; next053. Sharing remains off. See [CLIENT_REPORT_PORTAL.md](docs/implementation/CLIENT_REPORT_PORTAL.md), CLIENT_REPORT_BATCHES.csv and evidence/client-report-portal.json. Local approved-report acceptance is validated; phase/live gates remain open.

Growth group verification —18 November2026 IST:24 functional workflows across five durable record types;133 isolated regression programs,24/24 browser workflows, final full native MariaDB and uploaded-export preservation/bundled replay passed. Schema051/88, frozen V4, next052. Native index/actor-width guards and limited runtime privileges verified. P08-01/P08-06 local criteria accepted; current27 validated/34 in progress/31 planned/1 blocked. Provider automation, verified ROI, hosting and phase/live gates remain open. No deployment or real sends/spend.

Growth operations group —18 November2026 IST:24 functional workflows, five durable record types, scoped idempotent/CAS lifecycle, exact cost corrections and16 accountability counters/frozen V4. Forward051/88; next052. See docs/implementation/GROWTH_OPERATIONS_GROUP.md and GROWTH_BATCHES.csv. Provider discovery/verification and production/phase gates remain separate.

Client prospecting profile —17 November2026 IST: canonical policy persistence/CAS and legacy omission preservation; declared six-dimension fit, freshness/unknown/human-review rules and private CSV. See docs/implementation/PROSPECTING_PROFILE.md. Schema050/87 unchanged; P08-01/full discovery/provider acceptance remains open. Older strict policy readers require a compatible forward reader after new-field writes.

Twenty-feature verification —17 November2026 IST:20 module integrations passed; final131 isolated regression programs,23 browser workflows (16 initial plus7 corrected remainder, integration behavior rechecked), full disposable MariaDB050/87, TypeScript/build, frontend budgets and route/doc guards passed. Initial JS: 1,177,923 → 471,776 raw bytes; gzip level 9: 303,346 → 135,218 bytes. Four local parent criteria reconciled: P00-03, P08-08/P08-09 defer-decision branches, P09-06 persisted-name/optional-domain scope. Current counts25 validated/35 in progress/32 planned/1 blocked; no phase or production acceptance.

Twenty-feature group —17 November2026 IST:20 on-demand feature integrations, common failure/client/session boundaries, measured bundle checks and23 serial browser workflows. Optional extension decisions distinguish deferred/off from working integrations. See docs/implementation/TWENTY_FEATURE_DELIVERY.md and LOCAL_ACCEPTANCE_RECONCILIATION.md. No production deployment.

Workflow recovery —17 November2026 IST: canonical job binding/state-race/budget/commit-count hardening. See docs/implementation/SALES_WORKFLOW_RECOVERY.md and evidence/sales-workflow-recovery.json. Schema050/87 unchanged; full parent/phase/live acceptance remains open.

Frozen sales coverage —17 November2026 IST: new captures use V3, preserving V1/V2 replay and original baselines; sales CSV/display/deltas use fixed versioned coverage. Schema050/87 unchanged. See docs/implementation/FROZEN_SALES_COVERAGE.md. Older V1/V2-only binaries cannot read V3 records; retain a compatible reader on rollback. Parent/phase/live gates remain pending.

Sales accountability —17 November2026 IST: eleven audited sales/import counters in the canonical daily report/UI/CSV/digest; client/session-safe report reads and exports. Schema050/87 and frozen V1/V2 unchanged. See docs/implementation/SALES_ACTIVITY_REPORTING.md and evidence/sales-activity-reporting.json. Full workflow reconciliation and parent/phase/live gates remain pending.

Saved import navigation —17 November2026 IST: return from a recorded result to its original keyset page, jump from older batches to newest, and accessible loading status. Chromium navigation/CSV/session/client regression and TypeScript passed. Schema050/87 and parent acceptance unchanged. See docs/implementation/PROSPECT_IMPORT_HISTORY.md.

Saved import history —17 November2026 IST: forward050 scoped history index (87 tables), private paged journal reads, exact-key lookup, metadata-only CSV and key-only reload reconciliation. No import replay from reads. See docs/implementation/PROSPECT_IMPORT_HISTORY.md and evidence/prospect-import-history.json. Parent/phase, retention and live gates remain open.

Prospect preview —17 November2026 IST: shared canonical read-only row classification, same-file/database ambiguity, preview-before-import UI, exact request reconciliation and client/session-bound CSV drafts. Schema049/87 unchanged. See docs/implementation/PROSPECT_IMPORT_PREVIEW.md and evidence/prospect-import-preview.json. P08-01/P01-02 remain partial; no production import or deployment.

Operational capacity —17 November2026 IST: nine scoped read-only resource counters, shared unchanged admission limits, IST daily window, private no-store API and lazy client/session-safe review. Schema049/87 unchanged; next050. See docs/implementation/OPERATIONAL_CAPACITY.md and evidence/operational-capacity.json. Retention/deletion and hosting capacity remain pending; no deployment.

Critical alerts —17 November2026 IST: forward049/87, six observed category episodes, atomic stage reservations, initial/1h/24h same-destination escalation, shared bound Telegram delivery, private history/UI and dispatcher availability. Default off; P09-03 remains partial. See docs/implementation/CRITICAL_ALERTS.md and evidence/critical-alerts.json. No production activation.

Scheduled notification policies —17 November2026 IST: forward048/85, explicit default-off bot/destination opt-in, future IST slots, bound durable no-resend journal, fresh authority/config/budget fences, shared selector gating and private settings/history. P09-03 in progress; alerts/full acceptance remain open. See docs/implementation/SCHEDULED_NOTIFICATION_POLICIES.md and evidence/scheduled-notification-policies.json. No production activation.

Operations group —17 November2026 IST: versioned frozen V2/legacy V1 preservation, agency model3 capture exceptions, audit-backed explicit Telegram identity verification and prompt inconsistent-run recovery. Schema047/84 unchanged; next048. See docs/implementation/OPERATIONS_COMPLETION_GROUP.md and evidence/operations-completion-group.json. P09-01/02/04 remain partial; no production/provider activation.

Capture operations reporting —17 November2026 IST: twelve live daily report/UI/CSV/digest metrics cover committed capture transitions and current queue-bound backlog, with IST/privacy/invalid-state guards. Frozen coverage V1 remains unchanged. Schema047/84, next048. See docs/implementation/REPORT_CAPTURE_REPORTING.md and evidence/report-capture-reporting.json. P09-01 remains partial; no deployment or sends.

Capture-history continuation —17 November2026 IST: read-only scoped keyset pages, outcome filters, exact snapshot navigation, bounded formula-safe page CSV and client/session fences. Schema047/84 unchanged; next048. See docs/implementation/REPORT_CAPTURE_HISTORY.md and evidence/report-capture-history.json. P09-01 remains partial; no live deployment or delivery.

Scheduled report capture —17 November2026 IST: forward047/84, default-off IST policy, bounded shared-queue catch-up, current authority/lease fencing, atomic snapshot/run/job settlement, cancellation/recovery and private UI. P09-01 remains in progress; distribution/escalation P09-03 remains planned. See docs/implementation/REPORT_CAPTURE_SCHEDULE.md and evidence/report-capture-schedule.json. No production deployment or sends.

Immutable report capture —17 November2026 IST: forward046/82, frozen coverage V1, closed-day capture, audited revision CAS/stable replay, private hash-checked payloads, comparison/export and reload recovery. P09-01 remains in progress. See docs/implementation/IMMUTABLE_REPORT_SNAPSHOTS.md and its evidence JSON.

Manual Telegram reporting —17 November2026 IST: six committed daily activity and three current backlog metrics in canonical report/UI/CSV/digest. Schema045/81 unchanged. See docs/implementation/MANUAL_TELEGRAM_REPORTING.md; full reporting/phase acceptance remains open.

Durable manual Telegram continuation —16 November2026 IST: forward045/81, exact actor/content/destination binding, audited no-resend states, prepared-only cancellation, shared budget/resource caps and private reload/history UI. P09-04 remains in progress. See docs/implementation/TELEGRAM_MANUAL_JOURNAL.md and evidence/telegram-manual-journal.json.

Telegram evidence continuation —15 November2026 IST: saved client configuration/permissions, strict manual API acceptance, canonical report/history, local uncertainty and session fences; no simulated autonomous inbox. P09-04 is in_progress; remaining gates are explicit in docs/implementation/TELEGRAM_OPERATIONS_CONSOLE.md. Schema044/80 unchanged.

Agency exception continuation —15 November2026 IST: ten authorized current backlog counters, explicit weighted priorities, guarded CSV and agency review/CRM navigation. Schema044/80 unchanged. See docs/implementation/AGENCY_EXCEPTION_OVERVIEW.md and its evidence JSON; P09-02 remains in progress.

Delivery-evidence continuation —15 November2026 IST: see docs/implementation/MESSAGE_DELIVERY_EVIDENCE.md and evidence/message-delivery-evidence.json (under docs/implementation). Schema044/80, next045. Exact identity and readonly evidence/report UI; partial scope, tracker counts unchanged. No live sends or deployment.

## Current Phase: Phase 15 — Dev Server Diagnostic, Iframe CSP Resolution & Clean Restart (COMPLETED)
- **Completed in this Phase**:
  - **1. Dev Server & Port 3000 Binding Verification**:
    - Verified dev server startup on port 3000 (`tsx server.ts --port 3000 --host 0.0.0.0`).
    - Verified health endpoint `/api/health` returns status `ok` and active Gemini configuration.
  - **2. Content-Security-Policy Conflict Resolution**:
    - Eliminated duplicate `frame-ancestors` directive between Express middleware and the AI Studio Nginx reverse proxy.
    - Restricted Express `frame-ancestors` emission to standalone production mode (`NODE_ENV === 'production'`), ensuring Nginx can cleanly serve AI Studio preview iframes without browser security blocking.
  - **3. Verification & Stability**:
    - Triggered clean dev server restart with `restart_dev_server`.
    - Confirmed HTTP 200 OK across both internal port 3000 and proxy port 8080.
    - Validated all 23 test suites pass (100% pass rate).
    - Validated TypeScript check (`npm run lint`) passes with zero errors.

## Previous Phase: Phase 14 — Full Platform End-to-End Review, State Machine Synchronization & Sandbox Hardening (COMPLETED)
- **Completed in this Phase**:
  - **1. End-to-End Codebase & Component Audit**:
    - Inspected all frontend modules (`App.tsx`, `LeadsCrmView`, `ContentStudioView`, `CalendarView`, `ReviewsView`, `LocalSeoView`, `CompetitorsView`, `WebsiteBuilderView`, `BillingAdminView`, `AutonomousEngineView`, `IntegrationsView`, etc.).
    - Audited full API route surface in `server.ts` and data access methods in `server/db.ts`.
  - **2. Pipeline & State Machine Synchronization**:
    - Connected `handleUpdateLeadStage` to backend route `/api/leads/:id/stage` via `updateLeadStageApi`, ensuring CRM lead status transitions persist to the MySQL database across page reloads.
    - Connected `handlePublishPost` to the canonical publishing pipeline via `publishContentPostApi`, ensuring single-click publishing from dashboard and content cards updates database records.
    - Connected `handleDeletePost` to `deleteContentPostApi` and `handleDeleteReview` to `deleteReviewApi` to guarantee backend synchronization on deletions.
    - Connected `handleDeleteKeyword` to `saveCompanyData`, preventing deleted rank trackers from reappearing on workspace reload.
  - **3. Sandboxed Runtime & Iframe Safety Hardening**:
    - Replaced blocking `window.alert()` calls in `WebsiteBuilderView.tsx` with clean, non-blocking inline error and success feedback banners (`actionError`, `actionSuccess`).
    - Wrapped `window.confirm()` in safe try/catch guards to prevent sandbox security exceptions in iframe and mobile WebView runtimes.
  - **4. Comprehensive Quality Verification**:
    - `npm test`: **23/23 Test Suites Passing (100% Pass Rate)**.
    - 9-Stage End-to-End User Journey Walkthrough: **100% Pass Rate**.
    - `npm run lint`: **0 errors**.
    - `compile_applet`: **Build succeeded**.

## Previous Phase: Phase 13 — Hostinger Shared-Safe Scaling Adaptation: Durable Job Queue & Campaign Binding (COMPLETED)
- **Completed in this Phase**:
  - **1. MySQL-Backed Durable Job Queue (`job_queue` Table)**:
    - Implemented durable `job_queue` schema in MySQL and in-memory store with lease locking (`locked_by`, `locked_at`), attempts counter, backoff retry, and dead-letter failure states (`QUEUED`, `RUNNING`, `SUCCEEDED`, `RETRY_WAIT`, `FAILED`, `CANCELLED`).
    - Multi-tenant isolated: jobs are strictly partitioned by `company_id`.
    - Idempotency key deduplication prevents duplicate job insertions.
    - Added atomic claim mechanism (`claimNextJob`) with lock timeouts to prevent worker starvation and race conditions.
  - **2. Universal Scheduler & Hostinger Shared Hosting Cron Ping**:
    - Created secure `/api/scheduler/tick` and `/api/cron/tick` HTTP endpoints with secret verification (`x-cron-secret`) and platform admin authorization.
    - Enables Hostinger hPanel cron (`curl -X POST ...`) to wake idle shared hosting server and process pending background queues reliably.
    - Integrated with internal timer tick as dual-layer execution.
  - **3. Real Task Class Execution Engine (`server/jobQueueService.ts`)**:
    - Handled `publishing`, `seo_scan`, `competitor_scan`, `ai_summary`, and `lead_nurture` job types without mock data.
    - Connected genuine providers (`localSeoProvider`, `competitorProvider`, `aiExecutiveSummary`, `publishingEngine`).
    - Emergency kill switch safety gate blocks queue execution when kill switch is active.
  - **4. Canonical Campaign-to-Post Execution Binding**:
    - Connected `campaign_id` on `content_posts` table with database indexing.
    - Added `getCompanyPostsByCampaignId` repository query.
    - Updated `CampaignsView.tsx` to render bound posts and active pipeline indicators under initiative cards.
  - **5. Full Suite Validation**:
    - Added `test/phase1DurableQueueAndCampaigns.test.ts` (14 unit and integration test assertions).
    - `npm test`: **23/23 Test Suites Passing (100% Pass Rate)**.
    - `npm run lint`: **0 errors**.

## Previous Phase: Phase 12 — Final Production Closure & Review Date Provenance (COMPLETED)
- **Completed in this Phase**:
  - **1. Database Fail-Closed Repository Audit (P0-1)**:
    - Audited every CRUD database repository operation across all 28 entities in `server/db.ts`.
    - Real database failure throws `DATABASE_UNAVAILABLE` (HTTP 503) or `DATABASE_OPERATION_FAILED` (HTTP 500); zero in-memory fallback returns in production mode.
  - **2. Manual Review Date & Rating Provenance Truth (P0-2)**:
    - Removed automatic defaulting of review date to today in `src/components/ReviewsView.tsx`.
    - Missing rating $\to$ `null`, missing date $\to$ `null`, missing source $\to$ `user_entered` / `manual`, and provenance strictly resolves to `USER_ENTERED`.
    - Added automated regression tests in `test/phase8SourceTruthAndFailClosed.test.ts`.
  - **3. Full Suite Validation**:
    - `npm test`: **22/22 Test Suites Passing (100% Pass Rate)**.
    - `npm run lint`: **0 errors**.
    - `npm run build`: **Build succeeded** (Vite + esbuild CJS bundle).
    - `npm run db:status`: Environment secrets configured (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`); sandbox network connection reported `BLOCKED BY ENVIRONMENT` (local socket unavailable in sandbox container).

## Previous Phase: Phase 11 — Source Truth, Fail-Closed & Canonical Schema Integrity (COMPLETED)
- **Completed in this Phase**:
  - **1. End-to-End Test Matrix (16 Test Suites, 100% Pass Rate)**:
    - `test/phase6ProductionReadiness.test.ts`: Complete coverage for Auth, CRM, Google Places, Local SEO 3x3 Geo-Grid, Competitor Radar, Content Publishing, WhatsApp/Meta, Growth Intelligence, AI Summary, Revenue Attribution, Autonomous Safety Gates, and Clean Tenant Isolation.
    - Full 16 test suites passing in `npm test`.
  - **2. Clean Tenant Data Integrity Guarantee**:
    - Created clean test tenant verifying zero demo metrics, zero fake rankings, zero fake reviews, zero fake revenue, zero fake calls, and zero fake campaigns.
    - Growth score for empty tenant returns `UNAVAILABLE` strictly without defaulting to synthetic values.
  - **3. Cryptographic Security & IDOR Elimination**:
    - PBKDF2-SHA512 with 210,000 iterations for password hashing and auto-upgrading legacy hashes.
    - Constant-time HMAC-SHA256 signature verification for Meta/WhatsApp webhooks.
    - Webhook event idempotency deduplication with automatic memory bounds.
    - 8-stage outbound safety gate with human approval requirement and global emergency kill switch.
  - **4. Production Build & Linting**:
    - `lint_applet` (`tsc --noEmit`): 0 errors.
    - `compile_applet` (`vite build`): Succeeded.
    - Health endpoint `GET /api/health`: 200 OK.
  - **5. Production Readiness Report**:
    - Created `PRODUCTION_READINESS_REPORT.md` documenting all capabilities, evidence, test outcomes, and residual risk assessments.

## Previous Phase: Phase 5 — Business Intelligence Closure
- **Completed in this Phase**:
  - **1. Canonical Content Publishing & PATCH Bypass Prohibition**:
    - Unified all publishing triggers onto canonical `executePublishingJob` state machine (`SCHEDULED → JOB → PROVIDER → PROVIDER RESPONSE → PERSIST EXTERNAL ID → VERIFY → PUBLISHED`).
    - Explicitly forbidden `PATCH /api/content-posts/:id/status` with `status=published` (returns HTTP 400), preventing simulated external publishing without external provider confirmation.
    - Added comprehensive timeout and error classification in `classifyProviderError` (`PERMANENT`, `RETRYABLE`, `TIMEOUT_UNKNOWN`).
  - **2. Meta Social Direct Publishing & Idempotency**:
    - Facebook Page feed/photo publishing & Instagram Business 2-step container creation/publishing (`POST /api/meta/publish-post`).
    - Persists provider, external ID, timestamp, and response status in `publishing_records` table.
    - Idempotency gate checks `isPostAlreadyPublished` and returns `SKIPPED_ALREADY_PUBLISHED` for repeat requests.
  - **3. WhatsApp Verification & Deterministic Intent Scoring**:
    - Cryptographic HMAC-SHA256 signature verification on `POST /api/whatsapp/webhook` with constant-time equality (`timingSafeEqual`).
    - Webhook event idempotency via `isWebhookEventProcessed`/`markWebhookEventProcessed`.
    - Eliminated static `intent_score: 95` and `intent_score: 92`.
    - Introduced centralized `calculateMessageIntent` engine (`server/intentScoring.ts`) computing real deterministic scores based on pricing/quote keywords, service requests, callback urgency, and budgets. Returns `UNAVAILABLE` with `null` score for empty/unclassifiable inquiries.
  - **4. Autonomous Action Provider Execution & Anti-Fabrication**:
    - Real provider execution for all action types in `server/autonomousEngine.ts`:
      - `review_reply`: Updates review reply in DB with `updateReviewReply`.
      - `send_whatsapp`: Dispatches via `sendWhatsAppCloudMessage` or aborts with `BLOCKED_PROVIDER_NOT_CONFIGURED`.
      - `publish_post`: Executes canonical `executePublishingJob` across configured channels and records authentic provider IDs.
      - `adjust_campaign`: Executes Meta Marketing API adjustments or aborts with `BLOCKED_PROVIDER_NOT_CONFIGURED`.
      - Unsupported action types: Strictly returns `BLOCKED` with `UNSUPPORTED_ACTION_TYPE` without fabricating fake `providerResp` / `verified=true`.
  - **5. Preserved Global & Per-Tenant Emergency Kill Switch**:
    - `globalEmergencyStop` and `autopilot_enabled` checks halt both cycle evaluations and action executions immediately (`KILL_SWITCH_ACTIVE`, `BLOCKED_KILL_SWITCH`).
  - **6. Automated Acceptance Suite**:
    - Added `test/phase3RealExecution.test.ts` to master `npm test` script.
    - 13/13 test suites passing (77/77 tests passing with 100% success rate).
- **Validation**:
  - `npm test`: Passed (13 test suites passing, 77/77 tests).
  - `npm run lint`: Passed (`tsc --noEmit` 0 errors).
  - `compile_applet`: Passed (`vite build` succeeded).

## Previous Phase: Phase 1 — Production Security & Tenant Isolation Hardening
- **Completed in this Phase**:
  - **1. AUTH Secret Fail-Fast**:
    - Removed hardcoded fallback secrets in `server/auth.ts` and `server.ts`.
    - In production mode, missing `AUTH_SECRET` or secret shorter than 16 characters throws `FATAL_SECURITY_ERROR` and terminates startup immediately.
  - **2. Multi-Tenant Authorization & IDOR Elimination**:
    - Implemented centralized `resolveUserCompanyId(user, companyId)` and `verifyCompanyWorkspaceAccess(user, companyId)`.
    - Applied strict tenant authorization across all endpoints:
      - Revenue attribution (`/api/revenue-attribution`)
      - Integration management (`/api/integrations`, `/api/integrations/save`, `/api/integrations/:provider`, `/api/integrations/test`)
      - Campaign management (`/api/campaigns/internal`, `/api/campaigns/external`, `/api/campaigns/link`)
      - WhatsApp & Meta messaging (`/api/whatsapp/*`, `/api/meta/*`)
      - Autonomous Engine (`/api/autonomous/*`)
      - Custom domains (`/api/companies/:id/domains/*`)
    - Guaranteed that unauthorized requests receive 400, 403, or 404 rather than silently defaulting to `companies[0]`.
  - **3. Integration Lifecycle State Machine**:
    - Explicit lifecycle states: `not_configured`, `saved`, `testing`, `verified`, `connected`, `disconnected`, `error`.
    - Saving credentials sets status to `saved` (or `not_configured`), never `verified` or `connected` without a real provider test.
    - Verified status requires an actual live provider test handshake.
    - Credentials are redacted with masking on frontend retrieval.
  - **4. Mandatory Webhook Signature Verification**:
    - Enforced mandatory HMAC-SHA256 signature verification for WhatsApp/Meta webhooks in production mode.
    - Rejects webhook payloads if `META_APP_SECRET` is missing in production.
  - **5. Automated Testing**:
    - Added `test/phase1SecurityHardening.test.ts` to `npm test`.
    - 11/11 test suites passing (68/68 tests passing with 100% success rate).
- **Validation**:
  - `npm test`: Passed (11 test suites passing).
  - `npm run lint`: Passed (`tsc --noEmit` 0 errors).
  - `compile_applet`: Build succeeded.

## Previous Phase: Phase 0 — Consolidation & Canonical Architecture
- **Completed in this Phase**:
  - **Forensic Audit of Legacy Score**:
    - Identified static/hardcoded scores (e.g., fixed `overall: 88` in `initialGrowthScore` and fixed fallbacks in modal/views).
    - Replaced all static growth score definitions with a single centralized deterministic calculation engine.
  - **Centralized Growth Intelligence Engine (`server/growthScoreEngine.ts`)**:
    - Pure, deterministic calculation based strictly on verified and calculated signals across 7 business pillars:
      1. Google Business Profile Health (Place ID, verified connection, address, phone, hours, description).
      2. Local SEO & Map Pack (Verified geo-radar observations, rank position, tracked keywords).
      3. Reviews & Reputation (Verified count, average rating, response rate).
      4. Content & Social Velocity (Published posts count, frequency, approved status).
      5. Website & Digital Presence (Custom domain verification, website URL, HTTPS).
      6. Lead Conversion Pipeline (Total leads, converted count, conversion efficiency).
      7. Campaign Performance (Active campaigns, reach, CTR, conversion rate).
    - **Never Invents Missing Inputs**:
      - If 0 pillars have data: `score = null`, `status = UNAVAILABLE`.
      - If < 3 pillars have data: `score = null`, `status = INCOMPLETE_DATA` with explicit reasons.
      - If >= 3 pillars have data: `status = CALCULATED` with dynamic weighted average normalized to 100%.
    - **Pillar Telemetry & Audit Trail**:
      - Every pillar records: `metricName`, `metric`, `weight`, `inputValues`, `formula`, `timestamp`, `status` (`LIVE`, `VERIFIED`, `CALCULATED`, `USER_ENTERED`, `INCOMPLETE_DATA`, `UNAVAILABLE`), and `notes`.
  - **Backend API Endpoints (`server.ts`)**:
    - `GET /api/companies/:id/growth-score`: Retrieves dynamic score calculation with complete pillar telemetry and audit trail based on current DB and payload state.
    - `POST /api/companies/:id/growth-score/recalculate`: Triggers immediate re-evaluation, persists the updated score to company storage, and returns detailed telemetry.
  - **Unit Test Suite (`test/growthScoreEngine.test.ts`)**:
    - Comprehensive unit tests verifying:
      - Test 1: Empty inputs produce `UNAVAILABLE` score without metric fabrication.
      - Test 2: Insufficient inputs (< 3 pillars) produce `INCOMPLETE_DATA` classification.
      - Test 3: Comprehensive inputs produce `CALCULATED` score with exact mathematical breakdown.
      - Test 4: Lead and campaign performance calculation.
    - Test runner configured in `package.json` (`npm test`).
  - **Frontend UI Preservation & Telemetry Inspector**:
    - `DashboardView.tsx`: Displays score, dynamic status classification label, and insufficient data warnings without redesigning layout.
    - `AuditView.tsx`: Added interactive "Telemetry & Formula Audit" inspector modal to examine input values, mathematical formulas, and data truth status for all pillars.
    - `MobileAppView.tsx` & `AgencyView.tsx`: Safely handles `null` score states without falling back to hardcoded numbers.
- **Validation**:
  - `npm test`: All unit tests passed.
  - `lint_applet`: Passed (`tsc --noEmit` 0 errors).
  - `compile_applet`: Passed (`vite build` succeeded).
## Current Phase: Real Revenue Attribution & CRM Lifecycle Engine
- **Completed in this Phase**:
  - **Real Revenue Attribution Engine (`server/revenueAttribution.ts`)**:
    - Implemented strict lifecycle tracking: `SOURCE → LEAD → QUALIFIED → OPPORTUNITY → QUOTE/DEAL → WON/LOST → PAYMENT → REVENUE`.
    - Integrated with existing `leads` and `invoices` relational MySQL tables without creating duplicate CRM structures.
    - Supported Sources: Strictly limited to `Google`, `Organic`, `Website`, `WhatsApp`, `Telegram`, `Social`, `Referral`, `Campaign`, `Manual`, `Unknown`.
    - **Anti-Inference Rule**: Enforced strict `normalizeSource` — never guesses or infers unstated sources, returning `Unknown`.
    - **Provider-Verified Payments**: `isProviderVerifiedPayment` strictly accepts only provider-verified invoices (`status === 'Paid'`, real non-simulated `payment_id`, authentic provider method). Rejects simulated, mock, or client-only claimed payments.
    - **Calculated Metrics**: Accurately computes `leads`, `qualified leads`, `opportunities`, `quotes/deals`, `customers`, `conversion rate`, `total revenue`, and `revenue by source`.
    - **Zero-Fabrication ROI**: If marketing cost/spend data is missing, ROI is strictly set to `'UNAVAILABLE'`.
    - **Multi-Tenant Isolation**: Completely isolates all queries and calculations per `company_id`.
  - **Backend API Routes (`server.ts`)**:
    - Added `GET /api/companies/:id/revenue-attribution` with authentication and strict tenant IDOR verification.
    - Added `GET /api/revenue-attribution` for authenticated default company.
  - **CRM Pipeline Enhancement (`src/components/LeadsCrmView.tsx`)**:
    - Added `'opportunity'` stage support across the interactive CRM pipeline board and stage selector.
  - **Unit Test Suite (`test/revenueAttribution.test.ts`)**:
    - Test 1: Strict source normalization and anti-inference check.
    - Test 2: Provider-verified payment validation (simulated/mock rejected).
    - Test 3: Full CRM lifecycle (Source -> Lead -> Qualified -> Opportunity -> Quote -> Won -> Payment -> Revenue).
    - Test 4: Strict zero-fabrication of ROI (Cost missing = UNAVAILABLE vs. verified cost calculation).
    - Test 5: Multi-tenant data isolation with zero cross-tenant leakage.
- **Validation**:
  - `npm test`: All 3 test suites passed (14/14 tests passing, 100%).
  - `lint_applet`: Passed (`tsc --noEmit` 0 errors).
  - `compile_applet`: Passed (`vite build` succeeded).

## Current Phase: Production-Critical Razorpay Billing Hardening & Security
- **Completed in this Phase**:
  - **Billing & Verification Service (`server/billingService.ts`)**:
    - `verifyRazorpayWebhookSignature`: Constant-time cryptographic HMAC-SHA256 signature verification. Mandatory in production mode; strictly rejects requests if webhook secret or signature is missing in production.
    - `verifyRazorpayPaymentSignature`: Cryptographic HMAC-SHA256 verification against orderId and paymentId with timingSafeEqual.
    - `isProductionEnvironment`: Helper strictly detecting production environments.
    - `isWebhookEventProcessed` & `markWebhookEventProcessed`: Database (`processed_webhook_events`) and memory cache event idempotency.
    - `activateSubscriptionIdempotent`: Prevents duplicate subscription creation cycles while idempotently updating status.
    - `mapRazorpayEventToSubscriptionState`: Strict mapping of provider events to actual provider-supported states (`trial`, `active`, `past_due`, `payment_failed`, `cancelled`, `expired`).
  - **Database & Duplicate Prevention (`server/db.ts`)**:
    - Added `processed_webhook_events` table for resilient multi-tenant webhook event idempotency.
    - Added `getInvoiceByPaymentId` and `getInvoiceByOrderId` queries.
    - Updated `createInvoice` to automatically deduplicate by `payment_id` or `order_id` within a tenant workspace.
  - **Endpoint Hardening (`server.ts`)**:
    - `/api/razorpay/webhook`: Integrated mandatory signature verification, idempotency gate, provider state mapping, and duplicate-safe invoice sync.
    - `/api/razorpay/verify-payment`: Cryptographic HMAC verification, strict simulated payment rejection in production, idempotent subscription activation.
    - `/api/razorpay/create-order` & `/api/razorpay/create-payment-link`: Simulated payments strictly forbidden in production mode.
  - **Unit Test Suite (`test/billingRazorpay.test.ts`)**:
    - 10 exhaustive tests covering valid webhook, invalid signature, missing secret in prod, duplicate webhook idempotency, invalid payment signature, verified payment signature, simulated payment prohibition in prod, subscription state mappings, duplicate invoice prevention, and duplicate subscription activation idempotency.
- **Validation**:
  - `npm test`: All 4 test suites passed (24/24 tests passing, 100%).
  - `lint_applet`: Passed (`tsc --noEmit` 0 errors).
  - `compile_applet`: Passed (`vite build` succeeded).

## Current Phase: Meta & WhatsApp Integration Production Hardening
- **Completed in this Phase**:
  - **Meta & WhatsApp Centralized Service (`server/metaWhatsAppService.ts`)**:
    - `resolveWhatsAppCredentials` & `resolveMetaSocialCredentials`: Centralized per-tenant and environment credential resolution, masking secrets, and returning explicit `configured: boolean` status.
    - `findCompanyByWhatsAppIdentifier`: Strict multi-tenant mapping for inbound webhook messages by matching `phone_number_id`, `waba_id`, and `display_phone_number`. Strictly returns `null` for unmapped numbers, completely eliminating generic/default company routing leaks.
    - `verifyMetaWebhookHandshake`: Cryptographic verification of `hub.mode === 'subscribe'` and `hub.verify_token` for Meta Graph API webhooks.
    - `verifyWhatsAppWebhookSignature`: Constant-time HMAC-SHA256 signature verification (`x-hub-signature-256`) against `WHATSAPP_APP_SECRET`. Mandatory in production; rejects mismatched or missing signatures.
    - `publishToFacebookPage` & `publishToInstagram`: Two-step container creation & publishing workflow via Meta Graph API v21.0. Returns explicit `NOT_CONFIGURED` if credentials are missing and never marks posts as published until provider returns confirmed post/media ID.
    - `sendWhatsAppCloudMessage`: Direct Meta WhatsApp Cloud API v21.0 dispatch. Never returns fake success; returns `status: 'NOT_CONFIGURED'` when unconfigured.
  - **Multi-Tenant Integration Storage (`server/db.ts`)**:
    - Added `getCompanyIntegrationsByProvider` to query all company integration bindings for scalable webhook routing in both MySQL and in-memory store.
  - **Endpoint Authorization & Hardening (`server.ts`)**:
    - `/api/whatsapp/status` & `/api/meta/status`: Protected with user authentication (`getAuthUserFromRequest`) and tenant authorization.
    - `/api/whatsapp/send` & `/api/whatsapp/broadcast`: Protected with authenticated user + company authorization checks. Returns `status: 'NOT_CONFIGURED'` when credentials are missing and strictly marks fallback (`wa_link`) as manual client fallback with `fallbackNotice` without reporting it as Meta API delivery.
    - `/api/whatsapp/webhook` (GET): Secure handshake verification via `verifyMetaWebhookHandshake`.
    - `/api/whatsapp/webhook` (POST): Mandatory HMAC-SHA256 signature validation, event idempotency via `isWebhookEventProcessed`/`markWebhookEventProcessed`, strict tenant isolation via `findCompanyByWhatsAppIdentifier`, and CRM lead creation persisting `notes` with `[Provider Message ID: ...]`.
    - `/api/meta/publish-post`: Protected with authenticated user + company authorization checks. Does not mark posts as `published` until provider confirms with provider post/media ID.
  - **Unit Test Suite (`test/metaWhatsApp.test.ts`)**:
    - Comprehensive unit tests covering:
      - Test 1: Meta webhook handshake verification (`hub.challenge`).
      - Test 2: Inbound webhook HMAC-SHA256 signature verification.
      - Test 3: Strict multi-tenant mapping (isolated tenant routing with zero generic fallback leaks).
      - Test 4: Inbound webhook event idempotency (duplicate prevention).
      - Test 5: Credential resolution & `NOT_CONFIGURED` status enforcement (no fake success).
      - Test 6: Provider message ID persistence in CRM pipeline.
  - **Validation**:
    - `npm test`: All 5 test suites passed (30/30 tests passing, 100%).
    - `lint_applet`: Passed (`tsc --noEmit` 0 errors).
    - `compile_applet`: Passed (`vite build` succeeded).

### Current Phase: Production Transactional Email & Password Reset Hardening
- **Completed in this Phase**:
  - **Transactional Email Service (`server/emailService.ts`)**:
    - Created unified email dispatcher supporting standard SMTP (Hostinger/custom via `nodemailer`), Resend (`RESEND_API_KEY`), SendGrid (`SENDGRID_API_KEY`), and Postmark (`POSTMARK_SERVER_TOKEN`).
    - Enforced strict provider check: returns explicit `NOT_CONFIGURED` configuration error (HTTP 503) if no email transport credentials are configured.
    - Never pretends an email was sent if unconfigured or if dispatch fails.
  - **Secure Password Reset Lifecycle (`server.ts`)**:
    - Generates 32 cryptographically random bytes (`crypto.randomBytes(32)` -> 64-character hex string).
    - Persists only the SHA-256 hash (`crypto.createHash('sha256').update(rawToken).digest('hex')`) in MySQL / fallback store.
    - 30-minute expiration window strictly enforced.
    - Single-use guarantee: marks token as `used_at` upon reset and immediately invalidates all outstanding reset tokens for the user.
    - User identity verified before allowing password upgrade.
    - Upgrades password hash using PBKDF2 with OWASP parameters (210,000 iterations, 64-byte keylen, sha512).
  - **Zero Token Exposure & Audit Security**:
    - Completely removed all console log outputs containing raw tokens or password reset URLs.
    - Emits security audit events without leaking sensitive credentials or links.
  - **Documentation (`.env.example`)**:
    - Added comprehensive SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE`) and API provider configurations.
  - **Unit & Integration Test Suite (`test/passwordResetEmail.test.ts`)**:
    - Test 1: Unconfigured transactional email provider returns explicit error without pretending success.
    - Test 2: Cryptographic token generation and SHA-256 hashed persistence.
    - Test 3: Expired token verification strictly rejects stale tokens.
    - Test 4: Single-use verification and token invalidation.
    - Test 5: Full password reset lifecycle and credential update.
- **Validation**:
  - `npm test`: All 7 test suites passed (41/41 tests passing, 100%).
  - `lint_applet`: Passed (`tsc --noEmit` 0 errors).
  - `compile_applet`: Passed (`vite build` succeeded).

## Current Phase: Comprehensive End-to-End User Journey Audit & Production Verification
- **Completed in this Phase**:
  - **Comprehensive 9-Stage User Journey E2E Suite (`test/e2eUserJourneyAudit.test.ts`)**:
    - Stage 1: User Registration & Isolated Workspace Provisioning (Zero-metric truthful baseline, `INCOMPLETE_DATA` growth score classification).
    - Stage 2: Google Profile Sync & Places Data Ingestion (Real reviews ingested, unreplied reviews detected).
    - Stage 3: Local SEO Geo-Grid Scan & Evidence Observation (3x3 grid point rank observations, outer-perimeter rank drop detected).
    - Stage 4: Inbound Lead Capture & Review Resolution (Verified review reply committed to database).
    - Stage 5: Autonomous Governance Cycle on Real Evidence (2 recommendations strictly linked to authentic observation evidence IDs).
    - Stage 6: Human Approval Policy & High-Risk Gate (High-risk action blocked until explicit human approval).
    - Stage 7: Verified Execution & Audit Logging (Execution passed through 8-stage gate, immutable audit record written).
    - Stage 8: Razorpay Billing, Cryptographic Webhook & Ledger Sync (Cryptographic HMAC signature verified, invoice recorded, duplicate prevention confirmed).
    - Stage 9: CRM Revenue Attribution & Dynamic Growth Intelligence Calculation (Score calculated dynamically with complete 8-pillar telemetry audit trail).
  - **Master Test Runner Integration**:
    - Added `test/e2eUserJourneyAudit.test.ts` to `package.json` `test` command.
    - All 10 test suites running and passing with 100% success rate (63/63 tests passing).
- **Validation**:
  - `npm test`: All 10 test suites passed (100% success).
  - `lint_applet`: Passed (`tsc --noEmit` 0 errors).
  - `compile_applet`: Passed (`vite build` succeeded).
  - `restart_dev_server`: Dev server restarted and fully operational on port 3000.

## Previous Phase: Autonomous Governance & 8-Stage Lifecycle Engine
- **Completed in this Phase**:
  - **8-Stage Autonomous Lifecycle Engine (`server/autonomousEngine.ts`)**:
    - Implemented strict lifecycle: `OBSERVE → DETECT → ANALYZE → RECOMMEND → APPROVE → EXECUTE → VERIFY → MEASURE`.
    - **Anti-Fabrication & Zero-Invention Rule**: Evaluates strictly verified database observations (`rank_observations`, `competitor_observations`, `reviews`, `leads`, `external_ad_campaigns`). If 0 verified signals exist, returns `status = INSUFFICIENT_EVIDENCE` with 0 recommendations generated.
    - **Evidence-Linked Recommendations**: Every recommendation includes:
      - `id`, `company_id`, `observation`, `evidence_ids`, `source`, `timestamp`, `recommended_action`, `affected_metric`, `confidence`, `risk` (`low` | `medium` | `high`), `approval_requirement` (`auto` | `required`).
    - **Outbound 8-Gate Safety Enforcement**:
      1. Authentication: Verified session or authorized system context.
      2. Authorization: Multi-tenant workspace isolation (`company_id` IDOR protection).
      3. Kill Switch: Global emergency stop & per-company autopilot toggle (`isEmergencyPaused` / `isAutopilotOn`).
      4. Approval Policy: High-risk actions (budgets, offers, profile edits) strictly require human approval before execution.
      5. Rate Limit: Throttles executions per company workspace (max 10 actions/minute).
      6. Idempotency: Deduplicates repeated execution attempts.
      7. Provider Availability Check: Direct verification of live credentials before dispatch (aborts with `BLOCKED_PROVIDER_NOT_CONFIGURED` if unconfigured; never claims false success).
      8. Immutable Audit Logging: Structured audit record stored in `autonomous_audit_logs`.
  - **Persistence Schema & Database Models (`server/db.ts` & `schema.sql`)**:
    - Added tables `autonomous_recommendations`, `autonomous_actions`, and `autonomous_audit_logs`.
    - Implemented database and in-memory CRUD operations with self-healing migrations.
  - **Backend API Endpoints (`server.ts`)**:
    - `GET /api/autonomous/status`: Health check, active kill-switch status, pending approval counts.
    - `POST /api/autonomous/kill-switch`: Toggles emergency stop or autopilot.
    - `POST /api/autonomous/run-cycle`: Runs observation and recommendation cycle on real evidence.
    - `GET /api/autonomous/recommendations`: Lists grounded recommendations.
    - `GET /api/autonomous/actions`: Lists queued/executed actions.
    - `POST /api/autonomous/actions/:id/approve`: Human approval workflow.
    - `POST /api/autonomous/actions/:id/reject`: Human rejection.
    - `POST /api/autonomous/actions/:id/execute`: Verified execution through the 8-stage gate.
    - `GET /api/autonomous/audit-logs`: Immutable audit trail.
  - **Frontend UI & Telemetry Inspector (`src/components/AutonomousEngineView.tsx`)**:
    - Connected real API endpoints for running cycles, viewing evidence-grounded recommendations, human approvals, verified executions, and audit logs.
    - Preserved existing layout while adding real-time Kill Switch status banners and lifecycle visualizers.
  - **Unit & Integration Test Suite (`test/autonomousGovernance.test.ts`)**:
    - 8 comprehensive tests covering zero-invention, evidence-linked recommendations, high-risk approval gates, kill switch, unconfigured provider blocking, verified execution, idempotency, and multi-tenant isolation.
- **Validation**:
  - `npm test`: All 9 test suites passed (54/54 tests passing, 100%).
  - `lint_applet`: Passed (`tsc --noEmit` 0 errors).
  - `compile_applet`: Passed (`vite build` succeeded).



