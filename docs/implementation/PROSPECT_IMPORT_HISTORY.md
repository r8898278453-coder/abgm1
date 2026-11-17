# Saved prospect import history and reconciliation

17 November2026 IST. Partial P08-01/P01-06 continuation. Schema050/87 tables, next051. Migration050 adds only the scoped history index; historical001–049 sources and journal rows are unchanged. No deletion, live import, provider send or deployment occurred.

## Read-only committed evidence

The existing sales_prospect_imports journal is now readable by authorized client readers. Operators can browse25 committed batches at a time, inspect one exact request key and export its original row outcomes as CSV. No CSV re-entry/import POST is needed merely to inspect a retained transaction. Reads never insert leads, replay imports, grant consent, mutate journal state or unlock an unresolved import editor.

List metadata includes only request key, recorded IST time, total rows and seven reconciled outcome counts. Detail adds original row numbers/outcome codes. Source declarations, customer/contact names/addresses, lead IDs, actor identities, raw CSV and request hashes are excluded. Stored result JSON is capped at32768 bytes by SQL projection before it reaches the reader. Invalid/oversized/null payloads, unknown row outcomes, missing rows, inconsistent timestamps or consent claims make evidence unavailable instead of fabricating a result.

A committed record describes the original transaction; it does not prove that imported leads still exist or that permissions are unchanged now. The reader validates contract shape, not an independent cryptographic result signature. The application has no journal update/delete endpoint. A missing record is not proof that a concurrent in-flight transaction cannot still commit. Reading an existing key also does not prove that a rejected new request used the same input; viewing history never releases the exact-retry lock.

## Traversal and ownership

GET `/api/companies/:companyId/sales/prospect-imports` accepts only optional `before`; GET the same path plus `/:requestKey` accepts no query. Both require current client read access and send no-store responses. Details use strict64-character lowercase hex keys. A valid but absent scoped key returns404; unavailable/corrupt data returns503, and malformed query/cursor returns400.

Pagination uses existing immutable created_at/request_key ordering with a new nonunique index(company_id,created_at,request_key). Cursors bind client/key/time and must anchor an existing exact row. They are positions, not authorization tokens. Newer commits do not shift an older keyset page. The reader selects26 rows to return25 and a continuation; it never supports caller-controlled page size or unbounded export. Current writes/retries remain canonical and unchanged.

Owners: server/prospectImportHistory and shared/prospectImportHistory provide private projection/validation/CSV and scoped read routes. Existing salesWorkspace import transaction remains the sole writer. Migration050 validates/rejects a wrong named-index shape and is registered in the central migrator; no request-time DDL exists.

## Client and session controls

ProspectImportHistoryPanel is explicitly opened within the client-bound import panel. It validates full page/detail scope, order, row counts and totals; abort/generation/session guards discard stale responses. Client changes reset the panel. An edited lookup clears previously accepted detail, and changing session blocks stale CSV export.

History navigation retains only the current page cursor in memory. Inspecting an outcome offers Back to import batches, which re-reads that exact page; older pages offer Newest import batches. No cached batch/contact data or cursor stack is persisted. Loading is exposed with aria-busy and a status announcement. A client or last-key change resets the remembered cursor.

Before import I/O, the existing import panel stores one last-key pointer in actor/client-scoped session storage, after verifying persistence. Only key metadata is stored; raw CSV/source remains memory-only. After reload that pointer pre-fills lookup, with no automatic request or import. Existing input-hash keys and exact POST retry remain separate. A found historical batch is displayed as recorded evidence, not an automatic success claim for a different attempted body.

CSV includes client reference, request key, recorded IST time, row, outcome and consent=false. It exports only one accepted batch, guards spreadsheet formula prefixes/quotes and refuses a changed session. It is a privacy-minimized outcome export, not a full CRM/source backup or retention deletion authorization.

## Validation and remaining work

See evidence/prospect-import-history.json. Native tests cover a real committed/replayed import,32 tied-time batches over two pages without gaps/duplicates, wrong-client/forged cursors, private projection/CSV, corrupt/oversized refusal and SQL session timezone independence. Migration-index negative testing runs with disposable migration privileges; runtime history/CRM tests retain restricted application privileges. Browser tests cover lazy GET-only reads, pagination, saved-key lookup, CSV/session fences, foreign response rejection and late-client switching, plus existing preview/sales/workspace flows.

Retention/archive/deletion, complete operational reconciliation, verified discovery/enrichment and live hosting/provider/phase/release acceptance remain pending. This does not clear capacity or remove replay/suppression evidence. Billing and rendering activation remain excluded.
