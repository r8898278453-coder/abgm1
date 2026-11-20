# Google Calendar booking limits and buffers

20 November 2026 IST · P07-05

A manager edits **Google Calendar booking policy** in the client’s Sales policy. Set the minimum and maximum appointment duration, preparation and follow-up buffers, minimum notice and booking horizon. Save through the existing Sales policy version check. The existing Sales policy save behavior invalidates active workflow reviews when their policy changes. Older records default to any positive duration up to 24 hours, zero notice and buffers, and a 60-day horizon. An older client saving the other policy fields keeps the existing booking settings.

The appointment form displays and evaluates local times in IST. Server admission uses absolute times and the database clock. The padded interval must start at or after the current time. The appointment end must fall within the configured horizon. Availability returns `WORKSPACE_BOOKINGS` for a local conflict and `GOOGLE_CALENDAR` for provider results. The provider query checks the appointment plus the requested before and after buffers.

Within a client’s tracked Calendar, both the requested slot and existing holds use the current saved buffers. The gap between consecutive platform bookings must therefore accommodate the earlier appointment’s follow-up buffer and the later appointment’s preparation buffer. Exact boundary contact is allowed. Before a provider write, the server rechecks the policy, authority, reservation and local conflicts. Google receives the exact appointment times. Buffers are enforced by this platform and are not separate Google events.

Manual evidence of an already booked appointment and verified external Calendar changes can still be recorded. External users or other systems can change Google availability after a check. Live Calendar acceptance and the inquiry-to-booking pilot remain open. Schema 061 is unchanged. [Local acceptance evidence](evidence/booking-slot-policy.json)
