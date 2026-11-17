# Sales activity in daily accountability — 17 November 2026 IST

The canonical private daily report now includes eleven fixed sales activity counters. The dashboard, numeric CSV and validated Telegram digest consume the same registry and read model; no parallel CRM writer, scheduler or report endpoint was added. Schema remains050/87 tables, next051.

| Counter | Committed evidence |
| --- | --- |
| Prospect import batches | One SALES_PROSPECTS_IMPORTED audit per original committed batch |
| Prospect rows created | Sum of integer imported counts in those batch audits |
| Prospect rows not imported | Sum of integer excluded counts; all non-IMPORTED outcomes |
| Inbound sales messages | SALES_INBOUND_SAVED transitions |
| Ambiguous inbound messages | Subset with exact AMBIGUOUS identity |
| Recorded inbound opt-outs | Subset with JSON boolean optOut=true |
| Qualification revisions | SALES_QUALIFICATION_SAVED transitions |
| Human-review qualification revisions | Subset with exact HUMAN_REVIEW outcome |
| Opportunity revisions | SALES_OPPORTUNITY_SAVED transitions |
| Permission revisions | SALES_PERMISSION_SAVED transitions |
| Policy revisions | SALES_POLICY_SAVED transitions |

All audit event names have the existing AGENCY_ prefix. The reader runs inside the canonical report's read-only consistent transaction and deadline, uses company scope and the selected half-open IST day, and compares event names exactly. Existing indexed company/timestamp audit access is reused. No provider calls or permission updates occur during reads.

Import totals must both be JSON integers, nonnegative, and sum to1–100. Missing, string, negative, fractional, boolean, null, zero-total or oversized counters make the report unavailable; they never silently become a successful zero. An exact import replay uses the existing cached result without another audit, so it adds no batch activity. Preview adds no activity. Leads edited or removed later do not rewrite the committed audit count.

These are recorded revisions, not unique contacts or verified outcomes. A lead can have multiple qualification/opportunity/permission revisions. Ambiguity and opt-out counters overlap inbound totals; human review overlaps qualifications. Rows not imported include invalid, excluded-domain, existing lead/customer, ambiguous and suppressed outcomes. A declaration/import is not permission to contact. An opt-out count does not imply every suppression came through this inbox. An opportunity update is not a sale, booking or revenue. Old unlogged work is not backfilled. Failure to commit leaves no completed batch audit and cannot be reported as completed.

Live CSV includes the eleven fields. Frozen V1/V2 report registries, hashes, readers and comparison coverage remain unchanged and deliberately omit these new live metrics. New snapshot schema coverage is a separate versioned extension; this delivery does not silently amend old evidence. Digest validation checks all live metrics and its maximum-safe-integer fixture stays below Telegram's4096-character limit.

DailyWorkReport now mounts by client, accepts async reads only in the initiating session, and checks the accepted session again before CSV export. Switching clients clears the old report; missing sales metrics refuse rendering/export. The browser regression covers stale client responses and changed-session export without provider traffic.

Validation is recorded in evidence/sales-activity-reporting.json. Full planned/done/partial/failed/blocked reconciliation, other modules' activity, frozen sales coverage, source lifecycle retention, hosting/cron and real provider acceptance remain pending. P09-01 and parent/phase gates remain in progress. Notification opt-ins and reel rendering stay unchanged; this work does not deploy or activate sending.
