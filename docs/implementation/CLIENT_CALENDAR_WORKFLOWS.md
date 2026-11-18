# Current client calendar, draft receipts and schedule review

18 November 2026 IST. This continues P05-08 and the operational mobile/recovery slices. Schema052_client_reports /90 canonical tables and frozen report V4 are unchanged; next migration053. No new scheduler, draft ledger, AI provider or publication engine was introduced. Earlier pending commit d1f02ba was successfully pushed before this group began.

## User workflow

The calendar now reads current stored records for the selected client/month instead of mirroring a potentially stale `posts` prop or using a fixed historical calendar. Its context comes from current company details, capability pack, client goal, monthly target and profile/operations revisions. Missing city/category remain empty/unavailable. The context fingerprint binds those saved settings; browser business text is not authoritative.

The writer chooses a plan month, weekdays, a maximum1–12 text-draft attempts, a supported text target and an IST time. Future dates are computed from that cadence and current server observation time, with a366-day horizon. Defaults are suggestions, not a claim of a universal industry strategy. No dates use a hardcoded year/festival/business. Google/Facebook/Instagram drafts are supported; WhatsApp outbound remains in its separate consent-governed sales workflow. The existing approved-fact AI route receives the selected client and goal/pack. It remains responsible for fact access, changed/conflicting knowledge, model attempts and budget admission. Draft text is unverified review material; there is no automatic media render, approval, scheduling, publication or customer send.

Each successfully generated draft is saved using an actor/client-bound request key and normalized input hash. Generation failures/invalid content, new saved drafts, recovered existing records, uncertain saves and later attempts not started are reported separately. An uncertain save stops later generation/save attempts. The view opens the planned month so current saved records can be inspected. Read-only viewers do not get draft/decision controls; approvers get the bound approval action, while writing/rescheduling requires write authority.

Selecting a post shows the actual stored headline, caption, CTA, targets, state/revision and attachment-presence information. Media must be reviewed in Content Studio; the calendar does not automatically fetch arbitrary attachment URLs. The same existing publication workflow/audit transaction handles review, approval, reschedule and cancellation:

- Request review from a draft/failed post: move to pending_approval.
- Approve only a viewed pending_approval source version and current context. The schedule must be valid/future and within the horizon; unsupported targets and Instagram without an image need further review.
- Reschedule: save the new IST date/time and return to pending_approval, incrementing the canonical workflow revision. Earlier approvals/source hashes no longer authorize the changed occurrence.
- Cancel scheduling: return the eligible post to draft with a new revision. It retains the post and history. It does not claim to recall a provider operation already in progress.

Current dispatch states outside READY/FAILED block schedule changes in the canonical backend; the calendar also disables those actions and asks for publishing review. UNKNOWN never becomes an automatic Retry Publish action. Actual publishing stays in Content Studio/canonical workers with their existing policy, claims, quotas and provider-outcome rules. Calendar approval does not establish provider delivery, authorize an unreviewed asset, or weaken those execution guards.

## Durable save and cancellation recovery

The implementation reuses `publication_draft_intents`, `content_posts`, `publication_workflow_audit` and metadata-only agency audit records. The input hash has a purpose namespace and binds the actor, company, current-context fingerprint, normalized text, target and suggested schedule. Creating a post, linking its intent and recording the metadata audit commit together. Eight exact concurrent saves produce one post. Changed-content/actor reuse conflicts. A replay returns the current saved post lineage; it never recreates the original after edits or pretends it is newly saved.

Before POST, browser session storage keeps only the client/actor-scoped key and input hash. Generated text, captions and prompts remain out of recovery storage. The in-tab original body can be retried exactly; after refresh a key lookup recovers a committed post without regenerating AI text or spending another model attempt.

If the response is lost and no committed post is found, Safely close draft request takes the same client lock as creation. It either returns the already admitted post or saves a durable null-post receipt for the unused key. A later save using that key is refused. Repeated close requests are idempotent. This prevents a late original request and a replacement plan from silently creating duplicate drafts. An unacknowledged close retains its pointer and can be reconciled/repeated; the client never simply discards uncertainty. A currently authorized writer can close its own request while archived, without editing a post or admitting new work. Changed roles/assignments still deny access.

