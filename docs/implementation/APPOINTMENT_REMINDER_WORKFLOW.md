# Customer appointment reminders

20 November 2026 IST · P07-05

Select the **Appointment reminder review** template in Sales review workflows. Save and approve its single message-review step. Select the customer lead, load the confirmed appointment, choose the review lead time, record the enrollment evidence, and schedule the review. The UI shows the appointment and due time in IST. The underlying workflow schedules by absolute time using the existing durable SQL queue. Supported offsets are 5 minutes to 24 hours before an appointment within 60 days.

The enrollment binds the customer, confirmed appointment revision, due time, contact permission and approved workflow. Exact request replay reuses the enrollment. A booking revision can have one active or completed reminder. An exited reminder with a provider acceptance or unresolved dispatch continues to block duplicate enrollment. Booking reschedule or cancellation exits old active reminders, revokes unstarted sends and fences their queue jobs. A pending provider change blocks reminder eligibility until the booking is verified. A changed time requires a fresh enrollment and approval for the new revision.

When due, the existing queue produces a review with the saved appointment time. An operator uses the existing approved WhatsApp reply panel to approve exact text and recipient. The send worker rechecks the appointment, actor, permission, policy, sender, 24-hour customer service window and message limits at the existing provider boundary. Before claiming a send for an appointment tracked by the platform, the worker also checks the exact Google event. A changed or cancelled event stops the old approval. Unavailable evidence defers dispatch within the appointment deadline. The workflow expires at the appointment start. A send already in flight can still return provider acceptance after a booking change. Such an outcome remains recorded without reactivating the old workflow.

The live IST Sales report includes scheduled, ready and stopped review activity, provider outcomes and the current open reminder count. Signed provider receipts continue to supply delivery evidence. No new timer, send adapter, migration or feature flag is required. WhatsApp sending uses the existing default-off `ENABLE_APPROVED_SALES_SEND` setting.

Email, SMS and WhatsApp templates outside the customer service window remain open. Live calendar OAuth and the isolated P07-08 inquiry-to-booking pilot remain pending. [Acceptance evidence](evidence/appointment-reminder-workflow.json)
