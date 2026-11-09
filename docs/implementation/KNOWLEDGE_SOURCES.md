# Private knowledge sources — 10 November 2026 IST

Source schema target:030_private_knowledge_sources,51 canonical tables. This fixes existing false upload/index/search claims and starts P04-01/03/05 locally. P03/P04 acceptance, website import, complete fact governance and automatic use in marketing/sales remain open. No live migration or deployment was performed.

## Storage and extraction

Original bytes live in tenant-scoped knowledge_sources.content_bytes, not the public uploads directory or profile JSON. Each distinct upload creates immutable original bytes, SHA-256, original filename, inferred media type and byte count. Same-company identical bytes return the existing source ID, including after an uncertain acknowledgement or at the source-count limit. Different clients have independent namespaces. No source bytes or extracted content appear in the normal list DTO, daily report or audit URLs.

Upload accepts one multipart file with no extra fields. Maximum2MiB/file,50 sources/client and32MiB original bytes/client are enforced under the company-row lock. These are local application bounds, not evidence of actual Hostinger disk/DB capacity or agency-wide budget enforcement. The authenticated preview/download paths recheck client access; download is an attachment with nosniff/sandbox headers. Original-byte metadata is never overwritten by a reupload. Deleting an authorized source removes the row/original bytes from this database; backup erasure and retention governance are separate work.

Supported parsers:

| Type | Current behavior | Limits |
| --- | --- | --- |
| TXT / Markdown | Real UTF-8 decoding and source excerpts | Invalid encoding, empty text, known mismatched PDF/ZIP signature reject |
| DOCX | Stream bounded word/document.xml body text; basic XML entities decoded |256 ZIP entries;512KiB inflated XML; DTD/entity declarations reject. Headers, footnotes, images and layout page numbering are excluded |
| Text PDF | Real pdfinfo/pdftotext subprocesses, with page citations |40 pages;2.5s info/5s text timeout; bounded output. Requires installed Poppler executables |
| Scanned/no-text PDF | NEEDS_OCR | No OCR provider is enabled; no fabricated text/chunks |
| Protected/corrupt PDF | FAILED/PDF_UNREADABLE | No password guessing or fake successful extraction |
| Legacy DOC/other formats | Unsupported/rejected | No binary-to-placeholder text conversion |

Extraction output is bounded to512KiB and500 chunks, using real character spans in normalized page/body text. Line endings/NUL handling normalize the extracted representation; offsets are not original-file byte offsets. PDF page numbers are real parser pages; TXT/DOCX do not invent pagination. Empty TXT/DOCX is an empty-text error, not an OCR claim. Parser environment excludes database/auth/provider secrets while retaining proxy policy variables; temporary PDF directories/files are private and removed in finally. Process kill/host failure can leave temporary files; operational cleanup and complete OS memory/CPU containment still need P10/hosting acceptance. DOCX decompression is streamed and stopped at the output cap. At most two extractions run per application process; this is not a cross-replica scheduler or fairness guarantee.

## Stored lifecycle and approval

STORED → PROCESSING → EXTRACTED / NEEDS_OCR / UNSUPPORTED / FAILED are persisted states. These are source processing states, not promises that an existing durable queue job was created. Upload currently performs one bounded extraction in the request. Durable queue integration, immutable attempt history and broader resource budgets remain unfinished P04 work.

A claim increments a revision and records the database clock; settlement requires that exact revision and PROCESSING state. A live claim cannot be taken again; a claim older than ten minutes can be retried after an interrupted request. A late old process cannot settle the new claim. Same-byte upload replay does not secretly rerun extraction. Reload source metadata, then explicitly retry a STORED/failed source if needed. An ambiguous SQL acknowledgement is reported as unconfirmed; clients reload before deciding what happened.

