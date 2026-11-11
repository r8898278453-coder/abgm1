# Production Deployment Guide

12 November2026 IST: ten parent packages are locally accepted per docs/implementation/ACCEPTANCE_TEN.md. This is not a deployment acceptance: actual Hostinger/runtime/provider/phase gates remain open. Schema034/60 unchanged; coordinate server/client/worker versions. Bulk legacy intake adds one authenticated management endpoint, preserving the existing single-record path; originals stay unapproved and no source data is made public.

12 November2026 IST onboarding continuation uses existing034/60 schema and canonical worker: deploy matching server/client artifacts together; no request DDL. Setup close reloads the workspace revision after direct draft/completion writes. Website/PDF processing still requires a functioning worker and configured permissions. See docs/implementation/ONBOARDING_WORKFLOWS.md. No production action performed.

12 November2026 IST team continuation adds agency-name/assignment/location edit APIs and real management UI on unchanged034/60 schema. See docs/implementation/AGENCY_TEAM_WORKFLOWS.md for contracts, roles, expectedName ABA limitation, location revisions and rollout gates. No production deployment was performed.

Current source schema target034 /60 canonical tables; next migration035. This continuation adds private structured fact candidates/review and query governance. All001–032 files remain unchanged. Apply033 only through the canonical migration CLI in a separately authorized coordinated release, after backup/restore/hosting checks. Existing binaries reject the newer ledger. See docs/implementation/KNOWLEDGE_FACTS.md and generated STATUS.md; older release checkpoints below are historical. No deployment performed here.


This document outlines the standard deployment architecture, pre-flight checks, and operations for the **Aaditech BGA / LocalPulse** multi-tenant platform.

**Current migration target:032;51 canonical tables. Earlier batch notes describe their original prerequisites. No production migration has been applied here.**

---

## Frozen migration sources, forward manifests and ledger refusal

Current product schema remains029/50 tables. Read [MIGRATIONS.md](docs/implementation/MIGRATIONS.md) before authoring extensions or diagnosing identity mismatches. Run `npm run db:check:sources` for metadata-only source/registry validation; it never connects to DB. Build checks before frontend compilation and direct server bundling; standard source db:migrate/db:setup verify before obtaining the pool. These source tools need the pinned build/development dependencies. The production server bundle has no runtime TypeScript parser dependency.

Preserve001–029 names/checksums/source artifacts; do not rebaseline frozen hashes or mark failed rows successful.030+ requires immutable SQL/preflight data manifests with a versioned executor; no callback/checksum override or dummy030 is registered. Legacy source execution deliberately retains pinned Node/tsx; bundles embed verified legacy identities. New manifest identity survives source/minified compilation independently of function serialization. SQL remains trusted reviewed repository code and must be engine-compatible/idempotent after partial DDL.

Runtime readiness/migration now refuse unknown/future, failed, blank/malformed, duplicate and gapped ledger evidence. An old build cannot claim READY against a newer ledger; restore matching source/release and review evidence rather than deleting ledger rows. A connected invalid ledger reports connection PASS plus DATABASE_SCHEMA_OUTDATED. Already-running processes still need maintenance pause and coherent deployment. Replay0 counts applied migrations, not absence of migration-lock/infrastructure SQL commands. Step diagnostics omit raw DB SQL/returned rows. No automatic adoption, down migration or production action is performed here.

`db:status` and `db:verify` now share the canonical read-only report, print safe contract/machine-code metadata and exit0 only for a consistent READY schema. They no longer infer upgrade safety from table presence or claim production readiness. Both are actual DB readers; source-only checks use db:check:sources. Command-owned pools close, and connection diagnostics exclude configured bindings/raw error text. Runtime/provider/cron/backup checks remain separate.

P00-05 local acceptance is complete; [BASELINE_GATE.md](docs/implementation/BASELINE_GATE.md) records the still-open P00-06 hosting/rebaseline prerequisites. Local restore/manifests do not establish actual Hostinger runtime/cron/current-backup readiness.

## Durable public inquiries and receipt recovery — migration029

Apply canonical029 explicitly before starting this backend; runtime readiness requires public_lead_intakes, its tenant/request primary key, unique lead receipt identity, created/state-time indexes and receipt columns. Historical001–028 identities must remain unchanged. Current fresh/005-upgrade and copied user-export rehearsals pass through029 with50 canonical tables. No production migration has been applied here.

Deploy backend, frontend/generated HTML and any static ZIP exports coherently. Existing public POST aliases accept bounded visitor fields and matching legacy token aliases. Optional requestId UUID enables immutable tenant-scoped replay; reusing it with changed details returns409. Anonymous responses return only saved receipt ID, never CRM notes/contact fields. POST /api/public/leads/receipt accepts token+UUID in the body and returns historical RECEIVED/NOT_FOUND evidence; do not put tokens in query strings. NOT_FOUND can race an in-flight first submission, so retries keep the same reference. No durable DB means503. Legacy callers without UUID remain non-idempotent and cannot gain automatic recovery without regenerated forms.

Generated form recovery needs HTTPS, Web Crypto and sessionStorage. It stores request/receipt metadata only; contact fields remain in the current page. Reload checks receipts rather than auto-posting. Confirmed inquiries require explicit New inquiry before a new reference; uncertain or changed-detail attempts must reconcile first. Unsupported/corrupt storage fails closed. Closing/clearing a tab, a new browser or changed form token loses automatic local recovery. Re-export previously downloaded ZIPs; their embedded old scripts do not update automatically. Static form requests/receipt checks use https://bga.aaditechs.in; verify API/CORS after hosting.

Receipt and lead commit together. Keep immutable receipt tombstones coordinated with privacy/retention and lead deletion; deleting receipt evidence can invalidate replay safety. The new schema has no automatic purge and no FK requiring an existing lead, so retained receipts prevent replay from recreating deleted CRM records. Receipt means originally saved, not that the CRM record still exists or that a sale occurred. Token rotation invalidates old form credentials; it does not move receipts between clients.

A newly committed inquiry gets at most one claimed best-effort tenant Telegram alert attempt. NOT_ATTEMPTED means no recorded claim; STARTED/UNCONFIRMED has no confirmed API acceptance; API_ACCEPTED proves no recipient delivery/read. Crash or settlement uncertainty never authorizes an automatic resend. A crash before claim can leave no alert; there is no catch-up worker/full transactional alert outbox yet. Confirmed lead acknowledgement survives alert failure. Existing tenant credentials/global stops still govern transport. Daily report/CSV/digest separately show inquiry activity and current alert backlog in IST; do not interpret them as conversion/revenue or customer messages.

## Scoped website/domain operations and DNS evidence

Deploy the matching backend/frontend together. Supported website PATCH-style PUT fields are colors, tagline/title/subtitle, meta description/keywords, validated GA4 measurement ID and three CTA booleans. Body IDs/company IDs, raw header HTML/pages JSON, status/simulation overrides and unknown fields are rejected. Existing unsupported stored columns are retained. Saves update supplied fields under a company row lock, preserve disjoint concurrent edits and read back SQL; same-field cross-session writes still use last-writer-wins. Schema readiness additionally requires an exact unique website_configs(company_id) key, allowing equivalent names. It is already in canonical003 and the tested copied export; no new migration/runtime DDL is introduced. Missing operator uniqueness needs reviewed forward repair, not resetting old migration checksums.

