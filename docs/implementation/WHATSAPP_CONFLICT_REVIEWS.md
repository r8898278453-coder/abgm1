# Audited inbound conflict resolution — 13 November 2026 IST

Operators can investigate a WhatsApp replay conflict and explicitly retain the original signed event. Changed replay content is never promoted. Release removes only the reviewed event's quarantine; consent, message approvals, unknown provider outcomes and other contact conflicts remain independent guards.

| Delivered control | Actual behavior |
| --- | --- |
| Privileged inspection | Assigned read roles see a metadata-only conflict list. Canonical body/provider reference and investigation notes require current manage, approve and execute rights together. OWNER/ADMIN can review; STAFF/APPROVER/VIEWER cannot. |
| Original evidence verification | Release recomputes the immutable original input fingerprint using the retained inbox body/media/kind and original sender/WABA/contact/time. Missing or changed canonical evidence cannot be released. |
| Private observations | A new changed-input fingerprint records only field-change flags and an observation revision. Candidate body, candidate contact address, credentials and arbitrary raw payload are not retained or returned. |
| Exact review | Review binds expected review revision and conflict revision, actor, decision and20–1000-character investigation evidence. KEEP_BLOCKED is the default. Only ACCEPT_ORIGINAL can acknowledge known variants. |
| Replay identity | Stable actor/client/event request key plus exact intent hash. A repeated acknowledged/unknown-ack request returns its historical review and requires status refresh. A changed intent on that key conflicts. Historical replay never clears a newer conflict. |
| Atomic decision | Company lock, current roles, canonical evidence, uncertain-send guard, review row, monotonic revisions and audit commit together. Audit failures roll back. Concurrent old-revision decisions have one winner. |
| Distinct conflict reopening | A previously unseen changed fingerprint increments conflict version, cancels current work and reopens quarantine, including after an earlier release. A racing stale review cannot acknowledge this newer observation. |
| Reviewed variant discard | Identical variants already covered by an accepted review are acknowledged as discarded on provider redelivery, without importing content or recreating work. Unresolved variants remain retryable. Duplicate variants do not repeatedly increment conflict versions or audit rows. |
| Consent and send uncertainty | Resolution does not edit contact permission, queued grants, provider intents or delivery state. ACCEPT_ORIGINAL is refused while an approved send is UNKNOWN/DISPATCHING. Opt-out remains effective after release. |
| No work revival | Existing cancelled tasks/jobs/enrollments remain cancelled/exited. A later eligible inquiry or a new explicit operator enrollment is required. No message is sent by review. |
| Bounded incident state | At most100 distinct observation fingerprints per event. Overflow records a sticky quarantine and cannot be released through this API; repeated overflow does not create unbounded observations/revisions. At most1000 human review records per event. |
| Review UI/history | Scoped list/inspection/decision/evidence, explicit no-send/no-consent-change copy, saved IST review history, retained unknown-ack draft with identical-context retry, changed-version reload guard and late-client/session fences. Public event history separates historical conflict from current quarantine. |

## Ownership and migration

server/whatsAppConflictLifecycle.ts owns source observation/version updates inside the existing inbound transaction. server/whatsAppConflictReviews.ts owns privileged inspection and reviewed decisions; shared/whatsAppConflictReviews.ts owns strict inputs; WhatsAppConflictReviewPanel.tsx owns UI. Existing webhook, event-time quarantine, workflow cancellation, permission and send owners remain canonical. There is no second intake, scheduler or send engine.

Forward042_whatsapp_conflict_reviews adds four counters/flags to whatsapp_inbound_events and two tables (whatsapp_conflict_observations, whatsapp_conflict_reviews):79 canonical tables, next043. Historical001–041 are unchanged. Existing flagged041 rows backfill to unresolved conflict revision1; original flags/hashes/body stay intact. Repeated migration does not clear a reviewed revision. Old payload variants had no stored fingerprint and can therefore count as a newly observed variant if redelivered later.

Scoped no-store APIs: GET `/api/companies/:companyId/sales/inbound-conflicts` (up to50, unresolved first); GET `/inbound-conflicts/:eventId` (privileged canonical inspection, up to100 observations/newest20 reviews); POST `/inbound-conflicts/:eventId/review`. Event IDs are opaque scoped record identities, not payload or contact hashes. Full inspection is separated from read-only list access. SQL mutations recheck role authority inside the retained transaction.

## Remaining gates

This resolves ordinary retain-original incidents. It does not accept a changed candidate as truth, erase suppression, declare a send unsent, restore deleted canonical evidence, or release overflow incidents. Those require separate incident policy; there is no force-clear path. The operator's external provider investigation is declared evidence, not an automatically verified provider assertion.

Unmapped events still depend on correcting sender ownership and provider redelivery retention. General operator replay/dead-letter intake, email mailbox/bounce integration, booking/calendar, broader automation/report reconciliation and retention/release acceptance remain open. Local tests do not establish live Hostinger workers or provider permissions. No production migration/deployment, environment activation or live message was performed. Sending and reel rendering remain default off; billing remains excluded.

Validation and source fingerprints: evidence/whatsapp-conflict-reviews.json. No entire parent/phase is accepted by this batch.
