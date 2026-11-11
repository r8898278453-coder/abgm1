# Structured business facts and conflict review

11 November2026 IST. Local implementation foundation, not P04/agency/production acceptance. Schema033_structured_knowledge_facts adds knowledge_facts (52 canonical tables); historical001–032 remain unchanged. Next product migration034. No production migration/deploy performed.

## Ownership, values and provenance

Facts are isolated by company and authorized through the existing knowledge workspace routes. One stable lower-case key describes one business claim, for example pricing.annual or delivery.days. Different services/locations need different keys. Values are immutable candidate text (max4000 characters); corrections create a new candidate rather than silently editing an approved value. At most200 records per company; reads reject over-limit data instead of hiding possible conflicts. Exact same active candidate replay is deduplicated under the company lock, including lost create acknowledgements.

MANUAL candidates are business statements entered by an authorized user. SOURCE candidates must supply a same-company currently approved extracted source and exact current source revision. The value must be an exact substring of one saved chunk. Server captures chunk/page/UTF16 quote offsets; original bytes are checked before admission/approval. No model-generated price, confidence or citation is trusted. Stable user-supplied keys group candidates; semantic contradictions between different keys or unstructured prose are not automatically detected.

Candidate states: DRAFT, APPROVED, REJECTED, WITHDRAWN. No auto-approval. Source-derived eligibility requires the same source revision, extraction success and approval at read time. Source withdrawal, retry, deletion or reapproval with a new revision makes earlier facts ineligible; explicit new review is required. A retained fact value is not erased by deleting its original source; delete the fact separately when required. Source identity/hash/version/page and fact identity/revision support citations. Manual facts are reviewed statements, not independent verification of the business.

## Review and concurrency

Every mutation locks the company row, then validates the loaded fact revision. Eight simultaneous approvals produce one writer. Approval of a different value must explicitly name every currently approved conflicting candidate and its current revision in replace. Missing/stale/duplicate replacements refuse409. All superseded candidates become WITHDRAWN in the same transaction as the new approval. Source-derived candidates cannot replace a different approved manual value: withdraw that manual approval first. A newly approved manual value can explicitly supersede source/manual conflicts after review.

Source-provenance checks and minimal audit INSERTs share the mutation transaction. Audit failure rolls back both replacement withdrawals and the new approval. Audit events in existing autonomous_audit_logs contain only fact ID, version, state and authenticated actor—no key/value/source text. Deletion erases the fact row/value but retains minimal tombstone evidence. This is application-level history, not tamper resistance against privileged DB operators or backup erasure.

## Query contract and user interface

Saved-source search now consults governed keys first. Approved manual facts retain precedence over source proposals until reviewed. Without manual precedence, different eligible draft/approved values for one key return CONFLICT_REVIEW_REQUIRED with no citations. A matching known key with no eligible approved value returns FACT_APPROVAL_REQUIRED; it does not fall back to an older brochure quote. Matching approved facts return exact values and real fact/source revision/quote offsets. Other queries retain bounded FAQ/source extractive search. Key/value matching is lexical with small price/annual term aliases, not semantic understanding or an all-document contradiction detector. Facts are not yet automatically fed into marketing/sales model calls.

The Reviewed business facts panel creates manual or exact approved-source candidates, shows current state/provenance/eligibility, and exposes approve/reject/withdraw/delete. A checkbox requires review before replacing the displayed approved conflicting values. An approved manual conflict disables source approval. Unconfirmed/conflicting writes retain input and disable further writes until explicit reload. A changed/removed selected source cannot silently become manual provenance. Fact mutations invalidate pending fact-search replies; client remount and request sequence fences prevent late results entering another client's panel. Source operations and fact operations share the UI busy boundary.

## API and rollout

GET/POST /api/companies/:id/knowledge/facts list/create. POST /api/companies/:id/knowledge/facts/:factId/{approve,withdraw,reject,delete} mutates exact expectedVersion. Create accepts only {key,value,source?:{id,version}}. Approval accepts {expectedVersion,replace?:[{id,version}]}; other commands reject replace. Responses include scoped current facts and success; create returns id/reused and201 or200 for dedupe. No browser actor/company/approval override accepted. All facts remain private and Cache-Control:no-store applies.

Apply033 only through the canonical migration CLI after separately authorized release checks. Readiness checks the new table, critical columns, shape/index/foreign-key evidence. Wrong existing shapes refuse before adoption. Server, UI and every worker must run the coordinated release. Existing users/facts/profile JSON are not silently backfilled or rewritten; legacy FAQs remain explicitly manual and separate. Actual hosting, agency/RBAC, retention/performance and full business-memory/consumer gates remain open.

Validation is recorded in EXECUTION.md and evidence/structured-knowledge-facts.json: strict commands, exact quote offsets, manual precedence/conflict abstention, real SQL eight-way ownership/replacement/audit rollback/source invalidation/tenant checks, new migration fresh/upgrade/export replay and Chromium uncertainty/client isolation. No real website/provider/customer send is part of these tests.
