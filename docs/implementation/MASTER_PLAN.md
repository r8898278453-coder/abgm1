# ABGM1 agency marketing and sales platform — master implementation plan

Latest conflict-resolution continuation (13 November2026 IST): [WHATSAPP_CONFLICT_REVIEWS.md](WHATSAPP_CONFLICT_REVIEWS.md) adds privileged investigation, exact versioned retain-original decisions, known-variant discard, new-variant quarantine, bounded incident state and review UI. Schema042/79, next043; historical001–041 unchanged. No work/send revival, consent reset or parent/phase acceptance. Current counts: [STATUS.md](STATUS.md).


Latest verified-event continuation (13 November2026 IST): [WHATSAPP_EVENT_TIME.md](WHATSAPP_EVENT_TIME.md) adds provider-clock persistence, stale/expired history, delayed STOP, atomic replay/conflict guards, mapped-batch retry handling and scoped event-history UI. Schema041/77, next042; historical001–040 unchanged. Sender-resolution and operator-replay limits are explicit; no parent/phase or production acceptance. Current counts: [STATUS.md](STATUS.md).


Latest inquiry enrollment continuation (13 November2026 IST): [SALES_INQUIRY_RULES.md](SALES_INQUIRY_RULES.md) adds explicit client opt-in, verified inbound capture and duplicate-safe queue enrollment into an exact approved review workflow, with source/rule cancellation, recovery and scoped UI. Schema040/76, next041; historical001–039 unchanged. Exact message approval/sending remains separate and default off. No parent/phase or production acceptance. Current counts: [STATUS.md](STATUS.md).


Latest approved-reply continuation (12 November2026 IST): [APPROVED_SALES_MESSAGES.md](APPROVED_SALES_MESSAGES.md) connects exact human-reviewed WhatsApp replies to the existing durable queue/dispatcher with cancellation, uncertainty recovery and scoped UI. Sending remains default off. Schema039/74, next040; historical001–038 unchanged. No parent/phase or production acceptance. Current counts: [STATUS.md](STATUS.md).


Latest review-workflow continuation (12 November2026 IST): [SALES_REVIEW_WORKFLOWS.md](SALES_REVIEW_WORKFLOWS.md) records twelve connected workflow/queue/exit/recovery/UI deliverables. Schema038/73, next039; historical001–037 unchanged. Actual automated messages, calendar booking and full parent/phase acceptance remain gated. [STATUS.md](STATUS.md) gives current counts.

Latest grouped sales delivery (12 November2026 IST): [SALES_TEN_AREA_BATCH.md](SALES_TEN_AREA_BATCH.md) records ten connected CRM/sales/reporting work areas, exact implemented workflows and remaining parent criteria. Schema037/70, next038; historical001–036 unchanged. Current counts are generated in [STATUS.md](STATUS.md). No parent/phase or production promotion.

Latest durable-render delivery (12 November2026 IST): [DURABLE_REELS.md](DURABLE_REELS.md) supersedes earlier memory-queue/asset-approval pending notes. Schema036/64, next037; SQL recovery/cancellation, isolated resource-bounded worker, asset approval revisions and browser recovery are implemented. Rendering remains default off; Hostinger capability and full phase gates remain open. [STATUS.md](STATUS.md) gives current counts.

Latest render-input continuation (12 November2026 IST): [RENDER_INPUT_BOUNDARIES.md](RENDER_INPUT_BOUNDARIES.md). Strict owned raster inputs and canonical identity; creative/reel route module extracted; reel capability defaults off. Durable reel queue and asset approval remain pending. Schema035/63 unchanged; STATUS.md is authoritative for current counts. No new parent or phase acceptance.

Version 1.27 • updated 13 November 2026 IST • Implementation in progress (original plan: 2 November 2026)
Baseline repository: /workspace/abgm1 at 0424dbe52944165b38abe509ecc27a0aeb94e04d
Owner objective: one agency account serving many isolated clients across industries, with reliable marketing, lead acquisition, sales assistance/automation and complete daily accountability. Billing implementation excluded.

## 1. How to use this plan

This is the canonical implementation specification. TASKS.csv is its ordered work index, not a second specification. EXECUTION.md holds progress and evidence. Implement dependency-related deliverables in coherent groups of at least ten where practical, as requested by the owner. Order dependent mutations within each group; do not accept later phases before their prerequisite gates. Record exact delivered scope and evidence, then continue. The approved plan and tracker now live under docs/implementation/ in the application checkout. Use this copy exclusively; do not maintain divergent internal/external plans.

Implementation was authorized in subsequent user requests and continues in this checkout. Keep cumulative changes and update the tracker/evidence after validation. Production publishing/deployment and database migrations remain separate from local implementation; none have been performed in this continuation.

Earlier six user-facing workstreams remain intact: (1) reliability/agency isolation; (2) onboarding/business memory; (3) CRM/sales; (4) marketing/outcomes; (5) selective outbound/optimization; (6) agency reporting. Engineering phases P00–P10 below sequence these workstreams by dependency. The action ledger starts in P01; the reporting UI matures in P09. No reporting requirement is postponed until after execution systems are built.

A plan can reduce conflicts and regressions, not guarantee zero errors. Every completion claim requires the evidence level stated in this plan. Credentials, provider approval, supported access and production verification remain explicit prerequisites; unavailable capabilities are marked blocked, not completed.

### Current ten-package security/policy checkpoint — 12 November2026 IST

SECURITY_POLICY_GROUP.md records P02-02/03/05/06/07, P03-02/03/05 and P04-05/06 as one coordinated implementation group. Original local criteria for session policy P02-05, canonical integration registry P02-06 and scoped extractive grounding P04-05 are accepted after the complete14-step101-program/SQL/restore/seven-browser/build/guard matrix. The other seven remain partial. Totals21 validated/15 in_progress/1 blocked/56 planned; no phase accepted.035/63 adds user security epochs, PKCE state and refresh leases; historical001–034 unchanged; next036. Cookie mode/provider OAuth/hosting are not activated by local implementation.

### Current ten-parent local acceptance — 12 November2026 IST

ACCEPTANCE_TEN.md reviews the unchanged original criteria for P02-01, P03-01/04/06 and P04-01/02/03/04/07/08. All ten are now locally validated after a complete thirteen-step matrix. This consolidates delivered foundations plus bulk legacy migration/reconciliation, source integrity and parser/state/PWA hardening; it does not equate child workflow counts to parent completions. Current totals18 validated/17 in_progress/1 blocked/57 planned; no phase accepted. Schema034/60 unchanged; next035. Hosting/provider/production gates remain separate.

### Current saved onboarding/business-memory checkpoint — 12 November2026 IST

ONBOARDING_WORKFLOWS.md records twelve connected deliverables: actual server draft/resume/completion, existing registered-site/source review, saved-only connection metadata, preserved legacy classification/atomic text-source import and binary session fences. P04-07/08 in progress; full intake/consumer/migration/hosting gates remain open. Existing034/60 workspace/knowledge/queue schema reused, no new migration. DELIVERY_AND_PENDING.md explains the current delivered versus remaining project scope; STATUS.md retains all canonical task states.

### Current ten-workflow team continuation — 12 November2026 IST

AGENCY_TEAM_WORKFLOWS.md maps ten connected UI/API deliverables and their parent IDs: member list/add/role/remove, assignment list/save/revoke, location edit, agency name and client search. Existing schema034/60 is reused; no new migration. Role changes preserve narrower grants instead of widening every client assignment. P09-06 begins persisted name settings only; branding/domains and all full-parent/phase gates remain explicitly open. STATUS.md remains generated from canonical TASKS.csv.

### Current grouped agency/security checkpoint — 12 November2026 IST

The ten requested work packages plus directly connected P03-04 UI are now implemented together at the bounded scope described in BATCH_10_AGENCY_SECURITY.md. Schema034/60 adds owner/member/client mapping, operations/locations, session revocation and persistent limit state. Current company/session route owners, shared transport, provider registry, central role policy and public-only PWA participate in the same validation pass. Full parent/gate acceptance is not inferred from slices; STATUS.md gives current task/dependency totals. Historical001–033 unchanged; next035. No production migration or deployment.

### Current reviewed-fact draft consumer checkpoint — 12 November2026 IST

Three authorized user-requested draft flows (chat/review/marketing) now use approved structured facts, related-key conflict checks, stale-context discard, basic output validation and minimal durable provider-attempt/outcome evidence. A shared model adapter preserves configured fallback/cooldown while fencing audit uncertainty and empty/unknown replay. KNOWLEDGE_DRAFTS.md states the exact scope, review requirement and remaining autonomous/semantic/budget/hosting gates. Schema033/52 unchanged; P04-06 is now in progress, no phase accepted. Use generated STATUS.md for current task counts.

### Current structured-fact governance checkpoint — 11 November2026 IST

Schema033/52 adds immutable private fact candidates with exact source provenance, revision/explicit-conflict review, approved-manual precedence and source invalidation. Saved-source query abstains for matching known conflicted/unapproved keys rather than reverting to old quotes. Reviewed facts UI and actual concurrency/rollback/client isolation evidence are in KNOWLEDGE_FACTS.md and EXECUTION.md. P04-04 is now in progress; no phase accepted. Use generated STATUS.md for current counts/dependencies instead of earlier numerical checkpoints. All001–032 migrations unchanged, next034.

### Latest website-import accountability checkpoint — 11 November2026 IST

Five selected-IST-day distinct-run transition metrics and three current import-backlog fields now join report/UI/CSV/digest through the existing ledger. Explicit overlap/commit-versus-approval semantics, strict numeric completeness and native boundary/type/scope/actual-run reconciliation are documented in WEBSITE_IMPORT_REPORTING.md. No migration or phase promotion; schema032/51. Full P09 agency reconciliation/late amendments and all other prerequisite gates remain open.

### Latest durable website-run checkpoint — 11 November2026 IST

Website fetching now leaves the request:202 admission reuses one active per-client website_import job. The existing worker rechecks registered URL/lease; all page originals, extraction child jobs and final result commit atomically. No-page/partial runs, scoped keyset history, running cancellation and stale/client-change fencing are verified. Schema032/51 unchanged; WEBSITE_IMPORT.md and durable-website-imports.json record current behavior. Shared budgets/site policy, fact governance, automatic consumers, agency and actual hosting gates remain open. Tracker8 validated,11 in_progress,1 blocked,73 planned; no phase accepted.

### Latest durable-ingestion checkpoint — 11 November2026 IST

Source admission now queues private processing with atomic queue/source/outbox settlement, attempt fencing, orphan/interrupted/cancel recovery and integrity checks. UI exposes real queued status and pending-query fences. Schema032/51; older001–031 unchanged, next product033. KNOWLEDGE_INGESTION_QUEUE.md documents the production worker prerequisite and remaining website-run/agency/fact/provider gates. Tracker8 validated,11 in_progress,1 blocked,73 planned; no phase accepted.

### Latest source-history/accountability checkpoint — 11 November2026 IST

Atomic per-source transitions reuse the audit ledger; scoped50-row revision history and UI now preserve minimal deletion evidence. Six durable IST activity counts join report/CSV/digest with explicit no-backfill coverage.93 isolated programs, real fault/ordering/report SQL and Chromium/build evidence. KNOWLEDGE_HISTORY.md records privacy/retention/queue limits. Schema031/51 unchanged; tracker8 validated,11 in_progress,1 blocked,73 planned and all phase gates remain open.

### Latest website source checkpoint — 11 November2026 IST

Registered-client website import now connects bounded fetching/static extraction to private persisted originals/provenance, approval/search/retry and UI. Target031/51; route inventory147/29. No arbitrary browser URL, automatic fact verification or supersession claim. WEBSITE_IMPORT.md records complete limits and remaining durable queue/history/conflict/hosting gates. Tracker8 validated,11 in_progress,1 blocked,73 planned; no phase promoted.

### Previous website import foundation — 11 November2026 IST

P04-02 now in progress with bounded DNS-pinned HTTPS page snapshots and fixture-verified redirect/address/byte/content limits. No public route or UI consumes this transport yet. Read WEBSITE_IMPORT.md for prerequisites, provenance/extraction integration and egress acceptance still required. No phase accepted; tracker8 validated,11 in_progress,1 blocked,73 planned. Older checkpoint totals below retain their historical scope.

### Latest campaign reliability checkpoint — 10 November 2026 IST

