# Capture operations in the canonical daily report

17 November2026 IST. P09-01 remains in progress. Schema047/84 unchanged; next048. No production deployment, provider sends or migration was introduced.

## Delivered behavior

The canonical live daily report, labels/UI, CSV and existing digest formatter now include twelve capture-operation metrics. One SQL helper is called inside the existing read-only deadline/transaction; no parallel report store or notification transport is introduced.

Eight selected-day activity metrics use committed agency audit records: frozen revisions stored; amendments (LATE_RECORDS/CORRECTION/REVIEW, a subset of revisions); scheduled admissions; scheduled baselines stored; worker skips (including preserved existing baseline); policy cancellations (sum of affected pending run counts); recovery failures; and schedule changes. A policy change with zero cancellations counts as one change and zero cancelled runs. Skips and cancellations have separate definitions. These count transitions, not unique business outcomes or report delivery.

Four current all-date backlog metrics count capture runs awaiting settlement, their running-job subset, retained failed runs and pending runs with missing/wrong-type/failed/cancelled/succeeded queue records. Queue identity is joined by exact company, job ID and capture type. Running/reconciliation subsets overlap the pending total. Failed runs are retained historical terminal states, not a claim that they occurred on the selected day. Other skip reasons are available in history; they are not silently treated as failures.

Activity belongs to the recorded IST timestamp of a committed audit row, regardless of the frozen report's business date. The timestamp is recorded during the transaction; it is not a separate commit-clock measurement. SQL compares epoch boundaries using FROM_UNIXTIME under the read-only transaction. A transaction that commits later can add evidence to an earlier live report date according to that recorded timestamp; stored frozen revisions never change. This is why explicit late-record amendments remain separate. Source/run removal cannot erase retained audit activity. This is operational evidence, not reconstructed activity that predates the audit journal.

## Coverage, privacy and ownership

`shared/reportCaptureReporting.ts` defines keys/labels; `server/reportCaptureReporting.ts` owns the scoped SQL projection. Existing dailyWorkReport, dailyWorkReportLabels, dailyWorkDigest and DailyWorkReport UI remain canonical. Numeric validation rejects missing, negative, unsafe or noninteger counts before export/digest. Invalid run states and malformed policy cancellation counts make the report unavailable rather than fabricating zero.

No bot token, actor identity, destination, report payload or raw error enters these metrics. Counts overlap generic job activity and one another, so they must not be summed into an overall work total. No sends are triggered by reads or digest formatting.

Frozen coverage V1 is unchanged. Stored bytes/hash, labels, comparisons and exports retain the original metric list and omit these newer capture-operation metrics. The frozen-report UI/digest explicitly states that boundary. Extending frozen coverage requires a separately versioned format; existing snapshots must not be rewritten.

## Validation and pending scope

See evidence/report-capture-reporting.json. Native fixtures exercise actual audit records, all amendment reasons, policy cancellation totals, IST end-exclusive boundaries, other-client/case exclusion, alternate SQL timezones, all-date backlog/queue binding, malformed policy/run refusal and retained history. Default tests enforce every key's numeric coverage, UI labels, CSV/digest content and frozen V1 exclusion. Browser checks cover live daily reports, incomplete-response refusal, client switching, Telegram operations and frozen reports.

This does not reconcile every marketing/sales workflow into planned/done/partial/failed totals. Wider report coverage, frozen V2, scheduled distribution/destinations, critical alerts/escalation, retention management and Hostinger cron/runtime verification remain pending. No parent or phase was promoted.
