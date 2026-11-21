# Notification eligibility history

21 November 2026 IST · P09-01

The private daily dashboard and CSV show 33 observations for daily digests, review reminders and critical alerts. For each kind the report can show observed eligibility, archived or inactive workspace states, missing operations, absent or disconnected Telegram, missing or disabled policies, and first-due time pending, reached or missing. A workspace can have several blockers on the same day. A later observation can add another reason while keeping earlier evidence.

The scheduler checks a bounded rotating sample of clients, including some clients excluded by the send selector. Its independent cursor advances past the sampled clients. Each invocation inspects at most the batch limit, normally two clients and at most ten. Each client, kind, reason and IST day has one audit row. Coverage starts with the new observations and depends on the scheduler reaching each client. The report cannot reconstruct historical reasons for unsampled clients or days before this change.

Observation uses the saved prerequisites applied by the selector. First due time is compared with the database clock. Dispatch can still require current credentials, authority and other policy conditions. Observation failure rolls back the optional history and its cursor separately from the core selection. Evidence contains no message text, credentials, provider IDs or destination information.

Manual and scheduled V18 snapshots retain the indicators observed at capture. V1–V17 keep their original payloads and hashes. Comparisons require equal coverage. Public reports keep their approved metric list. Database schema remains 064.

[45-item checklist](NOTIFICATION_ELIGIBILITY_HISTORY_BATCH.csv) · [Verification](evidence/notification-eligibility-history.json) · [Main tracker](STATUS.md)
