# Authentication and integration continuation — 10 November 2026 IST

Current security/policy checkpoint (12 November2026 IST): [SECURITY_POLICY_GROUP.md](SECURITY_POLICY_GROUP.md) records035/63 (next036), opt-in cookie/epoch security, canonical aliases, PKCE/refresh groundwork and client goals/shared admissions. P02-05/P02-06/P04-05 are locally accepted; seven other targets remain partial. Historical001–034 unchanged; no phase, provider activation or deployment accepted. Older schema/status notes below describe earlier checkpoints; STATUS.md is current.

Current local acceptance (12 November2026 IST): [ACCEPTANCE_TEN.md](ACCEPTANCE_TEN.md) accepts the original criteria for P02-01, P03-01/04/06 and P04-01/02/03/04/07/08 after the complete13-step matrix. These decisions supersede older in-progress notes for those tasks only. Schema034/60 unchanged. Full phase/hosting/provider/production gates and explicitly separate extension limits remain open; generated STATUS.md is current.

Saved onboarding continuation — 12 November2026 IST: [ONBOARDING_WORKFLOWS.md](ONBOARDING_WORKFLOWS.md) documents server resume/atomic completion, canonical source/website review, saved-only integration metadata and preserved legacy-text intake. [DELIVERY_AND_PENDING.md](DELIVERY_AND_PENDING.md) separates delivered scope and pending packages. Schema034/60 unchanged; current task counts are generated in STATUS.md; no phase/deployment acceptance.

Current ten-workflow continuation (12 November2026 IST): [AGENCY_TEAM_WORKFLOWS.md](AGENCY_TEAM_WORKFLOWS.md) records real team/assignment UI, scoped assignment revocation, location revision edits, persisted agency name, client search and bounded role changes. Schema034/60 unchanged; current counts/prerequisites in STATUS.md. This is child-deliverable progress, not full-parent/phase acceptance or deployment.

These repairs support P01 reliability and preparatory P02 security/integration work. They do not complete P02-05 session/cookie/rate-limit work, the P02-06 integration registry, OAuth lifecycle, or production acceptance. Product schema stays029/50; no historical migration changed.

## Password reset and bearer compatibility

Password reset now locks the canonical user before checking the current token, changes password material and consumes that user's pending reset links in one transaction. An already used, expired, ambiguous duplicate hash or missing-user link cannot update credentials. SQL compares UTC DATETIME values independently of the SQL session timezone. The compatibility lookup converts those values explicitly to UTC ISO strings. The older separate update/mark helpers remain for trusted compatibility callers; public recovery uses only the atomic command.

A failed token-consumption write rolls back the password change. A lost commit acknowledgement remains uncertain: the response tells the user to try signing in or request a new link; it does not claim that rollback is proven. There is no automatic reset replay after uncertainty. Deleting/consuming another user's token ID through the compatibility helper cannot modify that other user.

Expensive password derivation happens only after the link is known valid under the lock. Recovery initiation and completion share the existing process-local5/hour/IP limiter. This is not a persistent/distributed rate policy; proxy topology and durable limits remain open. Account lockout cleanup follows confirmed reset and cannot negate its success, even if cleanup fails.

New login/register tokens carry a keyed password-material binding. Every authenticated request verifies the signature, strict HS256/JWT header and bounded required claims, then loads the current user and compares that binding. Password material is never embedded as plaintext in the token. Stored role/admin status remains authoritative. Changing a password invalidates previously bound tokens at subsequent authentication checks. Already authenticated in-flight operations are not canceled by this mechanism.

**Compatibility cutover:** deployed tokens without the binding will receive401 and require sign-in again. The low-level legacy signing/verification utility remains test-compatible but such a token cannot authenticate a request. All serving instances must run the new authentication code before relying on this behavior; an old binary continues its old token policy. Cookie migration, CSRF, durable individual-session logout/revocation, refresh tokens and persistent login-limit state remain separate work. The random jti is an identifier, not a replay-prevention guarantee.