Internal planning SQL acknowledgements/empty reads, explicit scoped planning routes, merged-period row locks, UI uncertainty/client fences and stable external-sync natural-key identity repaired. See CAMPAIGN_PERSISTENCE.md and campaign-persistence.json for current validation and limits. Source target030/51 remains; all phase gates remain open. Current route inventory146 declarations/29 registrations.

### Latest knowledge checkpoint — 10 November 2026 IST

Source target030/51: private immutable originals, bounded TXT/Markdown/DOCX/PDF extraction, run revisions/recovery, source approval/withdrawal and saved-only citations implemented locally. Current source backlog joins reports.88 isolated programs, native SQL, copied-export preservation/replay and knowledge/workspace Chromium pass. See KNOWLEDGE_SOURCES.md and private-knowledge-sources.json. P04-01/03/05 are in progress; durable queue/history, OCR/hosting, safe website import, conflict governance and automatic marketing/sales use remain open. Earlier029 checkpoints are historical.

### Latest security/integration checkpoint — 10 November 2026 IST

Atomic reset/password-bound authentication, safe rehash CAS, canonical recovery origin, confirmed encrypted integration persistence, scoped masked-key resolution and honest connection/DNS evidence added. Integration frontend load/modal/client isolation verified.86 isolated programs, native SQL and Chromium evidence; schema029/50 retained. Read AUTH_AND_INTEGRATION_BOUNDARIES.md before integration/deployment: legacy bearer tokens require re-login, all instances must update, and full session/rate/OAuth/registry/network gates remain open. No phase promotion or production action.

### Latest command/contract checkpoint — 9 November 2026 IST

Atomic competitor profile/observation/revision commands, explicit edit/delete preconditions, dedicated collection ownership, revision adoption fences and scoped frontend mutation/history handling added. Optional provider refresh preserves confirmed manual creation; baseline differences are explicitly previous-observation metrics. Source route inventory records138 declarations/26 registrations and guards duplicate terminal ownership/drift.83 isolated programs plus actual SQL, competitor/workspace browser, TypeScript/build evidence. API_COMPATIBILITY.md documents intentional legacy-client migration and limits. P02 preparation does not close P01 or any later gate; all remaining phases stay tracked.

### Latest observation checkpoint — 9 November 2026 IST

Local SEO SQL acknowledgements/empty reads, immutable observations, scoped private history, epoch timestamps and centre-only comparable trends repaired. Missing nodes and baselines remain unavailable in UI.81 isolated programs, full disposable SQL, TypeScript/build and mocked observation browser verification recorded. No schema/phase promotion or live-provider readiness claim. See EXECUTION.md and evidence/local-seo-observation-truth.json. Git delivery is a separate review branch preserving the three newer remote-main commits; integration/deployment remains separate.

### Latest migration/baseline checkpoint — 6 November 2026 IST

P00-05 locally validated:001–029 identities/source frozen,030+ immutable data manifests independent of compiler serialization, strict ledger/version gates, source/build/CLI guards and actual minified partial-DDL recovery/copied-ledger replay. Product schema remains029/50; no dummy migration added. Legacy source tooling remains pinned intentionally.79 isolated programs, source check, real SQL, copied export, TypeScript/build pass. P00-06 baseline review is in progress; live hosting/P00-03 evidence still gates phase acceptance. See MIGRATIONS.md, BASELINE_GATE.md and evidence/migration-manifest-and-ledger.json. Earlier checkpoint notes retain their original scope; the extension-strategy local gap recorded there is now closed.

Read-only db:status/db:verify now share canonical readiness, expose safe machine codes and no migration/production safety guarantees; credential-safe connection diagnostics distinguish production blocking from development memory mode.

### Latest public inquiry checkpoint — 6 November 2026 IST

Forward029 (50 canonical tables) commits public inquiry receipts and canonical leads atomically, with tenant/request identity, changed-body conflicts and minimal current-token receipt lookup. Generated forms recover lost acknowledgements by receipt across reload, retain pending identity and require explicit new inquiry after confirmation. Staff alert attempt evidence remains best-effort and is distinct from lead receipt; no automatic resend. IST daily report/CSV/digest show receipt counts and unattempted/unconfirmed alerts. Shared lead row writer preserves one canonical leads table.77 isolated programs, real SQL, both browser suites and copied-export restore pass. See EXECUTION.md and evidence/public-inquiry-recovery.json; broader phase/hosting/notification-outbox gates remain open.

### Latest website ownership checkpoint — 6 November 2026 IST

Strict scoped website routes and SQL patch/claim owners close body-ID and duplicate-domain cross-owner writes. Exact TXT+routing proof records DNS observation only; TLS/hosting remain unverified. Browser saves/downloads fence old clients and newer drafts; generated forms report only confirmed persistence and retain uncertain submissions.76 default programs, mocked Chromium, restricted real SQL and copied-export restore pass. Target028/49 tables unchanged. See EXECUTION.md and evidence/website-ownership-and-truth.json for limitations; no later phase gate or live hosting acceptance is promoted.

### Latest restore and persistence checkpoint — 6 November 2026 IST

Forward028 repairs gaps found by restoring the actual uploaded SQL export locally:13 canonical fields, leading-index gaps and obsolete mandatory action display columns.49 canonical tables; original business rows and5 ledger identities preserved; source/bundle replay applies0. Autonomous repository writes/empty reads now honor confirmed SQL, and TIMESTAMP writes/reads use epochs. See RESTORE_REHEARSAL.md, EXECUTION.md and evidence/copied-export-restore.json. This remains local acceptance; source-independent extension design, live Hostinger restore/cron and phase gates remain open.

### Product contract

- Marketing attracts demand; sales workflows qualify and progress it; outcomes inform future decisions.
- Support local services, agencies/B2B, appointment businesses and product businesses through capability packs, not one universal campaign.
- Every client has separate business facts, credentials, brand, contacts, conversations, budgets, schedules and reports.
- Routine work can run within approved policy. Sensitive commitments, new spend, custom prices and unresolved uncertainty require approval or handoff.
- No guaranteed clients, Google rankings, revenue, autonomous negotiation or universal third-party support.
- No simulated production success. Drafted, approved, API-accepted, delivered, published and verified mean different things.
- Subscription billing, checkout upgrades and new Razorpay functionality are out of scope. Existing billing data/security must not regress. Optional manual deal values are sales measurement, not payment verification.

### Dispatcher and catch-up checkpoint — 6 November 2026 IST

P01-07 locally validated: shared internal/external minute admission and persisted stage priority, fault-isolated budgeted stages with durable evidence, admin-only history and stale/unknown semantics.027 brings49 canonical tables. Sliding client/post windows prevent permanently skipped tails under partial budgets; action owners deduplicate overlap. Safety controls use saved owners rather than placebo flags/guarantees. Timer-based edit loss and older-ACK/newer-draft races are fixed; only editable profile data creates autosaves.72 programs, real SQL races/restart/timezone/fresh-upgrade and Chromium passed. Live Hostinger cron/activation and other phase gates remain open; see durable-dispatcher-and-fairness.json.

### Workspace revision checkpoint — 5 November 2026 IST

Forward026 (47 tables) adds a monotonic revision to existing company_profiles_data. One SQL owner and private internal snapshot metadata reject stale updates; existing data GET adds version and PUT requires expectedVersion. Browser saves serialize and pause on uncertainty/conflict until explicit reload; audit findings cannot be marked resolved through profile saves. Setup retry reuses a confirmed company, uncertain creation pauses, and neutral new-client defaults require actual facts/provider verification.71 default programs, real SQL race/rollback/fresh-upgrade parity and two mocked Chromium suites passed. No production migration or phase completion. See workspace-revision-and-recovery.json and EXECUTION.md for mixed-writer, provider-side-effect and creation-idempotency limits.

### Meta Ads reliability checkpoint — 5 November 2026 IST

Six P01 batches now distinguish recommendations, explicit status control, API acceptance and provider read-back. Removed global Ads credentials, implicit ACTIVE/default account targeting and false budget/ROAS optimization claims. Bounded read sync exposes partial/unavailable metrics and exact tenant scope; campaign UI/legacy provider badges are client-safe and evidence-qualified. Campaign responses exclude legacy raw metrics/unexpected fields. No schema change or phase promotion. See meta-ads-isolation-and-outcomes.json and EXECUTION.md. Budget/audience automation, durable action claims, currency/attribution and live acceptance remain later requirements.

### Schema authority checkpoint — 5 November 2026 IST

P02-04 task locally validated: canonical migrations are now the sole schema writer; app connections/lead requests/startup perform no implicit DDL or admin provisioning. Production startup requires READY. Full fresh001–025 and005-upgrade schema metadata match exactly; restricted runtime user passes read-only readiness with unchanged DDL/admin-DML counters. Existing source/bundle identities preserved;68 isolated regression programs pass. No schema version increase or production rollout. Other task/phase dependencies remain open; see schema-authority-cutover.json and EXECUTION.md.

### Current continuation — 5 November 2026 IST

Six sequential P00/P01 batches: signed bounded WhatsApp webhook, durable tenant/sender-scoped delivery receipts, atomic inbound lead/processed marker, autonomous WhatsApp durable request ownership, truthful Google review read-back verification, and credential-isolated regression runner. Forward025 brings47 canonical tables; historical migrations unchanged. CRM/autonomous cards distinguish dispatch from receipt state. No automatic UNKNOWN release, complete inbox/sequences or universal action ledger is claimed. See EXECUTION.md and evidence/whatsapp-receipts-and-autonomous-truth.json for verification and limits. Existing phase dependencies and hosting acceptance remain required; billing excluded.

### Implementation checkpoint — 4 November 2026 IST

Forward023 combined batch: per-client IST-day logical publication admission cap (NULL unlimited), durable reservations atomic with claims under company mutex, same-post/day reuse, failed/UNKNOWN retention, cap exhaustion safe60s queue deferral. Existing controls CAS/audit includes cap; dated usage snapshot and authorized keyset history UI/API, legacy absent limit not invented.45 canonical tables;56 programs, actual SQL cap2/8 contenders, rollback/rollover/timezone/25-row history and Chromium passed. No production writes; agency/provider-cost budgets and broader actions pending. Evidence: publication-admission-limits.json. Full implementation specification and remaining gates below remain authoritative; this foundation does not complete P01 or the whole platform.

Daily accountability extension: API/dashboard/existing morning digest include IST-day admittedPosts and controlChanges; reservations are not confirmed delivery. Safe fixed-metric CSV export of visible snapshot, cache no-store, SQL midnight/timezone/privacy coverage and browser export. No new schema or production writes. Evidence: daily-work-admission-reporting.json. Full reconciled daily business reporting remains a later acceptance gate.

Truthful capability batch: removed fabricated AI chat rank/health fallback and copilot greeting, local Telegram publish-success branch/execute affordance, timer-only onboarding audit and profile-flag live-sync badges. Telegram boolean acknowledgement means API accepted, not recipient receipt. Dashboard labels loaded/calculated records; unclassified competitor observation unavailable. Setup/copilot keyed by actor/client/open state to discard stale drafts/conversations. No schema or production writes. Evidence: truthful-capability-surfaces.json. Full P01-09 surface audit remains pending.

Generation truthfulness batch: shared bounded AI text/content schema; backend chat/reply/content unavailable503 and invalid structured content502 instead of fabricated success templates/raw JSON. Frontend generation rejects auth/rate-limit/network/malformed responses, preserves existing draft on failure, aborts obsolete generation. Reviews remount by actor/client, show database save rather than public publication, update saved record only after acknowledgement; parent duplicate reply save removed. Evidence: ai-generation-truthfulness.json. Full phase gate remains pending.

Review collection batch: real local qrcode encoder replaces all decorative QR artwork, PNG preview/SVG download/dedicated print frame share destination, Google HTTPS destination validation and required configured URL/Place ID, safe clipboard acknowledgement and missing-link disabled states. Dashboard unchecked bulk approve/post removed in favor of review navigation. Reply route preserves aliases, validates optional requested workspace against resource owner, canonical access check and redacted failure, returns workspace-only publication-unverified acknowledgement. Evidence: review-collection-truthfulness.json. Full reliability gate is still pending.

