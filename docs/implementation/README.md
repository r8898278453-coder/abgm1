# ABGM1 implementation blueprint

21 November 2026 IST. P09-01 advances through 25 notification accountability items. The private daily report adds twelve due-day outcome counts and three current unresolved counts. Manual and scheduled captures write V14. Tracker totals remain 62 validated, 16 in progress, 14 planned and one blocked. [Daily notification accountability](NOTIFICATION_DAILY_REPORT.md)

21 November 2026 IST. P09-01 advances through 26 calendar accountability items. The private daily report includes nine calendar revision metrics and eight selected-day slot counts, including linked publishing admission and recorded claim publication. Manual and scheduled captures write V13. Tracker totals remain 62 validated, 16 in progress, 14 planned and one blocked. [Calendar plan daily reporting](CALENDAR_PLAN_DAILY_REPORT.md)

21 November 2026 IST. P09-01 advances through 23 schedule history items. The private daily report adds six timestamp-form admission metrics and five committed schedule revision metrics. Manual and scheduled captures write V12. Tracker totals remain 62 validated, 16 in progress, 14 planned and one blocked. [Schedule history reporting](SCHEDULE_HISTORY_REPORT.md)

21 November 2026 IST. P09-01 advances through 25 publishing reconciliation items. Private daily reports add seven provider and operator review counters and six saved-date planning and admission counters. Manual and scheduled captures write V11. Tracker totals remain 62 validated, 16 in progress, 14 planned and one blocked. [Publishing reconciliation](PUBLISHING_RECONCILIATION_REPORT.md)

21 November 2026 IST. P09-01 advances through 27 platform outcome items. The publishing worker records claim-bound outcome events atomically with settlement. Private daily reports, CSV and new V10 snapshots include fifteen platform outcome counts and two partial-claim counts. Tracker totals remain 62 validated, 16 in progress, 14 planned and one blocked. [Platform outcome reporting](PLATFORM_OUTCOME_REPORT.md)

21 November 2026 IST. P09-01 advances through 22 publishing admission reporting items. Private daily reports reconcile each IST admission with its matching current publishing claim. New manual and scheduled snapshots write V9. Tracker totals remain 62 validated, 16 in progress, 14 planned and one blocked. [Publishing admission reporting](PUBLICATION_ADMISSION_REPORT.md)

21 November 2026 IST. P09-01 advances through 22 queue accountability items. Private daily reports distinguish admitted, claimed, cancelled, retryable, terminal and exhausted work, and current retry timing and lease exceptions. New manual and scheduled captures write V8. Tracker totals remain 62 validated, 16 in progress, 14 planned and one blocked. [Daily queue accountability](QUEUE_DAILY_ACCOUNTABILITY.md)

21 November 2026 IST. P09-01 advances through 28 workflow accountability items. The private daily dashboard and CSV include thirteen workflow activity metrics and seven current inventory metrics. Telegram summarizes five operational counts. Manual and scheduled frozen captures write V7 and retain V1–V6 history. Remaining cross-module reconciliation stays open. Tracker totals remain 62 validated, 16 in progress, 14 planned and one blocked. [Daily workflow reporting](WORKFLOW_DAILY_REPORT.md)

21 November 2026 IST. P09-01 advances through 27 Sales workflow reporting items. The private Sales report adds 13 recorded workflow event counts and seven current inventory counts. Workflow reconciliation across the daily work report, frozen captures and other modules remains in progress. Tracker totals remain 62 validated, 16 in progress, 14 planned and one blocked. [Workflow reporting](SALES_WORKFLOW_REPORT.md)

21 November 2026 IST. P09-01 advances through 26 daily email accountability items. The private dashboard, CSV and Telegram digest include 14 IST email activity counters and two current intake backlog counters. Manual and scheduled snapshots write V6 and preserve existing V1–V5 captures. The client portal keeps its approved metric list. Tracker remains 62 validated, 16 in progress, 14 planned and one blocked. Full cross-module reconciliation and production acceptance remain open. [Daily email accountability](EMAIL_DAILY_ACCOUNTABILITY.md)

21 November 2026 IST. P06-04, P01-06 and P09-01 advance through 28 email reply recovery and accountability items. Signed replies can be durably queued, retried with bounded leases, and monitored through private intake history and the IST Sales report. Migration 064 adds the encrypted intake journal and brings the target to 108 tables. Live provider acceptance, attachments and sequences remained open at that stage. See SALES_EMAIL_REPLY_RECOVERY.md.

