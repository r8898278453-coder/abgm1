# Notification selection and eligibility reporting

21 November 2026 IST · P09-01

The private daily dashboard and CSV report whether the scheduler selected the client for a daily digest, a review reminder or a critical alert on the selected IST day. Repeated selections for the same client and kind share one daily audit row. Both head and tail entries in a returned batch count as selected. Selection confirms placement in the batch. A later gate can still defer a claim or send.

Thirty-one current indicators show saved workspace and Telegram connection states, and policy, selection eligibility, first-due state and rotation head for each kind. The report uses the selector's saved workspace and connection predicates. Enabled policies can be selected before their first due time. First-due indicators compare the saved first due time with the database clock. Actual dispatch applies additional policy, authority, schedule and binding checks. The stored rotation head can become ineligible after a configuration change.

Selection evidence is best effort within the existing rotation transaction. If evidence fails, the savepoint discards that evidence and preserves the selection. These counts expose no provider identifiers, credentials, destination details or other client identities. The historical report only includes saved selection evidence. Current prerequisites can explain why a client is filtered today.

Manual and scheduled captures write V17. V1–V16 retain their original payloads and hashes. Comparisons require equal coverage. Public reports keep their approved metric list. The database schema remains at 064.

[45-item checklist](NOTIFICATION_SELECTION_REPORT_BATCH.csv) · [Verification](evidence/notification-selection-report.json) · [Main tracker](STATUS.md)
