# Client email sender domain verification

21 November 2026 IST · P06-04 and P01-05

In Integrations, open **Client Email Sender** and save `resend` as the engine, the exact Resend Domain ID, an API key with domain-read access and a From address on that domain. Then select **Verify saved Resend domain**. The result shows the verified domain and observation time in IST. A pending or failed Resend domain status is shown as unverified.

The route accepts only an authenticated request to the exact workspace and an empty JSON object. Before contacting Resend, it checks the current manager and active-client permissions, reads the saved encrypted integration and commits a private check-start record. Concurrent requests for the same workspace admit one check per minute. Conflicting canonical and legacy integration rows fail closed.

The provider request is a five-second, GET-only request to the fixed Resend Domains API for the saved UUID. Redirects, unexpected content types, oversized responses and nonmatching domain names or IDs withhold verification. The provider credential is sent only in the authorization header. Settlement rechecks manager access, client status and the saved binding. The audit includes the check ID, provider, saved-configuration fingerprint, outcome and observation time. The response shows the domain and observation time. API keys, mailbox addresses, provider DNS records and raw provider failures are excluded from both.

The observation is read-only with respect to the integration connection state. Domain verification is one prerequisite for a sender. A separate CRM action uses fresh domain evidence for scoped single-lead email approval. Signed receipt and bounce handling is documented in SALES_EMAIL_DELIVERY.md. Verified inbound threading is documented in SALES_EMAIL_REPLIES.md. Live provider validation remains open. See [client sales email](TENANT_SALES_EMAIL.md). The legacy test-send endpoint remains unavailable. Platform account recovery continues to use the platform email transport.

Storage uses the existing integrations and audit tables. See [batch verification](evidence/tenant-email-domain.json).


## Saved check status

The client sender card loads the latest saved check and offers a refresh that only reads the workspace journal. The card can show an initial check requirement, a check in progress, an unverified or unconfirmed result, a verified domain and its IST observation time, or a requirement to recheck. The start and result records are linked by check ID and verifier. A start without settlement is shown as unconfirmed after 30 seconds. A new attempt replaces the older status, including when the new result is inconclusive.

A verified observation is valid for 15 minutes after the check. Changing or resaving the configuration, revoking the verifying manager’s access, or archiving the workspace removes the verified status. Historical records created before binding was introduced require a fresh check. Credentials and raw provider responses remain out of the journal response. This is domain evidence. The CRM dispatch flow checks consent and operator approval separately. [Saved-status verification](evidence/tenant-email-domain-status.json)
