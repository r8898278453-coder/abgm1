# Registered website source import

11 November2026 IST. P04-02 remains in progress; prerequisite and phase gates remain open. Current source target031/51 tables. No production migration, live website fetch or deployment was performed in these tests.

## Current user flow

Knowledge view has **Import registered website**. It POSTs an empty object to `/api/companies/:id/knowledge/import-website`; no browser URL is accepted. Server authenticates and authorizes the workspace before reading the canonical company row's website. Missing website refuses; supported URLs require HTTPS and no userinfo/query/fragment/nonstandard port/IP literal. The existing rate limiter applies. The preview fetch stage admits at most one run per process; this is not durable cross-instance admission.

Root plus relevant same-origin about/contact/services/product/pricing/FAQ links are considered, max3 page attempts. Static UTF8/ASCII HTML/plain text is parsed without executing JavaScript or loading resources. Partial/empty/unavailable outcomes remain explicit. No claim of complete website coverage, current provider permission or verified business facts is made. Unsupported JavaScript-heavy pages require a text source or a later supported renderer.

Each successful page stores its exact original bytes privately in knowledge_sources as an internal `.html` snapshot. Media type, original source URL and fetch epoch milliseconds are retained. Migration031 adds nullable source_url/fetched_at_ms; type/length compatibility is checked before adoption and readiness requires expected shapes. The migration targets the validated MariaDB10.11 engine with idempotent ADD COLUMN IF NOT EXISTS. Confirm actual hosting engine compatibility separately. Historical001–030 files are unchanged; next product ID032.

Fresh snapshots extract bounded text and stay unapproved. Source metadata shows original URL/fetch time. Existing authenticated attachment download, exact-revision review/approval/withdraw/delete and saved-only search apply. Approved citations include source URL/fetch time plus original hash/source revision. Extraction retry reads saved original bytes and media type, retains provenance and clears approval; it does not refetch the website. Re-run import to fetch current website bytes.

Company-wide content SHA deduplication remains: identical bytes return the first stored source ID, original URL/time and current review state. A new URL/time is not invented for a replay. Changed bytes create a new unapproved source; an older approved snapshot is not automatically deleted/withdrawn. This is snapshot storage, not conflict/precedence governance. Review contradictory/newer content manually; structured fact conflict review remains pending. Existing50-source/32MiB quotas and private original-byte limits apply. Import failure after earlier page commits may leave those pages saved; UI requires reload after an unconfirmed action. There is no all-pages transaction or completed durable import-run history yet.

## Transport and extraction limits

Every DNS answer must pass a conservative public-address policy. One checked address is pinned into the original-hostname TLS socket; automatic family selection is disabled and certificate verification remains enabled. DNS is checked per redirect. Same-origin redirects max3; page total10s including DNS, DNS max3s, streamed body256KiB, text/html or text/plain only and identity content encoding. No caller cookies/authorization are forwarded. IPv6 policy deliberately refuses some valid addresses; unsupported is preferable to bypassing destination guards.

parse5@8.0.0 decodes HTML entities as inert data. Script/style/template/noscript/SVG/canvas/iframe/object/embed/nav/footer/form trees and basic hidden/aria-hidden/inline-style exclusions are skipped. This is not browser-computed CSS visibility. Traversal max50000 nodes/depth256, normalized text128Ki characters. Title, original/text SHA256 and same-origin relevant links accompany preview. Runs only start a new production fetch within20s of run start, each fetch bounded10s, max3 attempts. Exact private original-byte copies precede SQL storage.

Product transport uses directly pinned TLS. Proxy-only hosting/cloud deployment requires an explicitly tested design preserving destination validation; mocked tests bypass no network policy and prove no actual egress capability. Registered-client authorization narrows input but does not prove domain ownership or consent; full domain/agency policies remain separate gates.

## Evidence and remaining work

Mocked DNS/socket/stream and extraction tests cover pinning, mixed public/private refusal before dial, safe redirects, exact byte/hash provenance, encoding/content/complexity limits and redacted errors. Restricted disposable MariaDB verifies real persisted HTML, URL/time, unapproved exclusion, approved citations, stable replay and retry provenance. Chromium verifies client-scoped import payload, visible provenance and partial-import notice. Uploaded export restores through031 with original rows/ledger preserved and source/bundle replay0.

Remaining: durable ingestion queue/run and attempt history, shared admission/usage accounting, full fact conflicts/precedence, robust refresh/supersession policy, robots/site policy, browser/runtime support when needed, automatic marketing/sales consumers, actual hosting/egress canary and all preceding agency/security gates. This batch does not complete P04 or all planned work.
