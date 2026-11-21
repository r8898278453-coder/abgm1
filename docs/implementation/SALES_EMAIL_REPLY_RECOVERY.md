# Background Sales email reply recovery

21 November 2026 IST · P06-04, P01-06 and P09-01

Enable `ENABLE_TENANT_EMAIL_REPLY_RECOVERY` alongside the existing tenant webhook and reply flags to use durable admission. The new flag defaults off. The verified webhook returns `queued` after persisting the normalized routing envelope and its expiry. The original outbound address, contact and active tenant must match. Pending API acceptance can resolve later. The standard synchronous handler remains available while recovery is disabled.

Each client can hold 100 active envelopes for up to 24 hours. The payload is encrypted and binds the exact tenant and intake ID. It contains routing evidence for the reply read. The signing-secret fingerprint fences credential rotation. Reusing an inbound provider ID with different addressing returns a conflict.

The existing dispatcher claims at most one item per tick. The claim has a 60-second lease and a conditional token. Transient errors back off from 30 seconds to 15 minutes across at most six provider attempts. An expired claim can be reclaimed. The CRM write rechecks the current lease and execution controls, and the final receipt uses the same claim token. Replaying an already committed inbox message can settle a lost queue write without refetching or applying opt-out twice.

The scheduler checks its budget and the global stop, and skips archived clients during admission and claiming. Terminal outcomes and expiry cleanup scrub the ciphertext. Failed or expired items retain safe status metadata for investigation. Provider delivery retry and dispatcher recovery depend on the corresponding service being active.

Sales exposes page-bounded private intake history and an IST report that separates admissions, terminal outcomes and current backlog. Recovery counts describe intake processing. Signed delivery evidence and recipient replies have their own sections. [Daily work reporting](EMAIL_DAILY_ACCOUNTABILITY.md) includes recovery counts from V6 onward. Live Resend rollout, attachment intake and terminal retry tooling remain pending.

[28-item checklist](SALES_EMAIL_REPLY_RECOVERY_BATCH.csv) · [Verification](evidence/sales-email-reply-recovery.json)