Review CRUD reliability batch: confirm create/delete before updating visible records; keep form/record after failure, mounted-workspace completion fence; parent mirrors acknowledged CRUD without duplicate requests. Create schema preserves companyId/company_id, rejects conflicting aliases and retains operational issue; manual source matches schema. Delete authenticates canonical tenant, validates requested scope/query, honors affected-row result and redacts storage errors. SQL reply/delete no longer report success on missing/foreign rows. Evidence: review-crud-reliability.json. Full phase gate remains pending.

Audit truthfulness batch: owner-scoped no-store evidence GET/scan, no merging stale stored resolution flags or whole-workspace scan writes; legacy resolve evaluates current known finding and performs no remediation/provider/review writes. UI passes client scope, loads validated current findings locally, hides stale findings on failure, aborts obsolete reads and navigates to review modules rather than marking fixed. Google saved flag is explicitly authorization-unverified; missing rating not a low rating. Removed hardcoded sidebar rank/ROAS/branch/usage/live badges. Evidence: audit-evidence-truthfulness.json. Full reliability gate remains pending.

Four sequential P01 batches: real next-month AI draft planning with per-item outcomes/no fake calendar, confirmed content CRUD/retained publishing evidence and saved-field repair; scoped expected-stage CRM updates/no duplicate writes or false send/create success, tenant lead notifications; authoritative owner-validated row collections/no JSON resurrection or fabricated intent85; pre-provider AI workspace access guard and selected-client context. Evidence: phase01-content-crm-isolation.json. These are foundation repairs; later-phase tasks retain their dependency gates and statuses.

Fifth sequential batch: autonomous controls are workspace-keyed, backend state is required before mutation, unconfirmed writes require reload, approve→execute chain stops on client switch. Strict single boolean command validates actor/admin/scope before effects; failed/missing SQL persistence cannot return success. Header/safety navigation no longer fakes control writes. Removed root approval callback that fabricated review replies/first-post publication and replaced lifecycle progress ticks with reference-only state. Evidence: phase01-content-crm-isolation.json. Full phase gates remain pending.

Outbound policy continuation: global file stop rechecked at direct Meta/WhatsApp/Telegram/email send boundaries, including Instagram second step and tenant Telegram after integration read. Security password recovery explicitly exempt. WhatsApp API_ACCEPTED is distinct from delivery; malformed/network/5xx become UNKNOWN, definite rejection separate, no manual fallback after uncertainty. Bounded broadcast runner max100/20s new-start budget halts after UNKNOWN/PAUSED, reports per-recipient NOT_ATTEMPTED and whitelists response fields. Evidence: outbound-stop-and-outcomes.json. This is foundational coverage, not completion of the phase gate.

Durable WhatsApp continuation: forward024 message_dispatch_intents (46 canonical tables), transactional request/sender fingerprint claim with private token and initial actor, cached acceptance/no UNKNOWN takeover, safe paused/rejected explicit retry and fenced settlement. Direct single/broadcast APIs require requestKey; broadcast derives per-recipient keys and rejects duplicate normalized phones. Canonical client identity persists metadata-only in actor/client session storage; storage denial blocks sends. Owner-only no-store status API/CRM card exposes no body/recipient/hash/token. Evidence: durable-message-dispatch.json. This foundation does not complete P01/P06 acceptance gates.

Message accountability extension: daily report/dashboard/CSV/existing morning digest include initial request records and terminal API acceptance in selected IST day, plus separately current IN_PROGRESS/UNKNOWN backlog. Migration024 adds company/date and company/state/date indexes. Counts are logical request records, not provider attempts/delivery; no new sender. Evidence: durable-message-dispatch.json. Full reconciled business reporting remains pending.

## 2. Evidence and baseline

Existing audits: ../abgm1-project-audit.md, ../abgm1-vs-gojiberry.md, ../abgm1-dhanda-onboarding-audit.md. Revalidate source anchors before editing because line numbers change. Source and tests outrank historical COMPLETE/E5 labels in CODEBASE_MAP.md, AI_AGENT_STATE.md and feature matrices; those documents contain stale or broader claims.

Previously verified in this environment: build and TypeScript check pass; 23 chained test programs complete in test mode. These exercise mainly fallback/test data, not production MySQL concurrency, real OAuth, browser behavior or provider delivery. No tests were rerun solely to write this plan. Rebaseline at P00.

Read-only live checks on 2 November: homepage and /api/health return HTTP 200. The shallow health response includes a Gemini configuration flag, not a successful AI call or DB readiness. Exact deployed commit, hosting plan capabilities, production schema, cron, backups and authenticated journeys remain unverified. Live asset names differ from local output; hashes alone do not identify the deployed revision.

### Confirmed/source-supported gap register

| Gap | Finding / anchor | Planned resolution |
|---|---|---|
| G01 | Duplicate health registrations in server.ts around 411 and 7074; earlier responder shadows readiness | P01: separate liveness/readiness; legacy alias has one owner |
| G02 | Queue publishing resolves payload.postId without comparing resource tenant to job tenant | P01: authorized typed payload and worker ownership guards |
| G03 | Reproduced SEO job: provider UNAVAILABLE but execution and stored job SUCCEEDED; scan persistence failures swallowed | P01: provider-aware outcomes; persistence required; no invented default coordinates |
| G04 | claimNextJob uses pool SELECT FOR UPDATE/update outside a retained transaction; OR/type precedence; no worker fencing | P01: transactional claim, lease fencing, retry/reconcile and MySQL concurrency tests |
| G05 | Internal cron does not tick all queue work; external tick omits digest/reminder catch-up | P01: one due-work dispatcher with both trigger sources |
| G06 | Telegram simulated published replies, hardcoded connected badge and misleading error fallbacks | P01/P09: actual integration/action records only |
| G07 | Add-company path stores website URL; no site import in inspected path | P04: safe async website ingestion |
| G08 | PDF/DOCX picker stores description rather than extracted bytes/text; fake indexed/chunk count | P04: private uploads, actual parsing/OCR and truthful ingestion states |
| G09 | Knowledge query trusts request-supplied context; review/content/chat do not consistently retrieve approved knowledge | P04: authorized server-side knowledge service reused everywhere |
| G10 | Client switch retains previous values when knowledge/phone/website absent; stale response/autosave risk | P01/P03: reset/cancel requests, tenant keys and versioned writes; two-client browser tests |
| G11 | Creation hardcodes Maharashtra/India, connection booleans derive from URL/Place ID | P03/P04: nullable/confirmed geography; authoritative connection state |
| G12 | Calendar contains fixed laptop-business examples/dates and misleading 30-day generation summary | P05: current-date/locale/client-specific planner and actual saved count |
| G13 | GBP publishing branch in publishingEngine.ts fails even with token; google_business vs google_gmb_oauth naming split | P02/P05: explicit adapter mapping, OAuth lifecycle and real publishing |
| G14 | Review normal route saves locally; external Google execution is separate | P05: distinct draft/save/publish/verify commands through one service |
| G15 | Reel job Map loses restart state; render resources unverified on hosting | P05/P10: durable job adapter, resource measurement and optional separate worker |
| G16 | No lockfile despite npm ci deployment instructions | P00: pinned supported runtime, validated committed lockfile in coding stage |
| G17 | Source initializes schema in db.ts as well as versioned migrator; checksum uses function.toString | P00/P02: freeze history, source/bundle compatibility test, single forward migration authority |
| G18 | AgencyView branches/white-label settings include local-only state | P03/P09: persisted client/location model; real settings or explicitly deferred controls |
| G19 | WhatsApp accepted message ID returned as DELIVERED; statuses mostly logged; webhook handles first entry/change/message/status only | P06: accepted/delivery separation, durable batch event intake and receipts |
| G20 | Inbound webhook may create a lead per message, swallow persistence failure and mark event processed | P06: transactionally persisted inbox/dedupe; replayable processing |
| G21 | Authentication token localStorage; process-local limits; broad frame allowlist; raw query URL logging and handshake token log | P01/P02/P10: session strategy, durable limits, CSP and redacted audit records |
| G22 | Kill switch backed by process/file; some automatic paths need uniform policy check | P01/P02: persisted global/agency/client/channel stops checked before dispatch |
| G23 | Large server.ts/App.tsx/db.ts, duplicated routing/client logic and inconsistent status vocabulary | P02: modular extraction with compatibility tests, not a rewrite |
| G24 | Full outbound/inbox/booking/learning/daily accountability capabilities not established | P06–P09: explicit new workflows and measured acceptance |

G02 and G10 are source-supported risks; a production exploit or data leak has not been demonstrated. Treat them as high-priority regression targets. Existing security safeguards (credential encryption, fail-closed production DB, webhook validation and access checks) must be preserved.

## 3. Complete requirement coverage index

R01 agency owner/many clients → P03. R02 varied industries/capability packs → P03/P04/P05. R03 isolated client facts/credentials/data → every phase, tested P01/P03. R04 team roles/client portal → P03/P09. R05 optional locations per client → P03/P05.

R06 website auto-import → P04. R07 PDF/DOCX/TXT/Markdown/OCR → P04. R08 editable approved facts/brand/source citations → P04. R09 client knowledge reused in AI → P04–P08. R10 token expiry/reconnect/permission mapping → P02/P05/P06.

R11 Google profile audit/score → P05. R12 keywords/rank grid/history → P05. R13 local competitor intelligence → P05. R14 reviews/drafts/external replies → P05. R15 Google posts/images → P05. R16 FB/IG publishing → P05. R17 images/captions/templates/library → P05. R18 reels → P05/P10. R19 dynamic festival/offer calendar → P05. R20 storefront/export/domain lead capture → P05/P10.

R21 lead identity/dedupe/source → P06. R22 shared inbox/timeline/channel routing → P06. R23 explainable qualification/scoring → P06/P07. R24 sequences/delays/quiet hours/reply stop → P07. R25 approved personalized replies/handoff → P07. R26 calendar booking/reminders → P07. R27 won/lost/reason/manual values → P06/P08. R28 retention/review requests/repeat business → P07/P08.

R29 outbound ICP/exclusions → P08. R30 signals/discovery/lookalikes → P08. R31 enrichment/deliverability → P08. R32 authorized email/LinkedIn outreach → P06–P08. R33 website visitor account identification optional → P08. R34 external CRM/webhooks/API/MCP → P08, phased connectors.

R35 attribution/funnel/cost reporting → P08/P09. R36 bounded experiments/optimization → P08. R37 approvals/risk policies/autopilot/kill switches → P01/P02/P07. R38 durable execution/retry/fairness → P01. R39 monitoring/errors/backup/restore → P00/P01/P10. R40 daily planned-vs-done/client and agency reports → ledger P01, UI/digest P09. R41 Telegram real alerts/optional commands → P06/P09. R42 provider usage/spend limits (not billing) → P01/P08/P09.

R43 mobile responsive/PWA → P03/P09/P10; native Android deferred option. R44 onboarding guided setup/review/autopilot → P04/P09. R45 security/privacy/lifecycle/data deletion → P01–P10. R46 no fake success/provenance/freshness → every module. R47 Hostinger Business shared hosting constraints → P00/P10. R48 preserve existing features/no regressions → all phase gates. R49 no duplicate implementations/unnecessary rewrites → section 4 and task ownership. R50 token/context efficiency → section 13. R51 multilingual/local-time operation → P03–P09. R52 subscription billing skipped → global scope constraint.

No competitor capability is automatically a requirement. External CRM connectors, native mobile, white-label domains, website visitor identification and every prospect signal are separately gated extensions; each is retained in the plan with explicit activation criteria rather than silently omitted.

## 4. Architecture and canonical ownership

### 4.1 Keep a modular monolith initially

Retain React/Vite + Express/TypeScript + MySQL. Keep one codebase, deployment and database authority; separate feature modules inside it. Heavy browser rendering/OCR workers may run elsewhere only when runtime measurements require it. Do not introduce Redis, Kubernetes, microservices, another CRM, another queue or a vector database by default. SQL retrieval is sufficient initially if measured knowledge quality meets acceptance; add a vector adapter only after benchmark evidence.

Layers: route/auth validation → application service → tenant repository/unit-of-work → provider adapter. Background jobs call the same application services as routes, with a validated tenant execution context. AI proposes structured work, never directly authorizes/sends it. Frontend displays canonical server state.

### 4.2 Reuse map and file change ownership

