# Immutable daily report captures — 17 November 2026 IST

21 November 2026 IST. P09-01 advances through 22 notification preparation items. The daily report adds ten indicators before the claim stage, including empty work, preparation errors and rejected messages. Oversized daily digests use a compact summary. Manual and scheduled captures write V16. Tracker totals remain 62 validated, 16 in progress, 14 planned and one blocked. [Notification preparation reporting](NOTIFICATION_PREPARATION_REPORT.md)

21 November 2026 IST. P09-01 advances through 25 notification pre-claim reporting items. The private daily report adds fifteen indicators for recorded scheduler deferral reasons, with at most one entry per client, kind, reason and IST day. Manual and scheduled captures write V15. Tracker totals remain 62 validated, 16 in progress, 14 planned and one blocked. [Notification pre-claim reporting](NOTIFICATION_DECISION_REPORT.md)

21 November 2026 IST. P09-01 advances through 25 notification accountability items. The private daily report adds twelve due-day outcome counts and three current unresolved counts. Manual and scheduled captures write V14. Tracker totals remain 62 validated, 16 in progress, 14 planned and one blocked. [Daily notification accountability](NOTIFICATION_DAILY_REPORT.md)

21 November 2026 IST. P09-01 advances through 26 calendar accountability items. The private daily report includes nine calendar revision metrics and eight selected-day slot counts, including linked publishing admission and recorded claim publication. Manual and scheduled captures write V13. Tracker totals remain 62 validated, 16 in progress, 14 planned and one blocked. [Calendar plan daily reporting](CALENDAR_PLAN_DAILY_REPORT.md)

21 November 2026 IST. P09-01 advances through 23 schedule history items. The private daily report adds six timestamp-form admission metrics and five committed schedule revision metrics. Manual and scheduled captures write V12. Tracker totals remain 62 validated, 16 in progress, 14 planned and one blocked. [Schedule history reporting](SCHEDULE_HISTORY_REPORT.md)

21 November 2026 IST. P09-01 advances through 25 publishing reconciliation items. Private daily reports add seven provider and operator review counters and six saved-date planning and admission counters. Manual and scheduled captures write V11. Tracker totals remain 62 validated, 16 in progress, 14 planned and one blocked. [Publishing reconciliation](PUBLISHING_RECONCILIATION_REPORT.md)

21 November 2026 IST. P09-01 advances through 27 platform outcome items. The publishing worker records claim-bound outcome events atomically with settlement. Private daily reports, CSV and new V10 snapshots include fifteen platform outcome counts and two partial-claim counts. Tracker totals remain 62 validated, 16 in progress, 14 planned and one blocked. [Platform outcome reporting](PLATFORM_OUTCOME_REPORT.md)

21 November 2026 IST. P09-01 advances through 22 publishing admission reporting items. Private daily reports reconcile each IST admission with its matching current publishing claim. New manual and scheduled snapshots write V9. Tracker totals remain 62 validated, 16 in progress, 14 planned and one blocked. [Publishing admission reporting](PUBLICATION_ADMISSION_REPORT.md)

21 November 2026 IST. P09-01 advances through 22 queue accountability items. Private daily reports distinguish admitted, claimed, cancelled, retryable, terminal and exhausted work, and current retry timing and lease exceptions. New manual and scheduled captures write V8. Tracker totals remain 62 validated, 16 in progress, 14 planned and one blocked. [Daily queue accountability](QUEUE_DAILY_ACCOUNTABILITY.md)

21 November 2026 IST. P09-01 advances through 28 workflow accountability items. The private daily dashboard and CSV include thirteen workflow activity metrics and seven current inventory metrics. Telegram summarizes five operational counts. Manual and scheduled frozen captures write V7 and retain V1–V6 history. Remaining cross-module reconciliation stays open. Tracker totals remain 62 validated, 16 in progress, 14 planned and one blocked. [Daily workflow reporting](WORKFLOW_DAILY_REPORT.md)

21 November 2026 IST. New private captures write V6 with fixed email delivery, linked reply and recovery coverage. Existing V1–V5 captures retain their payloads and hashes. Comparisons require equal coverage, and client publication from V6 uses the existing approved metric list. Upgrade readers and workers together before writing V6 captures. [Daily email accountability](EMAIL_DAILY_ACCOUNTABILITY.md)

21 November 2026 IST. New private captures use fixed V5 coverage for appointment ledger activity and outstanding outcomes. V1–V4 retain their original coverage, comparison rules, stored bytes, hashes and replay. Amendments can be captured for older versions as V5, and deltas require equal coverage. The client portal accepts V5 source metadata and continues to project its existing approved metric list. Older binaries cannot read new V5 captures. Upgrade readers, workers and writers together before enabling capture on the target environment. [Appointment report evidence](evidence/appointment-daily-report.json)

Operations continuation (17 November2026 IST): [OPERATIONS_COMPLETION_GROUP.md](OPERATIONS_COMPLETION_GROUP.md) adds frozen V2, agency model3, explicit Telegram identity proof and recovery consistency. Schema047/84 unchanged. Historical notes below retain their checkpoint scope; no parent/phase acceptance.

