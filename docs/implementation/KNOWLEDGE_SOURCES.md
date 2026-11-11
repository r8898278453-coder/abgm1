# Private knowledge sources — 11 November2026 IST

Current schema033_structured_knowledge_facts /52 tables. Private originals, queued processing, review/search, source history and daily source accountability are implemented locally. P03/P04 acceptance, semantic fact governance and automatic marketing/sales consumption remain open. No production migration or deployment performed.

## Storage and formats

Original bytes live in company-scoped knowledge_sources, not public uploads or profile JSON. SHA256, original name, media type and byte count are immutable through application commands. Same-company identical bytes return the existing source ID/provenance/review state, including at the source-count limit; other clients have independent namespaces. A replay never secretly reruns extraction or invents a new source URL/fetch time. Normal metadata/report/audit responses omit original/extracted content. Authenticated preview and attachment-only download recheck scope; downloads include nosniff/sandbox headers and verify original byte length/digest.

One multipart file, no extra fields, max2MiB/file,50 originals/client and32MiB originals/client are enforced under the company lock. Public uploads accept TXT/Markdown/DOCX/PDF; registered website snapshots are internal HTML/plain sources with original URL/time/media. These are application bounds, not proven actual hosting capacity or shared agency budget. Delete removes the source row/original bytes; minimal source/queue audit remains. Backups/in-flight memory and retention governance are separate.

| Type | Actual processing | Limits |
| --- | --- | --- |
| TXT/Markdown | UTF8 text and exact normalized excerpts | Invalid encoding/empty text/mismatched PDF or ZIP signature refuse |
| DOCX | Bounded word/document.xml body with basic XML entities |256 ZIP entries,512KiB inflated XML, DTD/entities refuse; no headers/footnotes/images/invented page numbers |
| Text PDF | Local pdfinfo/pdftotext and actual page numbers |40 pages,2.5s info/5s text deadline; requires Poppler |
| Scanned/no-text PDF | NEEDS_OCR | No OCR provider/fabricated chunks |
| Protected/corrupt PDF | FAILED/PDF_UNREADABLE | No password guessing or fake extraction |
| Registered HTML/plain snapshot | Static entity-aware text; original URL/time/media retained | Bounded fetch/static extraction, no JS/resources; see WEBSITE_IMPORT.md |
| Legacy DOC/other formats | Unsupported/rejected | No binary-to-placeholder conversion |

Output max512KiB/500 chunks, using character spans in normalized text, not original-file byte offsets. Chunks max1200 UTF16 characters prefer nearby whitespace and avoid splitting surrogate pairs; very long unbroken tokens may hit the hard bound. PDF page provenance is real; TXT/DOCX do not invent pagination. Empty text is not an OCR claim except scanned/no-text PDF. Parser subprocess environment excludes DB/auth/provider secrets. Private PDF temp files are cleaned in finally; process-kill cleanup/OS containment and actual hosting resource acceptance remain P10 work. At most2 parsers/process is not cross-replica fairness.

## Durable lifecycle and approval

STORED → QUEUED → PROCESSING → EXTRACTED/NEEDS_OCR/UNSUPPORTED/FAILED are persisted states. Source upload normally acknowledges QUEUED, not indexed/extracted. Existing queue/source history/outbox are reused; admission and terminal settlement are atomic, DB lease/attempt and source revision/job references fence old workers. See KNOWLEDGE_INGESTION_QUEUE.md for bounded retries, orphan/interrupted/cancel recovery and actual worker/cron requirements. A QUEUED row proves persistence only, not functioning hosting cron.

Same-byte replay preserves the existing state. Explicit source retry requires loaded expectedVersion, rejects active runs and queues a new run while clearing approval. Retry processes saved bytes, not a fresh website fetch. Fresh runs remain unapproved, even after successful extraction. Approval means permission to use reviewed source text, not independent business-fact verification. Approval, withdrawal and deletion have exact revision preconditions; approval/settlement refuse changed original length/hash. Revision exhaustion refuses rather than wraps.

Original deletion fences late worker results; minimal tombstone/history remains. Source state changes and source audit events commit together; queued jobs also have durable attempt/outbox evidence. History contains only identifiers/state/revision/actor/time plus optional queue references, not source text/bytes/URL. Pre-feature events are not backfilled. Historical extracted-text versions are not retained for arbitrary download; originals, current extraction and minimal transitions are retained. See KNOWLEDGE_HISTORY.md.

