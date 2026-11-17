# Durable growth operations group — 18 November 2026 IST

This delivery connects saved prospect evidence, measurement experiments, declared costs and daily accountability in one private client workspace. The earlier fit calculator's memory-only result can now be saved with its exact policy snapshot and source declaration. Experiments have separate draft, approval, measurement, observation and closure actions. Cost corrections preserve the original record. No action activates a provider campaign, sends a message or makes a payment.

## Functional workflows

These are24 concrete workflows across five durable record types, not24 completed original parent tasks. GROWTH_BATCHES.csv maps each to its implementation and validation.

| Workflow | Delivered behavior |
| --- | --- |
| G01 | Save an assessment by recomputing against the current expected policy revision |
| G02 | Preserve the complete assessment context, profile snapshot/hash and original result |
| G03 | Read historical assessments after the current profile changes |
| G04 | Record a lead-linked buying-signal declaration with bounded source/observation/expiry |
| G05 | Reject foreign/missing lead references and future evidence timestamps |
| G06 | Normalize declared email/WhatsApp contact candidates without modifying a lead |
| G07 | Keep contact evidence explicitly unverified and separate from contact permission |
| G08 | Deduplicate exact create requests under a client lock, including8 contenders |
| G09 | Reconcile lost creation acknowledgements by scoped key plus intent hash after reload |
| G10 | Read bounded25-row keyset history and exact private record detail |
| G11 | Export metadata-only, formula-safe CSV without source/contact context |
| G12 | Create/edit experiment drafts using expected revision CAS |
| G13 | Approve the exact proposal with an authorized approver |
| G14 | Start a fixed measurement window after fresh approval-authority checks |
| G15 | Refuse overlapping running experiments for one client |
| G16 | Append bounded cumulative observations; reject totals that regress or repeat |
| G17 | Review minimum sample, baseline uncertainty, fixed window and failure-stop rules |
| G18 | Stop an experiment explicitly or complete it only after its window ends |
| G19 | Record idempotent declared costs using exact minor-unit amounts |
| G20 | Enforce linked-experiment currency consistency and show actual declared overruns |
| G21 | Void a mistaken cost with a reason, preserving original history |
| G22 | Review portfolio counts and separate currency totals; keep unsupported ROI null |
| G23 | Report12 committed activity and4 current-backlog counters in live UI/CSV/digest |
| G24 | Freeze new reports with coverage V4 while preserving V1/V2/V3 replay and hashes |

## Ownership, authority and durability

051_growth_operations adds growth_operation_records, bringing the canonical schema to88 tables. It has one scoped request-key uniqueness constraint, history/state indexes, versioned state, bounded JSON and a canonical content hash. Migration shape/index checks reject incompatible pre-existing definitions. The request path performs no DDL. Historical001–050 migrations and frozen V1/V2/V3 schemas remain unchanged.

Existing company locks, fresh actor/client RBAC, agency audit and read-only SQL deadlines remain authoritative. Creation accepts strict typed inputs for ASSESSMENT, SIGNAL, ENRICHMENT, EXPERIMENT and COST. Only experiment lifecycle and explicit cost void transitions mutate an existing record. No delete, force-reset or provider-verification override is exposed. Archived clients reject mutations while authorized historical reads remain possible.

All mutation state and audit metadata commit together. Creation caches the same record lineage for an exact request key/actor/input; replay can show its current state after later authorized changes. An acknowledged or ambiguous creation does not create another cost on exact retry. UI stores only key/hash/kind recovery metadata in actor/client-scoped session storage; raw source/contact context stays in the editor until an explicit save. After a lost acknowledgement, fresh history alone does not unlock the editor: exact key/hash reconciliation or an in-memory exact retry is required. Not-found is not proof an in-flight request cannot commit.

Transitions use the viewed revision and fresh authority. A lost transition acknowledgement requires a fresh read, not automatic replay or rebasing. Storage/payload failures and corrupt content hashes refuse success. Read pages return at most25 records; every cursor is bound to an existing company/kind/id/time anchor. Records are capped at1000 per client; observations at100 per experiment and payloads at64 KiB. This is a logical admission bound, not measured Hostinger disk/process capacity. No automatic retention deletion occurs.

## Truth and measurement rules

Signals and contact candidates are operator declarations, not automated provider discovery or verified enrichment. Expiry changes their read-time freshness; it never grants consent or changes canonical CRM identity. A saved assessment is immutable evidence of the original declared comparison, not a current permission or deliverability check. Current imports/suppression/send guards remain separate.

Experiments are measurement records. Their approval/start does not enable channels or reserve provider spend. An operator records cumulative declared totals during the window. Source references are retained privately. Samples must advance, successes/failures cannot regress, and their sum cannot exceed the sample. Bad totals are not silently rewritten; stop and document a new measurement when the original cohort must be corrected. Late provider ingestion and automatic cohort collection are not implemented here.

Review uses95% Wilson intervals, a predeclared minimum observed sample, baseline review when baseline sample is below20, a zero-baseline handoff for undefined relative lift, the fixed window and failure threshold. Open windows and insufficient data do not become positive outcomes. POSITIVE_DECLARED_SIGNAL is not randomized causal evidence or verified commercial success. STOP_SUGGESTED requires an explicit operator stop; it does not silently change a campaign.

Costs use integer minor units and bounded supported currency scales, with no floating-point input rounding. A linked experiment's currency is locked while recorded costs reference it. Over-budget entries remain visible instead of hiding real declared costs. Voiding corrects this ledger; it does not refund a payment. Exact command idempotency is not bank/invoice reconciliation: operators must distinguish actual receipt/line references. Different currencies are not added together. ROI remains null because verified revenue is not linked.

## Accountability and compatibility

Twelve committed audit-event counts use the selected half-open IST day. Draft/approval/start/observation/stop/completion transitions can overlap for one experiment. Cost void activity does not erase the original creation event. Four backlog counts are current across all dates, including retained stale declarations. No source reference, address or hypothesis appears in the fixed numeric report/digest.

New manual and scheduled report captures use fixed V4 coverage. Old V1/V2/V3 payloads/hashes, request replay and existing baselines remain unchanged; mixed-coverage comparisons refuse. V4 CSV includes the new metrics. Digest maximum-safe-integer coverage stays within4096 characters.

Deploy the matching reader/writer/migrator together. An older binary that does not understand schema051 or frozen V4 is not a compatible full rollback. Stop workers during release/rollback and retain compatible readers or forward-fix. Preserve growth records, replay keys and report hashes; do not delete/relabel evidence to satisfy an older binary. Production release is not performed here.

## Acceptance and remaining work

Evidence: evidence/growth-operations-group.json. The acceptance scope for P08-01 is owner-declared ICP/import/source provenance, with canonical CRM/customer/suppression checks; automated discovery remains P08-02. P08-06 acceptance covers bounded declared-data experiments and transparent review without autonomous spend. Neither closure accepts a prerequisite phase or live provider pilot. P08-05/P09-01 remain partial; verified revenue attribution, automatic cohort/provider ingestion, provider discovery/enrichment, measured hosting/cron, retention, mobile/release and production pilot gates remain open.
