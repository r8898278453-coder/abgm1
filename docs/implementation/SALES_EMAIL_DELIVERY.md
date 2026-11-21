# Sales email delivery evidence

21 November 2026 IST · P06-04, P01-05 and P09-01

Each Resend webhook endpoint uses the client ID in the URL and a signing secret saved in that client's integration. Supported outbound notifications include sent, delayed, delivered, failed, bounced, suppressed and complained. The endpoint defaults off. The signing secret is masked and encrypted by the existing integration credential store. Saving it can invalidate an outstanding sender check because the stored integration changed.

The handler verifies the raw bytes and timestamp before decoding JSON. A signed event must resolve to one previously accepted email dispatch in the same tenant. The recorded recipient must match. Emails sent after this change also carry a private sender fingerprint for the match. Older rows use the existing accepted provider ID and exact recipient. Unmatched callbacks return a retryable response. A receipt arriving before API acceptance is durable can succeed when the provider retries after settlement. A permanently unconfirmed or unrelated provider send remains unmatched.

The receipt journal keeps hashes, dispatch linkage, provider event type, occurrence time and a suppression flag. Exact repeats succeed without another write. Changing a signed event's normalized evidence while reusing its event ID returns a conflict. A late sent or delayed notification cannot reverse delivery. Later delivery can supersede a transient failure. Complaints, explicit provider suppression and permanent bounces remain visible and block new tenant emails to that address, even after someone changes the CRM consent field. A transient bounce shows evidence without setting a suppression.

The Sales inbox and private CRM contact conversation show the same receipt evidence. The Sales report groups distinct emails by event type for the selected IST date. An email can appear in several event groups. Recipient delivery and API acceptance remain separate. Linked inbound replies have a separate [CRM workflow](SALES_EMAIL_REPLIES.md). [Daily work reporting](EMAIL_DAILY_ACCOUNTABILITY.md) includes the signed delivery counts from V6 onward. Suppression release and live Resend validation remain pending.

The implementation and acceptance scopes are listed in [the 28-item batch](SALES_EMAIL_DELIVERY_BATCH.csv). See [verification results](evidence/sales-email-delivery.json).
