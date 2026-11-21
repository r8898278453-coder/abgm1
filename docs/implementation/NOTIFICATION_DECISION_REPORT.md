# Scheduled notification decisions before a claim

21 November 2026 IST · P09-01

The private daily work report and CSV show whether each of five scheduler decisions occurred on the selected IST day for daily digests, review reminders and critical alerts. Recorded decisions cover unavailable dispatch context, controls changing before a claim, the retained occurrence limit, another running occurrence, and a declined admission reservation.

One audit row per client, notification kind, reason and observation day keeps retries from inflating the counts. The context indicator includes conditions such as disabled policy, changed credentials and invalid scheduling context when the existing resolver declines admission. Each indicator describes an observed decision. A later eligible tick can still claim the slot. V16 adds [earlier notification preparation indicators](NOTIFICATION_PREPARATION_REPORT.md) for selected clients.

The scheduler writes the decision in its existing transaction. A declined reservation rolls back its pending work before recording the decision. Audit rows omit notification text, tokens and provider identifiers. The existing occurrence report continues to show claimed slots and saved settlements.

Manual and scheduled snapshots write V15. V1–V14 retain their original counts and hashes. Comparisons require equal coverage. The public client report continues to use its approved metric list. Database schema remains 064.

[25-item checklist](NOTIFICATION_DECISION_REPORT_BATCH.csv) · [Verification](evidence/notification-decision-report.json) · [Main tracker](STATUS.md)
