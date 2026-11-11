# Durable source ingestion queue

11 November2026 IST. Current schema033/52 tables; no production migration/deploy or real website fetch performed. This completes the local background source-processing slice, not P04/all platform acceptance.

## Admission and worker ownership

New file uploads and registered website snapshots store private immutable original bytes first, then admit a knowledge_extract job. The initial HTTP acknowledgement creates a source, not an extraction result: metadata normally reports QUEUED. Source state/revision/approval clearing, queue intent, source history, queue journal and outbox commit atomically at admission. Same-byte reupload returns the existing source and does not start another job. A failed admission can leave the original STORED; bounded dispatcher recovery admits those originals later without pretending extraction happened.

Migration032 adds nullable extraction_job_id and extraction_attempt to knowledge_sources, with compatibility preflight and readiness shape checks. Existing001–031 files and table count51 remain unchanged. Current fact extension033/52 is in KNOWLEDGE_FACTS.md; next product ID034. Validated SQL engine is MariaDB10.11.19; idempotent ADD COLUMN IF NOT EXISTS needs separate actual-host compatibility confirmation.

The existing dispatcher queue stage runs bounded source recovery before claiming jobs, then handles knowledge_extract through the standard queue worker. Public arbitrary job enqueue does not accept this internal type; the authorized source API owns admission/source binding. Eight contenders for one loaded source revision admit one job. Active QUEUED/RUNNING/RETRY_WAIT jobs reject another source retry. A fresh retry after a terminal job creates a new run and clears approval immediately.

Worker claims verify database-clock lease owner/attempt and source company/job reference, then record PROCESSING with a new source revision and the queue lease attempt. Same-attempt duplicate work is skipped; a recovered newer lease may take over processing. Late old workers cannot settle source data or a newer job. The queue's existing60-second heartbeat/5-minute lease and bounded failure budget apply. The attempt value is a lease generation and can include paused/deferred claims; source STARTED events indicate actual parser entry. Global emergency stop prevents new processing/recovery via the existing dispatcher guard; ingestion never grants publishing permission or bypasses outbound stops.

## Atomic outcomes and retries

The queue settlement transaction supports a trusted internal projection callback. Only after the current job lease guard succeeds does it update the matching PROCESSING source/revision/job/attempt, append source history, append queue events/outbox and commit. Failure anywhere rolls the entire settlement back. A source cannot report EXTRACTED while its corresponding success/outbox was rolled back.

EXTRACTED settles the job SUCCEEDED but leaves the source unapproved. FAILED/UNSUPPORTED/NEEDS_OCR are failed job outcomes with explicit source state/code. Parser capacity exhaustion may retry under the existing bounded backoff/budget; permanent parser/encoding/OCR prerequisites do not loop automatically. Unexpected execution/result persistence errors remain unconfirmed/recoverable under the durable lease; no success is invented.

Automatic bounded recovery covers unlinked STORED originals and legacy unlinked PROCESSING claims older than10 minutes (max5 admissions per pass, subject to work budget). Terminal FAILED/CANCELLED jobs cannot leave source QUEUED/PROCESSING forever: max5 reconciliations per pass project FAILED with an interrupted/cancelled reason. A user retry before that reconciliation records the old terminal disposition before the new queued run in one transaction. Cancelled/failed work is not silently restarted: a new manual source retry is required. Missing/corrupt references and exhausted revisions remain visible for explicit recovery rather than wrapping counters or guessing ownership.

Deleting an original fences any later result; a queued/running job that finds the source missing fails without recreating it. Minimal source tombstone and queue audit remain; this is not immediate erasure from in-flight memory, backups or audit metadata. Legacy unbound processing helpers remain for isolated compatibility tests/admin seams and reject any source already bound to a queue job. Production route registration uses durable admission.

## Integrity and provenance

Original byte length/SHA256 are checked before parsing and authenticated attachment download. Approval and queue settlement also require matching original length/hash; settlement binds to the claimed original digest. Comparisons cast hash values to binary to avoid ASCII/hash-function collation conflicts. Changed/damaged originals cannot be approved or silently indexed; remove the damaged source and upload a trusted original. These are application/data integrity checks, not cryptographic protection against privileged changes to the entire database/audit trail.