| Existing area | Keep/extend | First integration batch | Later work |
|---|---|---|---|
| server.ts | Entry/startup and compatibility mounts | P01 targeted safety fixes; P02 extract route groups | Add module mounts only; no new business logic |
| server/db.ts | Existing repositories behind compatibility exports | P01 queue transaction fixes; P02 pool/unit-of-work and repo seams | Move only touched repositories; do not rewrite all CRUD |
| server/migrator.ts | Frozen historical definitions + forward migrations registry | P00 checksum review; P02 stable extension loader | Add registry entries only; immutable migration modules |
| src/App.tsx | Composition and workspace provider | P01 switch fixes; P02 module/context extraction | Mount feature views; no duplicated fetching/autosave engines |
| src/types/index.ts | Compatibility reexports/domain UI types | P02 shared contracts integration | Reexport new feature types; one owner per concept |
| src/services/authService.ts | Compatibility client exports | P02 shared request/session/error handling | Domain clients delegate to shared transport |
| src/components/AgencyView.tsx | Agency/client overview | P03 replace local fake branch persistence | P09 reporting widgets through stable hooks |
| CreateCompanyModal / OnboardingModal | One persisted onboarding flow | P03 shell/tenant scope; P04 actual ingestion UI | Avoid a second wizard or company creation endpoint |
| KnowledgeBaseView.tsx | One knowledge library | P04 actual ingestion/retrieval states | Reused by all assistants, not reimplemented per feature |
| publishingEngine.ts | Canonical post orchestration | P01 safety; P05 GBP/partial outcomes | Legacy direct routes delegate; retry failed platforms only |
| scheduler.ts / jobQueueService.ts | Canonical dispatcher/worker | P01 common engine, leases and budgets | Register typed job handlers per later module |
| metaWhatsAppService.ts | Existing provider low-level adapters | P02 credential IDs; P05/P06 channel adapters | No direct transport calls in UI/autonomous code |
| growthScoreEngine / auditEngine / aiExecutiveSummary | Existing math/evidence services | P05 provenance/score consistency | P08/P09 outcomes and reports reuse them |
| autonomousEngine.ts | Approval/recommendation facade | P01 stop; P02 policy context | Calls canonical commands, no parallel execution engine |
| reelJobManager/reelRenderer/remotion | Render logic retained | P05 durable state adapter | P10 deployment capability switch |
| websiteService.ts | Storefront/export/DNS foundations | P05 lead form portability and escaping | P10 live domain capability verification |
| emailService.ts | Account-security transactional mail | P02 boundary defined | Tenant campaign mail uses channel adapter; does not reuse platform sender implicitly |
| public/sw.js / mobile config | Safe PWA foundation | P03 client/session cache review | P10 web readiness; native build optional |

Proposed new directories: shared/contracts/; server/core/; server/modules/{agency,knowledge,integrations,marketing,crm,conversations,sales,outbound,reporting}/; src/features/ equivalents; server/migrations/ for new immutable migration definitions; test/integration/, test/browser/ and provider contract fixtures. Names are planned, not files that already exist. Reuse discovered equivalent modules before creating new ones. Prefer a small domain grouping over one file per trivial type.

Single owners: ClientAccessPolicy (authorization), KnowledgeService (business facts), IntegrationRegistry (connections), PublishingService (posts), ConversationService/MessageDispatchService (conversations and sends), SalesWorkflowService (sequences/booking), AutomationPolicy (risk/budget/stops), DueWorkDispatcher (scheduling), EvidenceLedger (action history), OutcomeService (conversions). Cross-module operations invoke these owners rather than duplicating their logic.

### 4.3 Avoid overwrite/conflict churn

- First produce route/table/export inventory and short contracts; then extract mechanically with old endpoints preserved. Do not combine a broad refactor with new provider functionality.
- Early safety fixes cannot wait for architecture extraction. A later small extraction edit is intentional, not duplicate implementation.
- Mount new modules centrally once; later tasks edit their module, not the server monolith. Add feature navigation in planned batches after stable contracts exist.
- Each task declares files, migration IDs, API changes and tests before editing. One active writer for a shared file. Batch related edits, not unrelated changes.
- Do not promise a file will never be edited twice: fixes, tests and integration sometimes require it. Aim for one owner, small diffs and no wholesale regeneration.
- Historical feature matrices do not receive repetitive milestone rewrites. Update one evidence ledger during implementation; reconcile user-facing docs at release.

## 5. Data model and migration design

### 5.1 Invariants

Reuse companies as client workspaces; do not create a duplicate clients master. Reuse leads as the canonical prospect/customer identity for this product initially; add lead channels/identifiers and opportunities rather than create a competing contacts table. Allow multiple opportunities per lead. Optional agency organization sits above companies. Existing companies.user_id remains a compatible ownership field during backfill, not a perpetual alternate authorization path.

Every tenant record carries company_id; agency-scoped records carry agency_id. Server resolves these from authenticated memberships and resource ownership, never trusts body IDs or active-client browser state. Composite keys/indexes enforce tenant-bound relationships where supported. Queries and jobs require explicit scope; reject missing/ambiguous company selection rather than choosing the first client. Platform administrator is not the same as agency owner; support access is explicit and audited.

Store UTC timestamps; product scheduling and display timezone is fixed to Asia/Kolkata (IST) for every client, per user direction. Preserve locale separately; do not add a client timezone selector. Represent money with currency and minor units/decimal rules, never floating-point totals; unavailable costs remain null. Provider ID namespaces include provider and integration account. Keep sensitive documents outside public uploads; marketing media is separately classified public/shareable. All list APIs require bounded pagination and tenant filters.

### 5.2 Migration batches (reserve final numeric IDs only after P00 inventory)

| Batch | Schema additions/extensions | Compatibility/backfill |
|---|---|---|
| DB-A | Queue leases/version, action runs/events, schedules, outbox/inbox, persistent policy/stops/usage | Extend existing job_queue and audit tables; do not create parallel job queue |
| DB-B | agencies, memberships, client memberships, locations, fixed IST policy, company locale/version | Idempotent mapping of existing owners/companies; no implicit escalation |
| DB-C | knowledge sources/files/versions, ingestion runs, extracted facts, approved facts, chunks and citations | Legacy knowledge JSON imported as user-entered text; never claim a historical PDF was parsed |
| DB-D | content plan/version/assets linkage, per-platform publish intent extensions, review dispatch metadata | Reuse content_posts, publishing_records, reviews and rank/competitor observations |
| DB-E | lead identifiers, conversations/messages/receipts, consent/suppression events, opportunities, source touchpoints | Deduplicate within tenant with reversible merge map; no cross-tenant identity merge |
| DB-F | sales workflow definitions/versions/enrollments/steps, booking records, calendar connections and handoffs | Queue executes steps; workflow records store business state |
| DB-G | prospect ICP/signals/enrichment, external sync mappings, outcomes/experiments, bounded usage records | Reuse leads/campaigns; provenance and cost links |
| DB-H | report runs/delivery preferences/read models, agency settings/branding if enabled | Summaries derived from ledger, not a second action truth |

Before any production migration: schema and version inventory, checksum evidence, backup and restore test, duplicate/conflicting-row report, dry-run/backfill reconciliation and rollback plan. Do not modify migrations 001–006 already applied; confirm inventory before reserving new IDs. MySQL DDL can auto-commit: stage expand/backfill/switch/contract and make each step resumable. Use UTC consistency and actual MySQL/MariaDB feature detection; do not assume SKIP LOCKED/version compatibility.

Checksum special case: current hash uses migration function.toString(), which may differ between tsx and bundled/minified code. Test both execution paths against a copied ledger. Choose source-independent, immutable forward migration checksums. Existing ledger compatibility requires a verified migration manifest/process; never silently replace stored historical checksums or disable integrity verification. Keep old definitions frozen until compatibility is proven.

Retire db.ts runtime self-healing DDL only after fresh-install and upgrade coverage proves the migrator supplies all required schema. After cutover normal request paths must not mutate schema. Keep schema.sql as a generated/documented reference, not an independent migration authority. Do not break existing production boot while replacing initialization.

### 5.3 Concurrency and versioning

Writes to client profile/settings include a version/ETag; stale changes get a conflict response, not last-write-wins overwrites. Replace whole-company JSON autosave gradually with typed patches for user settings; server-derived metrics remain read-only. Client changes cancel obsolete fetch/autosave work. Outbox records are committed with business changes. Provider calls occur outside DB transactions and use intent/idempotency records, then evidence reconciliation.

## 6. Canonical contracts, state and APIs

Keep distinct vocabularies instead of one universal status enum:

- Jobs: existing QUEUED/RUNNING/RETRY_WAIT/SUCCEEDED/FAILED/CANCELLED vocabulary retained; exhaustion/dead-letter reason and unknown-provider reconciliation recorded explicitly.
- Business action outcome: completed/partial/failed/blocked/skipped/cancelled/unknown, with reason and evidence. Translate explicitly to job state; an unconfigured provider is never successful.
- Messages: draft/approval_pending/queued/provider_accepted/sent/delivered/read/replied/failed/unknown. Channels expose only states they actually support. Delivery is not proven by an API message ID.
- Publishing: draft/approval_pending/scheduled/publishing/published/partially_published/failed/unknown, with per-platform state and provider IDs. Compatibility adapter maps old frontend status values during migration.
- Integration: not_configured/configured/connecting/connected/verified/stale/failed/unavailable plus permission/token timestamps. Configured is not verified.
- Ingestion: uploaded/queued/extracting/needs_ocr/needs_review/ready/failed/blocked; each document version has actual extraction/index evidence.
- Evidence classification: keep DataStatusBadge semantics, including user_entered/calculated/unavailable. Live provenance has timestamps and scope; AI-generated is not verified.

Every command contains authenticated context, company scope, input schema, idempotency key where relevant, correlation ID and policy version. Response envelope includes data or stable error code, retryability, field errors and request ID; never credential values. Writes enforce validation at route and service boundaries. Date/phone/URL parsers are explicit and locale-aware. Input versions are frozen when approving content/quotes/workflows; editing invalidates affected approvals.

Route policy: preserve existing /api/companies and established content/leads/integration endpoints. New routes follow /api/companies/:companyId/{domain}; agency routes /api/agencies/:agencyId/... . Resolve id versus companyId aliases at the compatibility boundary only. Plan endpoint families for onboarding/import-runs, knowledge sources/files/facts/query, connections/OAuth, conversations/messages, opportunities, workflows/enrollments, bookings, prospects/signals/enrichment, reports/actions and scoped developer access. Exact schemas are frozen in P02/P04/P06 contracts before consumers implement them. Avoid declaring a second route that shadows an existing one; add route collision regression coverage.

GET actions must remain read-only. Publishing/sending/booking are explicit authorized commands. Uploads return 202 + run ID for async work. Webhooks durably validate/store events before acknowledgement, then process asynchronously with replay. Public lead forms use scoped expiring/rotatable tokens plus rate/abuse controls; absence of browser CORS is not authorization.

## 7. Detailed feature specifications

### F01 — Agency, clients, locations and permissions

Main owner can create/archive/pause clients, switch context and see aggregate status. Manager/staff receive explicit assignments and permissions. Optional client viewers/approvers see only their workspace; global admin/support privileges are not inherited by agency accounts. Scope matrix: owner manages agency/settings/assignments; manager operates assigned clients; staff restricted tasks; client approver reviews assigned client drafts; viewer reads approved reports. Enforce object-level access in APIs, jobs, files, webhooks and exports.

Locations belong to one client and have external location IDs, geography, hours and calendars. Model a branch as a location unless it is a separate legal/client workspace; do not create duplicate company/branch truths. Account connections may expose multiple authorized locations, with explicit mapping and unique routing. Archive pauses new jobs, retains permitted history and defines retention/deletion; delete requires a separate reviewed lifecycle.

Acceptance: owner with clients A/B; staff assigned A; client viewer B; empty client C; user from another agency. Test read/write/search/file/download/report/provider calls, switching, refresh, deep links and stale requests. No values from previous client render as current-client data. Local-only branches/white-label success messages disappear or become explicitly unavailable until persistent settings exist.

### F02 — Business onboarding and strategic readiness

One wizard: create workspace → website/documents/manual facts → extracted preview → confirm facts/brand → goals/ICP/service area → connect channels → configure approvals/capacity/budget → run real baseline audit → review draft plan → activate. Save resumable checkpoints server-side. Missing website is supported through manual facts/documents. No credentials/permissions inferred from a URL or Place ID.

