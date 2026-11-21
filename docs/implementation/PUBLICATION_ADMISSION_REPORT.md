# Publishing admission outcomes

21 November 2026 IST · P09-01

For each client, the private dashboard and CSV reconcile all publishing reservations for the selected IST day. Each reservation falls into one of eight categories. Recorded publish success, failure, unconfirmed, active, stale or undated, and other claim states require the original claim token. Missing or different current claims are shown separately. A retry can replace the original token, even within the same IST day. The report leaves the original outcome unresolved when that happens.

These counts reflect claim state as of report generation. Later updates can change the live report for an earlier day. Frozen V9 preserves the counts at capture. Manual and scheduled captures use V9. V1–V8 retain their original coverage, payloads and hashes. The public portal continues to use its existing approved metric list. Database schema remains 064.

Telegram reports the count of matched publish successes. Full reconciliation is available in the dashboard and CSV. Publish success reflects recorded claim settlement. Per-platform partial outcomes, provider read-back verification and plans that never reached admission remain separate work for P09-01.

[22-item checklist](PUBLICATION_ADMISSION_REPORT_BATCH.csv) · [Verification](evidence/publication-admission-report.json) · [Main tracker](STATUS.md)