Domain registration reserves a globally unique record with a random TXT challenge. Same-owner retries retain the saved record; another owner cannot update it. Verification needs exact TXT plus configured routing match and rechecks the record/targets/challenge before saving. DNS unavailable does not change stored evidence. New state dns_verified means DNS observed only; SSL status remains unverified. Legacy active states are presented as pending until rechecked. Configure the actual hosting attachment, HTTPS certificate and routing separately; configured legacy CNAME/A targets are not evidence that an edge service exists. Unverified reservations/disputes require an operator ownership policy; no automatic takeover is implemented.

Generated storefronts honor CTA preferences. Inquiry success requires a confirmed saved lead; uncertainty retains details and blocks immediate retry in that page. The public intake is not yet server-idempotent. Static ZIP forms use https://bga.aaditechs.in/api/public/leads; verify availability/CORS with a controlled submission after deploying to another host. Generated README includes hosting/TLS steps. Download/export, DNS observation and API receipt are separate evidence levels. Static pages share the existing template; complete SEO publishing/attribution and release control remain planned. No hosting/account/DNS/SSL/production change was performed by this implementation.

## Copied legacy export compatibility — migration028

Current build requires028 before startup;49 canonical tables remain required. Apply only through the explicit canonical migrator during an independently authorized deployment window. Forward028 repairs actual copied-export gaps in autonomous actions and review provenance/replies, reuses equivalent leading indexes and relaxes known obsolete action display columns without deleting their values. Old records gain no approval/provider verification. Read-only readiness refuses missing canonical fields or obsolete mandatory action display fields. Preserve001–027 ledger identities. Unknown legacy required field types or index-name collisions need manual review; DDL is not a transactional rollback.

Run `npm run test:sql:restore -- '/absolute/path/export.sql'` only for the disposable local rehearsal described in [RESTORE_REHEARSAL.md](docs/implementation/RESTORE_REHEARSAL.md). The supplied historical export reached READY with unchanged original business rows and5 ledger identities, source/bundle replay0 and rolled-back canonical write probes. This does not verify a current live backup or authorize production migration/restore. Extra legacy tables/columns remain compatible rather than normalized destructively.

Autonomous repository SQL successes no longer fall into production memory-fallback errors; empty/missing SQL results are authoritative. TIMESTAMP writes use database epoch conversion and reads return UTC from epoch metadata; UI remains fixed IST. These changes do not add provider retry/approval authority.

## Durable scheduler admission and fair catch-up — migration027

Migrate through027 and deploy all scheduler/frontend/backend processes consistently before starting this build.49 canonical tables are required, including dispatcher_state/dispatcher_ticks with exact primary keys, status/time index and journal columns. Existing001–026 identities remain unchanged; startup verifies read-only and never creates these tables. No production migration/activation has been performed here. Old scheduler binaries bypass this minute-admission contract.

Internal5-minute cron and POST /api/scheduler/tick or /api/cron/tick share SQL-owned admission. Use X-Cron-Secret (dedicated CRON_SECRET) or platform-admin authentication; query/body commands are rejected. Engine minute slots coalesce overlap:202 already_observed means no additional stages started for that slot. New slots atomically advance persisted priority across publishing+queue, outbox, digest and reminders. DB epoch time defines slot/notification cutoffs independently of process/session timezone. An external cron may run more frequently than internal5m, but at most one owner starts per DB minute.

20s budget is cooperative; active I/O/settlement may outlast it. Handler faults do not abort independent stages while budget remains. Checkpoint storage failure prevents further starts.503 UNAVAILABLE before admission starts no stages;503 UNCONFIRMED after admission does not imply no work happened. Inspect action evidence rather than force replay. STARTED is an admission checkpoint, OBSERVED a returned handler, and COMPLETED means orchestration observed every stage without reported failure counts, not that customers received messages. PARTIAL includes stage/selected-client/read failures or deferral. Bounded later claims mark RUNNING records older than5m UNKNOWN. Slots are never taken over or rewound to authorize resends.

Platform admins can GET /api/scheduler/history with20(default)/50(max) records and before slot keyset pagination. The cron header alone does not grant history access. Reads have a5s deadline/no-store; claim tokens/raw payloads/customer details are excluded. Cron results expose only whitelisted counts. Admin Safety UI renders history in IST and clears data on failed/revoked reads. Audit retention/archival requires an explicit operational policy; no automatic pruning is introduced.

Client/post rotation uses intentionally overlapping sliding windows. Only the head client advances notification priority; publishing advances the head client and its first post. Unprocessed secondary candidates retain their position, so a partial budget does not permanently skip the same tails. Existing per-occurrence/job/post claims deduplicate candidate overlap. Selected/admitted counts can include reused candidates and are not confirmed new publications/deliveries. DB/provider latency and missing cron execution can still defer work; no delivery SLA is implied. Minute admission is not a global lifetime lock, so existing per-action leases/claims remain required across long runs.

Safety UI has no local pretend feature switches or unsupported compliance/consent/auto-reply guarantees. Use real saved execution/publishing controls and integration verification. Existing holiday publishing preference is retained as a revision-bound draft with header acknowledgement, not an immediate global/channel stop. Loaded/mutated invalid holiday settings fail closed. Autosave compares an editable-only baseline rather than delaying initial edits; older acknowledgements cannot certify a newer draft. Source fixes are covered by72 isolated programs, actual disposable MariaDB through027 and mocked Chromium suites (workspace + dispatcher).

Live cron configuration, supported Hostinger runtime/limits, backup/restore, broader ledger fanout and shared agency/channel/cost/consent/opt-out policy remain separate gates. Billing excluded.

## Workspace revision protocol — migration026 required for this build

Run the approved canonical migration workflow through026 before starting this build; runtime only verifies schema and never repairs it.026 adds BIGINT UNSIGNED revision default0 to existing company_profiles_data without new tables, history invention or payload rewrite.47 canonical tables remain required. Revision column and exact company_id uniqueness are readiness prerequisites. Existing001–025 identities are unchanged. No production migration/deployment has been run here.

Deploy rebuilt frontend/backend and every profile-writing process consistently; stop old writers before relying on the revision protocol. Old binaries or manual SQL updates that change data_payload without revision invalidate conflict protection. Use the canonical repository rather than direct payload replacements. Restore a matched application/schema state under the existing backup/rollback gate; do not erase revision history or silently downgrade the API.

GET /api/companies/:id/data now returns companyId,company,data,version with no-store. PUT requires {data,expectedVersion}; version is a canonical unsigned decimal string, not a JavaScript number. Missing expectedVersion428, malformed400, stale409, unavailable/unconfirmed503. Success returns matching companyId/data and exactly the next version. Old HTTP callers must load the version and update their contract; there is no unversioned force-write fallback. The browser requires reload after conflict/uncertainty and serializes sends within each loaded client. Reload discards unconfirmed local drafts; automatic merge is not implemented. Local cache failure after a confirmed DB save does not reverse that acknowledgement.

Internal read→mutate→save compatibility exports retain private snapshot company/version metadata. Copying/serializing a snapshot loses that metadata; future internal callers must retain it or pass an explicit expected version. New untracked production objects start from revision0 and cannot overwrite a later revision. Revision covers the profile JSON only, not every table. A provider refresh can persist observations before its profile CAS fails; those external/separate-table effects are not transactionally reversed, and an old browser draft must reload before saving. Profile saves no longer accept audit-resolution commands.