Intent-linked posts retain the existing foreign-key protection; scheduling cancellation is not history deletion. Plain legacy draft deletion stays in Content Studio and retains its existing confirmed-delete/failed-delete behavior. The workflow seam was mechanically extracted into `transitionPublicationInTransaction` so the new client/context/role checks and the existing state/audit mutation share one transaction instead of opening another pooled connection. Legacy wrapper semantics remain, with an additional exact revision exhaustion guard. This group does not impose mandatory peer approval on every legacy caller.

## Calendar time, scope and limits

Schedules use the existing canonical schedule parser, including historical full datetime/offset values. The read model selects a bounded neighboring-date candidate range, projects the actual execution instant into IST, and filters to the requested IST month. A UTC record on the prior month's last date can therefore correctly appear on the first IST day of the selected month. Displayed times are formatted as actual IST instants; CSV preserves UTC instants with an explicit Asia/Kolkata context. Malformed schedules remain visibly in need of review when they can be assigned to the month; they cannot be approved through this API. Existing date-only conservative due-time semantics are preserved, not silently rewritten.

At most1,000 candidate posts per calendar read and1,000 retained publication-intent receipts per client are admitted by this slice. The candidate window includes boundary days, so a high-volume neighboring period can make a month unavailable rather than produce a misleading partial calendar. The five-second read-only SQL deadline and no-store responses apply. No automatic retention deletion was added. Workflow revisions are selected as decimal strings, retain exact unsigned64-bit values, can advance from maximum-minus-one to maximum, then refuse further mutations instead of rounding or overflowing.

Every request checks the current client scope and SQL actor/assignment authority. All mutations lock the company, then validate the current post/context/source version. Unknown acknowledgements clear actionable data until a fresh read. Client/account changes abort or invalidate late responses, drafts, previews, histories and exports. The calendar CSV includes only validated month/post metadata and version/state/timing, not captions, private profile data, generated text, credentials or prompts. Spreadsheet formula prefixes are escaped. The mobile page has labelled controls and readable failure/recovery states.

## APIs and code ownership

- GET `/api/companies/:companyId/content-calendar?month=YYYY-MM` — current context and month records.
- POST `.../content-calendar/drafts` — explicit text-only educational draft, forced draft state, scoped request receipt.
- GET `.../content-calendar/drafts/by-request/:requestKey` — writer-owned recovery.
- POST `.../content-calendar/drafts/close-request` — atomic recover-or-seal.
- POST `.../content-calendar/posts/:postId/decision` — REQUEST_REVIEW, APPROVE, RESCHEDULE or CANCEL_SCHEDULE.
- Existing `.../posts/:postId/workflow-history` — canonical recent decision history, with an indication when older history exists.

All unrelated query/body fields are rejected. The shared client calendar model owns cadence/time/DTO/CSV contracts; the new server adapter owns authorization/context/idempotent admission; existing content writer, intent table, fact-generation route and publication transaction remain canonical. The legacy three-date helper remains only as a compatibility export; it is no longer the active calendar planner.

## Validation and remaining scope

See [CLIENT_CALENDAR_BATCHES.csv](CLIENT_CALENDAR_BATCHES.csv) and [evidence/client-calendar-workflows.json](evidence/client-calendar-workflows.json). Final verification passed136 isolated regression programs, all28 browser workflows and the complete disposable MariaDB suite, plus TypeScript/build/route/frontend/doc checks. This group contains26 connected functional slices, not26 completed original tasks. P05-08 moves from planned to in_progress. Upstream and phase gates remain open.

Still pending: an immutable batch-plan/version store with retained full content snapshots, automatically selected/confirmed offers and audience/language/brand policy, semantic topic/asset deduplication, a maintained locale-aware festival source with user confirmation, stronger platform-wide mandatory approval governance, the complete media/library strategy and production hosting/provider acceptance. Individual durable text saves and canonical occurrence revisions do not substitute for those features. The calendar deliberately contains no direct provider-send action. Rendering stays default off, billing stays excluded and no production deployment/SQL change or live model generation/publication/message was initiated by the calendar fixtures.
