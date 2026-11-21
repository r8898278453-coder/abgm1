# Inspected asset library and exact duplicate photo selection

Continuation: [CALENDAR_PHOTO_GUIDANCE.md](CALENDAR_PHOTO_GUIDANCE.md) binds explicitly reviewed per-topic references to immutable plans. It adds generation-boundary validation, while actual attachment/use binding with publication checks remains pending.

18 November2026 IST. P05-07 continuation, with supporting P05-09 render admission fixes. The existing company_assets table, render_asset_approvals records, rights/source declaration, owned-file reader and render queue remain canonical. No new migration, worker, scheduler, provider client or approval store is introduced.

## Read-only inspection

Content Studio → Brand Assets now offers an explicit Inspect asset library from first page action. Opening the tab alone does not run file inspection. GET `/api/companies/:companyId/asset-library?before=cursor` returns at most10 inspected records from the existing100-asset catalog bound. Each local file uses the canonical ownedRenderImage reader: same-company registered local raster, validated path/realpath,5MiB maximum and bounded read. Remote URLs are never fetched. The reader checks supported raster signatures/size/path, not full image decode quality; a renderer can still refuse a damaged image. Unsupported/oversized/missing/unsafe files are FILE_UNAVAILABLE, not silently approved or deleted.

Stored approval is displayed separately from current observed file state:

- MATCHES_REVIEWED_FILE: observed image representation matches the current approval hash.
- BYTES_CHANGED: stored APPROVED hash differs from the observed file; review is needed.
- UNREVIEWED/REVOKED: readable file with that stored review state.
- FILE_UNAVAILABLE: no usable local file observation, regardless of stored review state.

The hash intentionally reuses the existing canonical renderer's MIME/base64 image representation hash. It is not a new incompatible raw-file hash. Identical supported byte streams produce the same representation. No image bytes/data URLs are returned by the inspection endpoint.

Observed duplicate IDs compare exact representation hashes only among files inspected on the current page. Recorded duplicate IDs compare APPROVED hashes across the registered client library; those other files may have changed or disappeared. The UI and CSV explicitly distinguish these meanings. A recorded match is not proof of current byte equality. This is not perceptual, semantic, resize-tolerant or cross-client deduplication.

## Snapshot and resource boundaries

SQL authorization/metadata reads use the existing read-only deadline and release the connection before local file I/O. Inspection is sequential, at most10×5MiB input reads per request; decoded image representations are not retained as a whole-page buffer. Successful earlier observations retain only hashes. After file reads, the server rechecks current SQL actor/client authority and the complete catalog metadata fingerprint. Changed metadata/permissions withhold the result instead of returning mixed review state.

Cursors bind client, metadata fingerprint and an existing catalog anchor. Catalog changes require restarting at page one. The panel replaces each inspected page; CSV exports the displayed page only. File content itself is not locked or made immutable by inspection: a later file change can occur without changing the catalog cursor. Each row has its own observed timestamp. Rendering still independently validates current bytes/approval before use and settlement; this endpoint never grants a render/publication capability.

Each page can read up to50MiB plus representation overhead, so it is on demand, not polled. There is no automatic full-library filesystem scan or claim that all100 records have current observations. A library above the existing100-row cap is withheld. No automatic cleanup/deletion, storage reclaim or hosting capacity claim is added.

## Renderer and approval fixes

New default render selection now chooses at most three distinct approved photo hashes. Exact duplicate approved photo registrations no longer occupy multiple default photo slots. Explicit requested photos remain explicit; logo and photo roles remain separate. Selected images still pass the existing approval and current-byte checks. A stale first selection fails closed; this change does not silently fall back to a different asset. Historical job snapshots and explicit asset refs are not rewritten, and their original verification remains intact.

Asset approval writes validate strict input inside the canonical writer, re-read users.is_platform_admin and current agency/client permissions from SQL, then apply the existing company-lock/CAS/hash/audit transaction. A stale supplied admin flag cannot bypass current authority. Approval revisions now accept exact unsigned64-bit decimal strings instead of the old15-digit limit: max-minus-one can advance to max, then further mutations are refused before overflow. Existing rows, audit format and approval semantics remain unchanged. Rights/source declarations remain user assertions, not copyright verification or permission to publish.

## UI, privacy and ownership

AssetLibraryPanel is scoped by current client and feature session. Late responses are aborted/ignored; corrupt, foreign or unavailable observations clear displayed data. Export rechecks the accepted session. No automatic mutation, image preview fetch, provider call or model generation is initiated by this panel. Existing RenderOperationsPanel remains the single approval/revocation UI and saved reel history owner.

Labels, review revision/state, observation time, duplicates and the reviewer rights/source declaration are shown as plain text. Metadata CSV formula-escapes cells and omits file URLs, rights/source notes, image bytes, prompts and credentials. It includes only observed page metadata/hashes with explicit UTC timestamps/Asia-Kolkata context and stale-recorded-match caveat. No private library data is put in browser persistence.

