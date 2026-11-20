# Marketing and CRM channel acceptance, 20 November 2026 IST

P05-11 and P06-08 meet their local acceptance criteria through contract fixtures, isolated SQL, browser coverage and explicit channel availability.

| Channel | Verified locally | Live status |
| --- | --- | --- |
| Google Business Profile posts | The Google-only fixture reports unavailable with zero provider attempts and creates no provider attempt record. Saved Places and GBP credentials cannot bypass this state. A mixed Google/Meta draft preserves the independent Meta outcome. | Drafting is available. Live GBP post dispatch remains unavailable. OAuth account and location scope verification, review publication and real post dispatch remain separate work. |
| Meta social publishing | Scoped stored-post inputs, approval, provider ID verification, partial results and retry behavior are covered by fixtures. Successful platforms stay recorded across partial and uncertain outcomes. | Live acceptance requires an authorized page and Instagram account and observed provider results. |
| WhatsApp | Signed batch intake, replay, receipt correlation, consent and opt-out, deduplication, tenant isolation and approved-reply gates were exercised in isolated SQL and browser checks. | Reviewed automatic replies are disabled by default. Direct sends require authorized credentials and an eligible recipient. Live send and reply evidence remains pending. |
| Tenant email | The existing compatibility endpoint returns unavailable after scope checks. Integrations displays the same unavailable state without suggesting it can send a live test. | Client sender verification, tenant threading, reply and bounce processing remain open under P06-04. |

Content Studio now starts with an empty offer field and a neutral service introduction based on the saved business name and service. Switching the client resets the draft and offer field. A browser fixture exercises the starter draft, the Google draft option and the absence of invented discount and offer copy.

The tracker records 61 validated, 13 in progress, 18 planned and one blocked. Local acceptance records the checks and unavailable channel states allowed by the original criteria. Live activation and underlying provider implementation tasks retain their own tracker entries.

Verification passed across 157 default regressions, native SQL, five Chromium workflows, TypeScript, production build, frontend budgets and route and migration source checks. [Verification record](evidence/marketing-channel-acceptance.json)
