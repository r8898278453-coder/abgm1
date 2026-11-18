# WhatsApp dispatch and workflow recovery group

19 November 2026 IST. Four original tasks locally validated against their unchanged acceptance: P06-02, P06-03, P06-05 and P07-03. Tracker: 49 validated, 17 in progress, 26 planned, 1 blocked of 93. Local implementation acceptance does not accept dependency phases, hosting, actual provider behavior or production deployment. Billing excluded; rendering and approved-message external transport defaults unchanged.

## Resulting behavior

A new supported WhatsApp attempt carries Meta's `biz_opaque_callback_data`. The private value binds the canonical request key, immutable input hash, current random attempt token and normalized recipient hash. Signed webhook status includes the echoed value and recipient; only the uniquely mapped current tenant/sender can correlate it. Signature validation and current sender mapping happen before durable intake. No new unauthenticated route, scheduling engine, database schema or second send path is introduced.

If HTTP acceptance is lost, the dispatch remains UNKNOWN and cannot be resent automatically. A matching signed receipt can record API_ACCEPTED under the company transaction lock. Recipient delivery remains separate: sent, delivered, read, failed, unobserved or conflicting evidence. Even a failed-delivery receipt establishes provider API acceptance, not recipient delivery. A receipt arriving before the HTTP callback returns UNKNOWN wins canonical settlement without another network send. Wrong recipient/token/hash/sender/company and ambiguous provider bindings never authorize reconciliation. Safe explicit retries rotate the attempt token, so an old attempt cannot settle a new one.

Receipt insertion, canonical acceptance, private inbox annotation and audit commit atomically. Repeated signed delivery is idempotent. Existing encrypted intake/reviewed replay preserves bounded recovery; successful snapshots clear their encrypted payload. No opaque callback, private claim token, recipient or body is added to canonical receipt rows, audit details or status/inbox responses. The private callback is retained only in the existing encrypted bounded intake until its outcome is committed or retention expires.

Historical API acceptance can reconcile the failed queue job's bookkeeping. Recovery cannot borrow another live worker's lease, overwrite a cancelled job, enqueue a successor or revive an exited workflow. The current real worker can observe canonical acceptance and settle its own lease without a send. Duplicate recovery does not append duplicate job success events. Known failed/conflicting delivery prevents advancement; a later failed receipt exits the linked workflow and cancels pending successors. Already admitted provider requests cannot be recalled.

Stored opt-out still blocks the next dispatch even when an old receipt arrives later. Imported contacts grant no consent. Supported direct and approved sends retain the same current-client, contact permission, inbound-conflict, reply-window/template, IST quiet-hour, daily-cap and final provider guards. Daily cap includes uncertain attempts; concurrent admission may conservatively defer capacity. Template selection is not a claim that Meta approved the named template.

The client inbox explicitly labels acceptance recovered from signed evidence and says no resend occurred. Its live activity report counts the existing canonical reconciliation event. Frozen report V4 and existing metrics are unchanged.

## Original acceptance evidence

| Original task | Unchanged acceptance covered | Local evidence |
| --- | --- | --- |
| P06-02 | Complete bounded mapped batch handling, signature, dedupe, out-of-order/crash behavior, failed persistence never processed | Existing webhook/event-time/encrypted-intake SQL plus signed correlation HTTP/SQL rollback/replay tests |
| P06-03 | Acceptance distinct from delivery, correct receipts, ambiguous timeout reconciliation, tenant identity | New shared contract + exact-attempt SQL, receipt-before-HTTP race, actual intercepted Meta payload and no-send replay |
| P06-05 | Durable STOP/permission, template/window/quiet/caps, no import consent | Pure and SQL policy tests; new actual DB quiet/cap/window checks; final transport/late opt-out tests |
| P07-03 | Existing queue/send owner, quiet/timezone/caps/retry, stale approval/version refusal | Workflow and approved-message SQL/browser; new live-lease recovery and delivery-failure cancellation tests |

## Verification and limits

150 credential-isolated default regression programs and five targeted intercepted browser fixtures (workspaceIsolation, salesWorkspace, salesWorkflows, approvedSalesMessages, salesInquiryRules). Complete disposable MariaDB suite, TypeScript/build and route/source/docs/capability/frontend guards are recorded in EXECUTION.md and evidence/channel-workflow-recovery.json. Browser registry remains 36; this group does not claim a fresh run of all 36.

Production callback echo/signature/delivery behavior still requires separately authorized provider acceptance. Legacy/unsupported sends without the current proof remain UNKNOWN; neither operator guesses nor arbitrary provider IDs can resolve them. Unmapped senders return retryable failure, rather than invent a tenant or retain unscoped private payloads. All bounded normalization limits remain. This group does not implement tenant email sender/read/reply/bounce, full cross-channel inbox/attachments/identity merge, external calendar booking, autonomous discovery/enrichment or complete all-module accountability. P06-04, P06-01, P06-06, P07-04/P07-05 and the remaining tracker are explicit next work. No real messages, model calls, production DB changes, rendering, billing or deployment were performed.