shared/assetLibrary.ts owns DTO/CSV validation. server/assetLibrary.ts owns scoped observation and cursor/recheck behavior. server/renderAssets.ts remains the approval/selection authority, server/renderRoutes.ts exposes the read-only adapter and ContentStudioView mounts the panel. Billing stays excluded and ENABLE_REEL_RENDERING remains default off.

## Remaining scope

P05-07/P05-09 remain in_progress. Still pending: comprehensive creative/brand/locale/media policy, maintained festival strategy, semantic/perceptual asset matching, content-calendar-to-asset selection/reuse policy, structured license expiry/provenance, full hosting/runtime capacity and provider acceptance. No production deploy, live DB mutation, real renderer/model/customer/provider call or automatic asset deletion was performed by verification.

See [INSPECTED_ASSET_BATCHES.csv](INSPECTED_ASSET_BATCHES.csv) and [evidence/inspected-asset-library.json](evidence/inspected-asset-library.json) for current local results. Schema053/93 tables, next054 and frozen report V4 remain unchanged; prior export restore evidence is retained rather than claimed as a new rehearsal.

## Final local verification

139 credential-isolated regression programs, the complete disposable MariaDB10.11.19 suite and three targeted browser workflows (assetLibrary/lazyFeatures/renderOperations) passed. Native assertions cover identical images/default selection, current-vs-recorded duplicate divergence after file changes, revocation/missing files, fresh actor refusal, uint64 exhaustion,13-row10+3 pagination and changed metadata cursor refusal. Existing synthetic reel worker tests remain injected fixtures, not real render/video evidence; local input files in this fixture use raster signatures and do not establish decode quality. Focused HTTP checks cover unauthenticated/foreign/extra/repeated query refusal and no-store. TypeScript, production build,265 route declarations/50 registrations,53 migration sources and document guards passed. Normal App closure583013 raw/168856 gzip bytes fits existing budgets. The browser registry now has29 programs; only the three relevant workflows were run for this group. No new export restore rehearsal was needed for unchanged schema053.

## Content Studio draft rendering, 21 November 2026 IST

Automatic template rendering receives the headline, caption and CTA from the same generation response shown to the editor. A slower earlier render cannot replace a later render result. Scheduling a text-only draft preserves its empty image field. Removing the last selected uploaded photo clears that selection. Editors can still choose stock imagery explicitly. Template success feedback identifies the template render. P05-07 remains in progress pending creative policy and asset provenance acceptance.

Chromium verification at 00:30 IST on 22 November confirmed that the Content Studio date picker and approval request both select 23 November. The picker is available on mobile and its controls identify IST. The isolated browser fixture checked that the text-only approval request omitted the image field and that the template request carried the current client, generated headline, caption and CTA. Live provider rendering and concurrent response ordering are outside this fixture.

The studio initializes target language from the supported saved preference and allows per-draft overrides. Cleared saved brand fields reset in the editor. The platform placeholder logo is for preview only. A client without a logo can request an ordinary template using the server’s approved asset selection. Legacy brand kits containing the platform placeholder follow the same behavior.

The Chromium fixture covers the Gujarati default, Hindi override, client color, absent logo and two overlapping template requests. It releases the first response after the second has rendered and checks the retained preview. Local verification uses simulated provider responses. Structured license provenance and expiry policy remain open.

## Time-limited asset rights

Migration 065 adds a nullable DATE to the existing approval. The review form records the last permitted calendar day in Asia/Kolkata. Existing approvals have no recorded end date. An older API client that omits the field preserves the stored value. An authorized reviewer may explicitly clear or extend it with the current revision and a new rights declaration. Revocation remains available after expiry.

Template and reel selection omit expired assets. An explicit request for an ineligible image fails. Queued work and settlement recheck the stored date against the current IST day even when the approval revision and file bytes still match. The inspection panel displays the declared date. This governs new renders. Previously exported files and downstream publication rights require separate review. Older application binaries predate expiry enforcement and must keep rendering disabled if rolled back.

## P05-07 local acceptance

Reviewers choose client-owned work, third-party license, public domain or another declared source and enter the rights declaration. Both fields belong to the same approval revision. A previous approval with only a note has an unknown source category until a reviewer classifies it. The inspection panel shows the recorded category. The database transaction records the category and end date with the approval and audit event.

The original tracker criterion covers client brand, language and offer facts, stored source/license/approval, and accurate creative capability labels. Content Studio uses the saved client preferences and labels the PNG template renderer. The marketing draft route uses the approved-fact context, blocks conflicting facts and returns drafts for review. Generated claims still need human review. The acceptance covers local software behavior, including the browser request and retained preview, independently of hosted rendering and provider output quality.
