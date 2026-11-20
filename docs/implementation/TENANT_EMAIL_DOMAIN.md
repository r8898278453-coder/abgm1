# Client email sender domain verification

21 November 2026 IST · P06-04 and P01-05

In Integrations, open **Client Email Sender** and save `resend` as the engine, the exact Resend Domain ID, an API key with domain-read access and a From address on that domain. Then select **Verify saved Resend domain**. The result shows the verified domain and observation time in IST. A pending or failed Resend domain status is shown as unverified.

The route accepts only an authenticated request to the exact workspace and an empty JSON object. Before contacting Resend, it checks the current manager and active-client permissions, reads the saved encrypted integration and commits a private check-start record. Concurrent requests for the same workspace admit one check per minute. Conflicting canonical and legacy integration rows fail closed.

The provider request is a five-second, GET-only request to the fixed Resend Domains API for the saved UUID. Redirects, unexpected content types, oversized responses and nonmatching domain names or IDs withhold verification. The provider credential is sent only in the authorization header. Settlement rechecks manager access, client status and the saved binding. The audit includes the check ID, provider and outcome. The response shows the domain and observation time. API keys, mailbox addresses, provider DNS records and raw provider failures are excluded from both.

The observation is read-only with respect to the integration connection state. Domain verification is one prerequisite for a sender. Dispatch authorization, send acceptance, recipient delivery, signed reply and bounce handling, and live provider validation remain separate work. The legacy test-send endpoint remains unavailable. Platform account recovery continues to use the platform email transport.

Storage uses the existing integrations and audit tables. See [batch verification](evidence/tenant-email-domain.json).
