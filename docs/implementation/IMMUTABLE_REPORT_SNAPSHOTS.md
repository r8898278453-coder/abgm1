# Immutable daily report captures — 17 November 2026 IST

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
