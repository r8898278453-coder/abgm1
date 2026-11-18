# Grounded qualification and assigned human handoffs

19 November 2026 IST. P07-01 locally validated; no prerequisite/phase/production acceptance. Tracker:39 validated,24 in progress,29 planned,1 blocked of93.

## Qualification behavior

Six explicit question packs cover general services, agency/B2B, local services, education/training, healthcare appointment enquiries and commerce/product enquiries. Each contains six questions: approved service, timeline, purchasing authority, prospect-declared budget, requested human follow-up and an industry-specific context question. Context covers goals/channels, service area, learning mode/eligibility, appointment preferences or quantity/delivery region as appropriate.

Selecting a pack changes draft sales-policy questions only. The operator explicitly saves the existing versioned policy; changing it invalidates old qualification context. Existing custom question sets remain supported and are explicitly unscored. The UI offers reviewed response choices without silently rewriting a free-text answer.

Qualification reuses the current approved/eligible KnowledgeService facts. Service/product/course/appointment matching uses exact normalized catalog text, not invented semantic equivalence. Each answer has an explainable declared/unknown/catalog-match/human-review state. Readiness only describes explicit near-term timing, authority and budget declarations; it is not a conversion prediction, verified financial assessment or permission to send.

Unknown answers, unrecognized choices, unsupported service text, missing/conflicting approved facts and sensitive healthcare enquiries receive explicit human-review reasons. Healthcare question text asks for appointment preferences rather than clinical records. No model call, automatic price quote, availability promise, medical advice, discount or outcome commitment is generated. A ready qualification still requires reviewed action. `humanReviewRequired` expresses extra escalation need; a false value does not grant automatic messaging or remove normal human review.

## Durable routing and lifecycle

The operator chooses a current authorized specialist and a reason. A handoff is saved inside the existing `sales_qualifications.details_json`, sharing its canonical revision and company transaction lock. There is no duplicate CRM, new table, shadow delivery job or external notification. Each handoff has an immutable ID, assignee, creator, qualification/policy/knowledge binding, own revision, reason, action note, IST timestamps and receipt proofs.

| Transition | Allowed actor and condition |
| --- | --- |
| Create → OPEN | Current writer; chosen assignee must currently have client write authority; current qualification context |
| OPEN → ACCEPTED | Assigned person with current client write authority; policy/knowledge current |
| ACCEPTED → RESOLVED | Assigned person with current client write authority; policy/knowledge current; explicit note |
| OPEN/ACCEPTED → CANCELLED | Current authorized assignee, creator or manager; cancellation is allowed when context is stale |

Resolution records an internal human acknowledgement, not evidence that the prospect was contacted, a notification arrived, a sale closed or a price was accepted. Archived clients refuse writes. Role/assignment loss is checked again at each operation. Recipients are selected from the canonical agency membership and current client role, not from browser-supplied actor privileges.

Only one OPEN/ACCEPTED handoff can exist per qualification/contact. An active handoff blocks replacing qualification answers; resolve/cancel it first. Completed/cancelled history survives later qualification saves. History is capped at ten retained handoffs per contact, with a 32 KiB total qualification limit. Capacity and malformed history refuse writes; no silent deletion occurs. A client-level on-demand queue lists pending assignments, defaults to the current person's assignments and can show other authorized client assignments. Contacts outside the existing newest-100 sales selector are identified explicitly; the queue does not invent access to an unloaded contact.

## Concurrency, retries and private reads

Parent and handoff revisions reject stale/ABA edits. Eight identical concurrent routes create one assignment. Immutable creation and latest-action receipts bind actor, client, contact, operation and exact input. Exact retained replay returns current saved state; older action receipts are not a permanent global request-key ledger. After an unconfirmed response, the UI retains the note and requires explicit reload before another write. Lost commit acknowledgements recover through retained receipts. Audit failure rolls back revision/state together.

Client/account changes clear the UI through the existing feature-session boundary; late responses and token-mismatched actions are refused. Reports validate company/contact scope, uniqueness, derived answer counts, history states and recipient shape. Request receipts and email addresses are omitted. Role/knowledge/policy inspection is bounded: at most 1000 saved qualifications, 50 agency recipient candidates and 200 knowledge facts; report context is read once per snapshot rather than once per contact. Over-limit data refuses a falsely complete report.

## API compatibility

Four private, no-store, query-free routes under `/api/companies/:companyId/sales`:

- GET `/qualification-handoffs`: current client assignment queue.
- GET `/leads/:leadId/qualification-handoffs`: selected-contact assessment/history and current recipients.
- POST `/leads/:leadId/qualification-handoffs`: strict `{expectedVersion, requestKey, assigneeId, reason}`.
- PUT `/leads/:leadId/qualification-handoffs/:handoffId`: strict `{expectedVersion, expectedHandoffVersion, requestKey, decision, note}`.

Existing qualification input remains compatible. Its response adds explainable assessment. Qualification edits now conflict while a handoff is active and reject corrupt/over-limit history. Existing question-policy, knowledge and canonical qualification writers are reused. `AGENCY_SALES_QUALIFICATION_HANDOFF_CHANGED` records assignment/status changes and is labeled in the existing live sales activity report. Frozen daily report V4 is unchanged; this does not claim broader P09 reconciliation completion.

## Evidence and remaining work

Validation:144 credential-isolated default programs plus focused final contract checks, full disposable MariaDB10.11.19 suite, three distinct targeted browser workflows (qualificationHandoffs, salesWorkspace, workspaceIsolation), TypeScript/build,275 route declarations/50 registrations/no collisions and migration-source/docs/frontend guards passed. Browser registry33 is not a fresh33-fixture run. Frontend closure587033 raw/170483 gzip bytes stays within the existing600000/180000 budgets.

See `QUALIFICATION_HANDOFF_BATCHES.csv`, `evidence/qualification-handoffs.json`, `test/qualificationAssist.test.ts`, `test/integration/qualificationHandoffsSql.test.ts` and the qualification/sales/workspace browser fixtures.

Schema remains 053_calendar_plans/93 canonical tables; next 054. No migration or production database action was needed. Billing is excluded; reel rendering stays default off. No production deployment, provider/customer send, model call or spend occurred.

This group covers P07-01's industry questions, explainable declared fit/readiness, unknown-answer escalation and actual assigned human lifecycle. It does not accept prerequisite P06-08 or any phase. Automatic external specialist notifications, predicted conversion scoring, clinical/financial decision-making, unlimited assignment history and a full cross-channel CRM inbox are not delivered here. P07-06 fulfillment/interval-based retention and repeat-business automation, workflow channel adapters/exit races, broader attribution/daily reporting and hosting/provider acceptance remain pending.