21 November 2026 IST. P06-04, P01-05 and P09-01 advance through 26 linked email reply and opt-out work items. New eligible sends use a private Reply-To address. A signed reply and matching provider read link the incoming message to the original CRM conversation, and explicit reply opt-outs block future email. The IST Sales report counts replies and opt-outs. Schema 063 remains the source target. Live Resend DNS and mailbox acceptance, reply recovery and outbound sequence integration remain open. See SALES_EMAIL_REPLIES.md.

21 November 2026 IST. P06-04, P01-05 and P09-01 advance through 28 locally testable email delivery work items. Signed Resend receipts bind to an accepted tenant dispatch, keep bounce and complaint suppression distinct from consent, and appear in the Sales inbox, private CRM conversation and IST Sales report. Migration 063 adds the receipt journal (107 tables). Reply threading, frozen daily accountability coverage, live Resend acceptance and release remain open. Tracker 62 validated, 16 in progress, 14 planned and one blocked. See SALES_EMAIL_DELIVERY.md.

21 November 2026 IST. P06-04 advances with default-off Resend email for one saved CRM lead after exact operator review. The existing client consent, IST policy, dispatch ledger and Sales inbox are reused. Tenant reply threading, signed bounce/delivery evidence, workflow sequences and live acceptance remain open. Tracker 62 validated, 16 in progress, 14 planned and one blocked. See TENANT_SALES_EMAIL.md.

21 November 2026 IST. P06-04 advances with a reloadable clock-bounded Resend domain observation, saved-sender binding, current verifier authority and pending/inconclusive states. Only the latest check for the current settings can be displayed as verified. Tenant dispatch, signed reply and bounce intake, and live Resend validation remain open. Tracker 62 validated, 16 in progress, 14 planned and one blocked. See TENANT_EMAIL_DOMAIN.md.

21 November 2026 IST. P06-04 moves into progress with a saved Resend domain check, exact tenant and sender binding, provider read-only access, durable cooldown and redacted audit. P01-05 advances because the generic client connection check now directs email users to the saved-domain check. Tenant dispatch and signed reply/bounce intake remain open. Tracker 62 validated, 16 in progress, 14 planned and one blocked. See TENANT_EMAIL_DOMAIN.md.

21 November 2026 IST. P09-01 advances with booking, cancellation and outcome revision activity, plus the current ended-appointment backlog. The dashboard, private CSV and daily digest use the same IST report. New manual and scheduled captures use V5, and existing V1–V4 snapshots remain readable. Tracker 62 validated, 15 in progress, 15 planned and one blocked. See APPOINTMENT_OUTCOMES.md.

20 November 2026 IST. P07-05 advances with exact-row recovery of abandoned Calendar stop claims under concurrent workers. P08-05 advances with a workspace appointment cohort in the source report. The existing booking and outcome ledgers now support current declared source and first or last recorded source before booking, including corrections, cancellations, missing evidence and aggregate CSV. Live pilot, cross-channel cost allocation, verified receipts/spend and ROI remain open. Tracker 62 validated, 15 in progress, 15 planned and one blocked. See SOURCE_OUTCOME_TRUTH.md.

20 November 2026 IST. P07-05 and P08-05 advance with operator-declared appointment outcomes, append-only corrections, revision fencing, frozen declared source and daily IST outcome totals. Migration 062 adds outcome evidence and a booking-time index. Live provider validation, pilot acceptance and complete cross-channel attribution remain open. Tracker 62 validated, 15 in progress, 15 planned and one blocked. See APPOINTMENT_OUTCOMES.md.

20 November 2026 IST. P07-05 advances with client-specific booking duration, padding, minimum notice and booking horizon. Availability and Calendar admission share the policy, exact event times are retained, and a changed policy fences the pending provider write. Existing policy records and older saves remain compatible. Live Calendar acceptance and the P07-08 pilot remain open. Tracker 62 validated, 15 in progress, 15 planned and one blocked. See BOOKING_SLOT_POLICY.md.

20 November 2026 IST. P02-07 and P07-05 advance with a workspace-bound Google Calendar OAuth flow, one-use PKCE state, exact calendar probing, encrypted credentials and automatic token refresh through the existing credential lease. Booking, reconciliation, reminders and push lifecycle reuse the refreshed binding. Live Google consent and P07-08 pilot remain open. Tracker 62 validated, 15 in progress, 15 planned and one blocked. See CALENDAR_OAUTH.md.

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

