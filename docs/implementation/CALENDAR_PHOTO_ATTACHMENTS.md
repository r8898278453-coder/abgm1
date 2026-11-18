# Explicit calendar photo attachment and guarded publishing

Latest local acceptance (18 November2026 IST): [ORIGINAL_TASK_CLOSURE_REVIEW.md](ORIGINAL_TASK_CLOSURE_REVIEW.md) validates P05-08 against the original criterion after the full grouped matrix. Older in-progress/status counts below are historical. Other explicit gaps and all phase/live gates remain open; no automatic activation.

18 November2026 IST. Continuation of P05-07/P05-08. Saved, mapped calendar drafts now support explicit photo attachment/detachment, canonical reapproval and provider-boundary validation. It reuses existing plan items/revisions, content posts, publication workflow/audit, asset approvals and publishing claims. No new migration, content writer, provider sender, scheduler or approval table is introduced.

## User workflow

Complete generation or close the plan's unsaved slots first. On a SAVED slot with immutable photo guidance, explicitly Read current mapped photo state. This fetches current post source version, plan revision, current image presence and retained binding. Opening the saved plan does not initiate a media mutation.

Only currently authorized writers can attach/detach. The current post must be draft/failed; scheduled or pending-review work must first return to draft through the existing canonical calendar controls. Attachment refuses unrelated existing image/video content. It resolves only the slot's exact saved asset/revision/hash, checks current same-client APPROVED photo metadata and owned local bytes, then updates image_url and invokes the existing publication transition in one company-locked transaction. Detachment removes only the matching bound photo and remains possible after its approval/file becomes unavailable. It does not replace unrelated media.

Both actions move the post to pending_approval and advance the canonical workflow/source version. Neither approves a schedule nor publishes. Existing publishing-claim state checks prevent edits while outcomes are IN_PROGRESS/UNKNOWN/published. The photo transaction rolls back if transition/audit/plan append fails. Closed plans allow media actions without reopening generation; limiting these actions to closed plans prevents media churn from consuming the revision budget needed to resolve unfinished generation.

## Durable binding and recovery

A strict photoAttachment record is added to existing generation_evidence_json and conditionally embedded in the append-only plan manifest. It contains state (ATTACHED/DETACHED), owned reference URL/ID/revision/hash, actor, request key/input hash, before/resulting post source versions and recorded time. Existing manifests without that property retain their exact bytes/hashes. Original generated-text snapshots are never rewritten; their image flag remains the original captured state.

The receipt hash binds actor/client/plan/item/action and expected post/plan revisions. Eight exact concurrent submissions produce one media mutation; exact latest-key replay returns the current post/binding. Changed actor/input reuse conflicts. Older receipts remain visible in immutable revision history, but old request keys are not globally reserved forever: stale expected revisions refuse later replay. Read current state after an unknown result; the UI disables actions until that read. A new request after a read still uses post/plan CAS, so a late original and replacement cannot both mutate the same old revision. There is no automatic mutation retry or raw-text/browser persistence.

The existing64-revision per-plan ceiling remains. Plan manifest bound increases from8KiB to32KiB to retain up to12 full media proofs; old payloads/hashes are unchanged. Per-item evidence is bounded at4KiB. Exhaustion refuses further changes rather than rounding/overwriting history. Create a new reviewed plan/post when the retained revision budget is exhausted.

## Approval and provider checks

Scheduling approval validates the current binding proof, selected immutable plan reference, current asset approval/URL/revision/hash and file bytes. Canonical publishing checks the same proof before admission and through existing canStart callbacks at provider/retry boundaries, including Instagram's second publish step. Erased/altered binding metadata inconsistent with the latest manifest is refused. DETACHED bindings require no image; adding an unrelated image through a legacy edit cannot bypass the binding. A bound post with incompatible image/video content is refused.

These hashes are application integrity checks, not protection against an administrator rewriting all rows/hashes. The guard covers posts linked to saved calendar items/bindings, not a claim that every historical image upload now has complete asset governance. Fully unconfigured in-memory legacy development mode is retained because no durable calendar bindings exist there; configured database failure withholds publishing. Existing global/client/channel stops, claim ownership, quotas, UNKNOWN no-resend handling and provider adapters remain canonical.

Already-published non-forced requests retain their existing skip/no-resend behavior. Revocation cannot retract an external request already admitted or delete a post already published. Provider acceptance remains distinct from public delivery.

## First-publication SQL repairs

