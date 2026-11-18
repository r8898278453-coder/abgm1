# Fulfillment-gated retention, aftercare and repeat business

19 November 2026 IST. P07-06 locally validated. Tracker:40 validated,23 in progress,29 planned,1 blocked of93; no prerequisite/phase/production acceptance.

A won opportunity is a sales outcome, not proof that the service was completed. The platform now stores a separate operator-declared primary-service fulfillment with completion time, evidence, actor, immutable event ID, own revision and receipt proof. It remains explicitly manual, not verified delivery/payment and not contact consent. Additional deals retain their own outcomes and do not acquire fulfillment implicitly.

## Admission and execution

| Trigger | Minimum elapsed time since declared completion | Purpose |
| --- | ---: | --- |
| AFTERCARE | 1 day | Review genuine completed service and current customer needs |
| REVIEW_REQUEST | 7 days | Review an honest feedback request and correct destination; no rating filtering, fabricated reviews or incentives |
| REPEAT_BUSINESS | 30 days | Human review of suitability for repeat business; no invented order |

Intervals use SQL-observed time and exact epoch comparisons. Enrollment also requires a current allowed contact permission, active client, current authorized enrolling actor, approved workflow and approver, current knowledge/policy, usable contact and no unresolved inbound/send conflict. Existing workflow-specific delays apply after eligible enrollment; they are additional to the minimum completion interval. Eligibility in the UI is a read-time observation, not permission to bypass server checks.

Only one enrollment per client/contact/trigger/fulfillment event is admitted, even after exit/completion or via another workflow definition. A normalized-contact-hash 1/7/30-day enrollment cooldown (including legacy duplicate leads) also prevents immediate repetition by revoking/re-recording fulfillment. Exact retained enrollment replay reuses the existing enrollment; a new intent cannot bypass eligibility or cooldown. These conservative cooldowns count enrollment admission, not proven delivery.

Every non-inquiry workflow snapshot now binds the fulfillment event, revision, completion time and minimum interval. Existing context validation rechecks that binding before review advancement, message approval, queued send, final provider eligibility and settlement. Fulfillment change/revocation cancels pending workflows/tasks/jobs through the existing canonical exit service, atomically with the record/audit. Primary opportunity edits revoke an active fulfillment declaration and already exit its workflows. A private contact-hash binding refuses reuse after contact identity changes; missing/invalid phone identity cannot authorize WhatsApp retention. Additional-deal edits preserve the declaration; shared parent revision checks prevent either writer overwriting the other.

Replies and opt-outs retain the existing source-event cancellation and final sending guards. There is still an unavoidable boundary race once a real provider has already accepted a request; revocation does not recall a message. No real provider send or activation occurred in this group. All templates create reviewed internal tasks; explicit existing exact-message approval and all external channel gates remain required. Enrollment is explicit; this is not a new autonomous fulfillment scanner or recurring campaign scheduler.

## Record lifecycle and recovery

The existing `sales_opportunities.details_json` stores one current fulfillment record, preserving primary fields and additional deals. It shares the canonical parent revision/company lock and has an independent fulfillment revision. A saved primary opportunity in `won` stage is required to record completion. A future completion time is refused. A currently fulfilled record must be revoked before recording a new fulfillment event. Revocation is possible after stage changes; it never erases the prior declared completion time.

Exact latest request receipts bind actor/client/contact/input. Eight identical concurrent records commit once. Changed input with the retained key conflicts; stale parent/fulfillment versions conflict. Audit failure rolls back the record and workflow exits together. A lost commit acknowledgement recovers through the retained latest receipt. This is one current receipt, not a permanent ledger for all historical request keys. Primary invalidation preserves the prior receipt: retrying that old request returns current revoked state and cannot restore completion.

The current record is retained rather than a full fulfillment-history table. Actor/time on the declaration identifies its recording; canonical primary-change audit records later automatic invalidation. A fresh fulfillment after revocation receives a new event ID and retains a monotonically increasing revision. The existing shared 16 KiB opportunity limit remains; over-limit/corrupt data refuses writes. Primary opportunity audits now retain outcome metadata rather than copying private deal/fulfillment receipt details.

## Private UI and APIs

Selected-contact UI loads evidence on demand, shows manual provenance and separate interval observations, records completion in IST, and supports revocation with evidence. It clears actionable state after acknowledgement or uncertainty and requires explicit reload. Draft evidence is retained after an uncertain write; there is no automatic retry. Account/client/session changes discard stale actionable views.

Two query-free, `Cache-Control: no-store` routes under `/api/companies/:companyId/sales`:

- GET `/leads/:leadId/fulfillment`: scoped current primary stage/revision, SQL observation time and public declaration; receipt proofs and contact binding omitted. Canonical sales-workspace and primary-save responses also omit nested fulfillment/deal/handoff receipt proofs.
- PUT `/leads/:leadId/fulfillment`: strict expected parent/fulfillment versions, 64-hex request key, FULFILLED/REVOKED, ISO completion time or null, and operator evidence.

The workflow definition enum adds REPEAT_BUSINESS and its reviewed preset. Existing INQUIRY hashes/definitions retain their format. Legacy non-inquiry enrollments without a fulfillment snapshot fail closed at execution (`RETENTION_CONTEXT_REQUIRED`); no silent backfill interprets old free-text notes as completion. Review/cancel old work and record real fulfillment before eligible re-enrollment. Existing cooldowns can still require waiting.

Existing live sales activity labels operator fulfillment changes. Frozen daily report V4 and verified revenue/ROI definitions are unchanged. No provider-reviewed feedback acquisition, new reminder delivery channel or verified completion adapter is claimed.

## Validation and remaining work

Validation:145 credential-isolated default regression programs plus final focused contracts, complete disposable MariaDB10.11.19 suite, three targeted browser workflows (retention, salesWorkflows, salesWorkspace), TypeScript/build,277 routes/50 registrations/no collisions,53 migration sources and docs/frontend guards passed. Browser registry34 is not a fresh34-fixture run. Frontend587033 raw/170485 gzip bytes stays within600000/180000 budgets.

See `RETENTION_BATCHES.csv`, `evidence/retention-fulfillment.json`, `test/retention.test.ts`, `test/integration/retentionSql.test.ts`, updated existing workflow SQL and retention/workflow/sales browser fixtures for execution results.

Schema remains 053_calendar_plans/93 canonical tables; next 054. No migration, production database write, deployment, model call or real provider/customer send occurred. Rendering stays default off; billing is excluded.

This group addresses fulfillment/consent/interval eligibility and reviewed aftercare/feedback/repeat-business templates. It does not accept P06-08, P07-05 bookings, other prerequisite phases, external providers or production pilot gates. Full channel inbox, broader workflow adapters/exit-race acceptance, daily/agency reconciliation, attribution/cost allocation and hosting inventory remain pending. Automated fulfillment ingestion, arbitrary recurring campaigns and per-additional-deal retention remain separate future scope.