Legacy password rehash first verifies the presented password and uses an exact old-hash/salt conditional UPDATE. It cannot overwrite a concurrent reset. Login awaits the rehash, re-reads and verifies the current user before issuing a token or returning identity metadata. Missing-user password UPDATE returns false; connected storage failures cannot silently fall back to an in-memory identity.

## Recovery links and public responses

APP_URL supplies the sole HTTPS origin for reset links, defaulting to the confirmed production domain. Userinfo, non-HTTPS schemes, paths, queries and fragments reject. Request Host and forwarded host/protocol values never select where the token is sent. Configure a real HTTPS development/staging origin before testing actual mail.

Known/unknown-account and provider-returned/throwing email outcomes share a neutral request acknowledgement when storage is available. It says delivery is unconfirmed. Provider errors and user/token/password details are not returned. This is not a constant-time anti-enumeration system or durable email outbox: user lookup/storage availability and response timing still require broader review. Configuration/storage failures return503. No public response claims mail delivery; no external security alert is emitted by reset completion. The token remains bounded by expiry if dispatch fails.

## Integration credential authority

Catalogue, save, test and delete now require explicit client scope; missing/conflicting aliases or foreign clients cannot fall back to the first company. Test/save resolve masked placeholders only from the exact same company/provider's stored secret. Fields are flat bounded strings; ciphertext-shaped submissions and nested objects reject. Omitted existing string fields are retained; an explicit empty string clears that field. This is still a compatibility provider-key format, not the complete typed provider/alias registry or OAuth lifecycle.

Encryption and masking share one secret classifier, covering smtpPass, password/token/key/auth/secret and API credentials stored in login. Browser metadata fully masks secrets, including short values; unknown nested legacy values are omitted rather than exposed. Newly saved affected fields are encrypted. Existing plaintext historical rows are not scrubbed or rewritten automatically; coordinated key recovery/rotation and data repair remain separate operational work. Existing AES-GCM ciphertext compatibility is retained.

Confirmed integration writes now commit/read their actual stable provider record on one connection and return directly; successful SQL saves cannot fall through to a production fallback error. Missing/empty reads and affected-row deletes are authoritative. last_tested_at stays null for an untested save. Saving credentials is labelled saving, not activation or verified authorization. Connected SQL failures cannot use memory success. Concurrent whole-credential edits still require a future version/CAS protocol; the company mutex serializes writes but does not make a stale client merge safe.

Catalogue metadata no longer advertises server-global transports/tokens as client connections or uses stored flags as proof of current authorization. Provider check output is a fixed public DTO, excluding raw payloads/errors/URLs/account objects. A successful connection check does not establish publishing/sending permission. Place ID syntax without an API request and untested Search Console credentials return NOT_VERIFIED. Supported live check adapters remain separate; unsupported aliases are not silently promoted into a capability.

The website integration check accepts only an HTTPS root URL for a domain already registered under that client. It reads exact ownership TXT/routing evidence via the canonical DNS verifier; it performs no arbitrary URL fetch or redirect following. It reports TLS/deployment as UNVERIFIED and does not register or attach hosting. This does not establish general SSRF protection for all existing provider/network/render endpoints; bounded safe network primitives remain P02-07/P04 work.

Frontend integration loads and test/save responses are scoped to actor/client and modal sequence. A failed metadata read clears stale cards and shows unavailable. Old modal results cannot replace a newer modal's result; old-client saves cannot reload/close the current client. These fences do not cancel an already-started server/provider operation. Integration deletion still retains underlying provider-side connections until separately revoked at the provider.

## Evidence

See [security and integration evidence](evidence/security-and-integration-boundaries.json), [route inventory](evidence/route-contract-inventory.json) and EXECUTION.md. Source inventory remains138 declarations/135 terminal handlers with3 shared AI chain entries; recovery extraction increases imported registrations to27. Billing is excluded. No production database, hosting, provider send or deployment was performed by these tests.

Current coordinated dependency:034/60 tables (next035), with agency/client assignments, conservative request-local roles, archive pause, revocation-aware bearer auth and provider registry aliases. Source/fact structures and historical001–033 identities are unchanged. Use BATCH_10_AGENCY_SECURITY.md and STATUS.md for current role/rollout/acceptance limits; older totals above retain their historical evidence scope.
