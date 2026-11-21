# Source and outcome attribution acceptance

21 November 2026 IST · P08-05

| Main-task criterion | Implemented behavior |
| --- | --- |
| Versioned first and last known touch | The report exposes stable boundary versions and opaque evidence IDs for retained website inquiries and supported inbound CRM interactions. Signed WhatsApp and linked, provider-verified email replies use occurrence time, including delayed recovery. Legacy records use their saved timestamp. |
| Explicit unknown outcomes | Ties across sources, untimed linked records and truncated history withhold attribution under the existing rules. A verified reply with missing, malformed or future event time stays untimed. Appointment source models use the same normalized timeline and require evidence before the first confirmation. |
| Compatible cost, currency and revenue evidence | Exact minor-unit totals stay separated by currency and evidence class. Dedicated cost CSV contains tenant-bound opaque record IDs, growth ledger revisions, currency and amount. Only active declared costs contribute. The report reconciles the exported cost evidence to its displayed totals and rejects inconsistent evidence. Manual won amounts retain their opportunity revision and separate unverified status. |
| Billing separation | Platform invoices and campaign budgets are excluded from verified customer revenue and marketing spend. Verified revenue, spend and ROI remain unavailable until independently verified financial sources exist. No billing integration is needed for these attribution calculations. |

The report represents retained CRM evidence. It leaves causal acquisition attribution and provider-verified financial data outside local acceptance. P08-10 and live rollout retain their own acceptance requirements. This change adds `costEvidence` alongside the existing V2 lead report and appointment projection on the private Sales endpoint. SQL schema and immutable daily report coverage stay at 064 and V19.

[Verification](evidence/source-attribution-acceptance.json) · [Project tracker](STATUS.md)
