# Automatic Google Calendar reconciliation

20 November 2026 IST · P07-05

The existing dispatcher can poll exact Calendar events associated with current, confirmed appointments. It checks up to two due events per run through the outbox work budget. Each origin has a durable claim and due timestamp. A worker that loses its claim or reaches its lease deadline cannot apply an observation. Expired claims become eligible again. The original booking actor must retain write access to the active client. The client’s current Google connection must match the tracked calendar.

Unchanged events leave the CRM revision intact. Verified moves and explicit cancellations use the same transaction as operator refresh to update the booking, audit the change and exit stale reminders. A missing, malformed or inaccessible event leaves the CRM booking intact and backs off from five minutes to at most one hour. Successful checks schedule the next read ten minutes later. A newer CRM revision or unresolved platform mutation defers reconciliation. Provider event requests are GETs throughout the worker.

The IST Sales report separates automatic changes from operator refresh activity and shows current appointments whose latest background check was unavailable. The dispatcher emits bounded counts for checked, changed, deferred and unavailable events. Provider details and customer data stay out of its response.

Migration 059 keeps 103 canonical tables. `ENABLE_CALENDAR_RECONCILIATION=false` is the default, and the global emergency stop pauses background admission. The Google Calendar create flag is independent. [Google push notifications](CALENDAR_PUSH.md) can now advance healthy polling due times. Live OAuth, public callback acceptance and an isolated inquiry-to-booking pilot still require acceptance. [Local acceptance evidence](evidence/calendar-reconciliation.json)