Capture industry, offer types, service/product catalog, approved price ranges, policies, differentiators, geography/language and fixed IST scheduling policy, ideal customer, exclusions, desired conversions and fulfilment capacity. Offer capability packs: local appointments; local quotes/services; B2B agency/services; product/ecommerce integration. Product checkout/order sync is an optional connector, not an invented built-in checkout under skipped billing. Sector-sensitive messaging uses explicit restrictions, not generic promises.

Readiness report identifies unconfigured, blocked, stale and available modules. Generate a proposed plan from verified facts; no performance audit is marked done by a timer. Define objective metrics/baseline and require explicit activation of external sends/spend.

### F03 — Website ingestion

Use an async bounded importer for an explicitly supplied public site: home/about/services/products/contact and permitted same-site links/sitemaps within configured depth/page/time/byte budgets. Respect applicable access restrictions and robots guidance; never bypass login/paywall. Resolve relative links, canonical URLs and redirects. Block loopback/private/link-local/metadata endpoints, unsafe protocols/ports, DNS rebinding and redirect escapes at every fetch. Apply safe fetch policy to template image URLs and existing integration URL tests too. Route via supported environment/hosting networking.

Extract visible text/structured data/contact/location/assets with URL+timestamp+content hash. Treat website instructions as untrusted content, not tool commands. Do not auto-follow unrelated domains or execute embedded scripts. Start with static HTML; render JS-heavy sites only in a measured, isolated supported worker, otherwise show partial result/manual upload route. Timeouts/access denials produce actionable state.

Facts carry confidence and field-level provenance. Conflicting phones/prices/addresses require review. Logos/images require approved ownership/licensing and safe MIME/size validation. Refresh creates a new version/diff; approved manual facts have precedence until reviewed. Website availability does not authorize Google/Meta actions.

### F04 — Private documents, extraction and business knowledge

Real multipart upload to tenant-private storage with extension/MIME/signature checks, byte/page limits and extraction resource bounds. PDF text extraction; scanned PDFs go to OCR when supported, otherwise needs_ocr with clear recovery. Implement DOCX parsing if advertised; legacy .doc must be explicitly supported via a safe converter or rejected with a conversion instruction. TXT/Markdown read normally. Reject corrupted/encrypted/unsafe unsupported files truthfully.

Persist original object metadata/hash, private access controls, versions, page/section text, extraction logs, actual chunks/index state and retention. Documents never go under public marketing uploads. Download requires server authorization or short-lived scoped URLs. Async parser/OCR must not execute document macros/instructions. Refresh/replacement/deletion invalidates old retrieval and pending messages using superseded facts as policy requires.

One KnowledgeService retrieves company-scoped approved facts/FAQ/source passages for query, review drafts, captions, sales replies and assistants. Initial retrieval: structured exact facts + SQL/text passage search with a small bounded context; benchmark before introducing embeddings. Citations resolve to actual source/version/page, not generated source labels. Retrieval confidence and contradictions decide abstain/escalate; isGrounded=true is not automatic proof. Never invent prices, warranties, delivery times, discounts or results. Log model/provider/version, token/cost usage, source versions and policy decisions with sensitive content minimization.

Acceptance fixtures: normal PDF, scanned PDF, corrupt/password-protected/oversize PDF, DOCX, TXT, multilingual facts, conflicting price cards, deleted version, prompt-injection text, missing answer and empty client. Verify source citations and tenant exclusion across every AI entry point. Test actual named facts, not just a nonempty response or label.

### F05 — Integrations and capability registry

One canonical provider ID plus explicit alias mapping for legacy Google IDs; Places data access is separate from GBP OAuth and Search Console. Registry holds supported operations, verified scopes, account/location mapping, expiry, last success/error, webhook state, usage and readiness. Credentials encrypted server-side with key version/rotation plan; UI gets masked metadata, not secrets. Connect/reconnect/disconnect revoke/cancel work predictably.

OAuth uses expiring single-use state bound to actor/company/redirect, PKCE where provider supports, least privilege and refresh locks to avoid token races. Revoked/expired tokens transition to stale/blocked, trigger an owner task and do not silently fall back to another tenant or platform token. Website URLs and account IDs never count as connected evidence. Refresh provider docs/version lifecycle before implementing current Graph/Google endpoints; do not hardcode competitor-supported access as authorization.

Security mail sender remains separate from tenant campaign mail identity. Tenant notifications cannot inherit a platform-global Telegram recipient or email sender accidentally; owner-level operational alerts are an explicitly configured separate destination.

### F06 — Google profile, local SEO and competitors

Sync only fields/resources available from the chosen provider and permissions; cache with freshness. Places review samples are not a complete review corpus. GBP operations require authorized accounts/locations; do not equate API-key Places access with owner control. Audit recommendations include evidence, severity, expected action and whether automation is available. Profile score is platform-calculated, not a Google-issued score or guaranteed rank predictor.

Keyword research (suggestions, intent, provider volume) is distinct from rank observation. Maintain 3×3 geo-grid/history foundation; require actual verified coordinates/place identity, correct timezone and explicit radius. No Navi Mumbai fallback for unknown clients; numeric 0 is valid geography. Track unranked, unavailable, failed, stale and partial separately. Provider selection does not fall back globally across tenants. Budget/cap recurring scans, dedupe in-flight work and expose sample timestamp.

Competitor identity uses place/location/provider IDs and confidence; preserve historical baseline before calculating changes. Missing baseline is not zero growth. Website/local competitors differ from outbound buyer prospects. Preserve provenance and avoid unsupported causal claims about ranking changes.

### F07 — Reviews and reputation

Unify review list/ingestion/dedupe, AI draft, local save, approval, provider send and verification. Use stable provider review IDs; user-entered reviews remain labeled user-entered. Publishing Google replies calls one provider adapter, used by UI/autonomous actions/jobs. Require current location permissions and external evidence; show saved locally separately. Human approval for sensitive complaints/legal/medical/financial promises based on policy. Allow edit/retry/reconcile without fake success.

Review requests after genuine service completion use consent and approved cadence; no fake reviews or selective manipulation workflow. SLA reminders use real review timestamps/status. Missing rating stays null; reminders must not replace unknown ratings with five stars.

### F08 — Content, creative library, calendar and publishing

Plan from the current IST calendar date, verified catalog, language, geography, approved offers and desired audience. Locale-aware festival dates use a maintainable source; user confirms relevant festivals. All publishing endpoints, including the legacy Meta composer, must dispatch a stored tenant-owned post through the canonical engine; payload overrides cannot bypass its claim or confirmed-outcome rules. Freeze plan/content versions; no hardcoded laptop business, historical dates or fabricated customer stories. Record plan count actually saved. Deduplicate repeated topics/assets and support draft review, edits, rescheduling and cancellation.

Use existing template renderer/palettes/theme rotation; approve brand kit and assets, support platform-safe dimensions and readable language/fonts. Curated ready-to-share library is per client with source/license/approval/version. AI image-generation capability and template rendering are labeled accurately; add a provider only when supported and budgeted, not by calling template output generated photography.

Canonical PublishingService orchestrates Google updates/media, Facebook and Instagram through explicit adapters. Legacy /meta/publish-post and autonomous routes delegate; no second path bypasses approvals/evidence. Per-platform intents preserve partial success: do not republish a successful platform while retrying another. Operator observations must be audited separately from system-confirmed provider evidence, retaining actor, claim/content context, reference and timestamp. Recording observed/not-found/uncertain notes cannot itself settle a claim or enable resend; verified resolution is a separate controlled operation. Provider accepted/timeouts require reconciliation; API acceptance is not proof of visibility. Respect external media accessibility and expiring URL lifetime; private documents are never exposed as media.

Reels reuse Remotion but job state becomes durable; persist progress/output metadata, input source versions, resource budget and restart behavior. Cancellation and cleanup are explicit; hard limits prevent concurrent renders exhausting hosting. Optional external worker only after P00/P10 measurements. No placeholder video counted as successful real creative unless explicitly requested as a draft.

### F09 — Campaigns, ads and storefront

Retain internal marketing plans separate from verified external ad metrics, with explicit links and campaign/source IDs. Existing paid-ad telemetry remains read-only until an approved provider write adapter, spend limits and rollback are validated. New ad launch/budget changes require owner approval; recommendations cannot directly spend. Missing spend/revenue stays unavailable, not a zero-cost success.

Website builder uses approved client facts/assets; preview/export/storefront share one renderer and escaping rules. Exported lead forms use the configured API origin (not an incorrect relative API on another host), allowed origins and token scope/rotation. Verify public lead capture, mobile layout, accessible forms, domain ownership and host routing. DNS check is not SSL provisioning; enable custom domains only with verified platform support. White-label agency domains are a different feature from client storefront domains.

### F10 — Canonical CRM and conversation identity

Within a tenant, normalize E.164 phones using confirmed region, email conservatively and provider IDs exactly. Do not infer India for all clients. Deduplicate incoming events/contacts; ambiguous identity creates a review task, not an automatic destructive merge. One contact may have several opportunities/services; preserve separate enquiry/outcome history. Reversible merge retains identifiers, provenance and event history. No identity merge across clients.

Store interactions, assignments, service interest, score reasons, next action, consent purpose/channel, capture source and touchpoints. Stage transitions server-side validated. WON/LOST have timestamp/reason/actor and optional manual amount/currency; manual values never become verified payment receipts. Client counts and funnels define whether they count contacts, enquiries or opportunities.

### F11 — Inbox, channels, inbound and delivery

Unified client timeline/inbox for chosen initial channels WhatsApp and email, then approved LinkedIn adapter if available. Preserve channel threading/attachments rather than pretending all channels have identical semantics. Incoming events route by verified integration/account/location; unknown tenants quarantined with safe diagnostics. Process all valid webhook batch entries, with event-type composite dedupe. Durable intake before 2xx acknowledgement; asynchronous retries/replay and dead letters. Do not mark a failed persistence operation processed or silently drop it.

Message sends pass through MessageDispatchService for tenant identity, approvals, suppression, provider limits, outbox, timeout reconciliation and receipts. WhatsApp ID is accepted, then real receipts advance delivery/read/failure. Enforce official conversation-window/template rules, consent and media requirements. Broadcasts are recipient jobs with per-recipient results and limits, not one long HTTP loop. Log redacted identifiers; do not print entire customer messages/verification tokens by default.

Campaign email uses tenant sender, verified domain/mailbox permissions, SPF/DKIM/DMARC readiness checks and reply/bounce ingestion. Deliverability controls include gradual caps, suppression and unsubscribe where applicable. Do not use transactional account-security credentials for marketing by default. Gmail/Microsoft or a selected provider integration is a prerequisite, not fabricated SMTP reply detection.

### F12 — Qualification and personalized response

Explainable scoring separates fit, observed engagement and user-stated intent. Use approved services, budget/timeframe/location and explicit missing-data reasons. Buying-signal confidence is not certainty of purchase. Qualification questions vary by capability pack; minimize unnecessary personal data. AI drafts grounded answers, approved offers and next steps. Verified low-risk FAQs can later auto-send within client policy; uncertainty, sensitive complaints and binding commitments route to a human with conversation context.

No tool execution from untrusted messages/documents. Structured command allowlist, schema validation, authorization, policy and budget are mandatory after model output. Evaluate multilingual accuracy and escalation quality. Auto-reply loops, repeated responses and provider webhook echoes must be detected and stopped.

### F13 — Sequences, bookings and retention

Versioned workflow definitions support trigger, eligibility, steps, delays, IST quiet hours, approval, branch, exit, retry and handoff. Start with bounded templates, not an unrestricted visual workflow designer. Enrollment unique by client/lead/opportunity/workflow version as appropriate. Event-driven reply/opt-out/booking/won/lost exits cancel pending work; sender rechecks immediately before dispatch. Atomic per-lead version/lease handles reply-vs-send races as far as locally controllable; unavoidable provider timing races are recorded and reconciled, never guaranteed impossible.

Booking integrates one actual calendar provider/link first; check free/busy/timezone/duration/buffers and idempotency, then create event, confirmation/reminders, cancel/reschedule and dedupe webhook changes. Local availability preview is not confirmed booking. Concurrent reservations and external conflicts have a defined rejection/recovery path. Capture external event ID before claiming success.

Retention workflows: fulfilled service/customer milestone → eligible review request, aftercare, repeat-service reminder or reactivation. Respect consent, frequency, prior replies and do-not-contact. Approved pricing/discount boundaries only; custom proposal/negotiation and contractual closure require human approval unless a narrowly defined validated policy exists.

