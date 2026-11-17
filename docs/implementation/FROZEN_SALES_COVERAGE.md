# Frozen sales coverage V3 — 17 November 2026 IST

New manual and scheduled closed-day captures use immutable coverage V3. It adds the eleven sales activity counters already present in the live report: committed import batches, created/not-imported rows, recorded inbound messages/ambiguous identities/opt-outs, qualification/human-review revisions, and opportunity/permission/policy revisions. The original canonical capture service remains the sole writer; no scheduler, table or endpoint is duplicated. Schema remains050/87 tables; next051.

The V3 registry freezes exact field names and labels independently of the mutable live registry. V1 and V2 files are unchanged. V3 canonicalization validates all inherited and new counters as nonnegative safe integers and copies only the declared coverage. Unknown/private source fields cannot enter the stored payload or CSV. There are no new sales backlog metrics; the existing at-capture backlog definition remains unchanged.

The existing payload hash covers the actual versioned report. Metadata/read/export dispatch supports versions1,2,3 and refuses unknown versions. The stored selector identifies its coverage. CSV writes coverage_version=3 and includes all eleven fixed sales fields. Comparison accepts matching coverage only: a V2 baseline and a V3 amendment cannot produce a misleading delta that treats missing old metrics as zero. Same-V3 comparisons include sales changes.

Exact request replay returns the original committed record and hash, including V1/V2, without regenerating a report. Scheduled baseline reuse also preserves an existing legacy baseline. A fresh explicit amendment can use V3 while the earlier V1/V2 baseline remains intact. Late committed sales audit evidence changes a newly captured amendment, never the older copy. Existing authorization, closed IST day, expected-revision CAS, capacity, audit rollback, unknown-commit reconciliation and queue lease checks remain canonical.

## Compatibility and rollback

No migration, schema-default change or old-row rewrite is required. Deploy readers and writers together. Older code that only understands V1/V2 refuses V3 metadata/history; it is not a compatible full rollback after V3 records exist. Keep capture schedulers stopped during a rollback and retain a V3-capable reader or apply a forward fix. Preserve all snapshot rows and hashes; do not relabel V3 as V2, delete records or overwrite old payloads to make an older binary accept them. Production release/rollback remains a separate action.

## Validation and remaining work

Evidence: evidence/frozen-sales-coverage.json. Unit coverage includes all eleven numeric failure boundaries, private projection, V1/V2 field exclusion, V3 CSV and exact-version deltas. Native SQL covers new V3 writes, late sales evidence, original-hash preservation, concurrent capture/revision races, audit/lost-ACK recovery, V1/V2 replay and baseline reuse, mixed-version refusal and scheduled-worker V3 admission. Chromium covers V3 display, sales deltas/CSV and existing exact retry/session/client fences.

P09-01 remains in progress. Complete planned/done/partial/failed/blocked reconciliation, other module coverage, retention, hosting/cron and live provider/phase/release acceptance remain pending. A frozen count is recorded evidence, not delivery, consent, revenue or guaranteed growth. Rendering and notification opt-ins are unchanged; no production activation occurs here.
