# Google Calendar push notifications

20 November 2026 IST · P07-05

A client manager opens **Google Calendar push** in the Sales workspace and loads the saved channel status. Register using the client’s saved Google connection. Migration 060 adds one durable channel row per client. The channel uses a random callback token with only its hash stored. The HTTPS endpoint address comes from `PUBLIC_APP_URL`. The watch call is sent once after the database reservation. An ambiguous Google response leaves the registration unconfirmed and prevents duplicate attempts. Channel state and expiry use the platform time zone when displayed.

Google sends an empty callback to `POST /api/webhooks/google-calendar`. The handler checks channel token, exact resource, expiry and a strictly increasing unsigned message number. An early `sync` signal can be acknowledged while registration is pending. It creates no work. The durable message watermark handles duplicates and reordering. A valid change signal can advance up to 25 healthy, unclaimed appointments for that tracked calendar. The handler coalesces signals to at most one wake per channel per minute and preserves existing failed-check backoff.

The dispatcher still reads each exact Google event before applying a CRM change. A notification reporting `not_exists` is a wake-up signal with the same verification path. Polling covers missed signals, in-flight checks and subscription downtime. The Sales report records registration requests, confirmed registrations and local disables. Verified appointment activity comes from exact reads.

Both `ENABLE_CALENDAR_PUSH` and `ENABLE_CALENDAR_RECONCILIATION` must be enabled. Push defaults off. The request asks Google for a channel lifetime of 24 hours. An active channel is eligible for manual renewal during its final hour. Local disable immediately rejects future signals from the channel. Google can continue sending until its remote channel expires. Automatic renewal, remote channel stop, live OAuth and the live inquiry-to-booking pilot remain open. [Local acceptance evidence](evidence/calendar-push.json)