Company setup writes only initial business fields at a freshly loaded revision and reuses a confirmed company ID after setup failure. Uncertain/malformed creation acknowledgement pauses further creation and offers a canonical-list reload. This is a per-modal recovery fence, not durable cross-tab/session company-create idempotency. Unentered geography/services remain blank and URL/Place ID presence does not mean provider connected. Actual extraction/integration verification stays in its planned owner.

Validation: npm test (71 isolated programs), npm run test:sql:local (synthetic disposable MariaDB only), npm run test:browser:workspace and npm run test:browser:company (mocked frontend APIs/external traffic blocked), npm run lint and npm run build. The latter two browser suites cover conflict/no-repeat/reload and setup recovery; they do not establish live hosting readiness. Billing excluded.

## Meta Ads safety and bounded sync — no schema change beyond025

Deploy matching rebuilt frontend/backend only after normal hosting gates. Meta Ads requires a connected/verified company_integrations.meta_ads row owned by the client, numeric ad account and stored token; global META_* Ads credentials are no longer fallback authorization for these sync/status paths. CamelCase/snake_case credential/account aliases and integration config account IDs remain compatible. Actual account/permission/API v21 support must be verified during future authorized activation; this local work has not changed production.

External campaign URLs remain GET /api/campaigns/external and POST /api/campaigns/external/sync. Both include companyId/no-store. Unknown provider/fields and conflicting company aliases reject400. Sync now includes PARTIAL; HTTP200 success:false can still mean some acknowledged records were saved. Reload stored records; do not clear the collection or claim a complete sync from that result. Limits25/page,3 pages/50 saved records and cooperative20s new-read budget/5s network timeouts are explicit. There is no durable cursor continuation. Unknown metrics/status remain unavailable/UNKNOWN. Tokens use Authorization headers and pagination URLs are never followed off the fixed Graph origin. External campaign/sync responses project allowed fields and exclude historical raw_metrics_json/provider pagination payloads; legacy stored raw JSON is not deleted or backfilled here. Plan explicit retention/scrub before production data cleanup. Existing provider-reported revenue status is not verified payment/accounting evidence.

Only explicit status_change actions with numeric externalCampaignId and ACTIVE/PAUSED are supported by the status-control adapter. Provider account preflight and global write stop precede POST; only matching read-back verifies configured state. Budget/audience changes are unsupported. Old budget_reallocation actions cannot silently activate a campaign, and newly observed spend creates recommendation-only campaign_review. No ROAS/CPA improvement is implied. Non-message action writes still need durable claims/reconciliation before autonomous activation; UNKNOWN is no automatic resend authorization.

Rebuilt campaign UI validates scoped collections/acknowledgements, shows partial server counts, handles failed reads explicitly and remounts on client/actor changes. Campaign dates/provider fetched times use IST. Provider Verified badges require recognized read-back proof; old booleans and message/publishing acceptance no longer suffice. This display guard does not backfill/verify historical records. Internal campaign CRUD, linking, currency and comprehensive attribution audits remain separate work.

## Schema authority cutover — read before starting this build

Normal connections, requests and application startup no longer create/alter schema, seed settings or create/promote administrators. Use the existing explicit CLI owners: db:setup for an approved fresh installation (migrations/system seed/optional initial admin), db:migrate for an approved upgrade, db:seed:system for explicit system defaults and admin:create for intentional administrator provisioning. Review backup/restore and migration gates before any production execution. These commands have not been run against production here.

Run db:verify and deploy:validate before npm start. Startup only performs a read-only canonical schema check and requires READY in production (NODE_ENV=production or IS_PRODUCTION=true). Every incomplete/unknown/check-failure state refuses startup; it does not repair the database. Both initial setup and upgrades must finish before starting this application build. CLI migration/setup needs schema privileges; normal application code no longer requires DDL privileges. Test grants demonstrate this locally but do not establish that Hostinger offers separate restricted users on this plan.

INITIAL_ADMIN_EMAIL/PASSWORD no longer causes durable user creation or privilege promotion when the application connects/starts. Provision an administrator explicitly through approved db:setup/admin:create. Historical migration identities001–025 are unchanged; the current build extends them through026 with47 canonical tables. schema.sql is a historical reference, not a second deployment/bootstrap authority; use canonical migrations. The build still embeds source migration identities for bundled read-only verification. Prior batch notes below describe their historical prerequisites; this section governs current boot behavior.

Actual local validation: empty-schema runtime cannot become production-ready, upgraded restricted-user runtime is READY, runtime CREATE/ALTER/INSERT/UPDATE counters do not change, and fresh001–025 metadata matches005-upgrade exactly. Production restore/rollback/hosting acceptance remains required.

## WhatsApp receipt intake and autonomous outcomes — migration025

Apply approved migrations through025 before starting this build; rebuild frontend/backend together and update all senders/workers consistently.025 adds message_delivery_receipts and nullable message_dispatch_intents.sender_id; readiness requires47 canonical tables, receipt columns/indexes/exact company+event uniqueness and company FK. No migration, deployment or customer send has been performed here. Existing intents receive no invented sender backfill and remain delivery UNOBSERVED unless they were originally created with sender identity.

POST /api/whatsapp/webhook now requires WHATSAPP_APP_SECRET or META_APP_SECRET for a valid X-Hub-Signature-256 over captured raw bytes. WHATSAPP_VERIFY_TOKEN is for the GET verification challenge and cannot authenticate delivery events. Use an actual Meta app secret and subscribe the correct WhatsApp app; no sandbox signature bypass. Each integration needs its exact phoneNumberId and connected/verified status; compatible wabaId is checked when configured. Duplicate sender mappings across clients fail closed as unmapped. This version supports the configured application secret; multiple apps with distinct secrets need a future explicit app registry.

Envelope limits:10 entries,20 changes per entry,100 total messages/statuses; malformed/oversized input400, bad/missing signature403, missing app secret or storage/lookup failure503. Complete validation precedes effects. Retry after partial persistence is safe for receipt uniqueness and atomic inbound lead/marker creation. Unmapped/ambiguous senders and unknown receipt types are acknowledged/counted without inventing tenant ownership; they do not yet have a durable remediation inbox. Monitor upstream webhook retry/errors during a future rollout.

Receipt rows retain only provider/sender IDs, status/times and numeric error code, not customer content, recipient or raw provider error. Existing inbound CRM lead content is retained as before. Receipt FK evidence needs an archival policy before company deletion. Owner-only existing status API now adds delivery, receiptCount, conflicting and lastReceiptAtMs. CRM/autonomous cards separate current evidence from API acceptance. READ/DELIVERED never downgrade on late events; failure conflicts are flagged. No matching evidence means UNOBSERVED, not non-delivery. Receipts do not automatically release UNKNOWN, create retries, stop a sales sequence, aggregate delivery into the daily report or consolidate an inbox.

Autonomous WhatsApp requires durable request storage and reuses its action-derived key. Store/status may confirm acceptance after an action-settlement failure; inspect the request rather than recreate the action. A distinct new action remains a distinct intent. Google review replies use canonical local tenant/review identity; local saves remain unverified and remote verification requires matching GET read-back. Legacy GOOGLE_PUBLISHED indicates acknowledgement here, not independent verification. Google review remote write/local action settlement is not yet a durable exactly-once workflow.

Run npm test for the isolated sequential regression registry; inherited DB/provider/admin/encryption credentials are removed only from test children, not the cloud environment. The runner loads no .env. Unit HTTP fixtures use local listeners, new provider tests mock transport, and npm run test:sql:local uses synthetic data in disposable MariaDB only. Hosting prerequisites/full phase gates remain open.

