# Website-import daily accountability

11 November2026 IST. Schema032/51 unchanged; no production migration, notification send or deployment. This extends the existing per-client daily report, CSV, digest formatter and dashboard; it is not complete P09 agency reporting.

## Activity and current backlog

Five required activity fields count distinct website_import run IDs that recorded the corresponding transition inside the selected Asia/Kolkata half-open day:

| Field | Meaning |
| --- | --- |
| websiteImportsQueued | Durable JOB_QUEUED admission recorded |
| websiteImportsCommitted | JOB_SUCCEEDED recorded after atomic snapshot-group persistence |
| websiteImportsWithFailures | JOB_FAILED or JOB_ATTEMPTS_EXHAUSTED recorded, including retryable failures |
| websiteImportsPaused | JOB_DEFERRED recorded, for example global emergency stop |
| websiteImportsCancelled | JOB_CANCELLED recorded, including cancellation while fetching |

Activity reads existing job_action_events joined to the same-company job_action_runs and fixed website_import type. Repeated same-transition events for one run count once per day. A run may count as both failed and committed if a retry later succeeded, or as failed and cancelled. These are overlapping transition counts, not mutually exclusive final-outcome buckets. Earlier request-bound imports are not backfilled. Import admission does not mean a network request was made, and commit does not mean extraction/approval, complete site coverage, a customer or revenue.

Three required current-backlog fields read actual same-client job_queue states across all dates: websiteImportsWaiting (QUEUED/RETRY_WAIT), websiteImportsRunning (RUNNING) and websiteImportsFailed (FAILED). Cancelled/succeeded runs are excluded. These are subsets of generic job backlog, not additional jobs to add to its totals. A stale RUNNING mark is not independent evidence of a live worker; normal lease recovery/worker acceptance still applies.

Selected-day run activity does not depend on current/deletable source rows or their approval status. No-page imports contribute failure records despite creating no source. Job/source histories provide drilldown. No webpage URL/text, actor, credentials or provider exception is copied into aggregate reports, CSV or digest.

## Shared surfaces and validation

The existing report API gains five activity and three backlog numbers. Server, UI, CSV and digest formatter require the coordinated contract; missing/invalid counts make the report/export/digest unavailable instead of inventing zeros. There are22 activity and14 backlog rows in CSV (38 CRLF-separated entries including header/trailing empty entry). Fixed labels/numeric values retain spreadsheet-formula protection.

Native restricted MariaDB verifies exact IST start/end boundaries, repeated-event dedupe, failure-then-success overlap, cancellation/pause/exhaustion, generic job-type exclusion, foreign-client isolation, source-independent history, current backlog and alternate SQL session timezone. Actual import HTTP/worker fixtures additionally reconcile15 admissions,5 committed groups,5 runs with failure records,6 cancellations and4 current failures (failures/cancellations overlap). No real website request occurs.

Chromium verifies visible counts, unavailable export for an incomplete report and late-response isolation on client switch. Regression/TypeScript/build evidence is in EXECUTION.md and evidence/website-import-accountability.json. Existing whole-platform reporting acceptance remains open: expected-plan versus actual work, all-workflow reconciliation, late amendments, agency aggregates and hosting/performance/retention gates.

Current coordinated schema target is033/52 tables (next034). Structured key-based fact candidates/review/manual precedence and source invalidation are implemented as documented in KNOWLEDGE_FACTS.md. Full semantic conflict detection, automatic consumers and earlier/later acceptance gates remain open; current task states are generated in STATUS.md. Earlier032 figures above describe their historical batch.
