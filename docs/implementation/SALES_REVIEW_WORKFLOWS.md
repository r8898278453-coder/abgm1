# Sales review workflow engine — 12 November 2026 IST

This continuation implements twelve connected review-workflow deliverables under P07-02/03/04/06 and strengthens P07-07/P09-01. It runs internal human-review work through the existing queue. It does not activate automated messaging, calendar booking or provider review requests. Full parent and phase acceptance remain open.

## Delivered scope

| Deliverable | Actual behavior |
| --- | --- |
| Bounded definitions | Inquiry, operator-declared aftercare and feedback-review presets; one to five linear review/handoff steps, bounded text and delays, at most thirty days cumulative delay. No raw send or arbitrary action kind. |
| Draft persistence | Stable actor/client creation key generates one saved definition; repeated/unknown acknowledgement retries return the existing record. Edits use expected revision and invalidate approval. Twenty-five definitions per client. |
| Explicit approval | Current client approve permission, exact saved revision/content hash, recorded reviewer/note. Staff can draft/enroll; staff cannot approve. Retirement exits related active work. |
| Enrollment snapshots | Explicit writable client/lead, current reviewer approval, ALLOWED WhatsApp permission, eligible lead stage and operator evidence. Snapshot binds definition, policy, contact/permission revision, canonical lead stage, inbound-event count, approved-fact fingerprint/references and enrolling actor. |
| Replay and admission limits | Actor-bound request-key replay; changed intent conflicts; one active enrollment per client/lead/definition; at most25 active client enrollments. Terminal replay returns its prior result. The UI provides an explicit new-intent action for intentional re-enrollment. |
| Existing queue execution | Internal sales_workflow_review job only; shared queue claims, attempt/worker/freshness fencing and action ledger/outbox. A successful job means REVIEW_TASK_CREATED, not delivery. No second scheduler or provider-send path. |
| Review advancement | Task revision, enrollment revision/step and snapshot must match. Approve-role completion records a note and atomically admits one successor or completes the enrollment. Concurrent completion creates one successor. Completion never sends a message. |
| Human handoff | Saved internal consultant-review instructions and approved-fact references. Human review can exit the sequence. This records a handoff task, not a delivered consultant notification or appointment. |
| Source-event exits | Verified inbound reply/STOP, contact permission change, opportunity edit, sales policy change and definition edit/retirement cancel pending tasks and queued/running work in the same source transaction. New inbound counts also fence stale work. |
| Context revalidation | Jobs/review completion recheck current enrolling actor and original approver roles, current definition/policy/permission, lead contact/stage, fact eligibility and expiry. Role/fact drift is checked at these boundaries; it is not advertised as an instantaneous background rewrite of every pending task. |
| Recovery and delayed work | Safe database failure retries after full rollback; crash/reclaim fencing uses the existing lease budget. Bounded dispatcher recovery exits expired enrollments and failed/cancelled/missing active jobs. Enrollments expire after31 days. Pause/global stop defer without consuming failure budget where applicable. |
| CRM and accountability | Draft/approval/enrollment/edit/retirement/exit/review/history UI with a read-only saved approval definition and operator-declared enrollment evidence, retained uncertain drafts, stable retry identities and client isolation. Fixed-IST display and existing dated sales audit report include actual workflow operations. |

## State, ownership and atomicity

Forward038_sales_workflows adds sales_workflow_definitions, sales_workflow_enrollments and sales_workflow_tasks:73 canonical tables; next039. Historical001–037 are unchanged. Workflow rows own business state; job_queue owns execution leases/retries; existing agency audit and queue event/outbox tables own activity history. Private context is not copied into public queue metadata or uploads.

All workflow mutations lock the canonical company before changing definition/enrollment/task/job state. The workflow executor retains that lock through validation, task insertion, enrollment transition and queue settlement. Reply/permission/outcome changes use the same order, so a race either creates a review that is then cancelled, or prevents its creation. There is no provider side effect in this transaction. Worker connections are released before post-error reconciliation/retry settlement to avoid pool starvation.

A committed task and its job success/outbox are atomic. A lost commit acknowledgement reconciles the SQL job before reporting failure or creating another task. A rolled-back task creation may retry through the shared bounded queue; confirmed validation failures do not retry blindly. A stale successful-worker replay returns the canonical existing result. Unsupported or forged public generic queue requests cannot admit workflow steps.

Definition edits invalidate their existing approval and exit enrollments. Changes to policy/permission/opportunity also exit current enrollments rather than silently applying a changed contract. Re-enrollment requires an explicit new request identity and current eligibility; it does not reuse an old message-send permission. The current source-event mutation and workflow cancellation/audit commit together.

Enrollment is an explicit operator action; the webhook does not automatically enroll a new lead. Inquiry enrollment excludes won/lost leads. Aftercare/feedback review requires a won lead, explicit recorded contact permission and operator-declared evidence. Preset delays start at enrollment or completion of the prior review, not an externally verified fulfillment timestamp. Actual fulfillment verification, provider review destinations, calendar events and real aftercare sends remain pending.

## Operational limits

Existing dispatcher/cron must be configured and schema038 must be deployed before queued work can run on the host. No production migration, environment change or scheduler activation was performed. Global stop/archive policies remain in force; sales pause is rechecked. Review tasks are internal and do not consume external message quota or send during quiet hours; any later manual message still passes the existing consent/quiet-hour/window/cap boundary. Archive behavior uses existing dispatcher policy; no auto-send capability is gained on reactivation.

Read APIs return bounded recent history with active enrollments/pending reviews first and explicit truncation. Expired waiting tasks are cancelled on the bounded recovery pass or at review validation. Completed records are retained; comprehensive retention/deletion/export review remains P10-01. No unsupported client timezone is introduced; timestamps display Asia/Kolkata.

## Evidence and remaining acceptance

Evidence: evidence/sales-review-workflows.json. Native SQL covers eight-way draft replay, exact approval/enrollment/review races, one successor, no message intents, reply/review race, STOP, source/role/knowledge invalidation, policy/permission/retirement exits, actual seven-day scheduled delay, safe rollback/retry, commit reconciliation and expiry/orphan recovery. Chromium covers unknown-ack recovery, explicit approval/enrollment, internal review completion and late-client writes. Copied-export replay checks data/ledger preservation.

P07-02 remains in progress for richer eligibility/branch and provider-capability contracts. P07-03 remains in progress for approved provider step execution. P07-04 still needs actual calendar booking exits and provider timing reconciliation. P07-06 still needs verified fulfillment/review destinations and real consented aftercare delivery. P07-07 remains review-only; sensitive commitments and actual delivery are not inferred from these tasks. All-module report reconciliation and release/hosting acceptance remain separate gates. Billing is excluded and reel rendering remains default off.
