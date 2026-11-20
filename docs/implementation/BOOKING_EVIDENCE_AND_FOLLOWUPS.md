# Appointment evidence and inquiry follow-ups, 20 November 2026 IST

CRM users with write permission can record an appointment that a human has confirmed outside the workspace. The client and lead are checked on each request. Confirmation requires an external reference and explicit start and end times. The form uses Asia/Kolkata. The server stores UTC epoch milliseconds and checks the time window against the database clock.

The endpoint records confirmation, reschedule and cancellation as separate revisions. Rescheduling keeps the same external event reference. The company lock serializes appointment updates with inquiry enrollment and workflow exits. The request key permits exact recovery after a lost response. A different payload using the same key and a stale expected revision both conflict. Historical receipts can be replayed, and the UI reads the latest state after a save.

Confirmation and rescheduling exit inquiry workflows, cancel pending inquiry work and fence review and queued send jobs in the transaction. An active booking suppresses fresh inquiry admission and is checked again at the final workflow eligibility boundary. The guard follows active CRM aliases to their canonical lead. A cancellation or elapsed appointment permits a fresh eligible enrollment. Prior workflows stay exited. Retention workflows keep their own eligibility rules.

There are two send race cases. When the booking wins before a provider request, the stale send is cancelled. When the request has already crossed the send boundary, an acknowledgement can still arrive and remains recorded as provider evidence. The ended enrollment cannot enqueue a successor.

Migration 056 adds the append-only booking evidence table with scoped revision and request-key uniqueness. The uploaded database export retained business rows, owner mappings and its original ledger during disposable restore. The target is 56 migrations and 102 canonical tables. Replay applied zero migrations.

P07-04 covers local workflow exit races. P07-05 remains open for actual calendar availability, provider-created events and reminders. P07-08 remains open for a real inquiry-to-appointment pilot. Operators are recording an external confirmation rather than reserving a provider calendar slot through this feature.

Verification passed across 157 default regressions, native SQL, three Chromium workflows, TypeScript, build and frontend budgets. [Verification record](evidence/booking-evidence-and-followups.json)