Client calendar verification —18 November2026 IST:final136 credential-isolated programs,28/28 serial browser workflows and full disposable MariaDB suite passed. Canonical review/reschedule/cancel,8-way save/approval races, lost-ACK recovery, sealed-key race, UTC/IST month boundary and exact uint64 exhaustion verified. TypeScript/build,253 route declarations/49 registrations and frontend583016 raw/168864 gzip bytes pass existing guards. Schema052/90 unchanged; next053. Tracker28 validated/35 in progress/29 planned/1 blocked; P05-08 remains in progress. See CLIENT_CALENDAR_WORKFLOWS.md and evidence/client-calendar-workflows.json. Rendering default off; billing/provider sends/deployment unchanged.

Client calendar group —18 November2026 IST:26 connected slices replace fixed draft dates and stale prop state with a current scoped IST calendar, chosen cadence, goal-bound text draft receipts, exact lost-ACK recovery, durable request sealing and canonical review/approval/reschedule/cancel actions. UNKNOWN dispatch states remain blocked. Schema052/90 unchanged; next053. P05-08 is in progress; batch strategy/festival/content-history and phase/live scope remain open. See CLIENT_CALENDAR_WORKFLOWS.md, CLIENT_CALENDAR_BATCHES.csv and evidence/client-calendar-workflows.json. No live AI/provider calls, render activation, billing or deployment changes.

Source/outcome verification —18 November2026 IST:135 credential-isolated regression programs,27/27 serial browser workflows and complete disposable native MariaDB suite passed. Recorded first/last ambiguity, opportunity revisions, declared cost integrity/voids,5001-row history withholding and private HTTP/CSV/current-client fences verified. TypeScript/build,248 route declarations/48 registrations and frontend583058 raw/168878 gzip bytes pass existing guards. Schema052/90 unchanged; next053. Tracker28 validated/34 in progress/30 planned/1 blocked; no parent/phase/live promotion. See SOURCE_OUTCOME_TRUTH.md and evidence/source-outcome-truth.json. Billing/provider sends/deployment unchanged.

Source/outcome truth group —18 November2026 IST:24 connected slices repair budget-as-spend, invoice-label verification, tenant/source/lifecycle and campaign wire/badge errors; add read-only known-interaction source models, current opportunity revisions and exact separate declared currency totals. Schema052/90 unchanged; next053. P08-05/P01-05/P01-09 remain in progress; no phase/live promotion. See SOURCE_OUTCOME_TRUTH.md, SOURCE_OUTCOME_BATCHES.csv and evidence/source-outcome-truth.json. Billing and provider sends unchanged.

Client report portal verification —18 November2026 IST:26 functional slices;134 isolated regression programs,26/26 serial browser workflows plus exact-content recovery recheck, native MariaDB fresh/upgrade/index/width/CAS/privacy/recovery matrix passed. Forward052/90; frozen V4 unchanged; next053. P09-05 optional approved-report scope locally validated;28 validated/34 in progress/30 planned/1 blocked. Sharing is off. Full daily reconciliation, external content approvals, providers and phase/hosting/live gates remain open. Evidence: CLIENT_REPORT_PORTAL.md and evidence/client-report-portal.json. No deployment or real sends/spend.

Client report portal group (18 November2026 IST):26 connected functional slices add source-bound drafts, private-note redaction, exact-version approvals, encrypted expiring/revocable share links, anonymous mobile reports and key/hash-based recovery. Forward052/90; frozen V4 unchanged; next053. Sharing remains off. See [CLIENT_REPORT_PORTAL.md](CLIENT_REPORT_PORTAL.md), CLIENT_REPORT_BATCHES.csv and evidence/client-report-portal.json. Local approved-report acceptance is validated; phase/live gates remain open.

Growth operations group (18 November2026 IST):24 functional workflows across saved assessments, declared signals/contact evidence, approved measurement experiments, exact declared-cost ledger and accountability. Forward051/88 and frozen V4; old evidence preserved. See [GROWTH_OPERATIONS_GROUP.md](GROWTH_OPERATIONS_GROUP.md), GROWTH_BATCHES.csv and evidence/growth-operations-group.json. No provider sends, spend, deployment or phase promotion.

Prospecting profile continuation (17 November2026 IST): saved client services/roles/regions/employee/website targeting and planning notes extend the canonical sales policy; legacy omitted fields preserve saved ICP. Six fixed read-only declared-fit checks,90-day freshness, human-disqualifier review, current-policy/client/session fences and private CSV added. See [PROSPECTING_PROFILE.md](PROSPECTING_PROFILE.md) and evidence/prospecting-profile.json. Schema050/87 unchanged; P08-01 remains in progress.

Twenty-feature integration group (17 November2026 IST):20 existing module batches now share deferred loading, isolated errors and current client/session remounts; measured initial bundle budgets and a serial23-fixture browser registry added. Explicit optional-extension scope and local acceptance audit recorded. See [TWENTY_FEATURE_DELIVERY.md](TWENTY_FEATURE_DELIVERY.md), TWENTY_FEATURE_BATCHES.csv and LOCAL_ACCEPTANCE_RECONCILIATION.md. No production/phase promotion.

