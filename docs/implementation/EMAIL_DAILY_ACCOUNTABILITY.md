# Daily Sales email accountability

21 November 2026 IST · P09-01

The private daily work dashboard and CSV now include 14 activity counters and two backlog counters for each client. The scheduled Telegram digest uses the same report and its existing delivery controls. All 16 counters fit within Telegram's 4,096-character text limit, including the largest supported counts.

| Evidence | How the daily report counts it |
| --- | --- |
| Signed delivery receipts | Distinct dispatches per event type for sent, delayed, delivered, failed, bounced, suppressed and complaint events. Uses the provider's recorded occurrence date. |
| Verified inbound CRM replies | Linked replies and their opt-out subset. Uses provider occurrence time. |
| Reply recovery | Queued uses admission time. Recorded, ignored, failed and expired use settlement time. |
| Current recovery backlog | Pending and running intakes with time remaining before expiry. Includes intakes admitted on earlier dates. |

Day boundaries use local midnight in `Asia/Kolkata`, inclusive at the start and exclusive at the next midnight. An email can appear in multiple delivery states. A queued intake can later become a recorded reply. The report retains these as separate counts.

New manual and scheduled captures use frozen coverage V6. V6 stores the recovery backlog as observed at capture time. Existing V1–V5 snapshots keep their metric coverage, hashes, downloads and idempotent replay. An amendment to an older capture can use V6. Change comparisons require the same coverage version. Release V6-capable readers and workers together before new V6 captures are written. Database schema stays at 064 with 108 canonical tables.

The new fields are aggregate counts. Email content, addresses, provider references, hashes and recovery payloads stay outside the report and its exports. The approved client portal can publish from a V6 source using its existing public metric allowlist.

P09-01 remains in progress for full cross-module reconciliation. Live Resend validation, attachment intake, terminal retry tooling, approved sequences and production release are tracked separately.

[26-item checklist](EMAIL_DAILY_ACCOUNTABILITY_BATCH.csv) · [Verification](evidence/email-daily-accountability.json) · [Main tracker](STATUS.md)
