# Client ICP and declared prospect fit — 17 November 2026 IST

18 November2026 acceptance update: GROWTH_OPERATIONS_GROUP.md adds durable assessment/profile/context/source history. P08-01 owner-declared ICP/import/provenance scope is now locally validated; earlier in-progress/history-pending notes below describe the prior checkpoint. Provider-backed discovery/enrichment and phase/live gates remain open.

Each client's canonical sales policy now saves a prospecting profile: enablement for declared-fit assessment, target services, buyer roles, exact regions, inclusive minimum/maximum employees, website requirement, value proposition and human-review disqualifiers. Industries and email-domain exclusions remain in their existing policy fields, avoiding conflicting duplicate owners. There is no new table, scheduler or sender; schema050/87 and next051 remain unchanged.

The existing manage-authorized policy command retains expected-version CAS, company locking, canonical workflow invalidation and atomic policy audit. Legacy stored policies parse with a disabled empty profile. Older callers omitting prospecting preserve the currently saved nested profile under the same lock instead of silently erasing it. A caller explicitly supplying a profile must pass the complete strict schema; normalized duplicate lists, unsafe numbers, reversed employee bounds, extra fields and oversized text are rejected. The UI uses the existing Save sales policy action and retains uncertain/conflict drafts using that owner's controls.

## Assessment

POST /api/companies/:companyId/sales/prospects/assess is authenticated, current-client write-authorized, queryless and private/no-store. It validates bounded declared context and source reference; a fresh actor/admin and client-access check occurs inside the read-only consistent transaction/deadline. The saved policy and database clock determine the result. It performs no network fetch, enrichment, lead import, consent write, audit write or provider send.

| Criterion | Rule |
| --- | --- |
| Industry | Existing policy industries; exact normalized match |
| Service | Saved target service list; exact normalized match |
| Buyer role | Saved role list; exact normalized match |
| Region | Saved region list; exact normalized match, no inferred geography |
| Employees | Inclusive configured bounds; unknown stays unknown |
| Website | Presence only when required; presence is not website verification |

Normalization uses NFKC, trimmed/collapsed whitespace and case folding. Empty lists/ranges are NOT_CONFIGURED. A missing required declaration is UNKNOWN. With a fresh enabled profile, a known structured mismatch produces EXCLUDED; otherwise unknown required fields, an entirely unconfigured profile or saved human-review disqualifiers produce REVIEW. Only a complete match to configured criteria without pending human disqualifiers produces DECLARED_FIT. Disabled profiles and evidence older than90 days produce REVIEW. Exactly90 days remains within the declared freshness window; future observation times are rejected. These are declarations, not independently verified facts or an AI intent score.

Human disqualifiers are not automatically interpreted. They require an operator decision even when structured values match. A value proposition is a planning note; it does not become an approved business fact or a price/promise for AI replies.

The editor records observed dates as fixed IST day starts, independent of browser/host timezone. Editing input invalidates the old result. Results must match current client and viewed policy revision; a changed revision requires reloading sales policy. Unmount aborts reads and token fences reject stale results/exports. CSV exports only fixed criteria/results, policy version, observed/checked IST times, state and consent=false; it omits source reference and raw prospect context and escapes spreadsheet formulas. Nothing is imported or sent by assessment/export. Existing preview/import is still required and freshly rechecks identity/customer/domain/suppression outcomes.

## Compatibility and limits

This is a sales policy JSON contract extension, not SQL DDL. Readers/writers must deploy together. A prior binary whose sales policy parser rejects unknown properties cannot read a newly stored prospecting field, including a saved default profile; retain an extension-aware reader or forward-fix on rollback. Do not erase saved targeting data to force old-reader compatibility. No production rollout occurs here.

Assessment context/source and results are memory-only; CSV is metadata, not a persisted immutable assessment journal. A policy revision identifies the observed configuration but does not provide historical reconstruction of every older policy value. Declared fit does not establish contact permission, deliverability, freshness verification, business revenue or import eligibility. Target profile criteria do not automatically filter the four-column CSV, which lacks these dimensions. Provider-backed discovery, enrichment, persisted evaluation provenance and full outbound/parent acceptance remain pending; P08-01 stays in progress.

Validation: evidence/prospecting-profile.json. Unit boundaries, native persistence/legacy/CAS/audit rollback/tenant/actor/query cases, the full SQL suite and sales/import browser workflows are recorded there. Existing billing exclusions, notification opt-ins, render defaults and release gates remain unchanged.
