# Critical operational episodes and bounded escalation

17 November2026 IST. P09-03 remains in progress. Schema049/87 tables, next050. Historical migrations001–048 unchanged. No production migration, opt-in activation, real provider send or deployment occurred.

## Signals and episodes

A third, default-off notification policy, critical_alert, uses the existing exact bot/destination approval, policy CAS, fresh actor/configuration guards, shared budget, durable notification occurrence and Telegram adapter. Enabling starts at the next future minute. The existing reminders stage observes up to two eligible clients per dispatcher pass using its own persisted selector cursor; there is no new timer, queue or send engine. Real cron/runtime readiness remains unverified.

Six fixed scoped categories are observed: outbound UNKNOWN or at least30-minute IN_PROGRESS message intents; UNKNOWN or at least30-minute IN_PROGRESS publishing claims; failed/dead-letter inbound intakes; queued capture runs with missing/wrong-type/terminal queue records; unresolved inbound event conflicts; and retained failed queue jobs. The source reader uses known canonical states and cannot be described as comprehensive corruption detection or full platform health. Categories overlap and are not unique customer/job incident counts.

There is one bounded current row per client/category. An observed0→positive transition opens a new monotonically numbered episode; a positive→0 observation resolves it. Unchanged counts update the observation time without creating transition-audit spam. An episode is observed category continuity, not a per-contact/job identity. If failures resolve and new failures arise between polls without an observed zero, they remain the same episode. Timeouts/unavailable sources fail the observation rather than fabricating a zero or resolution.

## Dedupe and escalation

Each open observed episode can produce initial level0, level1 after one hour and level2 after24 hours from first observation. The controller selects only the highest currently due unreserved level; missed lower levels are not backfilled. Maximum is three separately approved levels on the same currently approved destination. A reserved same/higher level suppresses repeat alerts, including changed counts in the same episode. Resolved/reopened episodes can have a new initial level.

Reservations are atomic with the existing notification occurrence admission and its audit. The hook rechecks exact company, category, episode, positive count, observation timestamp, stage and prior reservations before any insert. Observations older than five minutes refuse reservation. A stale/false hook rolls back every admission-hook write; independent earlier stale-claim recovery can still commit. Partial groups cannot reserve and suppress unsent items. Concurrent observers/workers share the company lock and unique reservation keys; only one effect owner proceeds.

A reservation is never released after a durable claim, UNKNOWN, blocked post-claim preflight or lost acknowledgement. There is no automatic retry of that level. A later scheduled escalation is a distinct pre-approved level, not a retry of the earlier message; the UI states this explicitly. Source state can change after observation/final check; messages are labelled observed evidence and do not prove the issue is still open at receipt time. Critical sends retain all existing stop/archive/actor/config/budget/strict-ACK boundaries and same-slot no-resend rules.

Messages contain a client reference and fixed category/count/episode/level/IST observation metadata. No customer names, lead content, actor identity, credentials, provider payloads or raw errors are included. A client reference disambiguates multiple clients sharing one agency chat. The notification journal stores hashes/metadata, not the message body. API acceptance is not recipient delivery/read confirmation.

Limits: six current category rows,1000 retained stage reservations per client,1000 existing notification occurrences per client/kind, one fresh RUNNING occurrence per client/kind,25 visible reservation-history rows and the existing cooperative work/read deadlines. Capacity exhaustion is visible and stops admission; no destructive retention/force-resend control is added. Dispatcher summaries expose only fixed numeric counts and availability; unavailable critical observation marks the cycle partial.

## Read-only operations UI

CriticalAlertPanel is lazily opened from notification history. It shows last-observed counts, first/resolved/last observation times, episode and stage history linked to canonical scheduled API evidence. Missing readers are unavailable, not zero. A history refresh performs no provider call or source-observation mutation. Viewers have read-only access; no UI action acknowledges, retries, resolves or forces a successful delivery. Client/session/request fences discard stale reads. Critical policy enable remains in the manager-only exact-destination settings panel.

GET `/api/companies/:companyId/critical-alerts` is queryless, authorized and no-store. It returns at most six current incident rows and25 reservation rows plus truncation/capacity metadata. Rows join the canonical critical notification occurrence by client/kind/due slot; no actor/content/binding hashes are exposed. Source/history/service/shared validators remain strict and bounded.

Owners: criticalAlertIncidents/shared criticalAlerts for observations, reservations, fixed messages and validation; CriticalAlertPanel/routes for private read-only review; criticalAlertScheduler inside the existing reminder stage; existing notification policy, bound occurrence and tenant transport owners for execution.

## Validation and remaining acceptance

See evidence/critical-alerts.json for completed checks. Native fixtures exercise source/category/client/state scope, concurrent observations/reservations, atomic admission rollback, UNKNOWN no retry across slots,1h/24h stages, resolve/reopen, stale evidence, capacity, actor/config/disable races, lost claim acknowledgement and private metadata. Tests use synthetic provider acknowledgements, not live sends.

Full P09-03 and phase acceptance remain open: real authorized destination/provider/Hostinger cron evidence, broader workflow reconciliation, measured capacity, retention management and release/canary gates remain separate. Current frozen V2/live daily report coverage is unchanged; this stage has its own incident/notification evidence rather than pretending complete daily workflow reconciliation. Critical alert preferences do not enable rendering, billing or automatic customer marketing messages.

Rollout/rollback: keep automatic dispatch stopped until migration and the new binary are verified. A prior binary does not understand critical notification kinds/history and may make its old history reader unavailable; SQL shape compatibility is not feature compatibility. Keep cron stopped on rollback and retain journals/reservations for investigation instead of deleting evidence to force replay.