Capture reporting continuation (17 November2026 IST): [REPORT_CAPTURE_REPORTING.md](REPORT_CAPTURE_REPORTING.md) adds twelve live report/UI/CSV/digest metrics. Frozen V1 and schema047/84 unchanged; next048. No delivery or phase acceptance.

Scheduled capture continuation (17 November2026 IST): [REPORT_CAPTURE_SCHEDULE.md](REPORT_CAPTURE_SCHEDULE.md). Forward047/84; next048. Default off; no scheduled distribution or phase acceptance.

Closed IST days can now be captured as application-immutable report revisions. A later capture appends a new revision with an explicit reason; it never regenerates or overwrites an older stored copy. Capturing a report does not send it anywhere.

| Delivered control | Actual behavior |
| --- | --- |
| Frozen coverage V1 | A separate immutable metric/label definition validates historical payloads independently of the live report metric registry. New live metrics cannot silently change the coverage or readability of stored V1 evidence. Future coverage changes require another version. |
| Private canonical payload | Only known safe nonnegative integer activity/backlog counts, selected date, IST zone and normalized source-generated time enter storage. Unknown fields, message bodies, source excerpts, provider payloads and credentials are excluded. |
| Honest capture meaning | Activity belongs to the selected closed IST day; backlog is as observed during the source read, NOT reconstructed at the historical midnight cutoff. Source-generated time and storage capture time are separately recorded/exported. This is recorded-work coverage, not complete platform/financial/provider truth. |
| Consistent source read | Reuses the canonical daily report's read-only repeatable-read snapshot and SQL deadline. The source is read before the storage transaction. A successful storage commit freezes that exact source result; it does not claim source data was re-read atomically at storage commit time. |
| Closed-day admission | DB-clock validation refuses today's still-open day and future days. The live report remains available for current-day inspection. Dates use the existing real-calendar/Asia-Kolkata contract. |
| Authority | Read permissions allow history/detail inspection; current manage permission is required for capture. Manage authority and active-client status are rechecked inside the storage transaction after the source read. Archived clients remain readable but cannot receive captures. |
| Stable retry identity | Capture binds actor, company, date, expected revision, reason and request key. Same-key retries return the original revision without re-reading current sources, including after a lost commit ACK. Changed context conflicts. |
| Serial lineage | A company row lock plus expected-latest-revision CAS and unique date/revision/request indexes prevent duplicate or silently reordered captures. Same-key concurrency converges; distinct keys with the same expected revision have one winner. |
| Amendment reasons | Revision1 uses BASELINE. Later revisions require LATE_RECORDS, CORRECTION or REVIEW. A review with unchanged counts is permitted; the comparison explicitly says no count changes. |
| Atomic audit | Snapshot insert and minimal REPORT_SNAPSHOT_CAPTURED audit commit together. Audit failure rolls the insert back. No external effects occur; unconfirmed commit responses retain exact retry identity for reconciliation. |
| Integrity reads | Canonical payload/hash, coverage version, date/source-time context, fixed counts and revision metadata are validated before detail/export. Corruption or incomplete coverage refuses a successful report rather than returning guessed zero values. Hash validation is application data integrity, not provider delivery evidence. |
| Bounded resources | At most20 revisions per date and1,000 captures per client. There is no update/delete API or automatic pruning of old captures. History for a date is bounded to20 metadata rows; full payloads are loaded by exact scoped ID. Retention beyond the cap remains an explicit future policy. |
| Comparison/export | Frozen CSV contains snapshot/coverage/revision/date/capture metadata and fixed metric rows. Backlog rows are labelled backlog_at_capture. Selected revision comparisons show signed deltas for changed activity and captured-backlog metrics, without implying business impact. |
| UI recovery | Stored capture intent contains only date/reason/revision/key, scoped by actor/client/date. A page reload can reconcile the original attempt even after the latest revision advanced. Pending retries cannot accidentally become a new amendment. Client/date/session fences discard stale results; malformed reads clear export. |

Endpoints: GET/POST `/api/companies/:companyId/daily-work-snapshots`, GET `/api/companies/:companyId/daily-work-snapshots/:id`. Capture input is exactly date, expectedRevision, reason and requestKey; clients cannot submit their own counts. All responses/errors are no-store. No notification/provider/scheduling endpoint is invoked by capture, compare or export.

Forward046 adds daily_report_snapshots and unique lineage/request indexes. Historical001–045 are unchanged. Current schema046/82 tables, next unused047. Fresh/upgrade/replay and exact uploaded-export/bundled compatibility are checked locally; no production migration is implied.

P09-01 remains in_progress. This closes the stored-revision foundation, not full multi-module plan-versus-outcome reconciliation, automatic scheduled capture/distribution, complete historical backlog reconstruction, signed financial/provider evidence, retention policy or phase acceptance. Current daily report and scheduled digest behavior remain their own canonical readers/owners. Billing remains excluded; rendering and automatic sending remain default off.

Validation/source fingerprints: `evidence/immutable-report-snapshots.json`. No production access, deployment, environment publication, provider send or credentials change occurred.
