# Explicit scheduled Telegram delivery

17 November2026 IST. P09-03 is now in progress; critical alert escalation/full acceptance remains open. Schema048/85 tables, next049. Historical migrations001–047 unchanged. No production migration, settings activation, provider send or deployment occurred.

## Delivered behavior

Daily digest and review-reminder delivery require explicit per-client, per-kind opt-in. Both default off, including already connected clients. The owner/manager previews the stored bot ID and destination fingerprint, then confirms that exact configuration. An opaque full binding fingerprint also prevents a token or destination change between preview and enable from being silently approved. CAS protects policy edits; changing credentials requires disable, reload and explicit enable again. An enabled policy never follows new credentials automatically.

Daily reports retain the existing08:00 Asia/Kolkata slot; review reminders retain hourly IST slots. Enabling starts at the next future slot, with no historical backfill. The existing scheduler can process the latest eligible cutoff within24 hours; it does not send every older missed report in a burst. A real configured cron/dispatcher is required and has not been verified on Hostinger.

The existing two-client sliding selector now chooses only ACTIVE clients with a connected Telegram integration and enabled policy of the requested kind. Disabled or unrelated clients do not consume the bounded report-generation batch. No second scheduler, queue or notification journal was introduced.

## Bound durable boundary

The canonical scheduled wrapper now uses boundNotificationOccurrences with the existing notification_occurrences journal. Admission locks the company, reads fresh policy/actor/configuration/due eligibility, and commits RUNNING plus exact policy/actor/binding/content hash and audit before any provider request. Neither raw message text nor credentials/destination are stored in the occurrence. Eight concurrent contenders have one network owner.

Before provider I/O the worker reserves the shared client message budget, rechecks current policy/authority/context, then invokes the existing tenant Telegram adapter with fresh integrations and a final authorization callback. Stop, archive, revoked role, stale policy, changed target and cooperative deadline can block sending. Configuration/authority can still change in the unavoidable interval after the final check and provider acceptance; no software can unsend an accepted request. Changing/disabling policy quarantines pending RUNNING evidence and prevents later reuse; an in-flight accepted outcome may therefore remain UNKNOWN rather than being falsely settled successful.

Only strict API_ACCEPTED evidence with a valid provider message ID settles SENT. SENT means API acceptance, not recipient delivery/read status. Provider timeout, malformed ACK, boundary/policy uncertainty and failed settlement leave the slot UNKNOWN or RUNNING needing review; they never authorize resend. A lost settlement acknowledgement reconciles the exact committed token before returning SENT. A lost claim acknowledgement cannot reach the provider. The same client/kind/cutoff is never reopened, even if message/configuration changes. Future independent slots remain eligible.

Known pre-provider budget/policy rejection after durable claim is also a terminal UNKNOWN slot with a specific reason. This conservative choice may miss that cutoff; it prevents an automatic later attempt with changed context/content. Operators can inspect the report manually; there is no resend/force-success button. Stale RUNNING claims become UNKNOWN through bounded recovery, including replay of the same cutoff.

Limits:1 fresh RUNNING occurrence per client/kind,1000 retained occurrences per client/kind, at most100 stale rows reconciled per admission pass. Capacity is visible and blocks new admission; destructive retention management is not implemented. READ_ONLY final checks use pure SELECT, not locking reads. Policy mutation and admission use company serialization and audited transactions.

## Settings and history

NotificationPolicyPanel is opened explicitly from the existing notification history. GET performs no send. Viewers can read; managers can save. Lost or refused acknowledgements retain the draft and lock further changes until reload. Client/session/request fences discard stale reads/writes. Missing configuration cannot be approved. The UI explains next-slot activation and unverified cron readiness instead of claiming automation is running.

Existing history gains optional policy revision, provider ID and reason code. Legacy rows remain readable with null metadata. UNKNOWN and stale RUNNING need investigation; no UI action implies resend. Metadata is private/no-store and excludes actor IDs, binding/content hashes and secrets.

GET/PUT `/api/companies/:companyId/notification-policies` are registered once. PUT accepts exactly `{kind,expectedVersion,enabled,expectedBindingHash}`. The binding hash is internal concurrency metadata; users approve visible bot/destination details. Unknown fields, malformed scopes, unauthorized roles, stale revisions and changed previews fail closed. The original low-level occurrence function remains compatibility/test code; production scheduled delivery uses the bound wrapper.

Owners: notificationPolicies/shared contract/routes; boundNotificationOccurrences; existing scheduledNotifications adapter, notificationBatch selector and notificationStatus/history. Migration048 adds one policy table and six nullable journal metadata columns. Existing manual Telegram intents, identity verification and frozen report storage keep their owners.

## Validation and rollout boundary

See evidence/scheduled-notification-policies.json for actual checks. Native fixtures cover fresh/upgrade/repeat schema, CAS, default off/future start, exact preview/role/config checks, policy audit rollback,8-way single-send claims, durable boundary visibility, hash-only privacy, unknown/no-resend, strict ACK, budget and actor/config/disable races, lost claim/settlement ACKs and settlement audit faults. Selector tests retain rotation/concurrency and exclude disabled/archived/wrong-kind clients. Browser checks cover explicit approval, uncertain save/reload, viewer and stale-client behavior.

This code is not live. During eventual rollout keep cron/automatic dispatch stopped until migration and the new binary are verified. Older binaries can insert unbound legacy rows and must not run cron after rollback: SQL backward readability does not provide the new execution guarantees. Policy activation and any real-provider pilot need separate controlled evidence. Hostinger runtime/cron remains unverified; provider/API acceptance is not simulated as production proof.

Still pending: critical incident dedupe/escalation, richer scheduled-report content coverage/frozen-report selection, controlled retry of definitely unattempted paused work, retention management, real configured-provider acceptance, complete P09/phase/canary/release gates. Billing and rendering activation remain excluded.
