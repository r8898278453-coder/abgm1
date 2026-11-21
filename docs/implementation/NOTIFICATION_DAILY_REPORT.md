# Daily notification accountability

21 November 2026 IST · P09-01

The private daily dashboard and CSV count daily digest, review reminder, and critical alert occurrences due on the selected IST day. Each kind shows API-accepted, unconfirmed, running within the five-minute claim window, and running beyond that window. The counts use retained occurrence rows. They can change after settlement or recovery. API acceptance reflects the recorded provider acknowledgment.

Three current counts cover running claims within the window, stale running claims, and retained unconfirmed occurrences across all dates. Counts can overlap the selected-day view. A stale or unconfirmed occurrence can require reconciliation. The report reads saved states and leaves execution and recovery to the existing scheduler. Slots without a saved occurrence, including schedules skipped before admission, are outside these counts.

The queries use the existing tenant-scoped reporting transaction. UTC due timestamps are compared to the half-open IST window independently of the SQL session timezone. Provider IDs, claim tokens and content stay outside the report. Manual and scheduled captures write V14. V1–V13 retain their original payloads and hashes. Equal-coverage comparisons and the public report's existing approved metric list are preserved. Database schema remains 064.

[25-item checklist](NOTIFICATION_DAILY_REPORT_BATCH.csv) · [Verification](evidence/notification-daily-report.json) · [Main tracker](STATUS.md)
