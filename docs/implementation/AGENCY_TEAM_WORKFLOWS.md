# Grouped agency team workflows — 12 November 2026 IST

Current security/policy checkpoint (12 November2026 IST): [SECURITY_POLICY_GROUP.md](SECURITY_POLICY_GROUP.md) records035/63 (next036), opt-in cookie/epoch security, canonical aliases, PKCE/refresh groundwork and client goals/shared admissions. P02-05/P02-06/P04-05 are locally accepted; seven other targets remain partial. Historical001–034 unchanged; no phase, provider activation or deployment accepted. Older schema/status notes below describe earlier checkpoints; STATUS.md is current.

Current local acceptance (12 November2026 IST): [ACCEPTANCE_TEN.md](ACCEPTANCE_TEN.md) accepts the original criteria for P02-01, P03-01/04/06 and P04-01/02/03/04/07/08 after the complete13-step matrix. These decisions supersede older in-progress notes for those tasks only. Schema034/60 unchanged. Full phase/hosting/provider/production gates and explicitly separate extension limits remain open; generated STATUS.md is current.

This continuation delivers ten connected user workflows, completing more of the existing agency foundation instead of opening ten unrelated parent packages. These are ten child deliverables, not ten fully accepted tracker packages or phases. Schema034/60 and historical001–034 remain unchanged; next migration035. No production database, hosting deployment, provider request, customer message or billing change.

| Deliverable | Canonical implementation | Local acceptance |
| --- | --- | --- |
| 1. Read agency members | AgencyManagement + existing GET members | Owner/admin list; private failures and non-manager state |
| 2. Add existing account | Member form + PUT members | Saved list reload; missing/foreign/invalid owner commands refuse |
| 3. Change member role | Existing PUT, boundedAssignmentRole | Every valid old/new role pair retains a subset of both grants; incomparable STAFF/APPROVER becomes VIEWER |
| 4. Remove member | Member controls + existing DELETE | Owner protected; membership and assignments removed atomically; UI reloads |
| 5. Read client assignments | New GET companies/:id/assignments | Management required; bounded200; no cross-client/foreign-owner mapping exposure |
| 6. Save client assignment | Role-ceiling form + existing PUT | Only compatible current agency members; owner mapping rechecked on the retained SQL connection |
| 7. Revoke client assignment | New DELETE assignments/:userId | Client access disappears; agency membership remains; missing404 and audit fault rollback |
| 8. Edit saved location | New PUT locations/:locationId + location editor | Exact uint64 revision, paired real coordinates/NULL, scoped edit, stale409, audit rollback, eight-way single winner |
| 9. Save agency name | New PUT agencies/:agencyId + name form | Locked expectedName comparison, strict trimmed160-character bound, foreign denial, audit rollback, eight-way single winner |
| 10. Search assigned clients | AgencyView filter over authorized company list | Case-insensitive names, empty results, existing selection remains explicit; search does not grant access |

## Contracts and safety

GET agencies adds canManage; GET operations adds agencyId. Existing successful fields remain. Current inventory:171 declarations,32 registrations, no collisions. Four new declarations (agency name PUT, assignment GET/DELETE, location PUT) have one route owner, server/agencyRoutes.ts. Responses use no-store and existing safe400/403/404/409/503 policy. No request DDL or new provider/scheduler path.

Agency name PUT accepts {expectedName,name}; location PUT accepts {expectedVersion,name,address,city,latitude,longitude}. Both writes and minimal actor audit share one transaction. Location revisions increment even on same-value saves, preventing ABA edits. Name uses value comparison, not a monotonic revision: an intervening A→B→A name change cannot be detected; a versioned branding model remains pending. Membership and assignment commands retain existing authenticated management semantics; complete optimistic concurrency for role editors is also still pending. Do not claim otherwise.

Assignment revocation is explicit-client access removal. OWNER and ADMIN inherently retain agency-wide access; their assignment deletion cannot revoke that inherent role. Removing an agency member removes all their assignments. Role updates previously overwrote every assignment with the membership role; now narrower assignments stay narrower and incomparable permissions intersect at VIEWER. Promoting an agency membership to ADMIN intentionally grants agency-wide access and is explained in the form.

Team UI is keyed by company and agency, uses session-fenced apiRequest, ignores unmounted/obsolete responses, and disables writes until confirmed reload. Unknown acknowledgements retain forms and require reload before retry. Location edit remains mounted after uncertain saves; revision reload determines current state. APIs verify actual SQL roles and company-owner/agency consistency independently of UI flags. Existing location creation still lacks a durable idempotency key; uncertain creation requires reload, not blind retry.

Search covers the currently loaded authorized list, not server-side pagination or global agency discovery. Membership is by existing user ID, not email invitation. Agency name is saved branding text only; no logo/domain/SSL/white-label availability is implied. Planning limits remain planning targets. Full legacy endpoint/worker role parity, role-change race fencing at every provider boundary, all-session/cookie/CSRF/retention work and actual hosting/provider acceptance remain open.

## Verification

99 credential-isolated default regression programs pass, including all valid role-intersection pairs and strict inputs. Restricted disposable MariaDB10.11.19 checks actual name/location eight-way contention, exact stale conflicts, no foreign mapping grant, assignment removal/membership survival, narrower-role preservation, incomparable-role transitions and audit rollback, alongside the full fresh/upgrade/replay suite. Extended Chromium agency fixture covers all ten workflows, saved reloads, retained uncertain member form, viewer controls, client switch and existing transport/cache privacy. Full workspace Chromium, TypeScript, canonical build/source identities, route guard and generated-doc guard pass. Build retains its existing chunk-size warning.

No migration changed; the preceding copied-export034/60 preservation/replay evidence is retained, not claimed as freshly rerun. Current parent status and prerequisites remain in TASKS.csv/STATUS.md. P09-06 starts only the real name-setting slice; complete branding/domain scope remains open. Release/deployment remains separately gated.
