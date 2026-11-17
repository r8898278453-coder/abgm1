# Prospect import preview and private draft isolation

17 November2026 IST. Partial P08-01/source contract and P01-02 isolation continuation. Schema049/87 unchanged, next050. No migration, provider send, live prospect import or deployment occurred.

## Behavior

The sales workspace now previews a CSV before its UI starts import. A preview shows row numbers and outcomes only: ready, invalid, excluded domain, existing lead/customer, ambiguous identity, suppressed address or duplicate within the file. It grants neither consent nor send authority. International phone/email validation and the100-row/100KB CSV parser are reused; country codes are never guessed.

Classification is owned by one helper used by preview and the canonical import transaction. Preview reads current policy, CRM identities and permission records in a bounded read-only snapshot. It simulates only rows that would actually import, so a skipped row does not create a fictional identity. Same-file matches and database matches are combined: a record linking two different candidates is ambiguous instead of being incorrectly declared an existing single lead. Output contains no contact address/name, lead ID, CSV text or source declaration.

POST `/api/companies/:companyId/sales/prospects/preview` accepts exactly `{source,csv}` and rejects all query parameters. It requires current client write access because it classifies prospective CRM data; viewers cannot invoke it. The service refreshes actor/admin authority and scopes every identity/permission query. It uses the existing read-only transaction/deadline. Preview creates no lead, import journal, audit transition or outbound request. Invalid/unavailable input returns an error, not a partial or fabricated result.

Final import retains its existing public contract, immutable request-key/input binding, company lock, audit transaction and cached replay. Existing API callers remain compatible; preview is a UI review step, not a new backend execution grant. Final import reclassifies current data. For example a row ready at preview may become SUPPRESSED after a new opt-out; counts can differ when policy/CRM/permission data changes. No preview result can override that check.

## Client/session safety and recovery

ProspectImportPanel owns CSV/source/result state and keys itself by client and session identity. It replaces the parent-held import drafts which could survive a client switch. A new client/session starts blank; late old preview/import responses cannot populate the new view. Inputs are disabled for viewers and during an in-flight or unresolved import. Editing a reviewed source/file invalidates the preview and disables import until reviewed again.

Before import the existing messageRequestKey utility saves a stable key for the exact actor/client/source/file scope. Session storage contains only hashed scope/key metadata, not raw CSV/source. A lost/refused acknowledgement retains the exact intent in this view and exposes an explicit exact retry; no automatic retry or altered-body retry is possible. Confirmed acknowledgements require matching client, all row outcomes, reused flag and consentGranted=false. If workspace refresh fails after a valid acknowledgement, import remains confirmed rather than being mislabeled failed.

CSV/source drafts are memory-only and clear on switch/reload. After reload, re-entering the same source/file in the same session uses the persisted key and can reconcile the original journal. The preview may then show existing leads while cached import replay returns the original outcomes; this is expected immutable evidence. There is no force-new-batch/resend action added to bypass an uncertain request.

Owners: shared/prospectPreview for strict input/outcome validation; existing salesWorkspace classifier/import and salesRoutes for scoped service ownership; ProspectImportPanel inside the existing sales workspace. No second importer, identity store, provider adapter, workflow or scheduler was added.

## Validation and remaining scope

Evidence: evidence/prospect-import-preview.json. Native SQL covers mixed statuses, virtual/database ambiguity, foreign-client identity isolation, unchanged lead/journal/audit counts after preview, opt-out changes between preview/import, cached replay, viewer/auth/query guards and existing CRM/import race/rollback fixtures. Default tests cover bounded command/row/sequence/duplicate/consent contracts and pure SELECT classification. Mocked browser tests cover preview-required UI, edit invalidation, exact lost-ACK retry, key-only storage, wrong-client response rejection, private draft reset and existing sales/workspace flows.

This does not claim provider-verified prospect discovery, enrichment, buying signals, consent, complete ICP relevance or completed P08 acceptance. Retention/deletion, broader workflow reconciliation, real hosting/provider pilots and remaining phase/release gates stay open. Rendering and billing activation remain excluded.
