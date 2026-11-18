# Multiple deals and canonical sales outcomes

19 November 2026 IST. Local implementation; production acceptance remains separate.

A contact now retains one primary opportunity and up to five independent additional deals. Existing `leads` and `sales_opportunities` remain the canonical stores. Additional deals live in the existing bounded JSON details, with no new table, migration, duplicate contact master or competing writer. Schema remains 053/93; next migration 054. Frozen report V4 is unchanged.

## Behavior and contracts

- Save the primary opportunity before adding a secondary deal. Each additional deal has an immutable ID, name, stage, independently reviewed value/currency, close/reopen reason, next action and optional IST due time. Its declared source is captured at creation; it remains linked to the canonical contact.
- Closing an additional deal does not close the contact/primary opportunity or cancel primary workflow enrollments. Additional deals do not enroll or send autonomous messages. Primary transitions retain the existing workflow-exit rules.
- All mutations lock the canonical company and opportunity. A shared parent revision prevents primary and additional writers from overwriting one another; additional edits also compare the viewed deal revision and stage. The primary writer preserves the additional-deal collection.
- Won/lost requires a reason and cleared action/due time. Reopening a closed deal requires a reason. No deletion endpoint erases prior deal identity. Current state and actor/version audit evidence are retained; this is not a full historical snapshot of every prior field value.
- Legacy quick-stage writes are limited to untracked, nonterminal contacts. Tracked opportunities and close/reopen transitions use the canonical primary opportunity form with its reason and revision requirements. The quick-stage SQL path uses the same company lock, preventing a race against primary creation.
- Total details are limited to 16 KiB; each contact has at most five additional deals. Revision exhaustion, malformed stored data, capacity, permission loss, archive, stale versions and audit failure refuse writes. No automatic retry rebases a stale edit.

## Request recovery

Creation stores an immutable request receipt; the latest edit receipt is retained per deal. Eight identical simultaneous creates commit one deal and return the same ID. Exact creation replay works after later edits and returns the current saved state, not a historical snapshot. An exact latest-edit replay also returns current state. The key binds actor, client, lead, operation, input and deal identity.

This is bounded receipt retention, not a permanent ledger for every historical edit key. An older edit replay must pass the shared/deal version checks and normally conflicts; reload saved state before issuing a new edit. After an uncertain acknowledgement the UI blocks another write until explicit reload. A transaction that committed before acknowledgement loss is recoverable by the same retained request receipt. Audit failure rolls back details and revisions together.

## Reporting boundaries

The private deal portfolio reports primary and additional deals together, with exact per-currency integer strings, separate unknown won values, and null verified revenue/ROI. It never adds different currencies. CSV contains identifiers, stage, declared value/currency/source and the manual-evidence definition; contact names, notes, actions, reasons and request receipts are excluded. Formula-like source strings are escaped. Both read and export validate current client/account scope and derived totals.

Existing daily/source outcome reports remain contact/primary scoped. Opportunity-save activity includes additional-deal revisions using the existing canonical audit event. Existing overdue backlog covers primary actions; secondary due times are shown in the deal panel. First/last recorded inbound touches and cost links remain lead-level. They are not copied into invented per-deal spend or revenue attribution. See P08-05 and P09-01 for broader attribution and daily-report acceptance.

## Private APIs

| Method | Path suffix under `/api/companies/:companyId/sales` | Contract |
| --- | --- | --- |
| GET | `/deals` | Current authorized client portfolio; at most 1000 contacts, otherwise refuse |
| GET | `/leads/:leadId/deals` | Selected-contact portfolio |
| POST | `/leads/:leadId/deals` | Strict create input; expected parent version and 64-hex request key |
| PUT | `/leads/:leadId/deals/:dealId` | Strict edit input; parent/deal versions, expected stage and request key |

All four routes reject queries and set `Cache-Control: no-store`. Reads and writes recheck current SQL actor authority; writes share canonical agency/client access and archive checks. Existing primary route remains compatible. Generic stage PATCH now returns a conflict for terminal transitions or tracked opportunities, directing the operator to the primary form.

## Verification and remaining work

Evidence: `test/extraDeals.test.ts`, `test/integration/extraDealsSql.test.ts`, `test/browser/extraDeals.test.ts`, existing lead-stage, sales, source-outcome and workspace-isolation fixtures. See `evidence/multiple-deals.json` for final execution results.

P06-07 is locally validated after its remaining multiple-deal and legacy-writer gaps were implemented and tested. Tracker:38 validated,25 in progress,29 planned,1 blocked of93.143 default programs, full disposable MariaDB10.11.19 suite and four distinct targeted browser workflows passed. TypeScript/build,271 routes/50 registrations,53 migration sources and frontend587033 raw/170477 gzip bytes pass existing guards. Browser registry32 is not a fresh32-fixture run. It does not close CRM/channel gate P06-08 or any prerequisite phase. Forecasting, per-deal ownership assignment, additional-deal workflow enrollment, full historical field snapshots, per-deal source/cost allocation, unified multi-channel inbox, broader qualification/retention packs and live provider acceptance remain separate work. Billing is excluded and reel rendering stays default off. No production deployment, production database write, provider send or model spend occurred.
