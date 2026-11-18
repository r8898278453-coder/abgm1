# Reviewed calendar strategy and wording overlap

18 November 2026 IST. P05-08 continuation. This group adds optional reviewed audience/brand preferences, explicit approved service/offer references and a read-only saved-topic overlap preview to the existing durable calendar plans. It does not introduce another model client, content writer, schema, scheduler or approval ledger.

## Workflow and claims

In Saved calendar batch plans, enable Use reviewed client strategy and explicitly load approved planning facts. The service returns only effective approved facts selected by the existing knowledge governance: conflicting/unapproved/ineligible/withdrawn facts are unavailable and approved manual precedence remains canonical. Fact values are displayed for review, not promoted as independently verified claims. Opening the calendar alone does not fetch this list.

Choose an audience (up to300 characters), Clear/Warm/Professional tone, Educate/Service enquiry/Reviewed offer objective and at most eight preferred and eight avoided phrases (40 characters each). Select at most four exact fact revisions and explicitly confirm the reviewed preference set. Editing preferences or references clears the displayed confirmation. This confirmation freezes planning preferences; it does not approve knowledge facts, approve a post or authorize publication.

SERVICE_ENQUIRY requires a selected SERVICE reference. OFFER requires a selected OFFER reference; other objectives refuse OFFER references. Roles are the writer's explicit classification of existing reviewed facts, not an inferred database fact type. Arbitrary role assignment cannot turn a fact into a factual offer: generation is instructed to use only selected OFFER values that also remain in canonical approved fact data, with no invented discounts, dates, validity, prices or guarantees. No automatic promotion or festival-date inference is added. Human review must still establish whether a dated offer is suitable/current; these free-form knowledge facts are not a structured expiry engine.

Plan creation and generation resolve the exact selected IDs/unsigned64-bit revisions against effective approved facts for the current client and bind the complete canonical knowledge fingerprint. Stale versions/fingerprints and foreign or unavailable facts are refused before model admission. Existing settlement rechecks current context/fingerprint/authority, so an edit or withdrawal during generation cannot materialize a stale draft. Manual approvals and fact source eligibility stay in the knowledge workspace.

Audience, tone and preferred vocabulary are untrusted style preferences, not factual authority. The existing knowledge system prompt, model selection/fallback, daily budget and metadata journal remain canonical. Tone/preferred-term quality still requires review. No deterministic semantic guarantee is claimed.

## Deterministic avoided-phrase gate

Before canonical draft writing, generated headline, caption, CTA and hashtags are checked for avoided whole normalized phrases. Unicode NFKC/case/punctuation/spacing normalization applies to both preferences and output. Hindi text/hashtags are included. An avoided phrase inside a negation is still refused; this is a conservative exact-phrase gate, not sentiment analysis. Word fragments such as an avoided phrase inside a larger unrelated word do not match.

Conflicting preferred/avoided phrases and duplicate normalized vocabulary are rejected at input. Matching output produces FAILED/BRAND_REVIEW_REQUIRED without a draft/snapshot. Existing savepoint/append-only failure handling and the explicit two-admission retry ceiling remain in force; model usage may already have occurred. Retry is never automatic. Changing the immutable preferences requires a new plan; close/cancel the old unsaved slots to release their topic claims first.

## Saved-topic preview

Check similar saved topics performs a read-only private request for the selected client/month/target. It validates current context and any selected strategy facts, then checks at most1,200 retained active topic claims. It validates stored configuration/topic hashes and bounds each stored item definition before parsing. Saved text/captions and provider data are not read or returned.

Exact normalized wording is flagged separately. Other matches require at least two shared non-stopword tokens and at least50% Jaccard word overlap, with at most three results per proposed topic. Common English function words are excluded; Hindi words remain literal tokens. Percentages measure token overlap, not semantic confidence. Synonyms, translated equivalents, paraphrases and creative/asset similarity can be missed. Topics with fewer than two content tokens receive no approximate score; existing exact matching still applies.

This preview reserves nothing and blocks no approximate match. The existing transactional unique topic claim remains the authoritative exact-duplicate guard at save time; another writer can save after a preview. Changing form inputs hides the stale preview. Duplicate-normalized topics inside one proposed batch remain refused by the existing input contract. The preview compares saved active claims, not approximate similarity between unsaved items in the same proposed batch.

## Compatibility, privacy and ownership

Strategy is optional on the existing plan input. Legacy omitted inputs keep exactly the same normalized shape, hashes and immutable configurations. New strategy fields are included in existing config/input hashes and append-only plan history; no old record is rewritten. Saved detail shows the immutable audience/tone/objective/preferences and reference count. It does not pretend an old reference is currently approved. Existing context/knowledge-current indicators still govern remaining generation.

Browser strategy/fact values stay in scoped React memory. Only creation key/hash goes into session recovery storage; captions, audience, selected fact values and prompts do not. Existing plan CSV continues exporting topic/state/version/hash metadata without private strategy or generated text. Current client/session guards apply to options, preview, create, recovery and detail. Context changes clear loaded selections; late option responses must match the current live context reference.

GET `/api/companies/:companyId/calendar-plans/planning-options` uses current read authorization, existing read-only SQL deadline and no-store responses. POST `.../topic-preview` requires write authorization, strict normalized plan input (no creation key) and the same deadline/no-store behavior. Extra query fields are refused. Both are registered ahead of the generic `/:planId` route. The canonical knowledge-context size/200-fact bounds still apply; service availability is withheld rather than returning a partial set.

shared/calendarStrategy.ts owns preference contracts, phrase gate and lexical scoring. shared/calendarPlans.ts preserves optional-input compatibility. server/calendarPlans.ts resolves facts and owns read-only preview/admission/settlement. CalendarBatchPanel owns explicit review and current-context display. server.ts passes structured untrusted preferences through the existing generateKnowledgeDraft adapter.

Schema053/93 tables, next054, frozen report V4 are unchanged. Billing remains excluded; rendering remains default off. No production deployment, DB mutation, provider/customer send or real model call is performed by verification.

## Remaining scope and evidence

P05-08 remains in_progress. Full automatic audience/offer strategy, structured offer validity/locale/brand policy, maintained locale-aware festival sources, semantic/topic/asset deduplication, full creative/approved library and production/provider acceptance remain open. This group supplies explicit reviewed preferences and exact fact binding, not a fully autonomous strategy engine.

See [REVIEWED_CALENDAR_BATCHES.csv](REVIEWED_CALENDAR_BATCHES.csv) and [evidence/reviewed-calendar-strategy.json](evidence/reviewed-calendar-strategy.json). Regression/native/browser evidence is recorded there after final checks. Schema changes were not needed; the previous export-restore rehearsal remains historical evidence for unchanged053, not a newly repeated restore claim.

## Final local verification

138 isolated regression programs passed; final strict JSON-type cases also passed in the focused strategy contract test. Full disposable MariaDB10.11.19 suite passed, including effective/draft/withdrawn fact selection, stale revision/fingerprint refusal, selected values reaching the model adapter, brand-gate failure/no snapshot, explicit compliant retry, exact/lexical/irrelevant topic preview and role/context/HTTP guards. Calendar/root browser2/2 and final calendar/lazy-feature2/2 passed (three distinct targeted workflows; not a fresh run of all28 registry fixtures). Browser coverage includes review invalidation, no model/create action during preview, immutable strategy recovery and no audience in session recovery storage. TypeScript, production build, source/route/doc guards pass. Full normal App closure583013 raw/168861 gzip bytes fits the existing600000/180000 budgets. No provider traffic or production database access was needed.
