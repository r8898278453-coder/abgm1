# Google Calendar appointment creation and recovery

20 November 2026 IST · P07-05

An authorized client operator can check availability, create a timed appointment on the client's saved Google Calendar, and stop active CRM inquiry follow-ups once the provider confirms the exact event. The feature uses the existing lead workspace. Times are entered and displayed in IST and sent as absolute instants.

- `POST /api/companies/:companyId/sales/leads/:leadId/calendar-create` takes a 64-character hex request key, the expected booking revision, and offset-qualified start and end. The window must be in the next 60 days and at most 24 hours long.
- Migration 057 records a durable intent before sending. Only its inserting request may attempt the Google event POST. Local overlap checks are scoped to the client and configured calendar. The handler checks Google FreeBusy and refreshes access and calendar binding before the write. FreeBusy and insert are separate operations. External writers and other clients sharing a calendar can change availability between them.
- The provider receives a deterministic event ID, a private intent marker, a generic title and event times. The create sends no attendees or updates. The event ID, marker, confirmed status and exact times must match on read-back.
- The CRM confirmation, intent state, audit and follow-up exit commit together. A pending intent prevents an overlapping platform booking or manual evidence change for that lead until the scheduled end. Exact concurrent retries reuse the intent. A different command with the same key conflicts.

The client Sales work report displays verified Calendar appointment activity for the selected IST day and separately counts current Calendar creates awaiting verification. Older report snapshots retain their existing definitions.

## Recover a lost or ambiguous response

Load the appointment record for the same client and lead. If it reports a pending creation, select **Verify calendar creation**. The corresponding endpoint is `POST /api/companies/:companyId/sales/leads/:leadId/calendar-intents/:intentId/reconcile`. It reads the deterministic Google event and can confirm it in CRM. It issues no new Google create. Verification remains available after switching off creation. If the event remains pending, check the configured calendar and its access before taking further action. Pending events cannot be attached through the automated path after their scheduled end.

## Rollout and remaining acceptance

Calendar creation defaults off with `ENABLE_CALENDAR_CREATE=false`. Roll out schema 057 before serving the new routes. Live OAuth with an event-write credential, a dedicated test calendar and scoped canary evidence remain pending. Google Calendar reschedule and cancellation and appointment reminders remain open. Existing CRM reschedule and cancellation continue to record changes an operator made externally. P07-08 requires a real approved inquiry-to-booking pilot including failure and no-reply cases.

See the [local acceptance record](evidence/calendar-create-and-recovery.json) for the SQL, browser and restore results.
