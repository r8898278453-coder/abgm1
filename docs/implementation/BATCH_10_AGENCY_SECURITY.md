# Grouped agency and security delivery

Current security/policy checkpoint (12 November2026 IST): [SECURITY_POLICY_GROUP.md](SECURITY_POLICY_GROUP.md) records035/63 (next036), opt-in cookie/epoch security, canonical aliases, PKCE/refresh groundwork and client goals/shared admissions. P02-05/P02-06/P04-05 are locally accepted; seven other targets remain partial. Historical001–034 unchanged; no phase, provider activation or deployment accepted. Older schema/status notes below describe earlier checkpoints; STATUS.md is current.

Current local acceptance (12 November2026 IST): [ACCEPTANCE_TEN.md](ACCEPTANCE_TEN.md) accepts the original criteria for P02-01, P03-01/04/06 and P04-01/02/03/04/07/08 after the complete13-step matrix. These decisions supersede older in-progress notes for those tasks only. Schema034/60 unchanged. Full phase/hosting/provider/production gates and explicitly separate extension limits remain open; generated STATUS.md is current.

12 November2026 IST. This group takes the ten requested tracker packages together, plus their directly connected agency UI package (P03-04). Current target034_agency_security_foundation /60 canonical tables; next035. Historical001–033 identities are unchanged. No production migration, deployment, external messaging or provider action performed.

Continuation: AGENCY_TEAM_WORKFLOWS.md closes the previously pending membership editor, loaded-client search, location-edit and name-setting slices. Remaining-column statements below describe the original checkpoint; full branding, analytics, scalable search and earlier gate acceptance remain pending.

## Package-by-package delivery

| Tracker | Delivered code and local evidence | Full-package acceptance still open |
| --- | --- | --- |
| P02-01 | Existing route declaration guard retained; agency/security contracts, roles, revision/error/privacy policy below; current route inventory has no terminal collisions | Full architecture gate and earlier reliability acceptance |
| P02-02 | Existing company list/create and auth/me moved into injected company/session owners; new agency APIs share retained-connection mutations; compatibility endpoints preserved | Remaining monolithic routes/repositories and complete seam audit |
| P02-03 | Shared transport refuses foreign/ambiguous paths and obsolete-token replies; actor changes/logout purge private workspace caches; new agency writes are revision-bound and stale-client fenced | Complete workspace-provider/feature-client extraction |
| P02-05 | Current bearer-session revocation persists hashed jti/expiry; new logout; password binding retained; DB-clock concurrent login-IP admission limits survive process-local reset | Cookie migration/CSRF design, all-session revocation, persistent account-failure lockout and retention |
| P02-06 | Shared registry separates Places/GBP/Search Console and canonical purposes; serpapi/smtp aliases read safely; conflicting configured aliases refuse rather than merge credentials | Full provider catalogue/schema consolidation and OAuth readiness verification |
| P03-01 |034 owner/agency membership/client backfill; new company and ownership mapping commit together; case-safe owner protection; eight concurrent company creations keep one agency | Hosting/backfill acceptance and ownership-transfer/invitation workflow |
| P03-02 | Five roles, client assignments and ceilings; central request-local policy; assigned-client lists; unknown mutations default to management; role downgrade/removal take effect on new checks | Complete endpoint/worker role audit, legacy owner-only route parity and fine-grained UI coverage |
| P03-03 | Persisted scoped locations with nullable real geography; fixed IST; revision-bound active/archive lifecycle; archive disables autopilot and registered queue processing; reactivation does not enable it | Location edit/branch analytics and complete archive coverage across remaining legacy schedulers |
| P03-05 | Local service/appointment/B2B/product planning packs, locale and daily action planning target persist through the operations API | Global family-wide usage reservations, conversion-goal orchestration and complete module navigation |
| P03-06 | Public-only PWA shell; private API/uploads/authorized requests never cached or given HTML fallback; actor/logout private-cache purge; no offline send replay | Real-device/offline acceptance and full cookie/XSS/retention review |
| P03-04 (connected UI) | Agency screen uses real company/settings/location APIs; revision saves, unavailable/empty/uncertain/reload/client fences; fake branches, STRICT badge and fake white-label save removed | Membership editor, scalable search, aggregates and agency settings/branding |

These are implemented and tested slices of eleven parent work packages, not a claim that eleven full engineering acceptance gates have closed. TASKS.csv marks them in_progress. STATUS.md generates current totals; complete prerequisites remain in MASTER_PLAN.md.

## Ownership and authorization

An owner receives one deterministic agency ID and OWNER membership; each existing company maps through agency_clients. Platform admin remains a separate authenticated DB flag. No JWT/browser role grants agency ownership. New company creation and mapping use one transaction; a failed SQL write cannot return memory success. Legacy owner case comparisons use DB identifier equality, preserving existing principal identity. Owner membership cannot be removed/downgraded through the membership API, including differently cased IDs.

