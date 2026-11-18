# Saved calendar plans

18 November 2026 IST. This continuation delivers durable batch definitions, per-slot generation admission, first-text snapshots and revision history for P05-08. It does not complete the full content strategy or the parent phase. See [SAVED_CALENDAR_BATCHES.csv](SAVED_CALENDAR_BATCHES.csv) and [evidence/saved-calendar-plans.json](evidence/saved-calendar-plans.json).

## User workflow

The current client calendar now includes saved batch plans. A writer chooses a future IST month, weekdays, time, Google/Facebook/Instagram target, English/Hindi and up to 12 explicit topics. Saving records a plan without calling a model. Settings and context are immutable; changed requirements use a new reviewed plan.

Generate pending draft slots explicitly admits each PENDING slot in sequence. A failed or unconfirmed slot stops that run. A subsequent pending-only run can process untouched slots; it never silently retries FAILED or GENERATING slots. A failed slot permits an explicit retry, at most two admitted generation requests per slot. Existing canonical model fallback and budget controls still apply within each request; these are not promises of exactly one underlying provider attempt.

Each successful slot saves an educational draft through the existing content writer and publication-intent transaction. It records the initial full text, source version, knowledge fingerprint and generation audit reference in a write-once snapshot. Subsequent live post edits, review, approval or rescheduling do not rewrite that snapshot. Frozen preview is clearly distinguished from the current post and attachments. Scheduling still belongs to the canonical review workflow; a saved snapshot is not publication or delivery evidence.

## Durable state and concurrency

Forward migration 053 adds calendar_plans, calendar_plan_items and calendar_plan_revisions. Target: 93 canonical tables; next migration 054. Historical 001–052 remain unchanged; frozen report coverage V4 remains unchanged.

All mutations use the existing company lock and current SQL actor/client permissions. Plan creation binds actor, client, normalized input and current context to a private request key. Exact replay recovers the committed plan; changed actor/input conflicts. Lost creation acknowledgements retain only the scoped key/hash in session storage. Recovery reads the committed result. Atomic close either recovers an admitted plan or seals the unused creation key, blocking late creation. Sealed receipts count toward the client cap and are not listed as usable plans.

Generation records its actor/key/hash and GENERATING revision before model I/O, then releases the connection. Exact replays return stored progress without a model call. Restart or lost-response recovery reads SQL; an unresolved GENERATING attempt is never automatically repeated. Operators may cancel it. Cancellation cannot recall model usage already admitted. A late result cannot create a post after slot cancellation or plan closure.

Settlement rechecks current writer authority, archive state, client context and knowledge fingerprint under the company lock. A savepoint protects canonical draft/intent creation, snapshot and revision materialization. Failure rolls back that materialization and records an actionable failure code; raw model output/errors are not copied into error metadata. An uncertain SQL acknowledgement requires reading stored state. No automatic worker or retry scheduler was added.

Append-only revision manifests bind immutable configuration hashes, states, attempt actors/times, saved post/snapshot hashes, generation hashes and failure codes. Current detail verifies the latest manifest, configuration and snapshot hashes; history verifies hashes and ordered contiguous revisions. Read paths reject corruption instead of presenting a partial trusted snapshot. These are application integrity checks, not protection against an administrator who can rewrite every row and hash.

## Topic, context and resource limits

Topic claims use Unicode NFKC, lowercase and punctuation/spacing normalization, retaining Hindi letters and marks. The unique active claim is per client/month/target. Equivalent normalized wording is blocked across retained saved plans. Cancelled unsaved slots release their claim. Saved slots retain it even after closure. Different clients/months/targets have independent claims. This is exact normalized wording protection, not semantic synonym, embedding, creative or asset deduplication.

The plan binds the existing client profile/operations context and canonical knowledge fingerprint. Any fingerprint-changing knowledge edit, including draft-fact changes, blocks remaining generation until a new reviewed plan is created. Archived clients remain readable; a currently authorized writer can close unsaved work. Removed assignments cannot cancel or mutate client work.

Bounds: 100 retained plans/creation receipts per client, 12 slots per plan, two admitted attempts per slot, 64 revisions per plan, 64KiB per snapshot, 32KiB configuration, 8KiB manifest, 25 rows per history/list page, five-second read-only database deadline, and 24 generation requests per IP per minute. Existing AI/draft capacity limits remain canonical. There is no automatic retention deletion. Read-only keyset cursors are client scoped and anchored to an existing row. API responses use no-store.

## APIs and ownership

Under `/api/companies/:companyId/calendar-plans`:

- GET/POST root: list metadata or explicitly create a plan.
- GET `/by-request/:requestKey`, POST `/close-request`: recover or seal creation.
- GET `/:planId`: current validated detail and immutable snapshots.
- POST `/:planId/close`: cancel unsaved work, retain saved posts/snapshots.
- POST `/:planId/items/:itemId/cancel`: cancel one unsaved slot.
- POST `/:planId/items/:itemId/generate`: durable explicit generation.
- GET `/:planId/revisions?before=revision`: private immutable manifest history.

Strict bodies/query fields and expected revisions reject conflicting decisions. shared/calendarPlans.ts owns contracts/normalization/metadata CSV; server/calendarPlans.ts owns SQL orchestration; existing knowledge generation, budget, model selection, publication intents and content writer remain canonical. CalendarBatchPanel owns creation/recovery/progress/history/frozen preview. The previous active quick planner is replaced; old individual draft receipts remain recoverable in CalendarView. CSV exports metadata, topics and hashes, not captions or generated text. Client/session changes invalidate late responses and exports.

## Remaining scope

P05-08 remains in_progress. Still pending: semantic topic/asset deduplication, complete media/library strategy, maintained locale-aware festival data, confirmed offer/audience/brand strategy, platform-wide mandatory agency approval policy and production hosting/provider acceptance. Existing reference documents retain historical evidence; this document supersedes their statement that a saved batch/version store is entirely missing.

Billing remains excluded. Rendering remains default off. This group does not deploy, migrate production, enable automatic publication or make real provider/model/customer calls during verification.

## Verification results

137 credential-isolated regression programs and all28 browser workflows passed (first5 plus remaining23 serial runs; targeted calendar/root2/2 also passed). The full disposable MariaDB10.11.19 suite passed with restricted runtime credentials, including exact request/admission races, immutable text after live edits, late-result cancellation, explicit retry, sealing/commit-loss/audit rollback, scope/context/knowledge fences and incompatible schema refusal. The uploaded SQL export restored and upgraded to053/93 while preserving original business rows and ledger; repeat/bundled migration replay was READY/applied0. TypeScript, production build,262 route declarations/50 registrations with no collisions, migration sources and document guards passed. Full normal App dependency closure:583013 raw/168862 gzip bytes within existing budgets. The browser resource timing buffer was increased to2000 after its default capacity dropped later module observations; the corrected lazy-module fixture passed. No external provider/model/customer request was required.