### F14 — Outbound discovery, enrichment and signals

Enable for clients needing B2B acquisition, not every clinic/shop. Define ICP roles, geography, industry/size, exclusions, competitor/service-provider blocks and per-client contact caps. Use authorized source adapters; CSV imports use the same identity/eligibility pipeline. Evidence: source URL/provider, acquisition time, signal type/time, fit explanation, confidence and permitted use. Deduplicate against clients/customers/existing sequences before contact.

Signal catalog: relevant engagement, funding, hiring/job changes, technologies, own first-party events and lookalikes where sources permit. Lookalikes require a validated positive example set and holdout evaluation; low volume does not justify unrelated prospects. Enrichment queries bounded providers with cost/result audit; stop when verified required fields found, preserve email verification freshness and ambiguous outcomes. Phone discovery is not permission to call/message.

Website visitor identification is optional account-level identification through a vetted provider and appropriate notice/consent; never imply a visitor's personal identity is known. LinkedIn automation is a gated capability: verify supported access, account policy and operational risks. No scraping/session-cookie/proxy workaround is assumed merely because Gojiberry advertises a feature. If unavailable, provide research/draft/manual-handoff or another supported channel and mark the feature blocked.

### F15 — Outcomes, attribution and controlled learning

Track source touchpoints/campaigns, qualified conversations, appointments booked/held, opportunities won/lost, manual/verified value and costs. Separate local/inbound/outbound funnels. Define attribution model/version and window (start with transparent first/last known touch); unknown remains unknown. Cross-device/person linkage requires evidence; no invented channel credit. ROI shown only when compatible cost and revenue evidence exists.

Extend existing score/summary/attribution services with adapters for opportunities and knowledge readiness. A heuristic growth score is not a measured business result. Experimental recommendations include hypothesis, baseline, audience, budget cap, stop rule and evaluation window. Freeze an approved experiment version; prevent simultaneous conflicting changes. Low samples report inconclusive. AI suggestions cannot autonomously expand spending or make unsupported causal claims. Learning initially means measured rules/experiments, not training a bespoke model by assertion.

### F16 — Agency daily accountability, alerts and client reports

Action ledger is written by every executor from P01. Every planned action has stable ID, client, location, campaign/workflow, scheduled/local date, actor, policy/version and intended result. Each attempt appends status, reason, timing, cost and evidence. Current state is a projection of events; existing autonomous audit logs remain an authorized event source, not a competing execution engine. Do not copy provider secrets/customer message contents into report rows.

Daily client report: plan; completed with evidence; partial; failed; blocked; skipped/cancelled; retries/recovery; leads/replies/appointments/outcomes; cost/usage; approvals required; next-day plan. No-work day and unknown/unconfigured channels are stated honestly. Reconcile totals to stored actions and attempts; retry attempts do not inflate completed action counts. Reports have source cutoff/timezone/version; late events can amend a report with a visible revision.

Agency view aggregates only authorized clients: health, stale connections, missed work, unattended leads, overdue approvals, capacity/usage and outcomes. Drill down to source events. Operator cannot see another agency's aggregate counts. Client-view reports omit private agency notes and other clients' data. Email/Telegram digest sends are idempotent and destination-scoped; sensitive attachments/links require access. Owner-wide alert destination is explicit, not a tenant-global fallback. Critical failure alerts occur immediately with dedupe, not only in a daily digest.

Telegram chat UI displays actual connected account metadata/actions. Optional inbound Telegram commands require verified webhook, user-to-agency/client binding and explicit disambiguation. External publication, spend or bulk sends still use approval/policy. Chat text saying 'executed' cannot substitute for a saved action record.

### F17 — Developer access, interoperability and optional UX extensions

Expose selected stable commands through scoped API keys (company/agency/operation, expiry/rotation, rate limits) and signed webhooks with replay protection. Start one external CRM connector chosen by actual need; define source of truth per field, mapping, retries, loop avoidance and conflict resolution. Do not implement every competitor connector at once. MCP wraps these same authorized commands with read/write scopes and approvals; it is not an additional business engine or a way around tenant checks.

Responsive web/PWA supports owner dashboard, approvals, lead follow-up and reports. Audit accessibility, loading/error/offline states and stale/client cache labeling. Never cache auth/API/private documents across identities. Logout/client switch invalidates relevant caches and queued writes; PWA offline mode does not authorize delayed external sends. Native Capacitor release/signing/store submission is optional after web readiness. Agency branding settings are persisted if enabled; custom white-label domain requires separate DNS/SSL verification and capability gate.

## 8. Phase sequence and exit gates

| Phase | Purpose and deliverable | Dependencies | Exit gate |
|---|---|---|---|
| P00 | Baseline/source-hosting inventory, regression fixtures, runtime/lockfile and migration strategy | None | Evidence recorded; current source/live differences explicit; no unresolved destructive migration assumptions |
| P01 | Immediate safety, tenant state resets, queue/dispatcher, policy stops, action ledger | P00 | Negative tenant tests and real DB concurrency/recovery pass; no reproduced false-success paths |
| P02 | Modular seams/contracts, security/session/integrations, single schema authority | P01 | Legacy contracts preserved; source/bundle migrations agree; shared owners used |
| P03 | Persisted agency/client/location model, RBAC, scoped UX | P02 | Cross-client/agency/role/browser isolation and backfill tests pass |
| P04 | Website/documents/approved facts, unified knowledge, real onboarding/readiness | P03 | Actual extraction/citations/abstention, revisions and tenant safety pass |
| P05 | Complete Dhanda-style marketing workflows, GBP/Meta, SEO/reviews/calendar/creative/storefront | P02–P04 | Fixture/contract tests plus authorized per-channel staging evidence; blocked channels explicit |
| P06 | CRM identity/opportunities and durable conversations/inbox/channel delivery | P03/P04; reuse P05 adapters | Replays/batches/replies/receipts/dedupe/consent tests pass |
| P07 | Sales workflows, qualification, policy autopilot, booking and retention | P01/P04/P06 | Reply/opt-out/booking race tests; one real approved marketing-to-appointment journey |
| P08 | Selective outbound, attribution, cost controls, experiments and API/connector extensions | P05–P07 | Authorized prospect-to-reply journey; measurable outcomes; no unsupported send capability silently enabled |
| P09 | Agency operations/reports, client access, Telegram and mobile web polish | P01 ledger; P03–P08 data | Report reconciliation, privacy, catch-up delivery and complete owner/client journeys |
| P10 | Security/performance/Hostinger rehearsal, rollback, controlled launch and handover | Relevant feature gates | Staging acceptance + restore/rollback + provider evidence; production activation separately authorized |

Do not wait until P08 to record attribution fields or P09 to emit ledger events. Their storage/contracts begin in P01/P06; later phases add read models and optimization. No UI should advertise a capability while its required gate is blocked.

Gate interpretation: implementation readiness and production activation are separate axes. A provider-unavailable optional feature can be implemented with contract tests and remain activation-blocked; record the exact prerequisite and continue independent tasks. A missing core prerequisite cannot be marked complete by deferral. In particular, tenant safety, real document extraction, durable persistence and truthful reporting are core gates. Optional LinkedIn, enrichment vendors, CRM connectors or white-label domains must not prevent agency reporting from progressing. When a serial work-index dependency reaches an optional task, resolve it as implemented-but-disabled or explicitly deferred with a decision record, never silently skipped. Required staging credentials must be supplied before enabling the corresponding channel. A phase may be code-complete with integration blockers, but it is not production-ready until all enabled required capabilities pass their live gates.

## 9. Queue, ledger and scheduling execution rules

Typed job registry validates job_type/payload and allowed resources. Immediate and scheduled commands share tenant authorization/policy checks. Claim uses one acquired connection and explicit transaction, with tested DB-version-compatible locking or conditional update. Record worker ID, lease expiry and monotonically increasing lease token/version. Completion/renewal/failure require matching lease; stale worker cannot overwrite a reclaimed job. Long work heartbeats or splits into resumable chunks. No DB connection held over network calls.

Per-action idempotency protects business operations; per-attempt IDs record retries. Exactly-once external delivery cannot be promised for all APIs. When a provider accepts a request but response is lost, mark unknown, lookup/reconcile if supported, otherwise escalate rather than blindly resending. Partial platform publication retries only missing outcomes. Backoff with jitter, attempt budgets, Retry-After support and dead-letter UI. Cancellation/stops checked both before expensive work and immediately before side effects.

One dispatcher derives due tasks for queue processing, content, scans, review reminders, digests and workflow steps. Internal timer and authenticated external cron call the same dispatcher. Persist schedules/last due occurrence; catch-up policy distinguishes safe catch-up, skip stale content and owner review. Per-schedule due occurrence key prevents duplicate ticks/digests. Bound HTTP tick duration/batch size to hosting limits; external worker or repeated cron handles remaining work. Use dedicated CRON_SECRET header, no AUTH_SECRET reuse/query secret logging; rotate legacy callers deliberately.

Fairness: per-agency/client/channel concurrency, scan/render/send caps and shared provider quota. One client cannot starve others. Admission checks projected usage before paid calls; settlement records actual/unknown cost. Reserve budget atomically for concurrent actions. Emergency stops persisted and visible across processes, with scope and reason; resumes do not release a backlog blindly.

## 10. Test and acceptance strategy

Use existing suites as regression evidence, not proof of live production completeness. Keep passes/failures/skips/provider-blocked/unrun separate. New tests must exercise meaningful behavior and failure paths; do not add tests asserting copied implementation strings or status labels only. Preserve underlying command exit codes; existing npm test stops at first failing program, so report unrun programs explicitly.

| Test group | Required scenarios |
|---|---|
| Tenant/RBAC | Two agencies, multiple clients/locations, staff assignments, viewer/approver permissions, payload/resource mismatch, file/export/job/report scope |
| Browser context | A→empty B switch, slow A response after switch, pending autosave, multi-tab session, refresh/logout, offline/stale caches |
| Real SQL | Fresh/upgrade schema, immutable checksums, source vs bundle, concurrent job claim, expiry/fencing, profile version conflicts, backfill reconciliation |
| Provider contracts | Unconfigured/stale/403/429/timeouts, accepted vs delivered, unknown reconciliation, permission failures, mixed-platform success |
| Webhooks | All batched entries, signature/replay, duplicate/out-of-order receipts, crash after durable ingest, retry and unmatched tenant quarantine |
| Ingestion/AI | PDF actual facts, OCR fallback, corrupt/encrypted/oversize input, URL redirects/private IPs, prompt injection, citations/conflicts, deleted data |
| Marketing | Client-specific current calendar, no unsupported claims, Google/Meta draft→publish→verify, null rank/rating data, repeat scheduling |
| CRM/sales | Identity ambiguity/merge, multiple opportunities, reply/opt-out before dispatch, quiet hours/DST, sequence version edits, booking conflict/idempotency |
| Reports | Totals match actions not attempts, daily timezone/catch-up, amendments, redaction, no-work and missing-provider days |
| Security/ops | Session CSRF/revocation, file access, safe URL fetching, persistent rate limits, redacted logs, restore, resource caps and dependency audit triage |

Use deterministic fixtures for reproducible provider contract tests and a dedicated real MySQL test database. Test data must never fall through to production env credentials or global recipient settings. Separate process state to avoid shared kill-switch/test file changes. Preserve and restore only test-caused artifacts. No real customer outreach, paid calls or production mutations just to get a green test.

Browser automation framework is a deliberate P00 dependency addition if needed, not assumed installed. Test against a staging environment with dedicated provider accounts. If a provider test is unavailable, pass local/contract gates but keep live gate blocked. Each activated channel needs one authorized end-to-end send/publish and observed external evidence. Real booking needs external event ID; a mocked calendar response is not live proof.

Standard code checks: npm run lint, npm run build, selected meaningful tests per change; full npm test at phase/release boundaries. After a failure or new code change rerun affected checks; do not repeatedly run unchanged full suites. All declared test programs must actually execute before claiming full-suite pass.

## 11. Hostinger deployment, privacy and security gates

P00/P10 read actual hosting configuration/logs via supported access before recommending a plan upgrade. Verify Node version/start command/port, repository revision/build artifacts, database version/permissions/pool limits, process lifetime/sleep, external cron intervals/timeouts, disk persistence, TLS/DNS, external network permissions and backup retention. Existing shared Business plan is a constraint to measure, not proof that Chromium/OCR/long-running workers work. No VPS/container migration/purchase assumed.

