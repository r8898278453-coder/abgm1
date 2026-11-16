# Scheduled frozen report capture

Capture reporting continuation (17 November2026 IST): [REPORT_CAPTURE_REPORTING.md](REPORT_CAPTURE_REPORTING.md) adds twelve live report/UI/CSV/digest metrics. Frozen V1 and schema047/84 unchanged; next048. No delivery or phase acceptance.

Capture history continuation (17 November2026 IST): [REPORT_CAPTURE_HISTORY.md](REPORT_CAPTURE_HISTORY.md) adds private paged/filterable run review and page CSV. Schema047/84 unchanged; next048. No delivery or phase acceptance.

17 November 2026 IST. Partial P09-01 foundation; P09-03 distribution and escalation remains planned. No phase or production acceptance.

## Behavior and ownership

Each client can opt into a default-off daily capture hour (Asia/Kolkata, default 08:00). Managers save an optimistic versioned policy; readers inspect policy, prerequisites and the latest 25 runs. Existing company-scoped authorization remains canonical. Enabling starts with yesterday; the dispatcher considers up to seven eligible closed dates. One run per client/date prevents duplicate capture and automatic amendments. An existing baseline is preserved and linked without regenerating its live source.

`server/reportCaptureSchedule.ts` owns policy, admission, execution and recovery. `shared/reportCaptureSchedule.ts` owns due dates and response validation. `reportCaptureScheduleRoutes.ts` mounts scoped GET/PUT once. `ReportCaptureSchedulePanel.tsx` provides opt-in controls, uncertain-save recovery and exact snapshot navigation. Existing reportSnapshots, audit, shared job queue, outbox and dispatcher retain their ownership. No new cron or transport is introduced.

## Reliability and boundaries

Admission locks the company and commits run, job, queue event and audit together. The worker rechecks current actor authority, policy revision, active client, stop state, due time and current lease before storage. Snapshot, run, queue result and event/outbox settle in one transaction. Lost commit acknowledgements reconcile the committed job. Stale leases cannot store snapshots. Changing or disabling the policy cancels pending/running jobs atomically; re-enabling cannot resurrect a retained date.

Global stop and archived clients pause work. Revoked authority skips it. Failed/missing/cancelled jobs and abandoned runs have bounded recovery with audited terminal metadata; recovery failures mark dispatcher admission unavailable. The UI separates run state from queue state and shows current prerequisites rather than claiming cron health.

Admission selects two clients per dispatcher pass with a dedicated persisted cursor; at most 14 dates are considered, subject to the shared work budget. Limits are seven pending and 1,000 retained run records per client, three queue attempts, seven-date catch-up and 25 recovery candidates per pass. Capacity exhaustion blocks new admission visibly; no automatic deletion or failed-date revival exists. Manual snapshot capture remains available under its own bounds. Skipped/failed dates require operator review; automatic retry after terminal state is intentionally absent.

Migration 047 adds report_capture_policies and report_capture_runs: 84 canonical tables, next migration 048. Historical migrations 001–046 remain unchanged. Frozen report coverage V1 is unchanged: current backlog represents capture-time evidence, not reconstructed midnight state.

## Validation and pending work

See evidence/report-capture-schedule.json for actual checks. Native fixtures cover concurrent policy saves/admission, viewer denial, baseline preservation, cancellation, revoked authority, outbox/audit rollback, commit acknowledgement recovery, stale lease replacement and recovery rollback. Browser fixtures cover default off, uncertain writes, reload, exact snapshot navigation and client switching.

Hostinger cron/runtime readiness remains unverified. Scheduled distribution, destinations, delivery evidence, escalation, richer report coverage and full P09 acceptance remain pending. No deployment, production migration, provider send or environment change occurred. Rendering, billing and automatic customer messaging were not activated.
