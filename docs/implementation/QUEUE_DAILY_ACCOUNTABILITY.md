# Daily queue accountability

21 November 2026 IST · P09-01

The daily dashboard and private CSV add six activity counts for unique jobs admitted, claimed, recorded with retryable failure, recorded with terminal failure, exhausted, and cancelled. Activity uses the existing committed job ledger and the selected Asia/Kolkata day. Each job counts once per category. A job can appear under multiple categories. Exhausted jobs are a subset of terminal failures. Existing success, failure and pause totals retain their definitions.

Six current counts show queued work due or scheduled for later, retries due or scheduled for later, running work with an expired lease, and running work missing a lease timestamp. Due counts use schedule time. Claiming also depends on eligibility and worker availability. The expired lease threshold matches the queue's five-minute recovery boundary. These counts read saved state and leave work recovery to the existing scheduler.

The Telegram digest shows due retries and stale leases. The dashboard and CSV retain all twelve metrics. Manual and scheduled captures use V8. V1–V7 keep their original values, hashes and replay behavior. Compare snapshots with equal coverage. The public portal keeps its existing approved metrics. SQL schema remains 064.

Remaining P09-01 work includes matching planned marketing and sales actions to partial, skipped and external outcomes across modules.

[22-item checklist](QUEUE_DAILY_ACCOUNTABILITY_BATCH.csv) · [Verification](evidence/queue-daily-accountability.json) · [Main tracker](STATUS.md)