## Publishing admission controls — migration023 (local validation only)

Migrate through025 before starting this application build; readiness requires47 canonical tables, daily_post_limit, reservation columns, exact company/day/post uniqueness and the post lookup index. Deploy all publisher workers consistently before relying on cap enforcement. This change has not been deployed or migrated to production.

Existing client controls default to unlimited (NULL). Authorized users may explicitly set1–100000 daily admitted posts. Older API clients omitting dailyPostLimit preserve the configured cap; explicit null disables it. The day is Asia/Kolkata, calculated from database UTC+330. Unlimited admissions are also recorded, so enabling/lowering a cap considers current-day reservations. Lowering a cap does not cancel in-flight work. Reservations are retained on failure/UNKNOWN; same-post/day retries reuse them, while next-day admissions create another reservation. No historical reservations are invented and no automatic refunds/expiry ownership takeover are provided.

Company mutex, policy/claim checks, scoped pause recheck and quota reservation/claim commit serialize admission. Safe pre-claim quota exhaustion defers queued work60s without consuming execution-failure budget; workers/cron must run to resume and current policy/UNKNOWN guards still apply. This is a logical post admission limit, not a provider-call, delivery, LLM-token, spend or billing limit. Direct non-publishing APIs are outside this gate.

Owner-scoped controls history exposes20 entries per revision-keyset page, actor/time and before/after state. Legacy missing limits remain not recorded. Usage snapshots are dated counts, not delivery proof. Reservation FK retention requires a future explicit archival policy before deleting admitted posts. Agency-wide limits/global SQL stop, wider action coverage and live hosting acceptance remain pending.

## Daily admission accountability extension

Daily report JSON adds activity.admittedPosts and activity.controlChanges. Deploy frontend/backend together; the new frontend rejects incomplete report shapes. No migration beyond024 is needed. Reservations are grouped by quota_day, including failed/UNKNOWN work; control audit uses recorded_at IST-day bounds. Current backlog remains a separate read-time snapshot. Client CSV exports only fixed numeric metrics and dated metadata from the displayed snapshot; it contains no captions, recipients, provider IDs, actor IDs or secrets. The existing morning digest adds these counts without a new delivery channel or resend path. Report responses are no-store. Full CRM/provider reconciliation, agency rollup and historical end-of-day backlog remain pending.

## Capability truthfulness UI batch

No schema change beyond024. Rebuild frontend for corrected AI unavailable states, conservative Google metric badges and setup review wording. Shared askAiChat now throws on unavailable/malformed successful responses; both current callers display explicit error messages. This is not an OAuth verification or background monitoring feature. Telegram manual test success represents API acceptance only. No automatic send is added. Setup and copilot are remounted by actor/client/open state; closing discards unsaved local setup edits and copilot conversation. Existing provider/settings stores and publishing policy remain authoritative. Full integration registry verification and broader UI/generation-fallback audit are pending.

## AI generation failure contract

Deploy rebuilt frontend/backend together: chat/review/content endpoints return503 when generation is unavailable, and content generation returns502 for malformed/invalid structured output. Backend no longer emits template fallbacks as generated success. Frontend rejects auth/rate-limit/error payloads rather than offering them as publishable drafts; content requires a nonblank caption and bounded optional fields. Unknown generated fields are stripped. Existing manual/preview content is still editable and is not evidence of AI success. Reviews save workspace records; this does not publish on Google or other review providers. Reply saves update UI after acknowledgement and parent no longer repeats the same save. No schema changes beyond024; review bulk action and other capability surfaces remain pending audit.

## Review collection and reply scope batch

Run npm ci with updated lockfile (qrcode runtime dependency; jsqr test decoder). Rebuild frontend/backend. Real QR generates locally from a configured valid Google review destination; Place ID does not authorize Google API publication. Missing/invalid link disables QR download/print. Print frame contains only current business label and QR, avoiding printing unrelated workspace UI. No QR destination is sent to a remote generator. A configured shortlink still needs operator destination verification before distribution. Physical scan/print acceptance remains pending.

Review reply aliases remain compatible; optional companyId must match resource company when supplied, canonical workspace access must pass and errors are redacted. Success means workspace record stored with providerPublication NOT_VERIFIED. Dashboard bulk generic reply writes are removed; pending replies open review manager. No schema change beyond024 or new provider send path.

## Review CRUD confirmation and selected workspace

No schema change beyond024; deploy matching frontend/backend. Review create accepts camelCase/company_id aliases but rejects conflicts; omission retains legacy workspace resolution. Operational issue flag survives validation; manual source uses the existing manual enum. Failed/null creation returns503 instead of success. Delete uses canonical tenant authorization, optional strict companyId query and checks actual SQL affected rows. Reply/delete missing or wrong-scope row outcomes are false, never unconditional success. Frontend updates visible records only after acknowledgement and parent callbacks do not repeat writes. Unmount suppresses stale completion callbacks; this is not cancellation of a server write already underway. Lost-acknowledgement create idempotency and provider-side review publication/deletion remain pending.

## Audit current-evidence contract

Rebuild matching frontend/backend; no schema change beyond024. GET /audit and POST /audit/scan evaluate saved records, are no-store and do not persist a scan snapshot. Historical audit_items resolution flags no longer override current findings. The legacy /audit/:auditId/resolve route now returns guidance/current evidence with remediationExecuted:false; it performs no generic reply writes, automatic fixes or resolution persistence. Unknown current finding returns404, failed/invalid evidence503. This intentional behavior correction prevents falsely marking work completed.

Audit view loads findings separately from parent autosave and binds reads to actor/client. Google saved profile flags are unverified configuration, not live OAuth evidence. Existing growth-score telemetry remains separately loaded; saved-record reads are not a single atomic multi-table snapshot. Full provider verification, durable audit snapshots and wider score/capability acceptance remain pending. Sidebar no longer advertises hardcoded ranks/ROAS/branch counts/usage; enabled autopilot indicates configuration only.

## Content, CRM, collection and AI client-scope contract

Deploy matching rebuilt frontend/backend. No schema migration beyond024. Client collection responses now require companyId and row company_id for scoped reads; unavailable/foreign/malformed data blocks workspace editing. Empty canonical collections remain empty instead of falling back to historical JSON vectors. Lead GET adds explicit companyId on scoped reads. Missing intent is unavailable;0 stays0. Post refresh failure is not a successful empty refresh.

Calendar creates three actual AI draft attempts dated1/8/15 of next IST month, not a completed30-day campaign. Partial generation failures are listed. Unconfirmed save stops remaining writes and disables repeat planning in that view; reconcile stored posts before retrying. Saved drafts require business-fact review and normal approval/scheduling. Content studio saves pending_approval. CTA/time slot/reel fields survive create validation. Existing direct legacy create status remains compatible; current approval policy still controls dispatch. Create APIs do not yet provide generic lost-acknowledgement idempotency.

Content deletion requires canonical tenant access, honors actual affected rows and retains published/uncertain/claimed records; FK-linked history may also prevent deletion. This is record deletion only, not provider deletion. No automatic archive/cascade removal is introduced.