OWNER/ADMIN have read/write/approve/execute/manage. STAFF has read/write, APPROVER read/approve, VIEWER read. Non-owner/admin users additionally need an explicit assignment in the same agency/client; assignment capabilities cannot exceed membership. Downgrade adjusts existing assignments; removal deletes them atomically with the membership and audit event. Granting membership requires an existing user. This is existing-user membership management, not email invitations or ownership transfer.

The request policy uses AsyncLocalStorage, not shared mutable global request state. Sensitive integration/member/assignment operations require management. Known fact/source/content approval paths require approval; publishing/sending/public job admission require execution. Staff writes are limited to the explicitly classified draft AI/knowledge paths. Unknown mutations and legacy whole-workspace JSON saves require management. Saved-source POST query is read-only. Existing inline owner checks can still deny assigned staff; they are not removed as an unreviewed access expansion. Earlier P03 gate therefore remains open.

Read access is allowed for archived clients. Ordinary mutations/execution are blocked; only explicit operating-preference/location management can change an archived client's configuration. Archive and autopilot-off update share the audit transaction. Registered queue dispatch checks archive before the job handler and defers without consuming failure budget. This does not certify every older direct scheduler/provider entry point; update all server/worker instances together.

## API and stored operations

- GET /api/agencies lists caller memberships (bounded100); platform admins are independently recognized.
- GET/PUT /api/agencies/:agencyId/members and DELETE /members/:userId require agency management; member lists bounded200.
- PUT /api/companies/:id/assignments requires that client's agency management and a compatible existing membership.
- GET/PUT /api/companies/:id/operations loads/saves exact expectedVersion with status, planning pack, en-IN/hi-IN locale and dailyActionLimit0–500. Timezone is always Asia/Kolkata. The numeric value is a planning target, not a fabricated guarantee of all-family dispatch-budget enforcement.
- GET/POST /api/companies/:id/locations and DELETE /locations/:locationId persist private locations (max100) with revision deletion; latitude/longitude are supplied together or both NULL. Missing geography is never replaced with Maharashtra/India; the legacy company-data fallback no longer invents state/country/address.
- POST /api/auth/logout accepts {} and revokes the authenticated current JWT jti server-side. GET /api/auth/me retains its existing user shape and now has no-store/redacted failure handling.

Private API responses use no-store. Invalid commands400; denied roles403; missing entities404; stale/archived/conflicting state409; missing/uncertain storage503. Company creation/list retain paths, authorization and successful DTOs; storage errors now use redacted503 instead of raw500 bodies. Role/location/operations mutations and minimal actor/identifier audit events share a transaction. API location creation requires reload after unknown acknowledgement; a complete idempotent location-edit flow remains open.

## Session, limits, registry and PWA

Bearer/password binding stays compatible; cookie-only requests are not authenticated. No ambient cookie authority is introduced, so a cookie-CSRF migration is not falsely claimed complete. Logout revocation stores SHA256(session:jti), user ID and expiry, never a raw bearer. A newly issued different jti remains valid; password changes continue to invalidate old password-bound tokens. Browser logout clears local state immediately and attempts server revocation; offline failure does not claim server revocation succeeded.

Login IP admission uses a hashed scope, DB-clock900-second windows and25 accepted attempts. Exclusive upsert row locks avoid INSERT IGNORE shared-lock upgrade deadlocks. Existing process-local email lockout remains additional protection; it is not presented as persistent cross-process email failure state. Revocation/limit cleanup is an explicit remaining retention task.

Google Places, GBP OAuth and Search Console are distinct registry entries. requiresOAuth is a requirement, not proof of an implemented/connected OAuth lifecycle. Existing alias rows are preserved; if both canonical and alias credentials exist, reads/writes refuse INTEGRATION_ALIAS_CONFLICT. No secret values or account identities are silently merged. General key encryption remains the existing owner; key rotation is not implemented by this batch.

Service worker v2 caches public shell URLs only and retires older caches. It never caches API/uploads/authorized/foreign requests and never substitutes the shell for private files. Actor changes/logout purge scoped private workspace storage. Shared bearer transport accepts local API paths only and discards responses if the session token changed while pending. No offline operation queue authorizes sending.

## Verification and release boundary

Unit/HTTP tests cover role ceilings, concurrent request intent isolation, registry collision/Google separation, mechanical company endpoint auth/ownership, and execution of the actual service-worker fetch policy. Restricted native MariaDB tests cover owner backfill/replay/eight-way creation, case-safe owner protection, cross-agency/client/role checks, downgrade/removal, persisted null geography, stale/eight-way operation CAS, atomic archive/audit rollback, alias collisions,12-way persistent rate reservation and hashed logout/reissued-session behavior. Browser tests cover real API-backed agency UI, uncertainty/reload, viewer controls, stale client results, actor cache purge and stale-token/foreign-bearer refusal; full workspace regressions remain mandatory.

Schema034 is a coordinated opt-in release: pause/update all server/worker instances, use canonical migration CLI with backup/restore rehearsal, validate actual hosting permissions/runtime/cron and verify isolated owner/staff/viewer canaries before enabling access. Local runtime users remain DML-only; migration DDL tests use the migration principal. No production authorization follows from this document. Evidence and final check results are in EXECUTION.md and evidence/agency-security-group.json.
