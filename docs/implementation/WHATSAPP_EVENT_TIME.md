# Verified WhatsApp event time and replay guards — 13 November 2026 IST

New signed WhatsApp inbound messages now carry their provider event time through persistence and reply-window checks. Previously local arrival time could extend a delayed message's free-text window and restart an inquiry workflow. This batch preserves delayed history while separating it from current automation.

| Delivered control | Behavior |
| --- | --- |
| Signed source clock | The complete signed raw batch is prevalidated. Each inbound message requires a strict seconds timestamp, numeric sender/WABA scope and valid contact address. Future timestamps beyond five minutes are refused before writes; the persistence service also checks database time. |
| Bounded parsing | Dedicated one-MiB raw body parser before general JSON decoding, existing100-event/10-entry/20-change caps,100 contacts per change, supported message field and bounded message bodies. Invalid batches have zero writes; unknown fields/states are counted as ignored. Duplicate contact profiles cannot select an arbitrary customer name. |
| Immutable event identity | Per-client provider event key preserves clock ordering even if an inbox history row is removed, and binds sender/WABA, contact, kind, body/media hash and provider time. The ledger duplicates no message body or credentials. Business inbox remains the canonical body owner. |
| Exact replay | Concurrent identical deliveries return the canonical recorded result. Legacy processed markers remain respected and are never relabeled as verified provider evidence. Changed content/source/time on the same key is rejected. |
| Atomic persistence | Event ledger, webhook marker, inbox, lead creation where eligible, source cancellations, inquiry capture and audit/outbox share the existing company transaction. Failed persistence never commits a processed marker. |
| Out-of-order history | Older-than-current provider messages are STALE. They remain visible in history but do not cancel current workflow work or change the actionable inbound snapshot count. Equal-second events remain actionable because provider ordering is not established within that second. |
| Expired history | Events at least24 hours old are EXPIRED. They do not create a new lead or an inquiry review, and arrival cannot reopen a free-text reply window. Existing-contact history still persists; unlinked history can be reviewed manually. |
| Delayed STOP | Exact opt-out phrases always apply, including stale/expired events. Suppression and pending-task cancellation commit with the inbound record. A later ordinary inquiry never grants permission again. |
| Reply-window owner | Canonical salesSendEligibility uses provider occurrence time for newly verified rows. Existing quiet hours/caps/permission/global-stop and final Meta send boundary remain in force. No alternate send service or approval is created. |
| Replay-conflict quarantine | Changed signed content records a durable conflict, exits the contact's workflow/pending inquiry work and blocks enrollment and both manual/approved sales sending. The original inbox/body is retained. No unsafe resend or conflict-clear override is exposed. |
| Partial/unmapped retry | Successful earlier batch items persist and dedupe on retry. Unknown or ambiguous sender mapping now returns503 rather than acknowledging discarded events; a corrected mapping can receive redelivery. A503 reply does not undo earlier committed items. |
| Operator history | Scoped no-store provider-history API/UI separates provider occurrence and local receipt clocks in IST, labels stale/expired/opt-out/conflict states and excludes unverified historical rows. Unknown/corrupt states and failed reads do not display current/healthy evidence. Inbox rows show their clock provenance. |

## Data and ownership

Forward041_whatsapp_inbound_events adds whatsapp_inbound_events:77 canonical tables; next042. Historical001–040 are unchanged. server/whatsAppWebhook.ts owns signed bounded batch parsing; server/whatsAppInbound.ts owns atomic persistence/replay; shared/whatsAppEvents.ts owns clock/disposition contracts; whatsAppEventTime.ts owns shared SQL clock/actionable/conflict rules. Existing inbox, workflow, inquiry, consent and message services retain their canonical ownership. The server.ts adapter forwards the verified source once.

GET `/api/companies/:companyId/sales/inbound-events` returns up to50 newest event summaries plus truncation. It exposes no body, recipient, sender IDs, hashes or private worker credentials. Existing inbox reads preserve provider metadata and explicitly label arrival-only records. Sales audit activity counts the local commit day in IST; late events do not fabricate historical actions on the provider occurrence day.

Exact retries after an uncertain commit cannot create duplicate work. A changed replay may return503 after its conflict/quarantine was durably committed; subsequent retries keep the original canonical input. Local receipt and provider occurrence timestamps are not interchangeable. Receipt delivery summaries retain their existing monotonic sent/delivered/read behavior and observed receipt timestamps.

## Compatibility and remaining gates

Historical rows and trusted legacy internal helper calls without provider source retain existing arrival-time compatibility. They are visibly unverified, excluded from the verified-history API, and are not backfilled as provider timestamps. The public signed webhook always supplies validated source time; there is no request-body switch to select legacy mode. Historical windows naturally age out; this batch does not retroactively invent lost provider clocks.

Unmapped events cannot safely be assigned to a client. Recovery depends on provider redelivery while its retry retention lasts and on correcting the sender configuration. There is no global raw-payload quarantine, operator replay/dead-letter API or conflict-resolution override in this batch. Conflicted contacts remain blocked pending an independently audited resolution capability. Retention/deletion and full multi-module reporting remain open gates.

No production migration, deployment, environment activation, provider call or customer message was performed. Exact reply approval remains required; approved sales sending and reel rendering remain default off. Billing is excluded. Validation evidence: evidence/whatsapp-event-time.json. Full parent/phase acceptance is not inferred from this batch.