CRM stage requests may include companyId and expectedStage. New UI supplies both; stale comparison returns409, zero matched rows cannot succeed. Legacy omission remains compatible; tenantless leads must be assigned before stage updates. Expected-stage comparison does not prevent ABA; full versioned sales workflow remains pending. Lead-create notifications use tenant-specific Telegram credentials and return separate API-acceptance status. Creating a lead no longer automatically sends a customer WhatsApp message in UI; manual links and API acceptance never imply recipient delivery or silently change stage. Billing behavior is not extended.

Chat/review/content generation routes resolve workspace access before provider work, replace browser-supplied company identity with authoritative DB identity and preserve selected companyId. Legacy omitted scope uses an authorized default workspace. Knowledge-query grounding and other AI surfaces require further audit. Current Hostinger MCP tools are unavailable in this session; these changes remain local and hosting acceptance is not established.

## Autonomous control persistence and current state

No migration beyond024. Matching frontend/backend required: actions/recommendations/log reads now include companyId. Autonomous UI is actor/client-keyed, validates current status and owner-scoped rows, disables mutations after unavailable/unconfirmed state and requires reload. Approval acknowledges action/client/approved state before dependent execute; client-switch cancellation stops that follow-up but does not cancel a server request already committed. Reference lifecycle is not live progress. Header and safety controls navigate to canonical backend controls instead of local-only state changes. Parent callbacks no longer synthesize review replies or post publication after unrelated action execution.

Kill-switch API now requires one strict command: {companyId,autopilotEnabled:boolean} or {companyId?,emergencyStop:boolean}. Unknown fields, mixed commands and coerced string booleans fail400. Company authorization and applicable platform-admin permission pass before effects. SQL update must affect a company row; absent/failed durable storage returns503 without optimistic success. Global setter retains fail-closed shared-file persistence and boundary semantics. Reload after failed/unconfirmed responses. No revision/CAS, distributed global store or expanded all-channel stop guarantee is introduced. Approve/reject/audit multi-write reconciliation remains pending.

## Durable WhatsApp request identity — migration024

Migrate through024 and deploy matching backend/frontend before relying on request deduplication. All sender processes must use the new code. Readiness requires message_dispatch_intents columns/exact company+request primary key and company FK. Historical001–023 remain untouched. Initial actor and private token are retained; no message body, recipient or access-token plaintext is stored.

POST /api/whatsapp/send and /broadcast now require a64-hex requestKey. Missing keys fail validation before provider work. New client utilities persist actor/client/payload-scoped retry metadata in sessionStorage and refuse dispatch if retry identity cannot be stored. Canonical JSON prevents object-key-order differences changing identity. Confirmed matching acceptance clears identity; uncertain/partial responses retain it. A new tab or explicit new payload/intent is not automatically a duplicate of a previous business action.

Accepted intent replay returns provider ID without a new send. IN_PROGRESS/UNKNOWN has no automatic expiry/takeover/resend. Only proven PAUSED/REJECTED with no stored provider ID may be explicitly retried. Provider acceptance followed by failed SQL settlement remains held UNKNOWN. No in-memory production fallback. Broadcasting derives recipient request keys from batch key+normalized phone, rejects duplicate normalized recipients and returns derived keys for attempted-row inspection. Published-post WhatsApp continues using its existing post claims; autonomous direct-send coverage is separate and still pending migration to this owner.

GET /api/companies/:companyId/message-dispatch/:key is an authorized no-store metadata lookup. CRM status refresh is read-only. API_ACCEPTED is not delivery/read proof. No release/force-resend/reconciliation endpoint or receipt workflow is introduced. FK retention requires an archival policy before removing referenced companies/intents; do not delete held rows to enable retry. Full action ledger, delivery receipt reconciliation and hosting acceptance remain pending.

## Message request reporting extension

Migration024 includes idx_message_intent_created(company_id,created_at) and idx_message_intent_state(company_id,status,updated_at). Report JSON adds activity.messageRequests, activity.apiAcceptedMessages and backlog.unconfirmedMessages; matching frontend/backend deployment is required. Initial requests count by created_at, terminal API acceptances by updated_at, both within the selected IST day. Current unconfirmed backlog spans all dates and is not a historical snapshot. Counts measure logical request rows, not provider attempts or delivered messages. Dashboard/CSV/existing morning digest show this recorded work; no new sender or receipt workflow is added.

## Outbound global boundary policy and WhatsApp outcomes

Rebuild matching frontend/backend; no schema changes beyond024. Every participating process must read the same existing emergency-stop file for shared enforcement. Direct Meta/WhatsApp/Telegram/operational email now check global stop at provider write boundaries, including IG publish after container creation and tenant Telegram after credential lookup. Password-reset security email deliberately remains available. No distributed/global SQL stop, in-flight cancellation or new agency/channel overrides are introduced. Read-only transport diagnostics are unaffected.

Direct WhatsApp status API_ACCEPTED means provider message ID returned, not delivered/read. UNKNOWN covers malformed/empty acceptance, transport error and5xx; no backup manual resend link is returned after provider uncertainty. PAUSED starts no request. Delivery requires subsequent verified receipt. No direct-message idempotency/replay ledger is added.

Broadcast accepts at most100 inputs and has a20s cooperative new-start budget; a current request may settle after the budget. UNKNOWN/PAUSED stops later sends. Response has acceptedCount/rejectedCount/unknownCount/pausedCount/notAttemptedCount and recipient results. Legacy successCount counts accepted IDs; failCount is all other inputs, not confirmed failures. Raw provider bodies are excluded. Inspect partial results before manually continuing; no automatic retries/resume or new campaign scheduler is provided. Test fixtures use temporary stop storage and mocked providers only.

## 1. Deployment Pipeline

The production deployment follows a deterministic, fail-closed pipeline:

```
[ Git Push to Main ]
        ↓
[ npm ci ] ------------------> Enforces reproducible lockfile dependencies
        ↓
[ npm run build ] -----------> Vite builds client into dist/client/
                               esbuild bundles server.ts into dist/server.cjs
        ↓
[ npm run db:migrate ] ------> Acquires distributed MySQL lock
                               Executes pending migrations in schema_migrations
                               Never touches already-applied migrations
        ↓
[ npm run db:seed:system ] --> Idempotently ensures required system_settings
                               Zero fake business telemetry inserted
        ↓
[ npm run db:verify ] -------> Audits all 47 canonical tables, indexes, and constraints
                               Exits with code 1 if any table is missing
        ↓
[ npm run deploy:validate ] -> Verifies Node version, build artifacts, and DB
        ↓
[ npm start ] ---------------> Runs node dist/server.cjs on configured port
```

---

## 2. Environment Variables Matrix

| Variable | Type | Required | Description |
|---|---|---|---|
| `NODE_ENV` | string | **Yes** | `production` |
| `IS_PRODUCTION` | string | **Yes** | `true` |
| `PORT` | number | No | Server listen port (default: 3000) |
| `DB_HOST` | string | **Yes** | MySQL server host (e.g. `localhost`) |
| `DB_PORT` | number | No | MySQL port (default: 3306) |
| `DB_NAME` | string | **Yes** | MySQL database name |
| `DB_USER` | string | **Yes** | MySQL user account |
| `DB_PASSWORD` | string | **Yes** | MySQL user password |
| `AUTH_SECRET` | string | **Yes** | 32+ character JWT secret |
| `CREDENTIAL_ENCRYPTION_KEY` | string | No | 32-byte secret for AES-256-GCM (derived from AUTH_SECRET if omitted) |
| `INITIAL_ADMIN_EMAIL` | string | No | Optional CLI setup/admin provisioning email |
| `INITIAL_ADMIN_PASSWORD` | string | No | Optional CLI setup/admin provisioning password |
| `GEMINI_API_KEY` | string | Optional | Google Gemini API key |
| `SMTP_HOST` | string | Optional | SMTP host for transactional emails |
| `RAZORPAY_KEY_ID` | string | Optional | Razorpay Key ID |
| `RAZORPAY_KEY_SECRET` | string | Optional | Razorpay Key Secret |