Sources are not eligible for search until an authorized user reviews the extraction and approves its exact version. Approval means permission to use that source text, not independent business-fact verification. Retry clears approval. Approval can also be withdrawn without deleting the original file, immediately excluding it from future searches. Approve/withdraw/delete use revision preconditions; stale commands conflict. A preview is bounded, private text rendered as text, not HTML. Current approval/revision is persisted; full approval/attempt audit history and historical extraction-version downloads are not implemented.

## Search and compatibility

The existing POST /api/ai/knowledge/query now accepts only explicit companyId and query. Browser-provided documents/FAQs/business context are rejected. It reads saved manual FAQs from the canonical profile and approved source chunks from private storage. It performs deterministic lexical retrieval and returns up to five exact excerpts with source ID, source/profile revision, content hash and PDF page where known. Missing matches abstain; provider/network failures do not become verified answers. Source instructions remain inert quoted data; this search does not invoke a model, execute tools or dispatch customer messages.

The search window is the newest20 approved sources and first200 saved FAQs, with truncation flags. This is not semantic/vector retrieval, a verified-fact graph or a complete answer-generation system. Contradictory approved documents may both be quoted; no automatic newest-fact precedence is claimed. Withdraw outdated source approval pending the full conflict/precedence workflow. Saved FAQ statements are manual data, not independently verified facts. Unsaved UI edits are excluded.

Legacy profile documents/FAQ content remain stored and editable via the existing versioned workspace draft. Legacy document metadata is labelled unverified; filename-only/binary placeholder records are not promoted into private extracted sources or supplied as approved retrieval content. Reupload the real file or paste actual text to create a reviewable source. There is no destructive legacy JSON migration. Existing custom knowledge-query callers must move to the explicit saved-source contract. Automatic review/content/chat/sales use of the approved sources is not enabled by this batch.

The frontend remounts per actor/client, aborts obsolete searches and fences late preview/list updates. Upload failure retains the form/file. Confirmed source commands update the visible collection only after scoped acknowledgements. Reloading/changing source eligibility clears stale source result text. Daily report/CSV/digest expose current counts awaiting approval, marked processing and blocked/not-yet-extracted; they do not invent historical completed-work counts for source rows that may later be deleted.

## Migration and rollout evidence

030 is the first real immutable data-manifest migration after the frozen001–029 legacy definitions. A preflight rejects incompatible preexisting source-table shapes. Critical columns and ordered lookup/unique keys participate in read-only readiness; a same-named wrong unique key or missing extraction column cannot be READY. The next product ID is031. Extension tests derive disposable IDs from the current registry rather than occupying a fixed product slot.

Local tests cover actual TXT/DOCX/PDF facts, OCR/malformed/signature/size/encoding/XML cases, private multipart storage/download, client isolation, same-byte8-way replay, source cap/replay at capacity, approval/retry/withdraw/delete fences, stale crash recovery, reporting states, fresh/005 upgrade/replay, restricted startup and source/bundled migration identities. The user's unchanged export upgrades locally to030/READY while preserving all original business rows and five historical ledger identities. This is a disposable-copy rehearsal, not a production backup/restore acceptance.

Hostinger must separately support the pinned Node runtime, schema30/51, required packet/storage limits and optional Poppler executables before live parser capability is accepted. Missing PDF tools return PDF_PARSER_UNAVAILABLE. Do not apply the migration or publish solely because the local tests pass. Strict ledger gating means an old29 binary will refuse a30 ledger; coordinate the later release and rollback plan accordingly. See evidence/private-knowledge-sources.json and EXECUTION.md.

Long answer citations select an exact source substring around the first answer-side query term, with excerptStart/excerptEnd UTF16 character offsets within the FAQ answer or extracted chunk. Question-only matches retain the answer prefix. This avoids returning an unrelated prefix when the matching answer text occurs later; no semantic inference is introduced.

Extraction retry is now revision-bound at the locked claim: stale tabs cannot clear newer approval/text, including recovery of an older processing claim. Eight contenders for one loaded revision admit one extraction owner. Internal initial-upload claims remain server-owned; public retry always supplies expectedVersion.
