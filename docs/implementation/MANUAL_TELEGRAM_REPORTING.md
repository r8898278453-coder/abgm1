# Manual Telegram daily accountability — 17 November 2026 IST

The canonical daily recorded-work report, CSV and digest now include manual Telegram activity and current unresolved work. These readers do not dispatch alerts, alter the journal or resolve uncertainty.

| Selected-day activity | Source definition |
| --- | --- |
| Requests recorded | Committed AGENCY_TELEGRAM_MANUAL_PREPARED audit rows, including admission already paused because configuration was unavailable |
| Provider boundaries recorded | Committed SENDING audit transitions; a boundary record does not prove network I/O occurred |
| API-accepted | Committed API_ACCEPTED audit transitions; recipient delivery/read remains unverified |
| Uncertain outcomes recorded | Committed UNKNOWN audit transitions; an unconfirmed settlement without an UNKNOWN commit is not invented as an activity event |
| Paused before provider I/O | Committed PAUSED transitions plus initial admission records explicitly carrying bindingAvailable=false; an absent legacy binding flag does not imply pause |
| Prepared requests cancelled | Committed CANCELLED audit transitions; idempotent cancellation replay adds no event |

Activity uses each committed audit record's stored event timestamp and the existing half-open Asia/Kolkata date bounds. It does not use current mutable journal state or provider timestamps to rewrite the selected day. Source transactions can become visible after a report read; this remains a current read model, not a finalized immutable report run or database-commit-time ledger.

Current backlog separately counts PREPARED, SENDING and UNKNOWN journal rows across ALL dates. SENDING/UNKNOWN are not retried or converted to recipient delivery states. Invalid journal state/casing refuses the report rather than hiding bad rows as zero backlog.

Shared `manualTelegramReporting.ts` owns the nine labels/metric keys consumed by report types, CSV and UI. Existing authenticated/no-store daily report route, read-only SQL deadline snapshot, fixed CSV columns and formatter remain canonical. The two new aggregate reads share that snapshot. Raw message text, actor identities, provider payloads, token, chat ID, destination fingerprint and request hashes are not selected for this report.

The CSV and digest require all nine safe nonnegative integer metrics. Missing/invalid coverage refuses export/digest; unknown counts never default to zero. Manual counters remain distinct from direct WhatsApp and scheduled-notification counters. Activity categories overlap and must not be summed into unique requests, attempts, incidents, completed work, clients or revenue. Current backlog must not be added to selected-day activity. The validated digest remains below Telegram's4096-character limit even with maximum safe integer counts.

Local evidence includes real journal execution/replay/cancel/lost-ACK transitions reconciled to the report, exact IST boundary records, late next-day settlement records, tenant/case isolation, missing binding evidence, current all-date backlog, negative/positive SQL session offsets, history retained after accepted journal-row deletion, invalid-state refusal, CSV/digest privacy and browser missing-metric export/client-switch checks. Tests use disposable MariaDB and mocked browser/provider calls.

Schema045/81 is unchanged; no migration source changed. Next unused migration046. No production access, provider sends, deployment, environment publication, scheduling/destination change or activation occurred. Billing is excluded; automatic sending/rendering remain default off.

P09-01 and P09-04 remain in_progress. This closes the manual-journal reporting gap from the previous batch, not complete multi-module reconciliation, immutable report snapshots, scheduled destination/escalation acceptance, live bot verification, inbound commands or full phase gates. Exact checks/fingerprints: `evidence/manual-telegram-reporting.json`.
