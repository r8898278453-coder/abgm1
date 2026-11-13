# AI Agent State

13 November2026: verified WhatsApp event-time/replay controls use whatsAppInbound.ts, whatsAppWebhook.ts, whatsAppEventTime.ts and WhatsAppInboundHistoryPanel. Schema041/77 (next042). Stale history cannot restart reviews or extend new verified reply windows; conflicts quarantine contact sending. See docs/implementation/WHATSAPP_EVENT_TIME.md for compatibility and remaining gates.

13 November2026: opt-in automatic inquiry review enrollment uses salesInquiryRules.ts, existing verified inbound transaction/workflow snapshot/shared queue and SalesInquiryRulePanel. Schema040/76 (next041), default rule disabled, message sending separately approved/default off. See docs/implementation/SALES_INQUIRY_RULES.md.

12 November2026: exact human-approved WhatsApp replies use server/approvedSalesMessages.ts and salesSendAuthorization.ts, existing queue/dispatcher/Meta adapter and ApprovedSalesMessagesPanel. Default off, schema039/74 (next040), no live activation. See docs/implementation/APPROVED_SALES_MESSAGES.md for scope, validation and remaining gates.

12 November2026 workflows: server/salesWorkflows.ts owns definitions/enrollments/review execution; salesWorkflowLifecycle.ts owns atomic source-event exits; shared/salesWorkflows.ts owns contracts/presets; SalesWorkflowPanel.tsx owns operator UI. Existing queue/audit/message/fact services remain canonical. Schema038/73; review tasks never imply provider delivery. See docs/implementation/SALES_REVIEW_WORKFLOWS.md.

12 November2026 sales batch: server/salesWorkspace.ts owns CRM extensions, consent/inbox/qualification/import/report services; server/salesRoutes.ts mounts scoped APIs once; shared/salesWorkspace.ts owns contracts; SalesWorkspacePanel.tsx is the CRM/agency UI. Existing lead stages, message intents, verified webhook mapping and knowledge facts retain their canonical ownership. Forward037/70; see docs/implementation/SALES_TEN_AREA_BATCH.md for ten implemented areas and remaining parent acceptance.

## Current Phase: Phase 0 — Consolidation & Canonical Architecture
- **Current Task**: Established ONE canonical implementation for every major capability across backend, rendering engines, database helpers, provider adapters, frontend views, and background schedulers.
- **Consolidation Findings & Actions**:
  - **Content Publishing**: Canonical `server/publishingEngine.ts` (`executePublishingJob`) via `POST /api/content-posts/:id/publish`. Migrated `ContentStudioView.tsx` from status-only patching to canonical state machine. `CalendarView.tsx` and `scheduler.ts` already use canonical engine.
  - **Scheduler**: Canonical `server/scheduler.ts` with hot-reload single-daemon guard (`global.__abga_scheduler_started`).
  - **Video Rendering**: Canonical `server/reelJobs.ts` + `server/reelRenderer.ts` + `remotion/*`.
  - **Google Integrations**: Canonical `POST /api/companies/:id/google-profile/sync` + Google Places Details API with review deduplication.
  - **Local SEO Rank Radar**: Canonical `server/localSeoProvider.ts` (`performRankScan`, `saveRankObservations`).
  - **Competitor Intelligence**: Canonical `server/competitorProvider.ts` (`fetchCompetitorObservation`, `calculateCompetitorChanges`).
  - **Meta & WhatsApp Cloud API**: Canonical `server/metaWhatsAppService.ts` (`publishToFacebookPage`, `publishToInstagram`, `sendWhatsAppCloudMessage`).
  - **Growth Intelligence Score**: Canonical `server/growthScoreEngine.ts` (`calculateGrowthIntelligenceScore`, `toGrowthScorePayload`).
  - **AI Executive Summary**: Canonical `server/aiExecutiveSummary.ts` (`collectTruthfulEvidence`, `buildEvidenceGroundedPrompt`).
  - **Revenue Attribution**: Canonical `server/revenueAttribution.ts` (`calculateRevenueAttribution`, `normalizeSource`, `isProviderVerifiedPayment`).
  - **Campaigns & Ads Separation**: Canonical `server/adCampaignService.ts` (`getInternalCampaigns`, `getExternalAdCampaigns`).
  - **Autonomous Governance**: Canonical `server/autonomousEngine.ts` (8-stage lifecycle engine with kill switch & audit logs).
  - **Authentication & RBAC**: Canonical `server/auth.ts` + `getAuthUserFromRequest`/`getUserCompanies` in `server/db.ts`.
  - **Integration Live Testing**: Canonical `POST /api/integrations/test` in `server.ts`.
  - **Data Status Badges**: Canonical `src/components/DataStatusBadge.tsx` (10 standard data classifications).
  - **Company Creation Baseline**: Cleaned `CreateCompanyModal.tsx` to provision empty arrays for keywords and competitors on initial setup.
