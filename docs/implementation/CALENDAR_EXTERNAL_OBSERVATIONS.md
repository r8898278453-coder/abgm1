# External Google Calendar changes

20 November 2026 IST · P07-05

Open a tracked appointment and select **Refresh from Google Calendar** after an operator moves or cancels it directly in Google. The action checks the workspace’s stored calendar binding and the exact event created by the platform. The request derives the event ID from the viewed CRM revision. The integration performs a bounded Google GET. A verified move updates the existing appointment to the observed absolute times. An exact event record with cancelled status updates the CRM to cancelled. Missing events, permission errors and mismatched origin markers on confirmed events leave the CRM unchanged.

A successful change saves the Calendar observation, booking revision, derived slot state, audit and affected workflow exits in the same database transaction. An unchanged observation creates no new revision. A pending platform Calendar write must be resolved through its existing intent before refreshing. The revision check blocks stale observations from overwriting newer local revisions. The live IST Sales report counts externally verified moves and cancellations separately from platform-initiated changes.

Before claiming an approved WhatsApp reminder send for a tracked appointment, the worker checks the exact Google event again. A moved or explicitly cancelled event stops that reminder. Missing or unverified evidence defers the unstarted job through the existing queue, subject to appointment expiry. The Sales report shows the current number of reminders waiting for Calendar verification. The normal approved-send gate rechecks local eligibility before dispatch. Provider changes after the Google read are handled on the next observation. Already accepted sends retain their provider evidence.

This batch uses the existing migration 058 ledger. Operator refresh and the targeted pre-send read are also available when [background Calendar reconciliation](CALENDAR_RECONCILIATION.md) is disabled. Live Google OAuth, Google push subscriptions, email and SMS reminders and the P07-08 pilot remain open. [Acceptance evidence](evidence/calendar-external-observations.json)
