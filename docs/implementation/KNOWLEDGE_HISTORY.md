# Source lifecycle history and daily accountability

11 November2026 IST. Current source schema032/51; history reused the existing ledger without a new table. Durable queued ingestion is now implemented as described in KNOWLEDGE_INGESTION_QUEUE.md; whole-import orchestration and phase/fact governance gates remain open.

## One existing ledger, atomic transitions

Source operations now append domain-specific KNOWLEDGE events to the existing autonomous_audit_logs ledger inside the transaction that changes the source. Upload/import storage, extraction start/settlement, approval, withdrawal and deletion either commit their mutation/event together or roll back together. Same-byte replay makes no state change and invents no new storage event. Actor is the authenticated server user ID for HTTP commands, or system for internal callers. No caller-supplied actor is accepted.

Each event contains only source ID, source revision, fixed transition/state, actor ID, DB timestamp and optional queue job/lease-attempt identifiers. Source URL, filename, original bytes, extracted text, provider bodies and credentials are not copied into details. The module exposes no history edit/delete operation. This is application-level append-only history, not cryptographic tamper evidence or protection against privileged direct DB changes. Existing generic scoped audit readers can also see these safe domain events.

Deleting a source removes its original bytes/text row but preserves minimal lifecycle events, including a deletion tombstone. It does not claim erasure from backups or the entire audit ledger. There is no synthetic backfill for pre-feature uploads/approvals; an old source may have only its later recorded transitions. Failed unauthorized/invalid commands are not falsely recorded as completed source mutations.

## Read API and UI

GET `/api/companies/:id/knowledge/sources/:sourceId/history` authenticates and authorizes the workspace, including for known deleted source IDs. Unknown/foreign source IDs in an authorized workspace return no source events. Optional `beforeVersion` is an exclusive unsigned revision cursor string; invalid/extra query fields reject. Fixed50-event pages, at most51-row reads, revision ordering and explicit unsigned SQL casts preserve same-second ordering and large integer precision. The canonical5-second read-only SQL deadline bounds connection acquisition/read work; malformed history becomes unavailable, not empty success.

Response includes companyId/sourceId/events/nextBeforeVersion. Event DTO whitelists id/event/sourceVersion/state/actor/recordedAtMs; private legacy extra details are excluded. Frontend validates scope, row order, cursor and timestamps. Source history controls load/reload/older records with IST display; pending results cannot enter a different client after remount. A selected history panel can reload a deletion tombstone after the original row disappears. Persisted source histories remain accessible through their known IDs; a complete deleted-source browsing catalogue/retention UI is not supplied by this slice.

## Daily report, CSV and digest

Six new activity metrics derive from committed ledger events in the selected IST half-open day, rather than current/deletable source rows: knowledgeStored, knowledgeExtractionsSettled, knowledgeExtractionsBlocked, knowledgeApprovals, knowledgeWithdrawals and knowledgeDeleted. Settled includes every extraction outcome; blocked is the FAILED/UNSUPPORTED/NEEDS_OCR subset. Separate attempts and repeated approvals count separate transitions. Duplicated byte upload replay does not count a new stored original. Deletion cannot erase earlier recorded activity. Current backlog remains separate.

CSV uses fixed numeric labels only, and the existing digest formatter validates complete numeric coverage. No source content or actor data enters the report/CSV/digest. Older unlogged activity is not reconstructed or represented as a verified historical absence. These new API fields require coordinated server/frontend versions; a missing/invalid required count makes export/digest unavailable.

## Evidence and limits

Restricted disposable MariaDB tests inject an audit INSERT failure and prove the source mutation/revision rolls back. Actual lifecycle, foreign-client reads, retained deletion events, same-second revision order,50-row pagination, large unsigned revisions, exact IST boundaries and cross-session timezone counts are verified. Native fixtures also prove a deleted source still contributes daily storage/deletion/approval counts. Unit and browser fixtures verify DTO privacy, bad cursor rejection, older-page loading and late-client result fencing. Default regressions, TypeScript/build and full workspace browser checks are recorded in EXECUTION.md.

Source transition history now participates in durable queue admission/attempt settlement. Whole-website import orchestration/grouping remains incomplete. Import failures before a source exists have no source lifecycle event. Shared usage budgets, fact conflict/precedence, approval of structured business facts, all-workflow reconciliation, audit retention/performance acceptance on hosting and actual provider/hosting release gates remain open.

Queued events and worker lease attempts are now recorded. Settled/attention report counts include reconciled cancelled/interrupted runs, including runs that never reached the parser. Original/hash checks, queue fencing and worker/deploy limits are in KNOWLEDGE_INGESTION_QUEUE.md.
