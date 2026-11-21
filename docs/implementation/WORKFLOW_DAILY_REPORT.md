# Daily Sales workflow accountability

21 November 2026 IST · P09-01

The private daily dashboard and CSV now include the same 13 audit activity counts and seven current inventory counts as the Sales report. Both use the shared tenant-scoped projection. Activity uses the selected Asia/Kolkata day. Inventory uses the current database clock and spans all dates. One enrollment can contribute to more than one activity count.

The Telegram digest summarizes API acceptances, exits, enrollments waiting for review, enrollments waiting for send settlement, and expired open enrollments. The dashboard and CSV show all 20 counts. API acceptance and recipient delivery remain separate evidence.

Manual and scheduled captures write V7. Stored inventory reflects the time of capture. V1–V6 keep their original payloads, hashes, and replay behavior. Only equal coverage versions can be compared. Upgrade readers and workers together before storing V7 captures. The client portal retains its existing approved metric list. SQL schema remains at 064.

P09-01 remains in progress for plan-to-outcome reconciliation across the remaining modules.

[28-item checklist](WORKFLOW_DAILY_REPORT_BATCH.csv) · [Verification](evidence/workflow-daily-report.json) · [Main tracker](STATUS.md)