Website snapshots keep original URL, fetch time and response media type through queued processing/retries. HTML/plain text parsing preserves that distinction, including literal angle brackets in plain text. Retry extracts saved bytes; it does not refetch the site. Changed website bytes create another unapproved snapshot; unchanged-byte replay retains first source identity/provenance/review state. Structured key-based review/manual precedence is implemented in KNOWLEDGE_FACTS.md; semantic conflicts and automatic snapshot supersession remain separate work.

Queue payload/result, source history and outbox omit original/extracted text: they carry identifiers, states, fixed codes and source revisions only. Source history additionally records queue job/attempt identifiers. Actor comes from server auth or the worker, never browser input. Saved-source search still reads only approved text with citations; there is no automatic campaign/reply/sales consumption or auto-approval.

## UI and operations

Knowledge cards show QUEUED/PROCESSING and the real linked queue status, explain the worker prerequisite and disable retries while a run is active. Reload adopts current persisted state. Source mutations invalidate/abort pending fact queries so an older approved result cannot reappear after withdrawal/deletion/retry. Source refresh/search are disabled while a source mutation is pending. Missing/unsupported registered website configuration provides actionable setup guidance, with document upload as an alternative. Snapshot/history/citation times use the shared IST formatter.

A running dispatcher/approved cron invocation, schema033, appropriate source/fact/queue/audit/outbox DML grants and parser capabilities are deployment prerequisites. A saved QUEUED record is not evidence that Hostinger has a functioning worker. Pause/update all server/worker instances together; an older running worker does not know the new job type. Older startup binaries also reject the newer ledger. Verify actual hosting, private DB capacity/permissions, scheduling overlap/restart and an isolated canary before release. No such production rollout occurred here.

## Runtime compatibility and tests

parse5 is pinned7.3.0 with explicit CommonJS and ESM exports for the externalized server.cjs build. A regression checks the require export and executes a server-style CJS extraction bundle with production credentials excluded. This preserves the Node20+ preflight policy; Node24.19.0 remains the locally validated toolchain. Lifecycle install scripts were disabled.

Website destination policy now uses native subnet matching: private/shared/link-local/multicast/reserved/documentation IPv4 ranges refuse without excluding unrelated public /16 ranges. IPv6 accepts global unicast2000::/3 except special2001::/23, documentation2001:db8::/32 and3fff::/20, and6to4 2002::/16; zone IDs, mapped/local forms and all non-global ranges refuse. Checked DNS remains pinned to the socket, every answer is checked, redirects remain same-origin and credentials/query/fragment/nonstandard ports/IP literals are disallowed. Static MIME recognition is case insensitive. This does not establish actual egress/proxy compatibility on hosting.

Native tests cover real queued HTTP upload,8-way admission, approval/retry fences, lease crash/stale worker takeover, atomic outbox fault rollback, exhausted/cancelled/fast-retry reconciliation, orphan recovery, deletion, foreign payload rejection, queued HTML/plain snapshots and byte corruption before/during parsing/approval. Historical schema/export replay, isolated regressions and Chromium/build results are recorded in EXECUTION.md and evidence/durable-knowledge-ingestion.json.

Website fetching now also uses durable website_import parent jobs with atomic page-group/source-job persistence, no-page failure history and scoped cancellation. See WEBSITE_IMPORT.md for the current contract; extraction remains a separate unapproved child stage.

Remaining: shared admission/usage/retention/performance policy, site/robots/domain ownership policy, semantic fact conflicts and freshness, automatic marketing/sales consumers, complete agency roles and actual hosting/provider acceptance. No claim of complete platform automation or all phases finished is made.

Current coordinated schema target is033/52 tables (next034). Structured key-based fact candidates/review/manual precedence and source invalidation are implemented as documented in KNOWLEDGE_FACTS.md. Full semantic conflict detection, automatic consumers and earlier/later acceptance gates remain open; current task states are generated in STATUS.md. Earlier032 figures above describe their historical batch.