## Saved-source search and UI

POST /api/ai/knowledge/query accepts only explicit companyId/query, rejecting browser-supplied documents/FAQs/business context. It reads canonical saved manual FAQs plus approved SQL source chunks and returns up to5 exact lexical excerpts with IDs/revisions/hash, PDF pages or website URL/time where available. Long answers quote the matching source substring with excerptStart/excerptEnd offsets. Missing matches abstain; failure does not become verified facts. No model/tools/customer messages execute from this endpoint; source instructions are inert quoted text.

Search covers newest20 approved sources/first200 saved FAQs, with truncation flags. It is not semantic/vector retrieval or a verified fact graph. Unstructured quotes can still contain contradictions. Reviewed structured keys now apply manual precedence and conflict/no-approval abstention first (KNOWLEDGE_FACTS.md); semantic cross-key/prose conflict detection and automatic newest-snapshot precedence remain open. FAQ statements are manual, not independently verified. Unsaved browser edits are excluded. Legacy profile document metadata remains visibly unverified/preserved, never promoted from a filename placeholder into approved source content; reupload actual bytes or paste actual text. No destructive legacy migration.

Frontend remounts by actor/client and fences obsolete searches/history/preview/list completions. Source eligibility changes abort pending fact queries so pre-withdrawal results cannot reappear. Pending source mutations disable overlapping search/refresh; upload failure retains input. Source cards show actual queue status and worker prerequisite. Snapshots/history/citations use the shared IST formatter. Daily report/CSV/digest distinguish current backlog from six durable recorded source transition counters that survive deletion; see KNOWLEDGE_HISTORY.md. New source text is not automatically used in campaigns/replies/chat/sales.

## Migration, evidence and remaining acceptance

030 introduced private source storage,031 website provenance and032 queue references; table count51. Historical001–031 are unchanged by032. Readiness checks critical names, source/provenance/job field shapes and ordered/unique indexes. Same-named wrong keys, short/non-null job references, wrong attempts or missing partial columns refuse readiness/adoption. The current033 extension adds structured facts/52 tables; next product ID034. Disposable fixtures derive unused IDs.

Local evidence includes real TXT/DOCX/PDF facts/pages, malformed/encoding/XML/OCR/limits, multipart/private attachment,8-way replay/admission, caps, approval/withdraw/retry/delete, atomic history/job/outbox faults, stale-worker takeover, queued HTML/plain provenance and integrity refusal. Uploaded export reaches033 READY with original business rows/five historical ledger identities preserved and source/bundle repeat0. This is a disposable-copy rehearsal, not a production backup/restore canary. Earlier private-knowledge-sources.json records its030 checkpoint; durable-knowledge-ingestion.json records the032 queue checkpoint; structured-knowledge-facts.json records033.

Actual hosting must support coordinated schema/server/workers, pinned runtime, DML/storage/packet capacity, scheduling/restart/overlap, direct HTTPS egress/site policy and optional Poppler before production acceptance. Old binaries refuse the newer ledger; pause/update all instances together. No release authorization follows solely from local tests. OCR enablement, complete fact conflicts/freshness, shared usage/retention/performance, agency roles and automatic marketing/sales consumers remain open.

Website import now acknowledges202 with durable run metadata; history/cancellation live beside source operations. Fetching no longer holds the HTTP request open. Parent success means snapshots committed, not extraction/approval. See WEBSITE_IMPORT.md for the full current contract.

Current coordinated schema target is033/52 tables (next034). Structured key-based fact candidates/review/manual precedence and source invalidation are implemented as documented in KNOWLEDGE_FACTS.md. Full semantic conflict detection, automatic consumers and earlier/later acceptance gates remain open; current task states are generated in STATUS.md. Earlier032 figures above describe their historical batch.

12 November2026 consumer checkpoint: reviewed structured facts now guide authorized chat, review-reply and marketing drafts with conflict/stale-context checks and private attempt records. Outputs still require review; this does not connect every autonomous/sales workflow. See KNOWLEDGE_DRAFTS.md and generated STATUS.md. Schema033/52 unchanged.
