# Google Calendar OAuth

20 November 2026 IST · P02-07 and P07-05

Use an HTTPS `PUBLIC_APP_URL` and set `GOOGLE_CALENDAR_OAUTH_CLIENT_ID` and `GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET` for a Google OAuth web application. Register the exact redirect URI `<PUBLIC_APP_URL>/api/oauth/google-calendar/callback` in Google and enable the Calendar API. The browser popup runs on the same origin as the authenticated workspace.

A workspace manager loads **Google Calendar connection** in Integrations, enters the explicit calendar ID and selects **Connect with Google**. The OAuth request uses PKCE and offline access with Calendar event and free/busy scopes. State is one-use and expires after ten minutes. It is encrypted and bound to the workspace, manager, authenticated session, calendar, OAuth settings and viewed integration revision. The popup returns the authorization code to the initiating same-origin page, which completes the exchange through its authenticated session. The callback strips query parameters and disables referrers and caching.

The server requires the issued refresh token and both scopes. It probes FreeBusy on the exact calendar, then checks the settings, manager access and credential revision before saving sealed tokens. The probe establishes availability access to that calendar. Google still decides event mutations and subscription permissions during those operations. Status exposes the connection mode, calendar ID and token expiry in IST.

Calendar operations check expiry before provider work. Refresh uses the existing tenant-scoped OAuth lease and compares the encrypted credential snapshot before saving. Concurrent refreshes and changed credentials fail closed. Rotated refresh tokens are sealed when Google supplies them. Failed refresh leaves the stored credentials available for diagnosis and manager reconnection. Manual Calendar credentials continue to work until their saved expiry. Schema 061 remains the target.

Live Google consent, end-to-end Calendar provider validation and the P07-08 pilot remain open. [Local acceptance evidence](evidence/calendar-oauth.json)
