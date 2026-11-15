# Message delivery evidence — 15 November 2026 IST

This continuation implements the planned P06/P09 delivery-observability foundation. The user's “Delivery unconfirmed” referred to ChatGPT's response indicator, not a reported platform defect. No live messaging incident is claimed or diagnosed.

| Implemented area | Behavior |
| --- | --- |
| Shared evidence classification | UNKNOWN, active, paused, rejected, invalid reference, missing sender, ambiguous reference, contradictory receipts, accepted without receipt, sent, failed, delivered and read stay distinct. Only an accepted request with exactly one matching client/sender/provider identity and consistent delivered/read receipt earns confirmation. |
| Exact identity | Forward migration044 preserves provider-reference bytes and uses binary collation plus a company/sender/provider/status index. Historical migrations001–043 are unchanged. Verification detects collation/index drift; incompatible pre-existing shapes fail before DDL. |
| Status API | Existing scoped GET retains raw stored state/receipt metadata and adds derived evidence, sender binding and identity count. No-store covers success and errors. |
| Receipt timeline | GET `/api/companies/:companyId/message-dispatch/:key/receipts` reuses authentication and current client access. A read-only snapshot returns the latest20 events, an explicit truncation flag and full-count summary. Provider occurrence and local recording timestamps are separate. Error codes are numeric; raw provider payloads, bodies and recipients are excluded. |
| IST report | GET `/api/companies/:companyId/sales/delivery-report?date=YYYY-MM-DD` uses real calendar validation and half-open Asia/Kolkata creation-day boundaries. Exact aggregate counts include the full request cohort; recent metadata is capped at50. Read-only snapshot and existing SQL deadline bound the reader. |
| Current versus historical | Counts represent CURRENT evidence for requests CREATED on the selected date. Late receipts may amend counts. This is not an immutable historical daily report. Receipt-arrival activity and all-date current unknown/active backlog are separately labelled. |
| UI | Sales workspace offers an explicit load, counts, recent request drilldown and receipt inspection. Client changes clear private report state; aborted/stale requests cannot replace current data. No send, resend or evidence-override controls exist. |
| CSV | Fixed metadata/count columns only; all expected metric buckets must be safe nonnegative integers and reconcile exactly to the total. Invalid/failed reloads remove export. No recipient, message body, investigation text or provider reference is exported. |
| Outcome truth | API acceptance and sent receipt do not establish delivery. Missing receipt does not establish failure or authorize another send. Delivery/read is not proof of booking, sale or revenue. |

Schema target044;80 canonical tables; next unused migration045. Rendering and automatic provider sending remain disabled by default. No live sends, production migration, deployment or environment publication occurred.

Validation records and source fingerprints: `evidence/message-delivery-evidence.json`. This is partial evidence for P06-03/P09-01, not parent or phase acceptance. Live webhook delivery, actual hosting/runtime/cron evidence, other channel adapters, immutable full daily summaries and broader sales/marketing acceptance remain pending in TASKS.csv.
