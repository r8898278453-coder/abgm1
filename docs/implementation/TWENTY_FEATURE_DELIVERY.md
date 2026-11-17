# Twenty feature integration batches — 17 November 2026 IST

This group integrates twenty existing feature modules into a shared on-demand loading, isolated failure and client/session boundary. Each row is one bounded module integration batch with a concrete production bundle entry and browser smoke acceptance. These are not twenty newly invented product features or twenty completed original parent tasks. The original internal services, permissions, idempotency and provider controls remain canonical.

## Scope and evidence

| Batch | Module/workflow | Delivery and targeted existing coverage |
| --- | --- | --- |
| B20-01 | Dashboard | Deferred module, scoped mount; workspaceIsolation and real-module matrix |
| B20-02 | Business audit | Deferred module, unavailable-service containment; workspaceIsolation |
| B20-03 | Google profile | Deferred module, scoped editor mount; workspaceIsolation |
| B20-04 | Local SEO | Deferred module, independent loading; observationTruth |
| B20-05 | Competitors | Deferred module, isolated failure/client reset; competitorWorkflow |
| B20-06 | Reviews | Deferred module, shared error boundary; workspaceIsolation |
| B20-07 | Content studio | Deferred heavy editor module; renderOperations/workspaceIsolation |
| B20-08 | Content calendar | Deferred calendar module; workspaceIsolation approval/planning paths |
| B20-09 | Campaigns | Deferred module; campaignPlanning |
| B20-10 | Sales CRM | Deferred module; salesWorkspace/salesWorkflows/approvedSalesMessages/salesInquiryRules |
| B20-11 | Website builder | Deferred builder module; websiteIsolation |
| B20-12 | Telegram operations | Deferred operations module; telegramOperations/notificationPolicies |
| B20-13 | Automation controls | Deferred module; workspaceIsolation autonomous-state and saved-control paths |
| B20-14 | Trust and safety | Deferred module; workspaceIsolation saved-control navigation |
| B20-15 | Agency management | Deferred module; agencyWorkspace; persisted name and explicit brand/domain scope |
| B20-16 | Mobile preview | Deferred module and explicit client key; twenty-real-module load/render/reset smoke only; full mobile acceptance remains open |
| B20-17 | Integrations | Deferred module; integrationIsolation; truthful saved-configuration label and explicit extension decisions |
| B20-18 | Business knowledge | Deferred module; knowledgeWorkflow/knowledgeFacts |
| B20-19 | Client onboarding | Module not requested while closed; onboardingWorkflow/companyCreation |
| B20-20 | AI copilot | Module not requested while closed; real-module matrix and shared session-reset/import-failure tests; grounded consumer tests remain in default suite |

Machine-readable tracking: TWENTY_FEATURE_BATCHES.csv. Source owners: App imports and components/lazyFeatures catalog, shared LazyFeature boundary, services/featureSession plus existing auth session notifications. Each feature's original component and server owner remain in place; no copied feature implementation or alternate sender was added.

## Behavior

Only visited feature code loads. Onboarding/copilot code waits until the modal opens. Each module has accessible loading and error states. An import/render failure is contained to that feature; navigation continues and an explicit Reload application control is offered. Errors do not expose the thrown detail in the UI. No automatic retry of writes or module imports occurs. The error message reminds the operator to review saved history before repeating a possibly committed action.

Token/actor changes publish a payload-free local session event and numeric memory-only revision; credentials never enter DOM keys or event payloads. The mounted feature resets on current component client identity and session changes. Cross-tab token changes are observed. Other tabs can retain different selected clients: another tab's last-selected-client storage value does not replace this tab's active component scope. Existing request-level abort/generation/session and server permission/replay fences remain necessary; unmount cannot undo a committed server action.

Twenty real modules are exercised by a fresh Chromium fixture using read-only unavailable-service responses. That fixture proves deferred import, render containment and client-remount behavior; it does not prove every feature works with live providers. A separate 23-fixture serial browser group covers existing user workflows, cookie sessions and private PWA behavior. Its child environments exclude production credentials and disable HMR to keep document/fixture updates from reloading tests.

## Performance and repeatable checks

The before build is from clean base commit `3a95fab`. Initial JavaScript is the manifest entry plus its static import dependency closure, not just the entry file. The after build contains twenty distinct dynamic entries outside that closure. Both raw bytes and gzip level9 totals are recorded in evidence/twenty-feature-delivery.json. These are local artifact measurements, not a claim about Hostinger response time, real network latency or end-user conversion.

npm run frontend:check validates all twenty emitted entries and their files, rejects a feature pulled back into the initial closure, and enforces initial budgets600,000 raw / 180,000 gzip bytes. Build output remains ignored; the Vite manifest is generated for this check. npm run test:browser:feature-group runs 23 explicit browser fixtures serially and reports exactly the selected/passed count. Optional fixture-name arguments run only the named subset and do not claim the whole group passed.

## Acceptance and remaining work

LOCAL_ACCEPTANCE_RECONCILIATION.md records four original parent decisions, including two expressly deferred extension gates. P09-07/P10-03 remain partial. Schema050/87 and frozen coverage V3 are unchanged; next051. Production runtime/cron/provider pilots, remaining marketing/sales connectors, complete workflow accountability, full mobile accessibility, retention and release gates remain open. No deployment, real customer/provider sends or billing activation occurs here.