Resource strategy: bounded API work and DB pool, cached evidence, limited scans, lightweight HTML/PDF first, one measured render/OCR lane, queue backpressure and storage cleanup. Benchmark representative small/medium client counts then set documented capacity. Choose optional worker/object storage only when measured need justifies cost and supported credentials/network are available. Public domain support/SSL must use actual hosting capabilities.

Security: password hashing preserved; review self-registration and role grant paths, explicit agency invites, least-privilege DB/API access, admin MFA rollout and session revocation. Choose browser HttpOnly Secure SameSite cookie session with CSRF/origin controls; retain scoped bearer support only where needed for mobile/API and stage compatibility migration. Do not merely move token storage without handling all clients. Limit CSP to actual needs; review script/image/frame/network sources and sanitization. Header-based cron and structured log redaction protect credentials. Rate limits keyed by actor/client/channel/IP as appropriate, persisted consistently across instances.

Data lifecycle: notice/consent/purpose/source records for contact data, suppression before sending, client export/deletion/retention and encrypted backups. Minimize PII in analytics/prompts/logs, define provider data handling and hosting region, version encryption keys and test recovery. Restore of a DB must preserve/reconcile opt-outs and external send intents so old scheduled work is not blindly replayed. Document source licensing and authorized access. No claim that competitor safety marketing establishes legal/platform permission.

Release: snapshot/backup → staging upgrade/backfill → checks and provider verification → source revision/artifact manifest → feature-flagged canary for one client → observe errors/latency/queue/delivery/cost → expand. Prefer backward-compatible DB changes and previous binary rollback; destructive contract/deletion deferred to later approved release. Save an exact deploy/rollback runbook. Actual production deploy, external sends, spend, DNS changes and destructive migrations need their appropriate authorization; a plan is not that authorization.

## 12. Business quality and release acceptance

A production-enabled capability is done only when implementation, schema, UI/API, permissions, tenant tests, failures/recovery, monitoring, operating instructions and required live verification are complete. A blocked optional capability is not shown as done. Readiness has separate statuses: local complete, integration verified, staging accepted, production observed.

Core launch scenarios:

A. Agency adds a clinic with URL/PDF; reviews facts and sources; connects authorized location/channels; generates a relevant plan; a real approved post is published; inquiry becomes a single lead; qualification/follow-up yields a confirmed appointment; owner/client report reconciles actions and evidence.

B. Same owner adds a software agency client; knowledge remains isolated; ICP/outbound enabled only with supported credentials; selected prospects are qualified and contacted within policy; reply halts sequence; human or bounded FAQ reply progresses conversation; appointment and outcome attributed without copying clinic content.

C. Provider token expires, cron overlaps, one render crashes and client B replies during a scheduled follow-up: failures visible, no false delivery/success, no cross-client dispatch, duplicate attempts bounded/reconciled, owner receives actionable alert and daily report includes missed work.

D. Empty/no-website/manual-only client receives no fabricated profile, rank, calendar history or connection status. Manual edits and facts survive restart/refresh; unsupported PDF/channel states explain the recovery path.

Metrics: qualified conversations, lead→qualified→appointment→held→won rates, known cost per qualified outcome, response time, operator time with an agreed baseline, due-action completion, provider failure/unknown rate, recovery time, duplicate incidents, knowledge citation/abstention quality and per-client data freshness. Define denominators and attribution windows before comparison. Do not set arbitrary growth promises or derive targets from selected vendor testimonials. Pilot results decide whether ABGM1 is better for a specific client's use case.

## 13. Token-efficient execution protocol

1. Read EXECUTION.md, next task row and referenced master sections. Check Git status and change inventory; do not re-read the whole repository/conversation every turn.
2. Use rg to locate symbol/route and read only the relevant neighborhood and direct callers. Prior audits are navigation aids; revalidate touched code once.
3. Before coding write a small change note: task ID, files, canonical owner, schema/contract changes, dependency checks and tests. No unrelated refactors or broad dependency updates.
4. Implement cohesive domain slices. Shared files have one active owner. Do not spawn agents unless separately requested/applicable instructions authorize it; future parallel work, if authorized, must own disjoint modules and serialize shared schema/mount edits.
5. Update all affected layers together (schema/service/API/UI/tests) for a task. Use narrow patches; do not regenerate entire existing files. Keep compatibility wrappers until callers migrate, then remove them in the same planned consolidation batch.
6. Summarize tool output; save long logs outside source and record command, exit code and evidence path. Never persist credentials/customer secrets in handoff files.
7. Run relevant checks, inspect diff/untracked files, record readiness and remaining blockers. Update only task status and concise execution state, not all historical docs.
8. On context resume: record commit, completed IDs, next ID, known touched symbols, last validation and blocker. Continue rather than rediscovering everything or repeating installation.
9. Freeze applied migrations, approved API/schema versions and source provenance. Unexpected incompatibility becomes an explicit decision/change request; never silently fork the design.
10. A genuine regression can reopen a completed task with evidence. Minimize repeated edits, not necessary correction. Stop feature expansion when exit gates pass.

## 14. Decisions, assumptions and gated extensions

Settled defaults: modular monolith; MySQL durable queue; companies reused; one shared contact identity per client using leads; immutable versioned knowledge; server-authoritative facts/connections; tenant-specific credentials/senders; action ledger from foundation; WhatsApp/email first; approved supported LinkedIn later; responsive web first; billing excluded.

Runtime/provider decisions to resolve in P00/P02 without blocking independent work: exact Hostinger DB/runtime/resource limits; calendar provider; campaign mailbox/reply provider; initial enrichment/source vendor; OCR execution route; browser session compatibility; permitted provider spend/caps; production/staging access and actual deployed commit. Do not request secret values in chat. Inspect configured binding names and operation readiness before requesting missing secure settings.

Optional features must have a decision record with activate/defer/block, reason, owner and revisit trigger: native Android signing/store delivery; agency custom domain/white-label; every external CRM; MCP; advanced visual workflow builder; vector retrieval; JS-rendered scraping; external render/OCR worker; account-level website visitor identification; paid ad creation; ecommerce order/catalog sync; SAML/enterprise requirements. Preserve their roadmap visibility, do not pretend they are delivered by the core milestones.

Primary official comparison sources: https://dhanda.app/ , its linked Google Play listing, https://dhanda.app/tncai ; https://gojiberry.ai/llm , https://gojiberry.ai/faq , https://ext.gojiberry.ai/openapi.json and official reply-handling guides linked in the research report. These are vendor documentation/interface evidence, not independent account execution or outcome proof. Gojiberry explicitly hands off replied leads and requires review/send for AI reply drafts. Dhanda-described Google posting is a parity target to verify, not proof of guaranteed ranking.

## 15. Completion record requirements

For each task: status, implemented commit/diff, files/migrations, exact test commands/outcomes, source/fixture evidence, live verification scope, known limitations and next dependency. For each phase: requirement coverage, regression results, migration/recovery evidence, blocked provider gates and rollout eligibility. One final release report distinguishes shipped/enabled, implemented but disabled, blocked and deferred. Do not mark this plan itself as implementation complete.


### Read-only Meta evidence checkpoint — 2026-11-03 IST

Forward migration015 adds `publishing_verification_audit` (40 canonical tables). Apply with the canonical migration runner only during an authorized deployment; no production migration has been performed. Publishing-review lookup now reads this table, so deploy schema before serving updated routes. POST `/api/companies/:companyId/posts/:postId/publishing-verification` requires workspace authorization, stored source version and a numeric Meta object ID. Credentials come exclusively from the connected workspace integration. The completed check is audited before acknowledgment; failed/interrupted checks are not guaranteed to have an audit row.

MATCHED means account ownership, published-object evidence, canonical text and publication-time window matched. It does not establish media identity, exact dispatch attribution or end-to-end delivery. No claim state changes or resend unlock occur. Missing permissions, fields, network access or provider errors fail closed as UNAVAILABLE; source/connection changes become STALE. Historical checks indicate whether their local source/connection still matches. Provider reads are GET-only, redirects rejected, token in Authorization header, shared five-second abort signal. Real Meta field/permission acceptance and provider quota controls remain hosting acceptance work. UI times remain Asia/Kolkata. Billing excluded.


### Verification admission — 2026-11-03 IST

Meta verification now admits one active request per authorized workspace and six requests per rolling minute within each application process. A bounded1000-workspace map returns HTTP429 with Retry-After when concurrency, rate or capacity is exhausted. Invalid/unauthorized requests never acquire a slot. Service completion/failure releases concurrency; client disconnect does not release an ongoing service early. Slots remain active while the underlying operation runs; no forced takeover. Provider object IDs<=128, account IDs<=64 and photo story IDs<=128 are enforced. Dashboard handles429 explicitly. No new migration. These are local resource protections, not durable distributed/provider quotas; multiple processes/restarts reset or multiply rate capacity. Verified resolution/replay remains pending and uncertain claims stay blocked.


### Stored-source publishing and retry batch — 2026-11-03 IST

Canonical publishing no longer creates a synthetic post or accepts runtime caption/headline/target overrides; callers must save the intended post first. Identical caption/headline payloads remain compatible; unsupported payload fields fail closed. Stale object snapshots fail before provider work. SQL claim admission compares a normalized source fingerprint while holding the content row lock. This catches source/status changes between initial read and claim; it does not promise immutable content throughout the provider request or full approval versions. pending_approval cannot publish through force. No schema migration.

Composer retry references now survive remount/reload within the same tab through sessionStorage. Keys hash actor/workspace/content signature; values contain only the acknowledged post ID, no caption/token. Identical re-entered content/targets reuse the stored post. Storage errors fail closed;100-reference capacity does not silently evict. This is not durable server intent: draft-create acknowledgment loss, another tab/device, cleared storage and changed content still require history review and future server idempotency. No automatic send on reload. Browser/server authorization remains authoritative, and UNKNOWN claims remain blocked. Fixed IST and billing exclusion unchanged.


### Durable composer intent batch — 2026-11-03 IST (supersedes tab-only retry cache)

Forward016 creates publication_draft_intents; canonical schema now41 tables. Apply canonical migrations before enabling the updated composer; historical001–015 remain unchanged. New POST `/api/companies/:companyId/meta-publication-drafts` authenticates workspace access and accepts strict requestKey/content/imageUrl/platforms. Company/key uniqueness and a single SQL transaction bind input hash, authenticated creator and stored post. Concurrent replay returns the same post; changed input or saved content fails409. Shared contentPostWriter owns normalization/INSERT for generic posts and durable intents. No in-memory fallback for durable intent preparation.

BREAKING API CONTRACT: `/api/meta/publish-post` now requires expectedVersion from preparation. It rejects missing400/stale409 before dispatch; engine and SQL claim also recheck stored source. The composer re-prepares on every explicit click. Legacy generic publish endpoints still lack required user-view versions. This snapshot binding does not implement agency-wide approvals or provider-confirmed reconciliation; pending_approval and UNKNOWN remain blocked.

Client keys derive deterministically from actor/workspace/content/image/targets and do not require browser storage. Acknowledgment loss and same-actor reload/new-tab/device retry recover the SQL post, provided input/key unchanged. Identical intent has no expiration or silent eviction; intentional repeated identical campaigns need future explicit new-intent controls. Changed content or actor yields another key and may create another send, so review UNKNOWN history first. FK restricts deletion of referenced posts; archive/retention workflow remains future work. No automatic publication on prepare/reload. Generic post creation and other integrations are outside this endpoint's idempotency scope. Fixed IST, billing exclusion and no production publication remain unchanged.


### Versioned status approval and generic publication batch — 2026-11-03 IST

Forward017 adds workflow_revision (unsigned BIGINT default0) to content_posts and publication_workflow_audit (42 canonical tables). Apply via canonical migration runner before application rollout; no production migration performed. DDL can resume when column already exists. Readiness rejects a missing revision column; migration/index/constraint checks still apply. Source fingerprints now include revision, so older loaded snapshots must reload after deployment. Audited posts are retained by foreign key, without cascade deletion.

