# Capture run history and operator review

17 November 2026 IST. This extends the scheduled report capture foundation in P09-01. It does not complete reporting, scheduled delivery or phase acceptance. Schema remains 047/84 tables, next 048; no migration was added.

## Behavior

The schedule panel has an explicitly opened, read-only history browser. Operators can review older capture runs, filter ALL/QUEUED/SUCCEEDED/SKIPPED/FAILED, refresh current evidence, export the displayed page and navigate to its exact stored baseline. Capture state and shared queue state remain separate; neither implies customer delivery.

`GET /api/companies/:companyId/report-capture-history` requires current company read access and returns no-store metadata. Optional `state` defaults to ALL; optional `before` is a bounded opaque cursor. Unknown fields, repeated values, invalid enum values and malformed cursors are rejected. The service fixes the page size at25, retrieves26 to determine continuation, and uses existing company/time/id history index ordering. No offsets or client-provided SQL identifiers are accepted.

The cursor binds company, outcome filter, immutable creation time and run identity. Its anchor must exist at that exact client/time/id. It is a traversal position, not an authorization token or signed proof; authorization is checked for every request. Changing the anchor run's mutable state does not invalidate traversal. Newer records do not shift an older page. Since outcomes are current, changes between pages can change filtered membership: refresh from the first page for a new review, rather than treating pagination as a frozen audit export.

## UI and privacy

`ReportCaptureHistoryPanel.tsx` owns this browser; `server/reportCaptureHistory.ts` owns read-only SQL and cursors; `shared/reportCaptureHistory.ts` owns validation and page CSV. Existing report capture/snapshot, queue and authorization services retain ownership. The UI clears previous results when starting a request and validates the returned company/filter, row bounds, order and duplicate IDs. Abort, request generation, token and keyed-client checks reject stale responses. A new client begins with a closed history browser. CSV and exact-snapshot actions reject a changed session.

CSV includes only the displayed page's client/filter, run ID, IST report date, capture/queue states, reason code, snapshot ID and recorded IST time. Formula prefixes and quotes are escaped. No report payload, actor identity, destination, request body, credentials or raw errors are exported. Exported evidence is current metadata, not proof of delivery or a complete all-history archive.

## Validation and limits

Evidence: `evidence/report-capture-history.json`. Native MariaDB tests traverse61 same-timestamp rows over three pages without gaps/duplicates; reject other-client/filter/forged-anchor cursors; continue after anchor-state changes; and retain existing transactional queue/capture tests. HTTP fixtures exercise auth/read scope, no-store headers, strict queries and pre-SQL malformed cursor rejection. Mocked Chromium exercises pagination, filter replacement, page CSV, default-off schedule/reload and client isolation.

Retained-run capacity remains1000 per client and no destructive retention control was added. Scheduled report distribution, escalation, live Hostinger cron/runtime verification, wider report coverage and parent/phase acceptance remain pending. No provider sends, production database changes, deployment or publishing occurred.
