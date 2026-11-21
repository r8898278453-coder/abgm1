# Daily publishing reconciliation

21 November 2026 IST · P09-01

The private IST daily dashboard and CSV show four provider read-back outcomes and three operator review decisions. These count saved attempts and decisions on their recorded IST day, including repeated checks on the same post. A matched provider object records the result of the saved check. Operator observations remain separate. Neither count changes the publishing claim or authorizes a retry.

Six planning counts show posts currently saved with an exact date-only value for the selected day. The admission categories distinguish same-day reservations, reservations retained only for other days, and posts without a retained reservation. Scheduled posts and posts awaiting approval are also shown within the last category. Edits and rescheduling can change these live counts. V12 adds [separate timestamp-form and revision counts](SCHEDULE_HISTORY_REPORT.md).

All output fields are numeric aggregates. Review notes, provider object IDs, evidence references and credentials stay outside the report. Queries use the existing tenant scope and read-only report snapshot.

Manual and scheduled captures write V11. V1–V10 retain their original payloads, coverage and hashes. Comparisons require equal coverage. Update readers and workers together before writing V11. The public portal retains its existing approved metric allowlist. Database schema remains 064.

[25-item checklist](PUBLISHING_RECONCILIATION_REPORT_BATCH.csv) · [Verification](evidence/publishing-reconciliation-report.json) · [Main tracker](STATUS.md)
