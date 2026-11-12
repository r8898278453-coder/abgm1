# Exact approved WhatsApp replies — 12 November 2026 IST

This batch connects saved workflow review tasks to the existing durable message dispatcher. It adds one-use human approval for exact free-text replies. It does not make inquiry enrollment, content approval or customer conversations autonomous. `ENABLE_APPROVED_SALES_SEND` defaults off; no environment, production schema, scheduler or live provider was changed.

## Delivered controls

| Control | Implemented behavior |
| --- | --- |
| Exact approval | Current OWNER/ADMIN approve and execute permissions; saved pending REVIEW_MESSAGE task; exact task/enrollment revisions; explicit review evidence. A workflow definition approval or ordinary internal review never grants a send. |
| Sender and recipient binding | Actual canonical client WhatsApp sender, credential fingerprint, normalized lead phone and exact trimmed text are immutable in the grant. Sender rotation requires fresh review. Browser submits expected sender/recipient to catch changed review context. |
| Atomic admission | Company lock, one grant per task, actor-bound request hash, stable retry identity, task MESSAGE_APPROVED, enrollment WAITING_SEND, shared queue job and audit/outbox commit together. |
| Private worker permit | Random server-only claim token bound to current queue worker/attempt/fresh lease, approval, payload hash and current task/enrollment versions. API request bodies cannot supply a permit. |
| Final eligibility | Existing client activity, permission, pause, IST quiet hours, daily cap, free-text 24-hour reply window, global stop and shared action budgets apply. Workflow context and current actor/definition/knowledge are checked again before the provider boundary. |
| Existing provider owner | Existing sales_workflow_send queue handler calls messageDispatchIntents and canonical Meta adapter. No second provider integration, scheduler or unbounded retry loop. |
| One network owner | Concurrent approval retries reuse one grant/job. Concurrent executions use grant CAS and canonical durable intent claim. Same-worker duplicate execution cannot quarantine its active sibling. |
| Reply and STOP cancellation | Existing inbound/permission/opportunity/policy/definition transactions cancel PREPARED grants and tasks/jobs. In-flight grants become UNKNOWN. A request already handed to the provider cannot be recalled; late acceptance records truth and never advances an exited workflow. |
| Honest outcomes | API_ACCEPTED requires a canonical accepted intent and provider message ID, and is distinct from delivery. Existing receipt status UI is available explicitly. REJECTED stops; uncertain/crashed sends become UNKNOWN and never auto-resend. |
| Recovery | Bounded 25-row pass handles expiry, missing/failed jobs and stale claims. Only stored canonical acceptance can reconcile UNKNOWN. Reconciliation after workflow exit records acceptance without admitting a successor. |
| Expiry and deferral | Approval expires in 24 hours. Feature disabled, pause, quiet hours, cap and global stop defer without consuming failure budget. Changed context, sender, expired window and revoked actors stop before sending. |
| Operator UI/history | Scoped pending-task selection, sender/recipient/text preview, approval evidence, retained uncertain text, reload requirement, stable retries, bounded saved history, fixed IST timestamps and late-client response fencing. Secret credentials/claim tokens/fingerprints are never returned. |

## Ownership and migration

`server/approvedSalesMessages.ts` owns approval/execution/recovery; `server/salesSendAuthorization.ts` validates the private permit; `shared/approvedSalesMessages.ts` owns strict API contracts; `ApprovedSalesMessagesPanel.tsx` owns review/history. Existing workflow advancement and source cancellation remain canonical. Forward **039_approved_sales_messages** adds **sales_message_approvals**, bringing canonical inventory to **74**. Historical001–038 are unchanged; next040.

New scoped no-store APIs: `GET /api/companies/:companyId/sales/approved-messages` and `POST /api/companies/:companyId/sales/workflow-tasks/:taskId/approve-message`. The read API returns at most50 grants and25 pending tasks with truncation. The write API requires execute and approve rights; APPROVER alone cannot activate sending. Public generic queue APIs cannot admit these jobs.

Connections and transactions are released before network calls. Committed claim followed by acknowledgement loss is treated as uncertain. Replays consult the durable intent, never assume a missing response means failure. UNKNOWN blocks automated re-enrollment for the same contact until canonical acceptance is reconciled. There is no operator override that clears uncertainty or declares a message unsent.

## Validation and remaining work

See evidence/approved-sales-messages.json for completed checks and fingerprints. Disposable native SQL uses synthetic sender credentials and injected provider responses; Chromium uses mocked HTTP. These establish local behavior, not provider permission, real delivery or Hostinger worker readiness.

Remaining: provider-approved templates/media, email mailbox/read/bounce integration, calendar booking/reconciliation, automatic trigger enrollment and richer branching, verified fulfillment/review destinations, full report reconciliation, retention and live-host release gates. Current exact message content is manually reviewed, not automatically proven semantically correct. No whole parent or phase is accepted by this batch. Billing remains excluded; reel rendering remains default off.
