# Telegram evidence console — 15 November 2026 IST

Scheduled delivery continuation (17 November2026 IST): [SCHEDULED_NOTIFICATION_POLICIES.md](SCHEDULED_NOTIFICATION_POLICIES.md) adds exact default-off client/kind opt-in and bound journal safety. Forward048/85; next049. P09-03 in progress; no phase or live acceptance.

Operations continuation (17 November2026 IST): [OPERATIONS_COMPLETION_GROUP.md](OPERATIONS_COMPLETION_GROUP.md) adds frozen V2, agency model3, explicit Telegram identity proof and recovery consistency. Schema047/84 unchanged. Historical notes below retain their checkpoint scope; no parent/phase acceptance.

Subsequent continuation: [TELEGRAM_MANUAL_JOURNAL.md](TELEGRAM_MANUAL_JOURNAL.md) replaces the earlier unjournalled manual POST with required stable keys and persisted intent evidence. The original checkpoint below records the previous scope/limits.

The Telegram page now separates saved platform evidence, an explicit client test alert and local marketing discussion. It no longer presents a chat simulator as a synced inbox or an online autonomous Telegram agent.

| Delivered slice | Actual behavior |
| --- | --- |
| Scoped configuration API | New GET `/api/companies/:companyId/telegram-operations` authenticates and checks current read and execute permissions. It accepts no recipient override or query fields and uses no-store on success/errors. Missing storage/permission evidence fails closed. |
| Saved identity projection | Reads existing decrypted client integrations on the server; rejects foreign rows and duplicate Telegram bindings. Returns saved public bot ID and a12-hex destination fingerprint, never the token/chat ID/raw credentials. No global bot or destination is inherited. |
| Honest configuration state | NOT_CONFIGURED, SAVED, ERROR and INVALID remain distinct. Stored transport enabled is not a successful getMe/send, current identity verification or destination reachability. identityVerified and recipientDeliveryVerified remain false. |
| Advisory execution eligibility | Current execute permission, active-client policy, saved transport prerequisites and current emergency stop determine whether the UI enables a manual test. The POST rechecks current execute access and canonical sendTenantTelegram retains its final stop/configuration guards. Read permission is insufficient to send. |
| Explicit manual acceptance | Existing `/api/telegram/notify` now returns exact companyId, API_ACCEPTED or UNCONFIRMED, recipientDelivery UNVERIFIED and persisted false. A bare success response is insufficient for the new UI to claim API acceptance. |
| Ambiguous manual results | Failed, mismatched or incomplete ACKs do not become recipient failure/delivery. The current view blocks further test sends, including after configuration reload; it cannot automatically resend. This is a local UI fence, not a durable manual-send journal. Remount/reload does not establish that uncertainty was resolved. |
| Canonical scheduled history | Embedded NotificationStatus reads saved daily-digest/review-reminder occurrences with bounded keyset pagination. Kind, timestamp, status, review flag, exact client scope and duplicate rows are validated. Invalid saved casing/status fails instead of being shown as running. SENT means provider API acceptance only. |
| Canonical daily work | “What happened today?” opens the existing recorded-work panel, without invoking an AI explanation. Selected-day IST activity and current all-date backlog stay separate. Existing CSV/count validation is reused. |
| Canonical action records | Shared ActionHistory links the console to actual saved automation/queue events. No local assistant message becomes a successful execution record. |
| Discussion boundary | Marketing questions remain client-scoped AI discussion. Replies carry suggestion labels, not Telegram receipt checks or publishing confirmations. Review buttons navigate to dashboard/CRM/content modules; no publish/job/send command is inferred from discussion. |
| Privacy and request fencing | Client-keyed remounts, aborts, live-instance/sequence checks and session-token guards discard delayed client/actor responses. Message text and suggestions are not persisted in browser storage. Viewer/archive/foreign access and late responses have native/browser fixtures. |
| Existing report privacy | Notification and daily-report routes set no-store before auth/error handling. Notification responses carry canonical companyId; unrelated cursor/query keys are refused. |

Schema044/80 is unchanged; no migration sources changed and next unused migration remains045. Existing providers, shared notification occurrence ownership and tenant transport remain canonical. No provider read/send was performed during implementation; tests inject senders or mock HTTP. Rendering and automatic sending remain default off; billing remains excluded.

P09-04 is now in_progress, not accepted. Remaining scope includes a durable manual notification journal/unknown recovery, actual bot identity verification with persisted proof, verified inbound Telegram identity/client selection/command authorization, action-confirmation links and full acceptance gates. P09-03 scheduled destination/retry/escalation acceptance and immutable complete daily reporting are not closed by embedding their existing readers. Manual test messages are explicitly absent from scheduled history; the console says so.

Checks, source fingerprints and limits: `evidence/telegram-operations-console.json`. No production migration, deployment, environment publication or credentials change occurred.
