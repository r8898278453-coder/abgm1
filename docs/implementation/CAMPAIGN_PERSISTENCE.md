# Campaign persistence and acknowledgement contract

Updated10 November2026 IST. Local source implementation; deployment/hosting acceptance and all broader campaign phase gates remain open. Billing excluded. Schema030/51 is unchanged by this batch.

Internal initiatives store planning name/objective/status, IST calendar dates, planned budget/channels and an optional link to one stored external ad. Saving or changing these records does not create, pause or spend on provider ads. Provider observations and user-entered plans retain separate storage and semantics.

## SQL and HTTP boundaries

Connected SQL create/update/delete return confirmed results rather than falling into memory success/failure. A successful empty SELECT remains empty; connected storage errors refuse. Internal INSERT uses epoch-derived SQL timestamps; readers use UNIX_TIMESTAMP to serialize UTC instants. User scheduling/default dates use Asia/Kolkata. SQL patch locks the scoped current row and checks the merged start/end period, including one-sided date changes. Only planning fields are editable. No-op patches on an existing row succeed; absent, foreign or unscoped updates/deletes do not.

Existing internal route paths remain. Auth and explicit matching companyId/company_id precede data access. Strict payloads reject extra keys, query/body ambiguity, empty updates, impossible dates, reverse periods, unknown states, negative/nonfinite/overprecision/oversize budgets and oversized fields. Non-null external links must resolve to exactly one stored external ID in the same workspace. Requests never issue provider writes. Success acknowledges the exact company and record; missing rows return404. Raw SQL details are excluded. See API_COMPATIBILITY.md for intentional legacy caller changes.

## Browser recovery

Internal reads reject unavailable/foreign data instead of returning an empty success. The common error banner and initiative state distinguish failure from zero records. The current app remounts the component on actor/client changes; pending completions are ignored after unmount. Functional state updates avoid closure overwrites. One mutation may be pending per mounted view. Unconfirmed mutations retain the form and block additional mutations until a confirmed collection reload; no automatic write retry. Successful planning status messages identify local planning state, with provider delivery unchanged. Field limits match the HTTP contract.

This process-local pending/uncertainty guard is not durable cross-tab transport idempotency or a server-side comparison revision. Reload after a lost response must be reconciled with the visible stored records before manual resubmission; identical names are not deduplication keys.

## External observation persistence

External upsert holds the company row and natural-key record in one transaction. Same client/provider/external ID reuses its actual ID, original creation instant and existing internal link, including concurrent syncs. New IDs are server-generated; caller IDs cannot select another row. Created/updated timestamps use SQL epoch conversion. Missing clients, failed commits and older fetched_at observations refuse; the existing sync service reports incomplete results for failures. Missing conversion/revenue/ROAS remain NULL. No real provider request is required by the native SQL fixtures.

A company mutex is correctness-first and serializes concurrent external upserts for that client. This is a current projection, not immutable telemetry history or evidence that provider access, ad delivery or attribution is verified. Full rate limits, reconciliation, execution policy/approval, campaign model and production canary remain separate acceptance gates. Foreign/ambiguous legacy external IDs may require explicit remediation before linking; this batch does not silently rewrite them. Existing sources001–029 are frozen.

## Evidence

See evidence/campaign-persistence.json and EXECUTION.md for executed checks. Native tests use a disposable restricted MariaDB instance and require verified local container identity. Browser fixtures block external traffic. Tests cover empty collections, actual stored create/update/delete, no-op/missing/foreign scope, merged-date rollback, source field separation, stable concurrent external replay and scoped UI uncertainty/draft/client handling. No production database, customer send, provider ad mutation, deploy or publish was performed.
