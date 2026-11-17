# Agency exception overview — 15 November 2026 IST

Capacity review continuation (17 November2026 IST): [OPERATIONAL_CAPACITY.md](OPERATIONAL_CAPACITY.md) adds nine client resource counters with shared unchanged admission limits. Schema049/87 unchanged; no retention deletion, live activation or phase acceptance.

Operations continuation (17 November2026 IST): [OPERATIONS_COMPLETION_GROUP.md](OPERATIONS_COMPLETION_GROUP.md) adds frozen V2, agency model3, explicit Telegram identity proof and recovery consistency. Schema047/84 unchanged. Historical notes below retain their checkpoint scope; no parent/phase acceptance.

The existing agency sales overview now brings ten current backlog metrics together for clients the current actor can read. This is an operational review queue, not a business-health or revenue score.

| Counter | Definition | Weight |
| --- | --- | ---: |
| New leads | Canonical leads still at new stage | 1 |
| Inbox identity review | Saved inbox rows with no linked lead | 3 |
| Overdue sales actions | Open opportunities with an existing due time before current UTC time | 2 |
| Unconfirmed dispatch | Canonical dispatch intents at UNKNOWN | 5 |
| Stale dispatch | IN_PROGRESS intents whose last update is at least30 minutes old | 5 |
| Failed intake | Intake journal records at FAILED; replay eligibility is not implied | 3 |
| Dead-letter intake | Intake journal records at DEAD_LETTER | 4 |
| Queued replay | Intake journal records at QUEUED | 0 |
| Unresolved inbound conflict | Original event conflict revision exceeds resolved revision | 4 |
| Pending workflow review | Workflow review tasks at PENDING | 2 |

Priority equals the sum of count × weight. Categories may overlap: the score is neither a unique incident count nor a strict severity/health assessment. Queued work remains visible without raising priority. API-accepted messages without delivery receipts are not treated as failed dispatches.

The canonical `readAgencySalesOverview` still owns authorization, aggregate scope and ranking. Its existing read-only deadline transaction uses current agency membership/assignment and owner consistency. One SQL snapshot contains the authorized client set, all counters and archived/active operation status. At most100 clients are accepted; exceeding that bound refuses the whole projection rather than exporting partial totals. No per-client network requests, new tables or additional migrations are introduced. Schema044/80 remains current; next unused migration045.

GET `/api/agencies/:agencyId/sales-overview` now returns modelVersion2, exact agencyId, CURRENT_AUTHORIZED_CLIENTS scope, DB checked-at time, operation status, all ten counters and transparent weights. Existing companyId/backlog/priority fields remain. Dates must be real calendar dates; unrelated cursor parameters are rejected. The optional legacy date field does not turn current backlog into historical daily activity. Errors remain no-store and do not return successful zero metrics.

The agency UI validates required counts and recomputes priority before displaying results. It supports reload, client-ID search, metric filtering, visible weights, archived-client visibility, selected-client navigation into CRM and metadata-only CSV. CSV includes ALL authorized snapshot clients, explicitly independent of display filters. Quoted client IDs neutralize spreadsheet formula prefixes. Bodies, phone numbers, investigation notes, payloads and provider credentials are never selected/exported. Failed or mismatched reloads clear stale results/export; request aborts, agency remounts and session-token checks fence delayed results.

The view has no send/retry/replay/cancel/policy/status controls. Source module permissions and current eligibility continue to govern every mutation. Historical activity, connection verification, capacity, actual cost, revenue, full agency prioritization and phase acceptance remain pending. Parent P09-02 remains in_progress; prerequisite gates are unchanged. Billing remains excluded; rendering and automatic sending remain default off.

Validation evidence and source fingerprints: `evidence/agency-exception-overview.json`. No production access, migration, deployment, environment publication or real provider sends were performed.
