# Per-platform publishing outcomes

21 November 2026 IST · P09-01

The private daily dashboard and CSV show recorded success, failure and unconfirmed counts for Google Business, Facebook, Instagram, WhatsApp and Telegram. The counts come from provider results recorded when an owned publishing claim settles. They can include previous provider evidence reused by the publishing worker. A recorded API success does not establish recipient delivery or a new provider request on that day. Google Business publishing availability follows the existing platform controls.

A claim with both success and failure contributes to the partial failure count. If any target is unconfirmed and another succeeds, the claim contributes to the partial unconfirmed count. Supported platform counts record each outcome once per settled claim. Pre-dispatch claims that have no target results and historical settlements without this evidence contribute no platform events.

The claim, post status and reporting events commit together. The writer records fixed event codes. Provider identifiers, messages, error text, credentials and claim tokens stay outside those events and reports. The IST report uses the event settlement day, independently of the earlier admission cohort.

Manual and scheduled snapshots write V10. V1–V9 retain their existing payloads and hashes. Comparisons require equal coverage. Update readers and workers together before new V10 captures. The public portal keeps its existing approved metric list. SQL schema remains 064.

[Publishing reconciliation](PUBLISHING_RECONCILIATION_REPORT.md) covers provider read-back evidence and current date-only plans without a retained admission. Historical plan revisions and cross-module reconciliation remain open.

[27-item checklist](PLATFORM_OUTCOME_REPORT_BATCH.csv) · [Verification](evidence/platform-outcome-report.json) · [Main tracker](STATUS.md)
