# Linked Sales email replies

21 November 2026 IST · P06-04, P01-05 and P09-01

For each client, configure the Resend Receiving domain, webhook signing secret and tenant API key in Integrations. The API key needs access to retrieve received mail. Resend Receiving DNS and registration for `email.received` must be available before rollout. The reply workflow uses `ENABLE_TENANT_EMAIL_REPLIES` and `ENABLE_TENANT_EMAIL_WEBHOOKS`. Both default off. Current sender verification and the existing manual sales send gates still apply to outbound email.

New eligible sends include a private Reply-To address derived from their dispatch key and the configured receiving domain. The inbox stores the address hash. An incoming reply can link when it targets the exact address, originates from the original recipient, and the original email belongs to an accepted dispatch in an active client workspace. The recipient and receiving address must also match the independently fetched Resend record. Emails already sent without the reply address and replies from alternate mailboxes require another intake path.

The existing webhook verifies tenant signature and timing. Fetching a matched reply uses a bounded GET to Resend with the saved tenant key. Before committing the reply, the server rechecks the tenant secret, API key and original thread. Provider errors or unresolved dispatch acceptance return a retryable response. Replays deduplicate by tenant and provider inbound ID. Concurrent callbacks can fetch the same message before storage. A completed retry reads the existing evidence directly.

The private Sales inbox and CRM conversation show the saved plain text and linked reply timestamp. HTML-only replies show that plain text is unavailable. Long plain text is shortened at 8,000 Unicode characters. Raw HTML, attachments and routing identifiers stay outside the public-facing projection. Only a whole-message stop or unsubscribe command updates Email consent. Saving that reply and applying the opt-out occur in the same transaction. Other replies leave consent at its current state.

The IST Sales report counts linked replies and explicit reply opt-outs on the provider occurrence date. [Background intake recovery](SALES_EMAIL_REPLY_RECOVERY.md) is available as a separate opt-in. Attachment import, suppression release, automated email sequences, frozen daily accountability metrics and live Resend acceptance remain pending. See the [26-item checklist](SALES_EMAIL_REPLIES_BATCH.csv) and [verification evidence](evidence/sales-email-replies.json).
