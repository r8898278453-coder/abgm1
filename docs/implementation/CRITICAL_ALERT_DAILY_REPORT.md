# Daily critical alert accountability

21 November 2026 IST · P09-01

The private daily dashboard and CSV break down critical alert reservations by six signals, three escalation levels and four linked occurrence outcomes. The four outcomes are API accepted, running, unconfirmed and missing occurrence. Counts use the day the reservation was recorded in Asia/Kolkata and the currently saved state of its linked notification. Multiple reservations can share one notification. The dashboard groups these metrics in an expandable section.

Eighteen current metrics show the last observed affected record count, whether that observation has an open episode, and retained alert reservations for each signal. These counts use saved observations and reservations. The report performs no fresh provider or source scan. Current evidence can differ from the live source until another observation runs.

The read-only sample uses the selected client and joins reservations to their matching critical notification occurrence. Provider identifiers, message content and credentials stay outside the report. A reservation without a matching occurrence remains separately visible. Provider API acceptance records acknowledgment.

Manual and scheduled captures write V19 and retain the state observed when the capture was taken. V1–V18 keep their original payloads and hashes. Comparisons require equal coverage. The public report keeps its approved metric list. Database schema remains 064.

[99-item checklist](CRITICAL_ALERT_DAILY_REPORT_BATCH.csv) · [Verification](evidence/critical-alert-daily-report.json) · [Main tracker](STATUS.md)
