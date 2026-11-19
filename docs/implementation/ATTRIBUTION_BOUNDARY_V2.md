# Attribution boundary V2 — 20 November 2026 IST

The live source/outcome contract advances explicitly from model1 to model2. Canonical API, validator, UI and CSV share the contract. Historical frozen report versions and database migrations remain unchanged.

Delivered together:

- First/last boundaries include sorted, unique saved evidence IDs matching their evidence count.
- Each row includes a deterministic canonical JSON boundaryVersion bound to client, lead, model, history completeness, untimed flag and both boundary snapshots. This is an exact content comparison token, not a signature, authentication token or a persisted historical revision journal.
- Replacing a timed boundary record changes the version even if source/time/count remain identical. Input ordering does not change it.
- A linked untimed interaction now withholds both boundaries: its chronological position cannot be established. Row status is UNTIMED_HISTORY; incomplete bounded history retains priority as INCOMPLETE_HISTORY. Other clients/leads are unaffected.
- Same-time first/last boundaries must agree; ambiguous evidence requires at least two records. Forged counts, duplicate IDs, unsorted IDs and inconsistent version tokens fail validation.
- Opportunity revisions reject noncanonical leading zeros. Malformed top-level collections fail before aggregation.
- CSV adds boundary version and first/last evidence IDs with existing spreadsheet escaping. Evidence IDs are tenant/kind-bound opaque hashes, not provider IDs, message bodies, contact addresses or credentials.
- UI explains untimed withholding and displays model V2. Unknown outcomes and withheld attribution remain explicit.

Manual won values remain unverified, per currency and separate from declared unallocated costs. Verified revenue/spend and ROI remain unavailable. This does not establish causal acquisition truth, billing coupling or a unique-person count across alias records. P08-05 remains in_progress until remaining financial evidence/provenance acceptance is complete. Tracker54 validated/16 in_progress/22 planned/1 blocked remains unchanged.

No production deployment, database write, migration, real provider send or model spend. Existing schema055/101, next056; frozen V4 unchanged.

Verification:156/156 isolated regressions, full disposable SQL matrix, two intercepted browser workflows (sourceOutcomes/salesWorkspace), TypeScript and production build passed. Evidence: evidence/attribution-boundary-v2.json.