---

## 3. Fail-Closed Production Guarantees

1. **No In-Memory Fallback in Production**:
   - In production (`NODE_ENV=production` or `IS_PRODUCTION=true`), if the database is unreachable or a query fails, the application throws `DATABASE_UNAVAILABLE` (HTTP 503) or `DATABASE_OPERATION_FAILED` (HTTP 500).
   - In-memory data structures are strictly isolated to `NODE_ENV=development` and `NODE_ENV=test`.
2. **Zero Fake Telemetry**:
   - Production databases receive only authentic user and provider telemetry.
   - Demo seed (`npm run db:seed:demo`) is blocked in production mode.
3. **Tenant Provider Credential Isolation**:
   - Outbound provider calls (Meta, WhatsApp, Google Places, DataForSEO, SerpAPI) use tenant-specific encrypted credentials stored in `company_integrations`.
   - Missing credentials return `NOT_CONFIGURED` without falling back to global secrets.


## Migration checksum build compatibility

Use `npm run build` for production artifacts. The server build captures migration checksums from source before bundling changes function serialization. Existing database ledger values are not rewritten. Source/CLI migrations and bundled read-only startup verification therefore use the same source identity. Standalone manual esbuild invocation omits that build metadata and is not a supported production build path. Validate with `npm run test:migrations:compatibility`; its upgrade harness is a contract test, not a substitute for a real database restore/upgrade rehearsal.


## Reproducible development baseline

The repository now includes package-lock.json. Use npm ci; do not regenerate the lockfile during ordinary setup. Validated toolchain: Node 24.19.0 (.node-version), npm 11.9.0. A clean temporary installation completed npm ci, TypeScript checking and the canonical build without changing resolved dependency versions. Verify the actual hosting Node runtime before a production release; this local result does not establish Hostinger runtime support. Keep DB environment bindings disabled for local regression suites unless a dedicated test database is explicitly selected.


## Client-isolation browser regression

Run npm run test:browser:workspace with a supported Chromium executable (CHROMIUM_PATH; defaults to /usr/bin/chromium). Playwright Core is pinned as a dev dependency; it does not download a browser. The test serves only Vite, intercepts all API calls with fixtures, blocks external browser requests and never starts application DB initialization. Covers populated-to-empty client switch, late responses, actual FAQ autosave payload isolation and logout during a pending load. This is separate from npm test because a browser runtime is required. The container test launches its isolated local browser with --no-sandbox; do not reuse that configuration for arbitrary public browsing or production rendering.


## Disposable real SQL regression

Run npm run test:sql:local with access to the managed local Docker socket. The runner uses an official digest-pinned MariaDB10.11 image, loopback-only ephemeral port, verifies container hostname and deletes its own random test database/container afterward. No production DB environment bindings or export records are used. Tests cover fresh migrations001–005, upgrade006/replay, concurrent claims/filter/expiry and rollback. Forward migration007 repairs missing review-source/domain-uniqueness coverage. The verifier recognizes structurally equivalent legacy indexes rather than requiring duplicate names. Fresh upgraded local schema now verifies READY; duplicate domain ownership blocks migration for manual resolution. This local result is not a production upgrade rehearsal. Worker settlement now uses lease-owner/attempt fencing; see the lease contract below.


## Forward migration 007

Migration001–006 definitions/checksums stay frozen. Migration007 reuses existing equivalent keys, adds missing review-source coverage and enforces global domain uniqueness only if absent. Duplicate domain ownership is checked before repairs; conflicts abort with DOMAIN_OWNERSHIP_CONFLICT and require reviewed resolution, never silent row deletion. Existing unrelated indexes are not renamed/dropped. Known legacy-name requirements are verified through ordered full-column metadata and exact unique-key coverage. Validate through npm run test:sql:local and do not apply to production without backup/rehearsal and deployment authorization.


## Queue lease contract

A claim's worker ID plus monotonically increasing attempts value identifies its lease. Completion, failure and renewal of RUNNING jobs require that exact identity and an unexpired five-minute lease. Executors renew every minute, reject a lost lease before provider dispatch and clear renewal timers after execution. Unfenced helpers may settle only pending compatibility fixtures, not RUNNING jobs. Retry tooling must never reset attempts on an existing job; use a new job identity for a new retry budget.

Expired workers cannot overwrite a reclaimed result, even if the worker ID is reused. Exhausted pending/expired jobs are dead-lettered in bounded cleanup batches and excluded from future claims. This is database-state fencing, not exactly-once external delivery: provider idempotency/outbox reconciliation remains required. Running-job cancellation API semantics are not expanded by this batch; tests inject cancelled state to verify stale settlement rejection.


## Transactional queue ledger foundation (migration008)

Migration008 introduces job_action_runs/events/outbox and a company-scoped unique idempotency key. Pre-existing duplicate keys require explicit resolution; the migration never silently removes jobs. Queue enqueue, claim, settlement, pending cancellation and exhaustion persist minimal metadata events and outbox intents with their state changes. Actor IDs come from authenticated route context. Legacy history is not invented, and private job payloads are not copied into audit/outbox tables. Outbox rows are durable PENDING delivery intents; no delivery consumer is enabled by this foundation. Use the local SQL suite to verify rollback/scope/concurrent replay. This is not exactly-once provider delivery or a deployed production migration.

### Internal action-feed migration009

Run the canonical migration flow before starting this revision. Migration009 adds delivery leases/retry fields and internal feed receipts/cursors; existing ledger rows default to the internal subscriber. Each five-minute internal tick (or authenticated external tick) drains up to25 deliveries. GET `/api/companies/:id/job-actions?after=0&limit=50` requires workspace access; continue with `nextCursor`, never skip to `latestRevision`. No-database mode returns503 rather than implying an empty durable history. Failed deliveries retry after30seconds, stop after3 attempts, and require operator diagnosis; automatic dead-letter replay is not exposed. This subscriber only writes SQL metadata and does not send notifications. UI, external fanout and persistent digest catch-up remain pending.

### Scheduled post recovery through queue

The universal tick now admits overdue scheduled posts before queue execution. `autoPublish` response contains admission counters, not publication results; `admitted` includes existing idempotent intents. Company/post/schedule identity persists in queue uniqueness. Queue attempts, worker leases and ledger now cover scheduled publishing. Worker rechecks schedule and autopilot before dispatch. A client paused after admission causes a terminal guarded failure; re-enable does not silently replay that same occurrence. Changed schedules create a new identity. The old direct global Telegram publication confirmation is no longer sent by this path; scoped notifications remain pending. Daily/hourly digest catch-up, client timezone normalization and ambiguous external delivery reconciliation are still pending.

### Dedicated cron header and tenant notification destinations

Before deploying this revision, configure external cron POST callers to send `x-cron-secret` matching a dedicated `CRON_SECRET`. URL query secrets and fallback to `AUTH_SECRET` are no longer accepted. Both `/api/scheduler/tick` and `/api/cron/tick` also accept authenticated platform administrators; development mode no longer bypasses authentication. Tick failures redact internal error details.

