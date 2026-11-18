# Source and outcome evidence, and revenue-claim repairs

18 November 2026 IST. Source schema remains052_client_reports /90 tables; next migration053. This continues P08-05 and repairs specific P01-05/P01-09 truth defects. No billing/payment flow, provider send, subscription, production database or deployment was changed. Parent/phase acceptance remains open.

## Concrete defects corrected

The previous scoped revenue endpoint summed campaign budgets and passed them as marketing spend. The legacy calculator accepted a Paid invoice with a plausible payment ID/method as provider verified, inferred source from a plan/payment-method label or contact lookup, admitted records without a tenant, and treated contacted leads as opportunities. None establishes verified customer revenue or source attribution. Tests had accepted these plausible-looking fixture IDs as proof; those assertions now explicitly require unavailable financial evidence.

Both existing GET revenue-attribution URLs now share a registered route module, explicit current workspace read access, strict query scope, no-store headers, metadata-only bounded SQL and a five-second read deadline. Database failure returns503, not a fabricated empty report. They do not fetch subscription invoices, company payload/campaign budgets, phone/email/name fields or payment identifiers. The legacy calculator ignores unverified cost scalars and invoice amounts; its deprecated invoice-verification helper cannot certify a customer payment without an authoritative evidence adapter.

The existing numeric zero fields for customer/payment revenue are retained only for legacy wire compatibility. New `revenueEvidence`/`costEvidence` and the fixed definition explicitly say UNAVAILABLE; they are not observed zero revenue/spend. The typed frontend validates that contract and renders financial metrics as Unavailable. `totalSpend` is null and ROI is UNAVAILABLE even if a caller supplies a budget or cost number. Verified customer receipts and spend will require separate scoped evidence contracts; setting a payment ID or invoice status cannot enable them.

Source normalization uses exact declared aliases, including Email as its own source. Combined/unrecognized labels remain Unknown; no substring classification, plan-name inference or prototype-property lookup. Missing/foreign tenant rows and duplicate identities cannot inflate lead counts. Contacted is not an opportunity; proposal/quotation remain consistent with the canonical CRM lifecycle.

The campaign view previously expected a `sources`/`qualified`/`customers` payload that the server did not return. It now consumes the actual typed `sourcesList`, uses saved won-stage counts and a labelled recorded win rate, and removes the unsupported verified multi-touch/ledger/revenue claim. The interactive calculator is separately labelled as user-entered hypothetical assumptions; it does not read or save verified financial performance.

## New saved-evidence report

`GET /api/companies/:companyId/sales/source-outcomes` accepts no query/body overrides. Current SQL actor authority and client read access are checked inside a repeatable-read, read-only deadline. It reads:

- Current lead ID, declared source and stage, plus the current canonical opportunity revision and declared amount/currency.
- Linked inbound inbox record IDs/channel/created time and public inquiry record IDs/lead linkage/created time. Outbound rows and records dated after the database observation clock are excluded.
- Existing active declared COST records through the growth module's canonical payload/hash validator. Voided costs are excluded; no new cost ledger or scheduler is created.

The report contains no customer names, phone/email addresses, message bodies, provider references, metadata blobs, notes, private cost references, invoice data or credentials. Lead IDs are intentionally included in this authenticated, client-scoped CRM report and its CSV.

First and last known recorded interactions are alternative models over those saved inquiry/inbound records. They are not historical acquisition/visitor identity, proof of provider delivery or a claim that a channel caused a sale. A current declared lead source is shown separately; it is never assigned an invented acquisition timestamp. A lead without timed evidence stays Unknown. Multiple different sources at the same first/last timestamp are flagged ambiguous and classified Unknown instead of choosing an arbitrary row. Null timestamps, unlinked interactions and links to leads outside the current owned cohort are counted without resolving by phone/email or exposing another client's identifiers.

The current outcome stage and opportunity revision describe the observation now. Reopened/lost/current won states use the canonical saved state; this is not a reconstruction of past-day outcomes. Unknown legacy stages are counted explicitly. Saved opportunity and inbox/public inquiry histories remain the authoritative event sources; this view adds no competing journal.

Manual won amounts and active declared costs are separate currency maps of exact decimal integer strings in minor units. BigInt accumulation prevents overflow/rounding or accidental conversion. Unknown amounts stay missing; lost/open values are not counted as won. Costs remain UNALLOCATED to first/last sources because no validated source-cost relationship exists. Verified customer revenue, verified marketing spend and ROI are null. No inferred profit or measured return is exposed.

## Limits, UI and export

At most1,000 current leads,1,000 retained cost records,5,000 inbound records and5,000 public inquiries are considered. Exceeding a lead/cost limit makes the complete report unavailable. If either interaction history exceeds its bound, `historyComplete=false` and first/last source boundaries are withheld for every lead; current CRM/manual amounts remain explicitly current. The server never presents the earliest retained row as the true first source.

The saved sales workspace has a demand-loaded mobile report panel with observation time in IST, counts/coverage/ambiguity, the two non-additive source models, separate declared currency totals and clear unavailable financial evidence. A client/account change aborts/invalidates pending results. Failed/corrupt responses clear the report and disable export. The response validator reconciles rows, stage totals, source buckets and exact money maps; it rejects financial claims or extra sensitive fields. CSV exports validated lead-level source/outcome rows with UTC timestamps, an explicit Asia/Kolkata context and the fixed definition, not contacts or a complete cost ledger. Formula-prefix escaping and scope/session checks apply.

## Validation and unfinished scope

See [SOURCE_OUTCOME_BATCHES.csv](SOURCE_OUTCOME_BATCHES.csv) for24 connected functional slices and [evidence/source-outcome-truth.json](evidence/source-outcome-truth.json) for actual test outcomes:135 isolated programs,27 browser workflows and the full disposable native SQL suite passed. These are not24 completed original parent tasks. No original parent is promoted solely by this group.

P08-05 remains in progress: verified customer receipt/refund/reversal evidence, provider spend/currency/window matching, immutable source/outcome release histories, explicit campaign/source cost allocation and verified ROI remain unimplemented/unverified. Existing declaration/manual values are not upgraded by these changes. P01-05/P01-09 still require platform-wide provider/persistence/badge acceptance. Complete daily action reconciliation and hosting/phase/release gates also remain open. Billing remains excluded.
