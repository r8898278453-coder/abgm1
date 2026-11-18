# Immutable calendar photo guidance

18 November2026 IST. P05-07/P05-08 continuation. Saved calendar plans now support explicit, reviewed per-topic references to approved local photos. This is planning guidance, not an image attachment, render, publication approval or automatic asset-use capability. Existing text drafts and publication workflows remain canonical.

## Selection and confirmation

In the saved plan form, enable Map approved photos to topics, then explicitly inspect the current asset-library page. Only photo records whose current bytes match their recorded approval are offered. Logos, revoked/unreviewed, missing or changed files are excluded from choices. Inspection is on demand and uses the existing10-file page/100-record library bounds; no new media engine or eager file scan is added.

Choose an optional photo for each topic. At least one selection is required when the guidance option is enabled. Each selected reference binds the zero-based topic slot, asset ID, exact approval revision and existing renderer representation hash. Same-byte references across topics require explicit Allow the same photo bytes permission, even when they are different registrations of identical bytes. This is not a global ban on campaign reuse, semantic matching or perceptual deduplication.

Review confirmation is required before saving. Changing choices, repeat permission, topic text/order or loading a different inspected page clears confirmation/mapping. Page changes replace candidate choices rather than silently retaining unchecked files. Turning guidance off restores the legacy photo-free plan input. The writer may leave some slots unmapped.

The selected references, explicit repeat policy and confirmation become part of the existing immutable normalized input/config hashes and plan revision history. Legacy omitted inputs retain their old shape and hashes. No schema migration or old-record rewrite is needed. No file URL, rights note, image bytes or model prompt is added to the input; only IDs/revisions/hashes are retained.

## Admission and settlement

Plan creation resolves references against the current same-client photo approval rows and verifies current bytes with the canonical ownedRenderImage/verifyRenderAssetRefs path. Submitted URLs are not accepted. The path root is the existing application `process.cwd()/uploads`, matching server.ts. Files must satisfy the existing same-company path/realpath, supported signature and5MiB limit; no URL fetch occurs. Exact revision, hash, photo type and APPROVED status must match.

Before a mapped slot's model admission, the server rechecks that slot's recorded approval and file bytes. A changed file/ref refuses admission before a model call or attempt increment. After model generation, materialization rechecks the same approval and bytes under the existing company lock/savepoint. Revocation, replacement or byte change during model I/O discards the output as FAILED/PHOTO_REVIEW_REQUIRED, without a saved text snapshot/post. A model attempt may already have incurred usage at that point. Existing explicit bounded retries, cancellation and no automatic replay behavior remain in force.

This gate applies to the slot's selected photo; an unmapped slot has no selected-photo requirement. Other context/knowledge/authority checks remain unchanged. Approving the same file again advances its revision, so an old immutable reference remains stale even if the bytes are unchanged. Close/cancel old unsaved work, then create a newly reviewed plan with the new exact reference. Guidance is not silently rebound to a newer file/review.

At creation at most12 unique selected registered assets are byte-checked. Repeated references to one asset are read once per verification operation, sequentially, without retaining a whole-plan image array. Each raster is bounded at5MiB; worst-case creation input reads are60MiB plus temporary representation overhead. Per-slot admission/settlement reads at most its one selected image. Checks reuse the transaction connection and do not acquire a second connection while holding the company lock. This remains an explicit action rather than scheduled full-library polling.

## What a saved result means

Saved plan detail shows the immutable slot → asset/revision/hash mapping. `photoApprovalsCurrent` reports whether recorded current approval metadata matches the saved references; it deliberately does not claim current file bytes were inspected by a detail GET. Byte checks run at creation and mapped generation boundaries. A later file edit can leave the metadata indicator true until byte verification, which then refuses use.

Successful generation still creates a text-only educational DRAFT. No image_url/video_url is attached by this feature. The initial text snapshot remains the canonical text snapshot; the separate immutable plan definition retains photo guidance. A photo reference does not prove the generated text visually fits the image, copyright, suitability, brand compliance or provider eligibility. Review it in Content Studio before any actual use. Automatic attachment is intentionally pending until publication-time asset revalidation and durable use binding are implemented together.

The model receives no photo bytes or new visual claims from the mapping. Existing approved-fact generation, budgets/model fallback and metadata journal remain canonical. A reference cannot authorize a render or send. Existing rendering stays default off.

## Scope, privacy and verification

CalendarPhotoPicker is inside the client/session-scoped batch panel. Lost-create recovery retains only the existing actor/client key/hash; no extra browser persistence is added. Saved photo guidance survives a lost create response because it is in the durable plan config. Existing plan CSV remains topic/state/version/hash metadata without asset file URLs, rights declarations or generated text. The photo picker uses only the existing read-only asset-library API; no new route or migration is added.

Shared normalization rejects extra reference fields, out-of-range/duplicate slots, revision0/overflow, invalid IDs/hashes, unconfirmed selections and repeated hashes without explicit permission. Server lookups enforce actual current ownership/approval; client-supplied references are not trusted. Existing request sealing, cancellation, saved snapshot hashes and source-bound schedule decisions remain unchanged.

See [CALENDAR_PHOTO_BATCHES.csv](CALENDAR_PHOTO_BATCHES.csv) and [evidence/calendar-photo-guidance.json](evidence/calendar-photo-guidance.json). P05-07/P05-08 stay in_progress. Pending: durable actual-use/attachment binding with publication-time revalidation, visual relevance/creative review, maintained festival/offer/brand strategy, semantic/perceptual matching and hosting/provider acceptance. Schema053/93 tables, next054 and frozen V4 are unchanged. No production deployment/DB mutation, real model/render/provider/customer call or billing change is performed by verification.

## Final local verification

140 isolated regression programs, full disposable MariaDB10.11.19 suite and three targeted browser workflows (clientCalendar/lazyFeatures/workspaceIsolation) passed. Native tests cover invalid hash refusal; changed bytes blocking before model callback/attempt admission; revocation during callback producing PHOTO_REVIEW_REQUIRED/no snapshot; new exact reviewed revision recovery; immutable config preservation and text-only saved posts with image_url NULL. Browser tests cover explicit approved-photo selection, repeat permission, confirmation and lost-create-response guidance recovery. Contract tests cover slot/revision/hash/extra-field/reuse limits and omitted legacy input. Files are synthetic local raster-signature fixtures, not visual relevance/decode/render acceptance. TypeScript/build,265 route declarations/50 registrations,53-source and document guards pass. Normal App closure583053 raw/168882 gzip bytes fits existing budgets. No new full29-browser or export restore run is claimed; schema053 is unchanged.
