# Calendar read verification, 20 November 2026 IST

CRM appointment evidence now offers two read checks against a separately configured Google Calendar. The selected time window can be checked for availability and an exact Google Calendar API event ID can be checked for confirmed timed start and end. An operator can use the returned event times in the IST form and then save the existing CRM evidence record.

Configure Google Calendar in the client Integrations page with its exact calendar ID, a current token with Calendar read access and its ISO expiry. The token uses the existing encrypted integration store. Places and Business Profile credentials are separate. The connection test checks FreeBusy access and the CRM event lookup checks access to the requested event.

The appointment write role, lead ownership and current credentials are checked before and after the provider request. The route refuses browser-supplied calendar IDs and reads only the saved calendar. Token rotation, disconnection or permission loss during the request invalidates the result. Responses omit event titles, attendees, credential data and unrelated busy intervals. The client clears the result when the appointment inputs change.

FreeBusy checks compare the requested and returned UTC window and the exact calendar key. They reject malformed or denied results. The interval is treated as half-open, so adjacent events are compatible. A free result describes the observation time. Event verification requires the exact returned ID, confirmed status and a valid timed interval. All-day and unconfirmed events require separate review.

P07-05 advances with read availability and existing-event verification. Live delegated OAuth setup and reconnect, provider-created appointments, reschedule and cancellation writes, reminder retries and the P07-08 real enquiry-to-calendar pilot remain open. The CRM evidence record keeps its operator-recorded provenance. No schema migration was needed. Tracker remains at 62 validated, 15 in progress, 15 planned and one blocked.

Verification passed across 158 regressions, disposable native SQL, three Chromium workflows, TypeScript, build and frontend budgets. [Verification record](evidence/calendar-read-verification.json)
