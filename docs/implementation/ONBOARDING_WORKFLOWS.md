# Saved onboarding and legacy business-memory intake

Current local acceptance (12 November2026 IST): [ACCEPTANCE_TEN.md](ACCEPTANCE_TEN.md) accepts the original criteria for P02-01, P03-01/04/06 and P04-01/02/03/04/07/08 after the complete13-step matrix. These decisions supersede older in-progress notes for those tasks only. Schema034/60 unchanged. Full phase/hosting/provider/production gates and explicitly separate extension limits remain open; generated STATUS.md is current.

12 November2026 IST. This grouped continuation implements twelve connected deliverables under existing P02/P03/P04 work packages; it does not claim twelve complete parent packages. P04-07 and P04-08 now in progress. Schema034/60 and historical001–034 are unchanged; next035. No production deployment/migration, external provider invocation, customer message or billing change.

## Delivered together

| Deliverable | Implementation and evidence |
| --- | --- |
| 1. Server setup load | Authenticated, no-store GET onboarding returns current workspace revision, saved step/status/profile and source-independent metadata |
| 2. Save setup draft | Strict typed profile and exact uint64 version; no local-only success; generic workspace saves cannot forge top-level setup state |
| 3. Resume setup | Closing/reopening reloads the actual saved draft/step; no timer or browser-only progress |
| 4. Confirm profile completion | Company fields, brand profile, setup status/revision and metadata-only actor audit commit together; audit failure rolls all back |
| 5. Queue registered website intake | Wizard delegates to the existing registered-site queue; no alternate crawler or scheduler |
| 6. Observe/cancel website runs | Existing saved run states, partial outcomes and cancellation controls; reload-based progress, no invented percentages |
| 7. Upload original business document | Existing private original/ingestion APIs accept PDF/TXT/MD/DOCX within2 MiB; selected file retained on uncertain acknowledgement |
| 8. Preview/review saved source | Real page/chunk text and source revision; explicit approve/withdraw/retry/delete through canonical routes, never implicit setup approval |
| 9. Read actual connection metadata | SQL provider/status/timestamp projection without credential columns; saved configuration remains current-access-unverified |
| 10. Classify legacy records | Preserve text/FAQ statements; empty/recognized placeholder documents require originals; bounded list with total/truncation disclosure |
| 11. Import legacy statements safely | Current-profile version + record ID select server-saved text; unapproved private TXT with explicit user-statement provenance; original, queue and audit share a transaction; content replay deduplicates |
| 12. Isolate sessions and workspace writes | Binary upload/download discard late actor replies; wizard unmount/request fences prevent client-A callbacks changing B; workspace autosave pauses while open and reloads revision on close |

## API ownership and data contracts

server/onboardingRoutes.ts owns GET/PUT /api/companies/:id/onboarding and POST /api/companies/:id/onboarding/legacy-import. Current inventory174 declarations/33 registration calls/no terminal collisions. Read uses canonical workspace access; mutations also recheck management/active-client policy inside their retained SQL transaction. Assigned viewers can read but cannot write. No raw SQL/provider errors or source body appears in metadata responses. Responses use no-store.

PUT accepts only expectedVersion, step1–4, complete and profile. Profile permits name/category/city/phone/plain HTTPS website, brand tone, English/Hindi/Hinglish/Marathi preference and target audience. Empty city/phone/website are supported. Name/category/tone required; URLs with credentials/query/fragment or non-HTTPS refuse. Saving a draft leaves canonical company/profile identity unchanged. Completing at step4 updates canonical company identity and merges only selected brand fields, preserving existing branding, legacy knowledge, observations and other workspace data. It never enables autopilot, approves facts/sources or sends content. Reopening a completed setup uses current canonical identity rather than a stale historical completed draft.

The existing company_profiles_data revision is reused; no parallel schema authority, independent version counter or migration. Company-row lock + revision comparison provides eight-way single-winner writes and prevents blind stale saves. Whole-workspace writes preserve the server-owned setup object through the existing sanitizer. App pauses its debounced saver while setup is open, clears pending timers and reloads the workspace on close. A previously in-flight save can still conflict; the wizard retains its form and requires reload rather than silently overwriting it. Complete scope/worker/provider-role race coverage remains a separate parent gate.

## Legacy originals and review

Legacy JSON is never deleted or rewritten by import. Up to200 documents and200 FAQs are classified, with actual total and truncation disclosed. IDs are snapshot-local array positions; exact profile version prevents importing a different reordered record. Recognized upload/indexing placeholders or absent text are classified NEEDS_ORIGINAL. This heuristic cannot prove every historical placeholder is detectable; an operator must review text. Unrecognized legacy text is labeled USER_ENTERED_TEXT, never verified original binary extraction.

Explicit import creates a private text original prefixed with the user-statement/unverified-extraction warning and record title. Converted original is capped at512 KiB. Same-byte replay reuses the source and existing queue attempt; no second queue or automatic approval. Original, queue history/outbox and import audit commit together. Eight concurrent imports result in one source and one extraction job; failed audit rolls the operation back. Source review/fact governance remains mandatory for source-derived answers. Existing saved FAQs retain their separately labeled legacy retrieval behavior; this continuation does not claim every AI consumer has been migrated.

## Remaining acceptance and deployment

Website intake deliberately uses the currently saved company URL. A changed setup draft URL must be completed before importing that new URL. Upload/import sources remain queued until a real configured worker processes them. OCR remains explicitly unsupported/blocked where unavailable; JavaScript-only sites may be partial. The wizard uses manual reload for progress. Broader intake pagination, automated profile extraction/suggestions, role parity across every legacy AI/provider entry point, full OAuth connection readiness, all legacy migration reconciliation and actual hosting/provider acceptance remain pending. Existing inline company-created notifications remain unchanged; no notification/send was executed in validation.

Onboarding/import events are durably audited. Full multi-module daily reporting reconciliation and agency exception dashboards remain P09 work; those events are not advertised as complete reporting totals. No feature activation or production authorization is inferred from this document.

Validation:100 credential-isolated regression programs; restricted disposable MariaDB10.11.19 fresh/upgrade/replay and real draft/resume/completion, eight-way CAS, permission, rollback, preservation and eight-way legacy dedupe tests; onboarding and full-workspace Chromium including stale callbacks and binary actor fences; TypeScript, canonical build/source-integrity, route/doc guards. Existing bundle-size warning remains. Previous copied-export034 preservation/replay evidence is retained; no schema change or new restore claim.