The intercepted real-engine fixture exposed two pre-existing SQL bugs. isPostAlreadyPublished fell through to the production fallback error when a valid SQL lookup returned no published row; it now returns false for that normal first-publication case. Publishing record creation/update sent ISO strings with trailing Z into strict MariaDB TIMESTAMP columns; writes now use CURRENT_TIMESTAMP for database-clock fields and FROM_UNIXTIME for supplied publication instants. In-memory return shapes stay unchanged. These repairs are necessary for the actual durable engine path, not a new provider implementation or evidence that live publishing was already working.

## Stable public media delivery

Providers cannot use a relative /uploads path directly. After durable publishing/client admission, bound photo delivery resolves the approved bytes and creates/reuses a content-addressed copy under `/uploads/{company}/publication-media/{representationHash}.{extension}`. The hash uses the existing renderer MIME/base64 representation. The original source file is not overwritten. The selected bytes are checked again and the copy is read/hash-verified before its URL is used; corrupt existing copies are refused rather than overwritten. The stored post/source version retains the original owned URL; only the provider payload uses the frozen delivery URL.

PUBLIC_APP_URL must be an explicitly configured HTTPS origin with root path, no credentials/query/fragment. There is no request-host fallback or hardcoded customer domain. This validates configuration syntax, not DNS, SSL, anonymous reachability or provider acceptance. The existing public-read uploads server serves delivery artifacts; actual hosting/media reachability remains an operational acceptance gate.

A company lock serializes artifact creation, at most100 retained files per company, each bounded by the existing5MiB raster limit (up to500MiB input bytes total plus filesystem overhead). Directory enumeration stops after101 entries. Existing hash copies may be reused at capacity. No automatic retention deletion/cleanup or storage reclamation is added. Failed/unknown commits can leave a reusable content-addressed artifact; they do not themselves send anything. Preparation failure before provider dispatch settles as known failure when acknowledged; uncertain settlement stays UNKNOWN. Current approval/source checks still run before provider calls even after a copy exists. App code does not overwrite content-addressed copies; privileged filesystem mutation is outside this integrity guarantee.

No image decode/visual-quality, copyright, semantic fit or provider fetch outcome is established by a matching signature/hash. Google publishing's existing incomplete adapter, provider permissions and production hosting gates remain pending; this group does not claim live end-to-end publication.

## APIs and ownership

GET `/api/companies/:companyId/calendar-plans/:planId/items/:itemId/photo` reads scoped current post/plan/binding. POST to the same path takes strict action, expectedVersion, expectedPlanVersion and a64-hex requestKey. Both use no-store, current SQL permissions and reject extra query/body fields. Existing general plan/history endpoints expose the retained immutable attachment proofs to authorized readers. Plan CSV stays metadata-only; it does not export media URLs or private rights declarations.

shared/calendarAttachment.ts owns strict proof contracts. server/calendarPlans.ts owns media admission/CAS/evidence/append; clientCalendar exports its existing post reader/DTO seam. server/calendarAttachmentProof.ts owns proof/current-source/approval verification; publicationWorkflow and publishingEngine reuse it. calendarPhotoDelivery prepares bounded stable media without calling a provider. CalendarAttachmentPanel owns explicit read/actions and stale/client/session/unknown-response fences.

Schema053/93 tables, next054 and frozen V4 remain unchanged. Billing stays excluded; reel rendering stays default off. Verification does not publish/deploy, mutate production or use real provider/model/customer calls. See [CALENDAR_ATTACHMENT_BATCHES.csv](CALENDAR_ATTACHMENT_BATCHES.csv) and [evidence/calendar-photo-attachments.json](evidence/calendar-photo-attachments.json).

Still pending: automatic creative/media strategy, structured rights expiry, semantic/perceptual matching, maintained festival/offer/locale policy, delivery retention tooling and real hosting/provider acceptance. P05-07/P05-08 remain in_progress.

## Final local verification

141 isolated regression programs, the full disposable MariaDB10.11.19 suite and three targeted browser workflows (calendarAttachment/clientCalendar/workspaceIsolation) passed. Native tests cover eight-way attach replay, canonical reapproval, audit rollback, lost detach acknowledgement/replay, original frozen snapshot preservation, changed bytes/revoked approvals, erased proof and unrelated-media rejection. The actual publishing engine was exercised with fully intercepted in-process Instagram/Facebook transports: a stable HTTPS image URL reached the container/photo payload, revocation stopped Instagram media_publish, mocked Facebook acceptance settled SQL timestamps/PUBLISHED, and later replay did not resend even after revocation. These are local integration fixtures, not real provider delivery. Contract tests include strict owned references and HTTPS origin syntax. TypeScript/build,267 route declarations/50 registrations,53 migration sources and document guards passed. Normal App closure583053 raw/168878 gzip bytes fits the existing budgets. Browser registry30 is not a fresh30-fixture run. Schema053 is unchanged; no new export restore rehearsal is claimed.