- **Completed Tasks**:
  - **GAP-001**: Remotion 15s MP4 video rendering engine (`server/reelRenderer.ts`, `server/reelJobs.ts`, `remotion/*`).
  - **GAP-002**: `video_url` persistence across MySQL schema, server endpoints, and frontend Content Studio / Calendar views.
  - **GAP-003**: MySQL Self-Healing Columns (`video_url`, `custom_domains`, `website_configs`, `invoices`, `subscriptions`).
  - **GAP-004**: Per-tenant Multi-Company Isolation and RBAC across company resources.
  - **GAP-005**: Google Places API review ingestion pipeline (`syncGoogleReviewsToDatabase`, `POST /api/companies/:id/google-profile/sync`).
  - **GAP-006**: Google Maps Local SEO Rank Tracker & SERP Scraper Engine (`performRankScan`, multi-node geo coordinate scanning across commercial nodes, competitor discovery from SERP listings, `POST /api/companies/:id/rank-radar/scan` and `POST /api/companies/:id/rank-radar/refresh-all`), with Data Truth badges (`LIVE`, `VERIFIED`, `CALCULATED`, `ESTIMATED`, `DEMO`).
  - **GAP-007**: WhatsApp Cloud API & Meta Direct Dispatch Pipeline (`/api/whatsapp/send`, `/api/whatsapp/broadcast`, `/api/meta/publish-post`), with inbound webhook signature verification (`/api/whatsapp/webhook`).
  - **GAP-008**: Inbound Razorpay Webhook Gateway (`/api/razorpay/webhook`) with HMAC-SHA256 signature verification (`x-razorpay-signature`), automated GST-compliant invoice generation in `invoices` table, subscription ledger period synchronization in `subscriptions` table, and `BillingView.tsx` integration.
  - **GAP-009**: Standalone semantic HTML5 website generator with JSON-LD Schema.org (`LocalBusiness`), OpenGraph tags, responsive Tailwind styling, instant inquiry CRM forms, and WhatsApp floating chat. Production static `.zip` bundle export engine (`generateStaticExportZip` using `JSZip`) with `sitemap.xml`, `robots.txt`, `manifest.json`, `netlify.toml`, `_headers`, and `README.md`. Custom Domain Binding with live Node.js DNS verification (`verifyDomainDns`) resolving CNAME, A-Record, and TXT tokens.
  - **GAP-P0-SEC**: Added strict session authentication and tenant authorization on `GET /api/integrations` and `POST /api/integrations/test`.
  - **GAP-P0-TRUTH**: Created centralized `DataStatusBadge.tsx` supporting 10 standard states (`LIVE`, `VERIFIED`, `CALCULATED`, `ESTIMATED`, `AI_ESTIMATED`, `USER_ENTERED`, `SEEDED`, `DEMO`, `UNAVAILABLE`, `ERROR`), refactored `DashboardView.tsx` to compute verified dynamic metrics, and removed unverified "LIVE" badges.
  - **GAP-P0-PUB**: Eliminated false success on `/api/meta/publish-post` when credentials are unconfigured or when Meta returns errors; updated `server/scheduler.ts` `runAutoPublishJob` to execute real provider verification/dispatch before marking post as published.
- **Verified Tasks**:
  - Remotion video rendering pipeline (`POST /api/ai/render-reel`, `GET /api/ai/render-reel/:jobId`).
  - Google Business Profile Places Details API integration & review synchronization.
  - Google Maps Rank Radar with multi-source fallback and real geographic node coordinates.
  - Meta/WhatsApp Cloud API dispatch & HMAC webhook signature verification.
  - Razorpay Webhook Gateway & Invoice Generation.
  - Static Website Export & Custom Domain DNS Verification.
  - Full TypeScript validation (`tsc --noEmit` passing with 0 errors).
  - Production compilation (`vite build` passing).
  - Dev server and health endpoint (`GET /api/health` returning 200 OK).
- **Known Blockers**: None.
- **Status**: Complete Phase 0 Consolidation.


12 November2026 continuation: durable SQL reel jobs replace the memory manager. Rendering defaults off; see docs/implementation/DURABLE_REELS.md for worker capability, approvals and exact evidence.
