# Reviewed facts in AI drafts

12 November2026 IST. Schema033/52 is unchanged; next product migration034. P04-06 is in progress, not full business-memory or autonomous sales acceptance. No production/provider/customer send or deployment was performed.

## Connected consumer flows

The authorized /api/ai/chat, /api/ai/reply-review and /api/ai/generate-content routes now load current same-client structured facts on the server. Browser facts, source references, system instructions and provider/model overrides are rejected. The existing workspace resolver selects/authorizes the company before input preparation; saved name/category/city/website replace browser identity. Only whitelisted identity fields enter prompts, never full company rows/tokens/owner fields. Chat no longer calls mutable repository counts “server verified” evidence. Browser context and promotion/style fields remain unverified request themes.

Context uses reviewed structured facts only, not every approved original/FAQ/raw source passage. Approved manual facts retain precedence. Eligible source facts retain source/version references. Draft/unapproved/withdrawn/ineligible/conflicted values are omitted; only their blocked keys enter the data context. For a request lexically related to a conflicted/unapproved known key, generation returns409 KNOWLEDGE_REVIEW_REQUIRED before any model request. This is key/value lexical governance, not a semantic detector across arbitrary prose or different keys.

At most200 fact records are read under existing bounded SQL. The assembled fact context has a24000-byte UTF8 limit; oversize returns409 rather than silently omitting business facts. Empty knowledge permits neutral drafts without specific unsupported claims. The client receives actionable conflict/change/context-limit guidance. Existing string-returning chat/review clients remain compatible; response knowledge metadata is additive.

Trusted draft policy is sent in the provider's systemInstruction configuration. Saved values/reviews/browser context are separate untrusted data. Policy prohibits invented prices/discounts/warranties/results/actions and prohibits sending/publishing/booking/spending. Public review prompting no longer encourages unsupported warranty claims. This is a prompt policy, not proof that a model obeyed every factual or injection constraint. Every result has requiresReview:true/outputVerified:false; existing publishing/sending approval controls remain separate.

## Stale-result and persistence boundaries

Before generation, a private fingerprint binds all current fact IDs, revisions, statuses, eligibility and content. Source withdrawal/retry/delete/reapproval changes eligibility even if the fact row is unchanged. The context is loaded again after generation. A changed fingerprint returns409 KNOWLEDGE_CHANGED and discards the result. This checks the generation interval, not a permanent lock or guarantee after the final read. Future dispatch must validate its own approved artifact/current source policy; a provenance fingerprint is not publishing permission.

A durable AI_DRAFT_REQUESTED event must be saved before provider work. Outcome events record GENERATED, BLOCKED, DISCARDED, REJECTED or UNAVAILABLE in existing autonomous_audit_logs. GENERATED means a response passed basic text/JSON shape checks and the final context check; it does not mean verified business truth or accepted publication. Empty/provider-unavailable returns503; malformed/oversized generated output returns502. Audit failure before a call prevents it; journal failure afterward prevents returning a claimed successful draft. No automatic customer action is performed.

Events include authenticated actor, request ID, kind, fingerprint, fact/source revision references and counts. They omit original fact values/keys, prompt, review/browser text, generated copy, provider error bodies and credentials. Existing authorized audit tooling can inspect these safe records. They are not cryptographic audit evidence or complete retention/erasure guarantees.

## Model adapter and actual usage evidence

server/draftModel.ts owns the existing configured Gemini fallback order and five-minute permission cooldown. This extraction does not establish that the configured model names are enabled in the user's provider account. A STARTED event precedes each actual attempt; returned output records SUCCEEDED, errors/empty output FAILED. FAILED is an attempt outcome, not proof that no tokens were billed. Permission failure starts cooldown; explicit busy503/UNAVAILABLE may advance to the next configured model. Unknown network failures, empty/invalid output and audit uncertainty stop without automatic replay. Empty responses may still report token consumption.

Usage fields are recorded only when the SDK actually supplies safe nonnegative integer prompt/output/total counts. A safe returned model version is retained when present; missing usage/version is unknown, never invented0. No currency cost or provider-bill reconciliation is fabricated. Started-but-unsettled events remain evidence of an interrupted/unknown attempt. No request-idempotent model cache, global/agency usage reservation, cancellation guarantee, hard provider deadline or exactly-once billing is established by this slice; existing client timeouts do not prove a provider request was cancelled.

## Validation and remaining scope

Unit/HTTP tests verify all three protected route consumers, authority/body limits, server-only context, manual precedence, conflict refusal, prompt policy separation, metadata privacy, audit failure fences, stale-result discard, response shape refusal and fallback/cooldown/no-replay/actual usage behavior. Native restricted MariaDB exercises real approved facts, durable attempt records, exact provenance and approval withdrawal during mocked generation. Chromium checks conflict/change guidance and existing workspace isolation; no real provider request is used.

See EXECUTION.md, evidence/knowledge-draft-consumers.json and generated STATUS.md. Remaining: autonomous review/content/sales/booking/qualification entry points, semantic output verification, usage/cost budgets/reconciliation, complete prompt/evaluation matrix, agency/RBAC/OAuth/hosting gates and other phase work. Only these three user-requested draft consumers have been connected; this is not full unattended marketing/sales automation.

Current coordinated dependency:034/60 tables (next035), with agency/client assignments, conservative request-local roles, archive pause, revocation-aware bearer auth and provider registry aliases. Source/fact structures and historical001–033 identities are unchanged. Use BATCH_10_AGENCY_SECURITY.md and STATUS.md for current role/rollout/acceptance limits; older totals above retain their historical evidence scope.