Daily digest/review-reminder notifications require that client's connected `telegram_bot` integration with both `botToken` and numeric `chatId`. They never inherit `TELEGRAM_CHAT_ID`/`TELEGRAM_BOT_TOKEN`. Missing configuration means no send. Plain text is used; counts exclude invalid/future timestamps and review age requires an actual timestamp. The legacy direct/manual Telegram endpoint and publishing-channel adapter are separate paths still requiring their own review. Durable notification occurrence/retry/catch-up is not enabled by this change.

### Manual Telegram notification API scope

`POST /api/telegram/notify` now accepts only `{ companyId, message }` and requires access to that workspace. Legacy message-only callers must include the client ID. The dashboard caller is updated. Telegram recipient/token come only from the client's connected integration; a request cannot override them. Unconfirmed sends return502, so inspect the destination before retrying an uncertain delivery. No automatic retry or durable manual-send deduplication is enabled. Other global operational-alert paths are separate and still under review.

### Notification occurrence migration010 and catch-up policy

Apply canonical migrations before starting this revision. Digest/reminder delivery now requires durable SQL occurrence claims; no memory fallback. The single five-minute/internal or authorized external tick derives latest daily08:00 IST and hourly IST occurrences. Downtime coalesces to the most recent due interval; it does not flood all missed notifications. Digest counts use the scheduled cutoff, not actual run time. Separate daily/hourly direct crons are removed; universal tick remains required.

Occurrence outcomes are RUNNING, SENT or UNKNOWN. A crash/unconfirmed provider acknowledgment/lost SQL settlement must not be blindly resent. Stale RUNNING rows become UNKNOWN on a later same-client/kind pass; operator reconciliation/UI is still pending. Missing client Telegram configuration prevents claim and can recover on a subsequent configured tick. No automatic uncertain replay is exposed. Existing integration/provider access remains required; this change does not configure live cron, credentials or destinations.

### Read-only notification status

Dashboard now reads `/api/companies/:id/notification-status?limit=25` under workspace authorization. Older pages use the returned `nextCursor` as URL-encoded `before`. The cursor consists of UTC cutoff plus notification kind; it is not a delivery token. Responses expose metadata only. No database returns503; stale RUNNING and UNKNOWN require operator review of the actual chat. Refresh does not resend. A reconciliation/replay action is not exposed, and manual test-alert history is not included. No additional migration beyond010 is required for this view.

### Fixed IST policy (Asia/Kolkata)

All clients use IST for product schedules and report cutoffs; do not rely on host `TZ` or browser local time. Shared schedule parser treats naive date/time values as IST and preserves explicit Z/UTC-offset instants. Invalid calendars/clocks are not due. A date without a time remains due only after that IST day ends. Existing raw schedule data/occurrence identities are not rewritten; review legacy naive schedules when deploying because they previously followed server-local time. Dashboard action/notification timestamps now explicitly show IST. Daily digest remains08:00 IST and reminders align to the IST hour. Configurable per-client timezone is outside the current scope by user direction.

### Notification dispatch cursor migration011

Apply canonical migrations before starting this revision. Daily digest and hourly reminder each select at most2 eligible companies per tick using independent persisted round-robin cursors. Connected tenant Telegram integration is required for candidate eligibility; actual credential/recipient validation still occurs at send time. Cursor selection commits before provider I/O; a crash can defer a client to the next rotation, while occurrence uniqueness suppresses duplicate delivery.

For N eligible clients, one tick every5min takes roughly ceil(N/2)*5min to visit all clients per notification kind.08:00 IST remains the daily reporting cutoff; actual delivery may occur later as batches rotate. This bounds client count only, not total request duration or per-client record reads. Scheduled-post scan/hard HTTP deadline remain pending; validate actual Hostinger cron execution limits before production rollout. No live cron settings changed by this implementation.

### Scheduled-post admission cursor migration012

Apply canonical migrations before starting this revision. Universal tick admits schedules using persisted company/post rotation: default2 enabled clients and5 metadata rows per client per tick. It no longer loads the full scheduled-post list. Empty/no-SQL mode produces no scheduled batch; actual due eligibility stays fixed IST. Existing schedule idempotency identity and worker policy checks remain unchanged.

Provider work is outside cursor transaction. Crash after selection may defer records until another rotation; no publication result is fabricated. Future/invalid rows consume a scan slot but rotation advances past them. Large backlogs require repeated ticks and lateness monitoring. The bound covers returned records and admission work, not internal DB scan cost, legacy report reads or hard HTTP duration; those limits still need work. No live cron or production database changed during implementation.

### SQL notification summaries and timestamp coverage

Scheduled digests/reminders now fetch aggregate counts/ratings plus at most one sample, under a repeatable-read snapshot. Full review bodies/lead notes are not loaded; reminder excerpts are bounded in SQL. No new migration required. TIMESTAMP `created_at` is canonical for recorded-time cutoff: records missing a usable value are excluded and counted as missing coverage. Human-readable review dates are not fallback timestamps for these summaries; no data repair is performed. Digest labels describe recorded reviews rather than source publication dates.

UTC instant cutoffs convert through FROM_UNIXTIME for database timezone independence; display remains IST. Rating gaps stay unrated/unavailable. Result size/application memory are bounded, but aggregate database scan time is not; validate performance and query-duration controls before claiming a hard hosting request budget.

### Cooperative scheduler work budget

Universal ticks now use20,000ms of cooperative new-work admission budget. Response includes `budget.mode`, `limitMs`, `elapsedMs`, `exhausted` and `deferredStages`. Deferred stages return `{deferred:true,reason:"TICK_BUDGET_EXHAUSTED"}` rather than fabricated zero-success counts. Consumers must handle this response shape. Running claimed jobs/SQL transactions settle normally; next jobs/deliveries stop being claimed after budget expiry.

Phase groups rotate within the process while preserving admission-before-queue order. This does not persist across restart or coordinate phase priority between replicas. SQL/provider/connection acquisition can still overrun, so this is not a hard HTTP/hosting time limit. No in-flight write is forcibly failed solely because its caller budget elapsed. Validate Hostinger execution limits and implement safe query/provider-specific deadlines before claiming hard request-duration compliance.

### Reporting snapshot client deadlines

Digest/reminder read snapshots use a5s client deadline including pool acquisition, transaction setup, SELECTs and read-only commit. Timed-out active connections are destroyed rather than pooled; partial summary is rejected. Late queued acquisitions are returned unused. Scheduler response now exposes failedCompanies/readTimeouts and selected/deferred company counts. No migration required.

This is a read-only reporting control, not a generic write/provider timeout. Disconnect does not guarantee instantaneous DB-server query cancellation; queued pool requests can complete later and are released. Overall tick still uses a cooperative20s new-work budget. Hosting/server statement limits and safe write/provider abort/reconciliation remain pending; no live hosting settings changed.

### Publishing ambiguity/retry and recipient policy

Unconfirmed publishing writes (timeout/network/408/5xx/2xx without provider ID) are UNKNOWN and are not automatically retried. Force no longer bypasses any unresolved UNKNOWN/RETRYING evidence for the post/platform, even if a newer FAILED record exists. Inspect provider state before any future audited reconciliation. Queue may dead-letter an incomplete publishing workflow while content/provider states remain UNKNOWN; this does not mean no message reached the provider.

