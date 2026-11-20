# Agency and knowledge acceptance, 20 November 2026 IST

P03-07 and P04-09 met their original local acceptance criteria together.

| Task | Verified behavior | Evidence |
| --- | --- | --- |
| P03-07 | Owner access across clients, staff/approver/viewer access limited to assignments, foreign-agency denial, empty-client isolation, persisted location edits and A/B/empty-client navigation | agencyFoundationSql, agencyWorkspace, workspaceIsolation |
| P04-09 | Text, image-only and mixed PDFs have distinct outcomes. Page citations retain source provenance. Conflict, approval, withdrawal, deletion and tenant boundaries apply to retrieval. Sales workflow context includes eligible approved facts and checks for changes before dispatch. | knowledgeExtraction, knowledgeSourcesSql, knowledgeFactsSql, salesWorkflowsSql, approvedSalesMessagesSql, knowledgeWorkflow, knowledgeFacts, approvedSalesMessages |

A mixed PDF keeps the readable text and page citations and flags pages where extraction produced no text. An image-only PDF returns the OCR-required state with no chunks. A mismatch between the parser page count and extracted page boundaries fails extraction. The OCR-required state asks for a text version or OCR.

The tracker now records 57 validated, 15 in progress, 20 planned and one blocked. P03-07 and P04-09 record local acceptance. P02-08 architecture compatibility, P04-06 broader draft consumer coverage, and live Hostinger evidence remain open. Disposable restore verified migration 055 and 101 canonical tables, original business-row and ledger preservation, and a zero-change migration replay.

Verification passed across 157 default regressions, disposable native SQL, six Chromium workflows, TypeScript, production build and the frontend budgets. The evidence record lists the browser workflows and restore outcomes. [Evidence](evidence/agency-knowledge-acceptance.json)
