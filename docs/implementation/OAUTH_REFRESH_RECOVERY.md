# OAuth state and refresh recovery — 20 November 2026 IST

The shared OAuth framework now locks the canonical active client during state creation, state consumption, refresh admission and refresh settlement. New PKCE verifier ciphertext binds company, actor, provider, session hash and state hash. Copying ciphertext between saved states is rejected. Existing unconsumed legacy verifier strings retain their original ten-minute expiry and one-use consumption contract.

Refresh settlement requires a current lease, unchanged credential snapshot and an integration in saved/connected/verified state. Archived clients and error/revoked/disconnected integrations cannot be revived by a late refresh. Results require a nonempty access/oauth token, allowlisted fields, bounded string values without CR/LF/NUL, and a bounded object snapshot. Account/location fields remain preserved. Failed/cancelled refresh callers can release only their exact lease; an old owner cannot release a successor.

Native disposable SQL covers one-use eight-way state/refresh races, ciphertext substitution, archived admission/settlement, invalid/empty/unknown refresh fields, invalid snapshots, revoked status with credential preservation, explicit recovery and stale release. No code exchange, provider connection or live readiness is claimed. No migration, historical checksum change, deployment, production write, provider request or model spend.

Original tracker remains54 validated/16 in_progress/22 planned/1 blocked. P02-07 stays in_progress: all provider adapters still need canonical OAuth adoption and explicit revocation coverage; these shared primitives do not establish universal token lifecycle enforcement. Hosting and phase gates remain open. Schema055/101 and frozen V4 are unchanged.

Validation:156/156 credential-isolated default regression programs, full disposable native SQL matrix, TypeScript, production build and generated-document checks passed. Browser not rerun: shared server OAuth primitives only; existing UI unchanged.