Overall publication requires all requested channels to confirm. Mixed successes remain recorded per channel; unknown takes precedence, definite partial failure is reported explicitly. Telegram publishing requires that client's connected integration and matching returned chat ID; WhatsApp has no platform-admin recipient fallback when company phone is absent. Configure client destinations before rollout. Existing adapter request abort limits remain; whole-job/write-safe deadlines and atomic distributed first-dispatch claim are still pending. No production credentials, live cron or historical rows were modified.

### Canonical publishing claim migration013

Apply canonical migrations before starting this revision. New canonical publishing engine acquires one durable stored-post/workspace claim before dispatching any channels. Active/UNKNOWN/completed claims block concurrent/repeated work; only known FAILED is automatically reclaimable with new owner token. Stale5min IN_PROGRESS transitions UNKNOWN on another claim attempt, with no takeover. Final claim and content-post status settle in one owner-fenced transaction. Do not delete/reset uncertain claims to force retry without provider reconciliation.

Coordinate all publisher instances onto the same new version; older binaries ignore these claims. Scope caveat: legacy /api/meta/publish-post still directly calls adapters and must be migrated next; do not claim end-to-end platform protection until all producers use canonical engine. Claim uses post identity, so new content/target revisions require a new post or future versioned workflow. SQL/provider write deadlines and operator reconciliation remain pending. No production migration or live worker change was performed here.

### Legacy Meta API stored-post requirement

`POST /api/meta/publish-post` now requires explicit companyId, postId, content and1–2 unique Facebook/Instagram targets. Content/media/target set must match the saved post; changed/foreign requests cannot dispatch. Anonymous direct publishing, Google/WhatsApp targets and force/credential overrides are rejected. Deploy updated frontend/backend together or migrate external callers to save a draft first. Existing content-post publish endpoint remains canonical.

Integration composer now saves draft before sending and reuses that ID for retries within the mounted view. Unknown/5xx/network outcomes retain ID for inspection; refreshing/reopening loses local reuse map, so inspect existing post history before creating another intent. IN_PROGRESS returns202/success:false; handled UNKNOWN/FAILED200/success:false; callers must inspect success/status, not HTTP200 alone. No direct Graph adapter calls remain in server.ts.

Draft creation now preserves selected company/platforms/video field and rejects conflicting company aliases. Missing media no longer gets an automatic stock image; supply intended image for Instagram, or use Facebook text-only. No migration beyond013 required. General manual-action feed/reload-safe intent idempotency and audited reconciliation remain pending; no live production changes performed.

### Publishing observation audit migration014

Apply canonical migrations before starting this revision. Dashboard now supports stored-post outcome-review lookup and note-only operator observations. GET/POST `/api/companies/:companyId/posts/:postId/publishing-review` require workspace authorization. GET returns an opaque current version, bounded provider metadata and history; older history uses returned nextBefore as `before`. POST requires expectedVersion, decision and evidenceReference, plus target/providerPostId for OBSERVED_PUBLISHED. Actor comes from authentication; unknown body fields are rejected. Changed evidence returns409 and requires reload.

Review rows record observed claim/post/content context; dates display IST. Notes never change publishing/claim/provider state and never enable resend. NOT_FOUND is an observation, not proof of no send. Actual provider verification and approved resolution/replay remain pending; notification-occurrence review is separate future work. No live provider calls, production migration or deployment performed. Application audit is append-only, not a claim of tamper-proof external storage.


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

## Authentication and integration compatibility checkpoint — 10 November 2026 IST

Before any separately authorized deployment, review docs/implementation/AUTH_AND_INTEGRATION_BOUNDARIES.md. Tokens issued before the password-binding cutover require sign-in again. Deploy authentication changes coherently across all serving processes; an old process retains the old policy. APP_URL must be the intended HTTPS root origin for recovery links. Integration test/save/catalogue/delete clients must send explicit company scope. Saved configuration is no longer represented as verified channel permission. No production changes were performed in preparing this checkpoint.

## Private knowledge source checkpoint — 10 November 2026 IST

Prepared schema030_private_knowledge_sources adds the51st table using immutable SQL manifest v1. Review docs/implementation/KNOWLEDGE_SOURCES.md before separately authorized rollout. Confirm private DB storage/packet capacity, optional pdfinfo/pdftotext capability, parser resource limits and temporary-file cleanup; missing PDF tools are explicitly unsupported. Coordinate frontend/server/schema30 because older binaries reject newer ledger evidence. No production migration, parser installation or deployment was performed here.

## Fail-closed release prerequisites — 11 November2026 IST

`npm run deploy:validate` now emits structured PREREQUISITES_PASS/FAIL evidence and exits1 for missing client/server build files, Node below20, unavailable configured database, or any noncanonical/contradictory schema readiness. The installed @google/genai dependency requires Node20+, which is the release preflight minimum; the validated local toolchain remains Node24.19.0. Development memory mode cannot pass this release command. Both build paths must be regular files. The command closes its owned database pool, excludes raw database errors and may include only allowlisted transport codes. It performs no migration or repair. Passing these local/configured checks does not establish Hostinger runtime, deployed commit, cron, backups, provider acceptance or approval to release.

Website source provenance031 adds nullable URL/fetch-time columns to knowledge_sources. Coordinate schema/server/frontend rollout separately; older binaries reject the newer ledger. The manifest uses MariaDB-compatible idempotent ADD COLUMN IF NOT EXISTS; confirm actual host engine. Registered import requires tested direct HTTPS DNS pinning/egress; proxy-only environments need a supported design preserving these guards. No production migration or website fetch was performed. See docs/implementation/WEBSITE_IMPORT.md.

Durable source ingestion032: pause/update all server and worker instances together, apply reviewed migration separately and verify READY before resuming. The existing queue/dispatcher must actually run; a QUEUED acknowledgement proves persistence only. Verify source/queue/audit/outbox DML grants, lease overlap/restart, parser availability and private capacity. Parser7.3.0 has explicit CommonJS support for server.cjs; Node24.19.0 remains locally validated. Direct pinned TLS egress/site policy still needs hosting acceptance. See docs/implementation/KNOWLEDGE_INGESTION_QUEUE.md. No production rollout performed.

Website import is now internal durable website_import work as well as knowledge_extract child work. Update/pause all server and worker instances together: old workers do not recognize the new type. Import HTTP now acknowledges202/run metadata; release the matching UI. Verify worker/cron restart, bounded fetch egress, cancellation/recovery and unapproved canary snapshots before release. No additional schema beyond032. See docs/implementation/WEBSITE_IMPORT.md; no deployment performed in local validation.

12 November2026: chat/review/marketing draft consumers require schema033 fact reads and audit INSERT permission before provider work. Coordinate server/UI deployment for new409 guidance and additive provenance metadata. Configured model availability, actual SDK usage, provider latency/cancellation/capacity and canary behavior need separate hosting/provider verification. No new migration or live rollout. See docs/implementation/KNOWLEDGE_DRAFTS.md.

Grouped agency/security release requires034, paused/coordinated server and worker updates, owner-backfill validation, DML grants on the new tables, revocation-aware auth and private-cache worker v2. Existing bearer tokens retain password binding and now check revocation. New assigned roles are deliberately limited by request policy; legacy owner-only endpoints and full role parity remain gated. No automatic provider activation follows a pack change; reactivation keeps autopilot off. Use BATCH_10_AGENCY_SECURITY.md and the copied-export rehearsal before any separately authorized canary.
