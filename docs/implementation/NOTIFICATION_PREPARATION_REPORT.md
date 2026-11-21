# Scheduled notification preparation reporting

21 November 2026 IST · P09-01

The daily dashboard and private CSV record preparation errors and rejected messages for daily digests, review reminders and critical alerts. They also show when a review scan found no eligible work, when a critical alert check lacked dispatch context or candidates, and when a digest used a compact summary.

Each metric records presence for the client, kind, reason and observation day in Asia/Kolkata. Repeated ticks use the same audit row. Evidence is best effort while the scheduler has budget and database access. It omits message text, credentials and provider identifiers. Companies filtered before selection and situations where no audit write starts remain outside this view.

When a complete daily digest exceeds 4,096 characters, the scheduler uses the IST date, inbound lead count, review count and dashboard link in a compact message. The existing claim and delivery rules still apply. The full work report remains in the dashboard.

Manual and scheduled captures write V16. V1–V15 retain their original payloads, counts and hashes. Comparisons require equal coverage. The client portal continues to use its approved metric list. Database schema remains 064.

[22-item checklist](NOTIFICATION_PREPARATION_REPORT_BATCH.csv) · [Verification](evidence/notification-preparation-report.json) · [Main tracker](STATUS.md)
