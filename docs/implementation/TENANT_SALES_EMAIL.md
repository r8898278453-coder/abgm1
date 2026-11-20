# Client sales email

21 November 2026 IST · P06-04

With `ENABLE_TENANT_SALES_EMAIL=true`, an operator with approval and execution access can select a saved CRM lead and check email readiness. The client must have a current verified Resend domain and the lead must have one unambiguous saved email identity and explicit email consent. The operator reviews the exact subject and plain text, then manually approves that email. The feature defaults off.

Admission and the provider boundary recheck the workspace, recipient, consent, sender observation and operator permissions. Shared sales pause, global stop, IST quiet hours, the daily sales message cap and any enabled shared action budget apply. The sender comes from the same client's saved integration. The request uses the fixed Resend email API and the exact approved recipient and content.

An approval uses a stable request key scoped to its client. The existing dispatch ledger deduplicates concurrent attempts and binds retries to the same actor and content. A pause before the provider call can retry the same approval. A timeout or indeterminate provider result is stored as unconfirmed and cannot be resent by retrying that approval. Provider acceptance can be recovered using the original approval, including when the cap is already spent. The form holds the approval in the open workspace. Saved outbound messages and dispatch states can also be inspected in the Sales inbox.

An accepted provider response means Resend accepted the API request. Signed Resend events can add recipient delivery, bounce and suppression evidence to the inbox. New sends can opt into [linked reply intake](SALES_EMAIL_REPLIES.md). Approved sequences and live Resend acceptance remain pending. See [Sales email delivery](SALES_EMAIL_DELIVERY.md). The legacy test-send endpoint remains unavailable, and the CRM flow uses the tenant integration independently of the platform's account-recovery transport.

[Local verification](evidence/tenant-sales-email.json)