Workflow recovery continuation (17 November2026 IST): current client/type/runnable-job binding, terminal-success orphan detection, fresh locked state/repaired-job rechecks, pre-mutation budget and post-commit counts harden the canonical recovery path. See [SALES_WORKFLOW_RECOVERY.md](SALES_WORKFLOW_RECOVERY.md) and evidence/sales-workflow-recovery.json. Schema050/87 unchanged; no parent/phase/live promotion.

Frozen sales continuation (17 November2026 IST): new captures use fixed coverage V3 with eleven sales counters; V1/V2 replay, hashes and existing baselines remain preserved. Same-version comparisons and CSV use actual coverage. Schema050/87 unchanged; next051. See [FROZEN_SALES_COVERAGE.md](FROZEN_SALES_COVERAGE.md) and evidence/frozen-sales-coverage.json. Full parent/phase/live acceptance remains open.

Sales reporting continuation (17 November2026 IST): eleven committed sales/import counters now share the canonical daily report, dashboard, CSV and validated digest; client/session export fences added. Frozen V1/V2 and schema050/87 remain unchanged. See [SALES_ACTIVITY_REPORTING.md](SALES_ACTIVITY_REPORTING.md) and evidence/sales-activity-reporting.json. Full workflow and parent/phase/live acceptance remain open.

Saved import continuation (17 November2026 IST): [PROSPECT_IMPORT_HISTORY.md](PROSPECT_IMPORT_HISTORY.md) adds private committed-history lookup/pagination/CSV and key-only reconciliation. Forward050/87; next051. No deletion, live import or parent/phase acceptance.

Prospect import continuation (17 November2026 IST): [PROSPECT_IMPORT_PREVIEW.md](PROSPECT_IMPORT_PREVIEW.md) adds read-only preview, canonical classification reuse and private draft/exact-retry controls. Schema049/87 unchanged; no parent/phase or live acceptance.

Capacity review continuation (17 November2026 IST): [OPERATIONAL_CAPACITY.md](OPERATIONAL_CAPACITY.md) adds nine client resource counters with shared unchanged admission limits. Schema049/87 unchanged; no retention deletion, live activation or phase acceptance.

Critical alert continuation (17 November2026 IST): [CRITICAL_ALERTS.md](CRITICAL_ALERTS.md) adds the third default-off policy and bounded incident escalation using the existing scheduler/journal/transport. Forward049/87; next050. Historical notes below retain their original scope; no live or phase acceptance.

Scheduled delivery continuation (17 November2026 IST): [SCHEDULED_NOTIFICATION_POLICIES.md](SCHEDULED_NOTIFICATION_POLICIES.md) adds exact default-off client/kind opt-in and bound journal safety. Forward048/85; next049. P09-03 in progress; no phase or live acceptance.

Operations continuation (17 November2026 IST): [OPERATIONS_COMPLETION_GROUP.md](OPERATIONS_COMPLETION_GROUP.md) adds frozen V2, agency model3, explicit Telegram identity proof and recovery consistency. Schema047/84 unchanged. Historical notes below retain their checkpoint scope; no parent/phase acceptance.

Capture reporting continuation (17 November2026 IST): [REPORT_CAPTURE_REPORTING.md](REPORT_CAPTURE_REPORTING.md) adds twelve live report/UI/CSV/digest metrics. Frozen V1 and schema047/84 unchanged; next048. No delivery or phase acceptance.

Capture history continuation (17 November2026 IST): [REPORT_CAPTURE_HISTORY.md](REPORT_CAPTURE_HISTORY.md) adds private paged/filterable run review and page CSV. Schema047/84 unchanged; next048. No delivery or phase acceptance.

Scheduled capture continuation (17 November2026 IST): [REPORT_CAPTURE_SCHEDULE.md](REPORT_CAPTURE_SCHEDULE.md). Forward047/84; next048. Default off; no scheduled distribution or phase acceptance.

Frozen report continuation (17 November2026 IST): [IMMUTABLE_REPORT_SNAPSHOTS.md](IMMUTABLE_REPORT_SNAPSHOTS.md) adds closed-day immutable coverage-V1 captures, audited revision CAS/replay, metadata history, comparison and frozen CSV. Forward046/82; historical001–045 unchanged; next047. P09-01 remains partial; no phase or production acceptance.


