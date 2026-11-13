Current continuation: [WHATSAPP_EVENT_TIME.md](WHATSAPP_EVENT_TIME.md) adds provider timestamps and history-only stale/expired intake. Actionable inquiry counters exclude these history-only rows; delayed STOP and conflict quarantine still exit work. Current schema041/77.

# Automatic inquiry review enrollment — 13 November 2026 IST

Clients can opt in to turn a new verified WhatsApp inquiry into an internal workflow review automatically. The default is disabled. This batch automates enrollment, not message approval. Exact WhatsApp reply approval and the default-off sending flag remain separate.

| Delivered control | Actual behavior |
| --- | --- |
| Exact client rule | One revisioned rule per client selects an exact approved INQUIRY workflow version. OWNER/ADMIN manage, approve and execute rights are required together. Disabled rules retain no workflow target. |
| Explicit opt-in | No saved enabled rule means no inquiry event or enrollment. Existing and historical inquiries are not backfilled on activation. |
| Verified source | Capture runs inside the existing signature-verified inbound persistence transaction after reply/STOP processing. The durable inbox ID, contact, lead and inbound count bind the event. |
| Permission/identity | Existing ALLOWED WhatsApp permission and a single identified lead are required. Opt-out, ambiguous identity, won/lost leads and missing permission produce visible skipped outcomes. Inbound messages never imply opt-in consent. |
| Atomic capture | Inbox, processed-webhook marker, cancellation of prior work, inquiry event, shared queue admission and audit/outbox commit together. Provider webhook retries create one event. No provider calls occur. |
| Source replacement | New reply/STOP and permission/policy/definition/opportunity changes cancel pending inquiry jobs in their source transaction. A newer inquiry may create a fresh internal review only when still eligible. |
| Canonical enrollment | Existing immutable snapshot/enrollment service is reused inside the retained company transaction. Same actor/definition/permission/knowledge/policy fences and maximum25 active enrollments apply. |
| Worker fencing | sales_inquiry_review uses existing queue leases, worker/attempt/freshness checks, one enrollment and one successor review job. Concurrent or acknowledged-success replay cannot create another enrollment. |
| Rule/actor drift | Exact rule version, approved workflow and current managing actor rights are checked before admission. Rule changes exit its linked active enrollments; later workflow execution and sending also recheck rule/current roles. |
| Pause/bounds | Pause/global stop/archive defer without consuming failure budget. At most25 pending inquiry events and250 captured events in a rolling24-hour client window can admit work. Overflow is saved as skipped. No failure retry creates a provider send. |
| Expiry/recovery | Events expire24 hours after local inbound persistence. Bounded25-row recovery records expired/missing/failed/cancelled jobs as skipped for operator review. No silent backfill or automatic revival. |
| Operator visibility | Scoped no-store rule/history API, explicit workflow/evidence UI, unknown-ack reload guard, client/session response fences, up to50 recent events (pending first), current enrollment state and IST display. Existing sales audit report includes committed inquiry actions. |

## Ownership and data

`server/salesInquiryRules.ts` owns rule, capture, execution and recovery. `shared/salesInquiryRules.ts` owns strict input contracts. `SalesInquiryRulePanel.tsx` owns UI. Existing salesWorkspace inbound capture, salesWorkflowLifecycle cancellation, salesWorkflows snapshots and jobQueueService dispatch retain ownership. No second scheduler, webhook endpoint or send engine was introduced.

Forward040_sales_inquiry_rules adds sales_inquiry_rules and sales_inquiry_events:76 canonical tables; next041. Historical001–039 are unchanged. GET/PUT `/api/companies/:companyId/sales/inquiry-rule` are scoped to the existing auth/agency route owner; writes require manage and recheck approve/execute rights inside the transaction. Private message body, provider credentials and claim tokens are absent from inquiry history.

All source and workflow mutations use the canonical company lock. Worker admission, event ENROLLED, workflow snapshot, first review queue job and audit/outbox are atomic. A lost commit acknowledgement reconciles the successful SQL queue record. Database failures fully roll back and use the existing bounded failure budget. Successful inquiry execution means an enrollment was saved; successful review execution means a task was created. Neither is provider delivery.

## Remaining acceptance

Native SQL, contract and browser checks passed; exact evidence and source fingerprints are recorded in evidence/sales-inquiry-rules.json. Local fixtures do not establish production webhook traffic, cron availability or provider permissions. No production migration, deployment, environment activation or live customer message was performed.

Email inbox/read/bounce integration, actual calendar booking, richer workflow branching and automatic approved response generation remain pending. Inquiry processing does not infer fulfillment or silently initiate aftercare/review-request sequences. Full P07-02/03/04/07 and P09-01 acceptance, multi-module historical reporting/retention and Hostinger release gates remain open. Billing is excluded; reel rendering remains default off.