BREAKING operator API contracts: PATCH `/api/content-posts/:id/status` and `/api/posts/:id/status` require strict `{companyId,expectedVersion,status}`; status is draft/pending_approval/scheduled only. POST publish aliases require `{companyId,expectedVersion,force?}`. Authenticated workspace access and server actor identity apply. Source/status checks and dispatch fencing occur under SQL locks; transition+revision+actor audit commit together. IN_PROGRESS/UNKNOWN/PUBLISHED claims block manual status editing; no operator reset to publishing/published/failed/unknown. Stale versions return409; no automatic rebase/retry. SQL failure rolls back the transition/audit.

Post list/create expose sourceVersion. Updated Studio/Calendar/Dashboard pass viewed versions. Content Studio supports request approval, approve for scheduled publishing and return to draft. Success callbacks refresh rather than issuing another publication. Client validation/conflicts preserve displayed status; lost acknowledgment stays uncertain. UI is keyed by actor/workspace. Fixed IST remains unchanged.

Scope remains owner-authorized content/status snapshot approval: no mandatory agency policy, peer approver role separation or schedule-field version binding yet. Authorized API callers may schedule a draft directly; generic post creation can still create scheduled content. Scheduled occurrence workers retain their existing due/status/autopilot guards. Internal provider-state setters are not replaced by operator workflow. Approval audit reader, client portal and action-feed fanout remain future work; do not declare complete enterprise approval governance. UNKNOWN never unlocks through this workflow. Billing excluded; no real customer messages/deployment.


### Schedule approval binding and history — 2026-11-03 IST

Forward018 extends publication_workflow_audit (42 canonical tables unchanged) with change_kind, schedule_before/after JSON, audit_sequence and scoped sequence index. Historical rows retain IDs/timestamps; migration assigns sequence by recorded_at,id and resumes nullable-sequence/backfill/index stages before AUTO_INCREMENT. Requires MariaDB10.2+/MySQL8 window-function support; tested disposable MariaDB10.11, live hosting engine acceptance pending. Apply with application writers stopped/before serving the new app; no production migration performed. Readiness validates added columns and scoped/unique index columns. Historical001–017 unchanged.

Source hashes now bind scheduled_date/scheduled_time/time_slot; clients must reload old snapshots. Workflow PATCH supports strict schedule {date:YYYY-MM-DD,time:HH:MM}; only status pending_approval allowed with schedule. Reschedule saves before/after, revision and actor transactionally and requires approval again. It does not send immediately or release UNKNOWN. Existing schedule occurrence workers reject changed occurrence identity.

Canonical creation defaults now use the IST calendar day and a parseable10:00 clock. Explicit time slots/clocks are preserved instead of silently selecting10:00. Legacy scheduled_time containing a full same-day datetime is supported; conflicting date fields fail closed. No mass rewrite of existing schedules.

GET /api/companies/:companyId/posts/:postId/workflow-history authenticates workspace/post access, returns at most20 metadata rows with unsigned sequence keyset cursor, and uses a five-second read-only SQL deadline. Content Studio provides IST reschedule-for-approval and paginated actor/status/schedule history. Owner-authorized workflow remains separate from mandatory agency policy/peer role checks, client approval portal and daily-report/action-feed fanout, which are pending. Provider delivery/reconciliation remains unverified outside existing staged/mocked checks. Billing excluded; no production publish/deploy.


### Saved publishing-policy enforcement — 2026-11-03 IST

Forward019 adds nullable policy_version to publication_workflow_audit;42 tables unchanged. Historical001–018 unchanged. Apply canonical migrations before serving application; readiness checks the added column. No production migration/deploy performed. Existing audit rows retain NULL rather than invented approval proof.

Publishing claims enforce saved company_profiles_data.engine_settings.approvalSettings: googlePosts, socialPosts and promotionalOffers. Missing/malformed/unknown values require approval; exact auto only. Offers require the offer rule as well as applicable channel rules. A bounded SQL projection reads these three rules without loading knowledge content; profile row is locked at admission. Approval requires scheduled post and latest audit matching current content/status/revision/schedule+normalized policy fingerprint. Unrelated profile text changes do not invalidate proof. Directly created scheduled content no longer bypasses required approval. Legacy NULL policy proof needs reapproval. Explicit auto leaves ownership, duplicate and UNKNOWN protections intact.

IMPORTANT rollout behavior: existing missing-policy clients now require approval; review saved settings and approve queued content before enabling scheduled dispatch. UI uses the same approval default, preserves existing explicit auto, explains waiting for confirmed settings save, and offers failed/scheduled reapproval. Policy denial does not falsely mark the persisted post failed. In-memory development has no durable approval evidence and therefore requires explicit auto for provider tests; production fallback remains disabled.

Scheduler identity v1 is unchanged for workflow revision0; nonzero revisions use v2 and include revision. Metadata selectors carry revision and stale worker occurrence comparison rejects older generations. Reapproval gets a fresh durable job instead of a policy-denied failed job. Merely toggling policy to auto does not revive a failed occurrence; use explicit reapproval/reschedule or appropriate manual action. Same-generation admissions stay idempotent.

Scope is publication start admission, not all agency governance: no peer-role separation, dedicated policy CAS/revocation epoch or retroactive in-flight cancellation. Settings remain in existing JSON storage with its last-writer behavior; equivalent normalized A→B→A rules can match prior equivalent approval. Other action families, scoped stops/quotas, report fanout and live hosting/provider acceptance remain pending. Fixed IST and billing exclusion unchanged.


### Publishing execution controls — 2026-11-03 IST

No migration/schema change; canonical42 tables through019. Global stop is centralized in executionStop.ts using existing uploads/.emergency_stop.json. Autonomous public exports remain compatible. Atomic rename avoids partial records; failed persistence throws instead of acknowledging success and latches the current process stopped. Invalid/unreadable/nonboolean records fail closed. IMPORTANT production startup behavior: a missing stop file pauses execution; initialize/recover it only through the existing authorized control during hosting acceptance. Nonproduction missing file defaults unpaused. Shared-file scope does not establish distributed cross-filesystem or power-loss durability.

Global stop applies to canonical direct/manual and automatic publication. It is rechecked before claim and at provider start/channel/retry boundaries, including Instagram second step. Queue and autonomous action publishers explicitly use automatic mode; automatic mode additionally requires company autopilot enabled and a nonpaused valid holiday flag. Metadata-only SQL lookup uses a five-second read snapshot; malformed flags/payloads or failed lookup block automatic starts. Explicit manual publishing bypasses client autopilot/holiday pauses, while retaining global stop and all prior authorization/approval/claim checks.

Stop does not undo a request already sent. Confirmed outcomes settle and remain visible; later unstarted channels stop. Intermediate/unconfirmed Instagram work remains UNKNOWN, never blindly retried. UI banner now states these boundaries and does not promise automatic recovery of blocked jobs. Existing queue retry/failure handling may need new workflow revision/manual recovery after pause; durable pause/resume orchestration remains pending. Other direct action families, agency/channel stops, quotas and distributed control state are outside this batch. Production tests/deploy/customer messages were not performed; fixed IST/billing exclusion unchanged.


### Durable pre-work pause recovery — 2026-11-03 IST

Forward020 adds job_queue.deferrals INT UNSIGNED DEFAULT0;42 canonical tables unchanged. Apply canonical migration before serving updated workers; readiness checks this column. Historical001–019 unchanged; legacy attempt/status values stay intact, with no invented deferrals or terminal-job revival. No production migration/deploy performed.

attempts remains the monotonically increasing lease generation, preserving worker+attempt fencing. Execution retry budget and retry delay use attempts-deferrals. A fenced pre-work pause transitions to RETRY_WAIT for60 seconds and increments deferrals only for a currently owned RUNNING claim; attempts never decreases. JOB_DEFERRED event, safe pause reason, action run and outbox commit with the state change. Repeated/stale concurrent settlement cannot add credit twice. Event failure rolls back deferral/owner release. Cancelled/terminal jobs cannot be revived through this operation.

Queue global stop, automatic publishing autopilot/holiday pause and unavailable controls now defer before work. Publisher deferredReason covers only a denial proven before its durable publishing claim. Source/schedule changes, human approval denial, confirmed/ambiguous provider effects and post-claim uncertainty follow existing failure/reconciliation behavior. A resumed control makes the same job eligible at its next due worker tick; all normal policy/source/provider guards still apply. Paused waiting does not exhaust execution budget when the deferral commits; a crash before commit can still consume budget. Actual execution failures retain max_attempts and execution-count backoff.

Action history distinguishes Claim generation from provider attempts and displays pause reasons. Up to60s delay and actual worker/cron availability remain prerequisites. This does not resurrect historical failed/policy-denied jobs or replay UNKNOWN writes. Distributed/agency/channel stop storage, quota reservations and hosting acceptance remain pending. Fixed IST and billing exclusion unchanged.


### Daily recorded work and morning digest — 2026-11-03 IST

Forward021 adds/reuses aggregate indexes on workflow(company_id,recorded_at) and company/status backlog tables;42 canonical tables unchanged. Equivalent custom indexes are reused to avoid duplication; readiness validates leading columns. Migrate canonically before serving new readers; historical001–020 unchanged. No production migration/deploy performed.

Authenticated GET /api/companies/:companyId/daily-work-report?date=YYYY-MM-DD uses fixed IST calendar midnight bounds and a five-second repeatable-read SQL snapshot. DISTINCT job/post counts prevent repeated transitions inflating one category; completed/failure/pause and approval/reschedule categories can overlap and are not additive. Current backlog is explicitly separate and across all dates: queued/waiting, stored running/failed jobs, pending_approval posts, UNKNOWN and stale IN_PROGRESS claims. Historical dates do not turn current backlog into an old snapshot. No customer content/private payloads are returned, and no job completion is presented as verified clients/revenue. Missing database/error returns503, not fake zero.

Dashboard card supports date/refresh and stale/date/client/session response isolation. Existing tenant morning digest gains an explicitly dated previous complete IST calendar-day work section plus current backlog. Business statistics retain their prior rolling24h window; labels distinguish them. If the work read fails, text says unavailable, with workReportsUnavailable/readTimeouts counters; core digest can still use existing guarded tenant delivery. No new sender, global recipient or replay bypass. Additional read honors the20s cooperative stage gate; running operations are not a hard deadline guarantee.

Coverage is saved queue transitions and workflow audit only. Full reconciled business/CRM/direct-provider report, immutable report snapshots, all-client aggregate and additional delivery channels remain pending. Review live schema, tenant integration/cron configuration and hosting acceptance before rollout. Fixed IST and billing exclusion unchanged; no real customer message was sent during implementation.


### SQL workspace/channel publishing controls — 2026-11-03 IST

Forward022 adds publication_execution_controls and publication_control_audit;44 canonical tables. Apply canonical migrations before app/workers, validate new columns/FKs/unique revision index, and update every publisher worker before relying on enforcement. Historical001–021 unchanged; no existing pause or approval data is rewritten. No production migration/deploy performed. FK audit retention blocks physical deletion of referenced controls/companies; archive/retention workflow remains pending.

Authorized GET/PATCH /api/companies/:companyId/publication-controls supports strict expectedVersion, paused boolean and distinct channel names (Google/Facebook/Instagram/WhatsApp/Telegram). Monotonic CAS detects concurrent/ABA writes; server actor and before/after snapshots persist with the state transaction. Missing row defaults to no scoped override; malformed or unreadable state blocks publication. Requests cannot override actor/workspace via body. UI uses explicit save and must reload after conflict/unconfirmed acknowledgment; no automatic write/retry. Last saved/read state displays actor and IST time, scoped by signed-in user/client. Frontend/server contract shares channel names.

Workspace and selected-channel pauses apply to canonical manual and automatic publication. If any target is paused, the whole post waits before starting rather than intentionally sending a subset. Scope+autopilot+holiday checks share one5s owned SQL snapshot at each checkpoint; global file stop is checked before/after. Manual starts ignore autopilot/holiday but still honor scoped/global stops, approval and duplicate/UNKNOWN guards. New scope pause reasons reuse safe60s queue deferrals, preserving execution budget. Resume requires eligible worker tick/current policy and does not resurrect terminal or ambiguous work.

Stop checks are cooperative boundaries, not atomic cancellation of a remote request already underway. SQL scope propagates across workers sharing the DB; file-global stop remains filesystem-scoped. Every direct action family, agency-wide SQL stop, quotas, peer roles, full control-history UI and control-audit report fanout remain pending. Fixed IST/billing exclusion unchanged; no real provider/customer send occurred during implementation.