Manual Telegram reporting continuation (17 November2026 IST): [MANUAL_TELEGRAM_REPORTING.md](MANUAL_TELEGRAM_REPORTING.md) adds six audited daily transitions and three current backlog counters to report/UI/CSV/digest, with strict metric coverage and IST/privacy tests. Schema045/81 unchanged; next046. P09-01/P09-04 remain partial; no phase/production acceptance.


Durable manual Telegram continuation (16 November2026 IST): [TELEGRAM_MANUAL_JOURNAL.md](TELEGRAM_MANUAL_JOURNAL.md) adds bound, audited request states, exact replay/no resend, prepared-only cancellation, capped admission and private reload/history. Forward045/81; historical001–044 unchanged; next046. P09-04 remains partial; no phase or production acceptance.


Telegram operations continuation (15 November2026 IST): [TELEGRAM_OPERATIONS_CONSOLE.md](TELEGRAM_OPERATIONS_CONSOLE.md) replaces simulator presentation with saved configuration, explicit manual acceptance, canonical reports/history and suggestion-only discussion. P09-04 is in_progress; live identity, durable manual journal and verified commands remain open. Schema044/80 unchanged; next045.


Agency exception continuation (15 November2026 IST): [AGENCY_EXCEPTION_OVERVIEW.md](AGENCY_EXCEPTION_OVERVIEW.md) adds ten authorized current counters, transparent priorities, filtered review, metadata CSV and CRM navigation. Schema044/80 unchanged; next045. P09-02 remains partial; connection/capacity/cost and full phase acceptance remain pending.


Latest delivery-evidence continuation (15 November2026 IST): [MESSAGE_DELIVERY_EVIDENCE.md](MESSAGE_DELIVERY_EVIDENCE.md) adds exact request identity, ambiguity/conflict-aware status, bounded receipt timeline, current-evidence IST cohorts and reconciled CSV. Schema044/80, next045; historical001–043 unchanged. Partial P06/P09 foundation; no phase or production acceptance. Current counts: [STATUS.md](STATUS.md).


Latest intake-recovery continuation (14 November2026 IST): [WHATSAPP_INTAKE_RECOVERY.md](WHATSAPP_INTAKE_RECOVERY.md) adds encrypted verified snapshots, audited shared-queue replay, atomic business settlement, retention/resource controls and metadata-only recovery UI. Schema043/80, next044; historical001–042 unchanged. No outbound send, parent/phase or production acceptance. Current counts: [STATUS.md](STATUS.md).


Latest conflict-resolution continuation (13 November2026 IST): [WHATSAPP_CONFLICT_REVIEWS.md](WHATSAPP_CONFLICT_REVIEWS.md) adds privileged investigation, exact versioned retain-original decisions, known-variant discard, new-variant quarantine, bounded incident state and review UI. Schema042/79, next043; historical001–041 unchanged. No work/send revival, consent reset or parent/phase acceptance. Current counts: [STATUS.md](STATUS.md).


Latest verified-event continuation (13 November2026 IST): [WHATSAPP_EVENT_TIME.md](WHATSAPP_EVENT_TIME.md) adds provider-clock persistence, stale/expired history, delayed STOP, atomic replay/conflict guards, mapped-batch retry handling and scoped event-history UI. Schema041/77, next042; historical001–040 unchanged. Sender-resolution and operator-replay limits are explicit; no parent/phase or production acceptance. Current counts: [STATUS.md](STATUS.md).


Latest inquiry enrollment continuation (13 November2026 IST): [SALES_INQUIRY_RULES.md](SALES_INQUIRY_RULES.md) adds explicit client opt-in, verified inbound capture and duplicate-safe queue enrollment into an exact approved review workflow, with source/rule cancellation, recovery and scoped UI. Schema040/76, next041; historical001–039 unchanged. Exact message approval/sending remains separate and default off. No parent/phase or production acceptance. Current counts: [STATUS.md](STATUS.md).


Latest approved-reply continuation (12 November2026 IST): [APPROVED_SALES_MESSAGES.md](APPROVED_SALES_MESSAGES.md) connects exact human-reviewed WhatsApp replies to the existing durable queue/dispatcher with cancellation, uncertainty recovery and scoped UI. Sending remains default off. Schema039/74, next040; historical001–038 unchanged. No parent/phase or production acceptance. Current counts: [STATUS.md](STATUS.md).


Latest review-workflow continuation (12 November2026 IST): [SALES_REVIEW_WORKFLOWS.md](SALES_REVIEW_WORKFLOWS.md) records twelve connected workflow/queue/exit/recovery/UI deliverables. Schema038/73, next039; historical001–037 unchanged. Actual automated messages, calendar booking and full parent/phase acceptance remain gated. [STATUS.md](STATUS.md) gives current counts.

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
