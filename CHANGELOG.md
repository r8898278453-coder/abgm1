# Changelog

All notable changes to this project will be documented in this file.

## [1.18.0] - 2026-09-24
### Added & Standardized (Autonomous Governance & 8-Stage Lifecycle Engine)
- **8-Stage Autonomous Lifecycle State Machine (`server/autonomousEngine.ts`)**:
  - Implemented the complete governance workflow: `OBSERVE → DETECT → ANALYZE → RECOMMEND → APPROVE → EXECUTE → VERIFY → MEASURE`.
  - **Zero-Invention & Anti-Fabrication**: Evaluates strictly verified database records (`rank_observations`, `competitor_observations`, `reviews`, `leads`, `external_ad_campaigns`). If 0 verified signals exist, returns `INSUFFICIENT_EVIDENCE` with 0 recommendations generated.
  - **Evidence-Linked Recommendations**: Records `observation`, `evidence_ids`, `source`, `timestamp`, `recommended_action`, `affected_metric`, `confidence`, `risk` (`low` | `medium` | `high`), and `approval_requirement` (`auto` | `required`).
  - **Outbound 8-Gate Safety Enforcement**:
    1. Authentication: Valid session or authorized system daemon.
    2. Authorization: Multi-tenant workspace isolation (`company_id` IDOR protection).
    3. Kill Switch: Global emergency stop & per-company autopilot toggle (`isEmergencyPaused` / `isAutopilotOn`).
    4. Approval Policy: High-risk actions (budgets, offers, profile edits) strictly require human approval before execution.
    5. Rate Limit: Throttles executions per company workspace (max 10 actions/minute).
    6. Idempotency: Deduplicates repeated execution attempts.
    7. Provider Availability Check: Direct verification of live credentials before dispatch (`BLOCKED_PROVIDER_NOT_CONFIGURED` on unconfigured; never claims false success).
    8. Immutable Audit Logging: Structured audit record stored in `autonomous_audit_logs`.
- **Database Persistence & Schemas (`server/db.ts` & `schema.sql`)**:
  - Added relational MySQL and in-memory tables: `autonomous_recommendations`, `autonomous_actions`, and `autonomous_audit_logs`.
- **Backend API Endpoints (`server.ts`)**:
  - Added `GET /api/autonomous/status`, `POST /api/autonomous/kill-switch`, `POST /api/autonomous/run-cycle`, `GET /api/autonomous/recommendations`, `GET /api/autonomous/actions`, `POST /api/autonomous/actions/:id/approve`, `POST /api/autonomous/actions/:id/reject`, `POST /api/autonomous/actions/:id/execute`, and `GET /api/autonomous/audit-logs`.
- **Frontend UI Integration (`src/components/AutonomousEngineView.tsx`)**:
  - Connected real-time cycle execution, grounded recommendation cards with evidence IDs, human approval/rejection triggers, execution state badges, and immutable audit logs drawer.
- **Unit & Integration Test Suite (`test/autonomousGovernance.test.ts`)**:
  - 8 comprehensive tests covering zero-invention, evidence linkage, high-risk approval gates, emergency stop kill switch, unconfigured provider blocking, verified execution, idempotency, and multi-tenant isolation.


## [1.17.0] - 2026-09-23
### Added & Enhanced (Multi-Provider Integrations Hub & Live Verification Testing)
- **Transactional Email Transport Testing & UI Dispatch**:
  - Registered `transactional_email` provider in `GET /api/integrations` with automatic detection of server environment SMTP/API credentials.
  - Implemented live connection testing in `POST /api/integrations/test` for SMTP handshake (`nodemailer.verify()`) and Resend/SendGrid/Postmark API key checks.
  - Added `POST /api/integrations/email/test-send` allowing workspace administrators to send live test verification emails directly from the UI.
  - Built dedicated "Send Test Email" modal with recipient configuration and real-time dispatch feedback in `IntegrationsView.tsx`.
- **Meta Ads Marketing API Connector & Direct Sync**:
  - Added `meta_ads` provider card with credentials management (`adAccountId`, `accessToken`, `appSecret`).
  - Added live credential verification checking `https://graph.facebook.com/v21.0/act_{adAccountId}`.
  - Added direct "Sync Ad Telemetry" trigger button with top-level feedback notifications in `IntegrationsView.tsx`.
  - Added snake_case and camelCase credential key resolution in `MetaAdsAdapter`.
- **Integration Test Suite (`test/integrationsHub.test.ts`)**:
  - 5 tests covering credential verification, invalid key rejection, missing credential detection, and Marketing API parameter enforcement.

## [1.16.0] - 2026-09-23
### Added & Hardened (Production Transactional Email & Password Reset Security)
- **Production Transactional Email Service (`server/emailService.ts`)**:
  - Implemented multi-provider dispatcher supporting SMTP (Hostinger / Custom SMTP via `nodemailer`), Resend (`RESEND_API_KEY`), SendGrid (`SENDGRID_API_KEY`), and Postmark (`POSTMARK_SERVER_TOKEN`).
  - Added strict configuration check: if no email transport is configured, returns explicit `NOT_CONFIGURED` configuration error (HTTP 503) without pretending email was sent.
  - Generates secure HTML and fallback text email templates with clear expiry and single-use security notices.
- **Enterprise Password Reset Lifecycle (`server.ts`)**:
  - Token Generation: 32 cryptographically random bytes (`crypto.randomBytes(32)` -> 64 hex characters).
  - Storage: Persists only the SHA-256 hash in MySQL (`token_hash`) with 30-minute expiry window.
  - Single-Use Enforcement: Tokens are marked with `used_at` upon password reset and all outstanding reset tokens for the user are invalidated.
  - Identity Binding: Verified against existing user database record.
  - Zero Token Log Leak: Removed all raw token/reset URL outputs from stdout, system logs, and Telegram alerts.
- **Unit & Integration Test Suite (`test/passwordResetEmail.test.ts`)**:
  - 5 tests covering unconfigured provider error handling, cryptographic hashing, expiry enforcement, single-use invalidation, and end-to-end credential updates.

## [1.15.0] - 2026-09-23
### Added & Standardized (Campaign & Ad Telemetry Separation)
- **Internal vs External Ad Campaign Separation**:
  - Separated `InternalCampaign` (business planning, objectives, timeline, budget) from `ExternalAdCampaign` (verified provider telemetry from Meta Ads API).
  - Enforced zero-fabrication rules: missing conversions, revenue, or ROAS strictly return `UNAVAILABLE`.
  - Added `MetaAdsAdapter` and `test/campaignTelemetrySeparation.test.ts`.

### Added & Hardened (Meta Facebook, Instagram & WhatsApp Production Hardening)
- **Centralized Meta & WhatsApp Service (`server/metaWhatsAppService.ts`)**:
  - `resolveWhatsAppCredentials` & `resolveMetaSocialCredentials`: Resolved per-tenant credentials from MySQL database/memory with fallback to environment variables, masking secret tokens.
  - `findCompanyByWhatsAppIdentifier`: Strict multi-tenant mapping for inbound WhatsApp webhook events using `phone_number_id`, `waba_id`, and `display_phone_number`. Unmatched identifiers return `null` and strictly prevent generic/default company routing.
  - `verifyMetaWebhookHandshake`: Secure verification of `hub.mode === 'subscribe'` and `hub.verify_token` returning `hub.challenge`.
  - `verifyWhatsAppWebhookSignature`: Constant-time cryptographic HMAC-SHA256 signature verification (`x-hub-signature-256`) against `WHATSAPP_APP_SECRET`.
  - `publishToFacebookPage` & `publishToInstagram`: Two-stage Meta Graph API v21.0 container initialization and publishing workflow, returning explicit `NOT_CONFIGURED` status on missing credentials.
  - `sendWhatsAppCloudMessage`: Verified direct Meta Cloud API v21.0 message dispatch.
- **Strict Authorization & Idempotency on Endpoints (`server.ts`)**:
  - All direct send and publish routes (`/api/whatsapp/send`, `/api/whatsapp/broadcast`, `/api/meta/publish-post`, `/api/whatsapp/status`, `/api/meta/status`) are protected by user authentication (`getAuthUserFromRequest`) and company authorization.
  - Missing credentials return `status: 'NOT_CONFIGURED'` without fake success.
  - WhatsApp manual links (`wa_link`) are explicitly returned with `fallbackNotice` and are not reported as Meta API delivery.
  - Inbound WhatsApp webhook (`POST /api/whatsapp/webhook`) enforces HMAC signature verification, event idempotency via `isWebhookEventProcessed`/`markWebhookEventProcessed`, and attaches provider message IDs to CRM lead logs.
- **Unit Test Suite (`test/metaWhatsApp.test.ts`)**:
  - 6 comprehensive tests covering handshake verification, signature verification, multi-tenant isolation, event idempotency, unconfigured handling, and provider ID persistence.

## [1.13.0] - 2026-09-20
### Added & Standardized (Production-Critical Razorpay Billing Hardening)
- **HMAC-SHA256 Signature Verification & Production Secret Enforcement (`server/billingService.ts`)**:
  - `verifyRazorpayWebhookSignature`: Constant-time cryptographic HMAC-SHA256 signature verification.
  - Mandatory in production: strictly returns HTTP 400 error if webhook secret or signature is missing or mismatched in production environments.
  - `verifyRazorpayPaymentSignature`: Cryptographic payment verification against order ID and payment ID using timing-safe buffers.
- **Webhook & Event Idempotency**:
  - `isWebhookEventProcessed` & `markWebhookEventProcessed`: Multi-tenant idempotency engine backed by both `processed_webhook_events` database ledger and high-performance in-memory cache.
  - Automatically deduplicates and ignores redundant webhook calls without duplicate processing.
- **Duplicate Prevention for Invoices & Subscriptions**:
  - `createInvoice`: Enforces unique payment and order indexing to eliminate duplicate invoice records in the ledger.
  - `activateSubscriptionIdempotent`: Ensures atomic, idempotent activation and state transitions without spawning duplicate subscription rows.
- **Strict Simulation & Live Payment Separation**:
  - `isProductionEnvironment`: Guaranteed detection of production modes.
  - Simulated (`sim_`, `mock_`, `test_unverified_`) payments are strictly blocked and forbidden from returning `success=true` in production mode.
- **Provider-Supported Lifecycle States**:
  - `mapRazorpayEventToSubscriptionState`: Maps actual provider event payloads to `trial`, `active`, `past_due`, `payment_failed`, `cancelled`, `expired`.
- **Unit Test Suite (`test/billingRazorpay.test.ts`)**:
  - 10 automated test suites verifying valid webhooks, forged signatures, missing secrets, event idempotency, valid/invalid payment verification, simulation production guards, duplicate prevention, and subscription lifecycle state transitions.

## [1.12.0] - 2026-09-20
### Added & Standardized (Real Revenue Attribution & Lifecycle Engine)
- **Lifecycle Pipeline (`server/revenueAttribution.ts`)**:
  - Implemented the complete 8-stage revenue attribution lifecycle: `SOURCE → LEAD → QUALIFIED → OPPORTUNITY → QUOTE/DEAL → WON/LOST → PAYMENT → REVENUE`.
  - Seamlessly mapped to existing `leads` and `invoices` relational MySQL tables without creating duplicate CRM structures.
- **Strict Supported Sources & Anti-Inference**:
  - Supported Sources: `Google`, `Organic`, `Website`, `WhatsApp`, `Telegram`, `Social`, `Referral`, `Campaign`, `Manual`, `Unknown`.
  - Implemented strict `normalizeSource` rule: unstated or unidentifiable channels are strictly marked `Unknown` and never inferred.
- **Provider-Verified Payment Guard**:
  - `isProviderVerifiedPayment`: Rejects frontend-only claims, client paymentIds, and simulated payments (`sim_`, `mock_`, `test_unverified_`, `client_mock_`).
  - Revenue calculation links strictly to provider-verified paid invoices with verified provider payment methods.
- **Computed Attribution Metrics & Zero-Fabrication ROI**:
  - Computes `leads`, `qualified leads`, `opportunities`, `quotes/deals`, `customers`, `conversion rate`, `total revenue`, and `revenue by source`.
  - If marketing cost/spend data is missing, ROI is strictly returned as `'UNAVAILABLE'` with zero fabrication.
- **Multi-Tenant Isolation**:
  - Complete isolation enforcing ownership check per `company_id` across backend endpoints (`GET /api/companies/:id/revenue-attribution` and `GET /api/revenue-attribution`).
- **Unit Test Suite (`test/revenueAttribution.test.ts`)**:
  - Added deterministic tests for source anti-inference, provider-verified payment validation, lifecycle stage attribution, zero-fabrication ROI, and multi-tenant isolation.
- **CRM UI Enhancement (`src/components/LeadsCrmView.tsx`)**:
  - Added `'opportunity'` stage to the CRM Kanban/pipeline board and dropdown stage selector.

## [1.11.0] - 2026-09-20
### Added & Standardized (AI Executive Summary Evidence-Grounding Service)
- **Structured Evidence Builder (`server/aiExecutiveSummary.ts`)**:
  - Pre-LLM structured evidence object builder extracting `metric`, `value`, `source`, `timestamp`, `status`, and `notes`.
  - Enforces strict classification: `LIVE`, `VERIFIED`, `CALCULATED`, `USER_ENTERED`, `DEMO`, `SEEDED`, or `UNAVAILABLE`.
  - **CRITICAL**: Demo data is isolated and strictly prevented from ever receiving a `VERIFIED` status tag.
- **Anti-Hallucination LLM Guardrails & Fallback**:
  - `buildEvidenceGroundedPrompt`: Injects only verified JSON evidence into system instructions with strict prohibitions against inventing rankings, review growth rates, phone calls/clicks, percentage changes, competitor shifts, leads, revenue, or ROI.
  - `generateDeterministicSummary`: Deterministic engine fallback that renders 100% evidence-grounded headlines, summaries, and key takeaways when the AI model is offline or unconfigured.
  - Transparently indicates "Data is unavailable" for unobserved metrics without guessing.
- **API Endpoints (`server.ts`)**:
  - `GET /api/companies/:id/ai/executive-summary`: Fetches real DB telemetry across reviews, leads, content posts, local SEO observations, competitor radar, custom domains, and growth scores, constructing structured evidence and returning a grounded summary.
- **Unit Test Suite (`test/aiExecutiveSummary.test.ts`)**:
  - Added deterministic tests for all 5 required scenarios:
    1. Real verified evidence (strict grounding without hallucinated metrics).
    2. Missing evidence (explicit `UNAVAILABLE` classification).
    3. Empty evidence (safe handling of uninitialized telemetry).
    4. Demo data (verified demo data is never classified `VERIFIED`).
    5. Conflicting data (conservative normalization).
- **UI Grounding (`src/components/DashboardView.tsx`)**:
  - Grounded executive bento display to truthful statuses without assuming unanswered reviews or fake positive sentiment percentages when telemetry is unavailable.

## [1.10.0] - 2026-09-20
### Added & Standardized (Centralized Growth Intelligence Score Service)
- **Centralized Engine (`server/growthScoreEngine.ts`)**:
  - Pure, deterministic calculation based strictly on verified and calculated signals across 7 business pillars:
    1. Google Business Profile Health (Place ID, verified connection, address, phone, hours, description).
    2. Local SEO & Map Pack (Verified geo-radar observations, rank position, tracked keywords).
    3. Reviews & Reputation (Verified count, average rating, response rate).
    4. Content & Social Velocity (Published posts count, frequency, approved status).
    5. Website & Digital Presence (Custom domain verification, website URL, HTTPS).
    6. Lead Conversion Pipeline (Total leads, converted count, conversion efficiency).
    7. Campaign Performance (Active campaigns, reach, CTR, conversion rate).
- **Data Integrity & Zero Metric Invention**:
  - `score = null` and `status = UNAVAILABLE` when zero inputs are provided.
  - `score = null` and `status = INCOMPLETE_DATA` when fewer than 3 pillars contain verified data.
  - `status = CALCULATED` with dynamic weighted average normalized to 100% when sufficient inputs exist.
  - Complete pillar telemetry recorded per pillar: `metricName`, `metric`, `weight`, `inputValues`, `formula`, `timestamp`, `status`, and `notes`.
- **API Endpoints (`server.ts`)**:
  - `GET /api/companies/:id/growth-score`: Fetches real-time score with complete pillar telemetry and audit trail.
  - `POST /api/companies/:id/growth-score/recalculate`: Triggers immediate re-evaluation and persists result.
- **Unit Test Suite (`test/growthScoreEngine.test.ts`)**:
  - Deterministic tests covering empty, partial, and comprehensive data sets. Added `npm test` script.
- **UI & Telemetry Audit (`src/components/AuditView.tsx`, `DashboardView.tsx`, `MobileAppView.tsx`, `AgencyView.tsx`)**:
  - Preserved existing UI layout while rendering dynamic data classification badges (`CALCULATED`, `INCOMPLETE DATA`, `UNAVAILABLE`).
  - Added interactive Telemetry & Formula Audit modal to inspect input values and formulas per pillar.
  - Safely eliminated hardcoded fallback scores across the app.

## [1.9.0] - 2026-09-20
### Added & Standardized (Competitor Intelligence & Historical Snapshots)
- **Architecture Flow**: Implemented `Competitor → Provider → Normalize → Persist → Timestamp → Historical Snapshot → Change Detection → API → UI`.
- **Competitor Provider Adapter Layer (`server/competitorProvider.ts`)**:
  - `ICompetitorProvider` interface with `GooglePlacesCompetitorProvider` and `SerpApiCompetitorProvider` implementations.
  - Normalized metrics: `rating`, `reviewsCount`, `photosCount`, `postsPerWeek`, `rankPosition`.
  - Zero scraping unless supported; unconfigured provider returns `UNAVAILABLE` without inventing data.
- **Database Persistence & Snapshots (`server/db.ts`)**:
  - Auto-initializes `competitor_observations` table in MySQL (`company_id`, `competitor_id`, `name`, `place_id`, `address`, `rating`, `reviews_count`, `photos_count`, `posts_per_week`, `rank_position`, `provider`, `timestamp`, `status`, `raw_payload`).
  - Implemented `saveCompetitorObservation`, `saveCompetitorObservations`, `getCompetitorObservationHistory`, `getLatestCompetitorObservations`, `getCompetitorHistoricalBaseline`.
- **Change Detection Engine**:
  - `calculateCompetitorChanges`: Computes `reviewGrowthThisMonth`, `ratingDiff`, and `rankDiff` ONLY when a verified prior baseline observation exists in the database.
  - Shows `Baseline needed` or `UNAVAILABLE` instead of synthetic `+23 reviews` claims.
- **API Endpoints (`server.ts`)**:
  - `POST /api/companies/:id/competitors/:competitorId/refresh`: Triggers live provider fetch, normalizes, timestamps, persists to DB, computes baseline change, updates payload, and returns snapshot.
  - `POST /api/companies/:id/competitors/refresh-all`: Refreshes all tracked rivals for a company.
  - `GET /api/companies/:id/competitors/:competitorId/history`: Retrieves observation history.
  - `POST /api/companies/:id/competitors`: Adds competitor with optional instant provider scan & initial observation persistence.
  - `PUT /api/companies/:id/competitors/:competitorId`: Updates competitor data and persists observation.
  - `DELETE /api/companies/:id/competitors/:competitorId`: Removes competitor from payload.
- **UI Enhancements (`src/components/CompetitorsView.tsx`)**:
  - Truthful metric display (`UNAVAILABLE` for missing metrics, `Baseline needed` when historical baseline is absent).
  - Data classification badges (`DataStatusBadge`) on all competitor rows.
  - Single competitor and batch "Scan All Rivals" action buttons.
  - Modal to inspect full timestamped observation snapshot history from MySQL.

## [1.8.0] - 2026-09-19
### Added & Standardized (GAP-006: Local SEO Rank Tracking Foundation)
- **Real Provider-Based Adapter**: Implemented `ILocalSeoRankProvider` adapter pattern in `server/localSeoProvider.ts` supporting DataForSEO (`DataForSeoRankProvider`) and SerpAPI (`SerpApiRankProvider`).
- **Zero Fabrication Constraint**: Returns `UNAVAILABLE` if no verified rank provider is configured; removed Gemini-generated rankings, random search volumes, hardcoded positions, and frontend fallback rankings.
- **Physical 3x3 Coordinate Matrix**: Generates 9 actual physical geographic coordinates (lat/lng) spanning a 3.5 km radius around the business/city center.
- **Historical Observations & Trend Persistence**:
  - Auto-initializes `rank_observations` table in MySQL (`company_id`, `keyword`, `latitude`, `longitude`, `grid_index`, `grid_label`, `provider`, `position`, `status`, `source_evidence`, `created_at`).
  - Implemented `saveRankObservations`, `getLatestKeywordObservations`, and `getKeywordObservationHistory` in `server/db.ts`.
  - Calculates keyword rank trends exclusively from stored database observation history.
  - Added `GET /api/companies/:id/keywords/:kw/history` endpoint.
- **UI 3x3 Geo-Radar Overhaul**:
  - Upgraded `LocalSeoView.tsx` with a true 9-node geographic matrix showing exact coordinates, grid node labels, observed ranks, and provider indicators.
  - Transparent `UNAVAILABLE` status banner directing users to connect verified provider credentials.

## [1.7.0] - 2026-09-19
### Fixed & Standardized (Google Integrations Separation)
- **Architectural System Separation**: Separated Google Places (API Key), Google Business Profile (OAuth2), Google Search Console (Service Account), and Local SEO/SERP tracking into distinct catalog entries in `/api/integrations` and `/server.ts`.
- **Honest Provider Naming & Status**: Refactored Google Places integration to accurately reflect Google Places API rather than falsely conflating Places data with Google Business Profile OAuth. Unconfigured states now honestly show `NOT_CONFIGURED` / `Places API Disconnected`.
- **Review Pipeline Integrity**: Verified end-to-end review ingestion (`syncGoogleReviewsToDatabase`), deduplication via author & content matching, real timestamps, sentiment classification, and MySQL persistence.
- **Provider Test Gateways**: Added live verification handlers in `POST /api/integrations/test` for Google Places API Key, Google Business Profile OAuth token validation, and Google Search Console Service Account credentials.

## [1.6.0] - 2026-09-19
### Fixed (P0 Production Safety)
- **Tenant Authorization & IDOR Protection**: Enforced strict session authentication and tenant authorization on `GET /api/integrations` and `POST /api/integrations/test`, preventing unauthenticated metadata leakage or credential testing.
- **Elimination of Fake Provider Success**: Modified `/api/meta/publish-post` to return `400 Bad Request` with `UNCONFIGURED` status when credentials are missing, and only mark posts as `published` in MySQL when at least one external platform confirms success.
- **Scheduler Autonomous Dispatch**: Updated `runAutoPublishJob` in `server/scheduler.ts` to perform real Meta/Telegram provider verification and dispatch; marks post as `failed` if required providers are disconnected rather than falsely reporting publication.
- **Data Truth & Centralized Status**: Introduced `DataStatusBadge.tsx` supporting 10 standard data truth classifications (`LIVE`, `VERIFIED`, `CALCULATED`, `ESTIMATED`, `AI_ESTIMATED`, `USER_ENTERED`, `SEEDED`, `DEMO`, `UNAVAILABLE`, `ERROR`).
- **Dashboard Dynamic Calculation**: Refactored `DashboardView.tsx` to dynamically calculate real metrics from database state (active leads by stage, verified reviews, sentiment %); eliminated hardcoded Hindi text and unverified "LIVE" badge claims.

## [1.5.0] - 2026-09-18
### Added
- Real Razorpay Webhook Gateway at `/api/razorpay/webhook` with strict HMAC-SHA256 signature verification (`x-razorpay-signature`) via `crypto.timingSafeEqual` (GAP-008).
- Automated GST-compliant invoice generation and persistence into MySQL `invoices` table and subscription period ledger synchronization into `subscriptions` table.
- Production Static Website Generator (`server/websiteService.ts`) with semantic JSON-LD Schema.org (`LocalBusiness`), OpenGraph tags, Tailwind styling, instant inquiry CRM forms, and WhatsApp floating chat (GAP-009).
- Production Static Hosting Export bundle generation (`.zip`) using `JSZip` containing `index.html`, `local-seo.html`, `instant-inquiry.html`, `sitemap.xml`, `robots.txt`, `manifest.json`, `netlify.toml`, `_headers`, and `README.md`.
- Custom Domain Binding with live Node.js DNS verification (`verifyDomainDns`) resolving CNAME, A-Record, and TXT verification tokens.
- Public storefront route at `/storefront/:companyId` directly serving standalone, crawlable HTML5 pages.
- Upgraded `WebsiteBuilderView.tsx` with Interactive Preview, Custom Domain Binding, SEO & Branding customization, and one-click Static Zip Bundle export.
- Upgraded `BillingView.tsx` with live Razorpay link generation, subscription upgrade modal, payment settlement confirmation, and Section 31 tax invoice downloads.
### Added
- Enterprise WhatsApp Cloud API & Meta Direct Dispatch Pipeline (`server.ts` & `src/services/authService.ts`).
- Secure inbound Webhook receiver at `/api/whatsapp/webhook` with HMAC-SHA256 signature verification (`x-hub-signature-256`) via `crypto.timingSafeEqual`.
- Outbound WhatsApp template messaging (`lead_instant_quote_v1`, `review_request_v1`, `festival_offer_alert`, `appointment_reminder`) and media dispatch support.
- WhatsApp bulk campaign broadcast engine (`POST /api/whatsapp/broadcast`) with per-recipient result reporting.
- Meta Social Direct Publishing (`POST /api/meta/publish-post`) supporting Facebook Page feed publishing and Instagram Business 2-step media container publishing (`/media` -> `/media_publish`).
- Live credential resolution and status checks (`/api/whatsapp/status`, `/api/meta/status`) with credential masking.
- Interactive multi-mode WhatsApp Dispatcher and Meta Social Publisher testing tools in `IntegrationsView.tsx`.
- Zod validation schemas for WhatsApp and Meta publishing in `server/validation.ts`.

## [1.3.0] - 2026-09-18
### Added
- Google Maps Local SEO Rank Tracker & SERP Scraper Engine (`performRankScan`) supporting multi-node geo coordinates, live Google Places TextSearch, and Gemini SERP evaluation.
- `POST /api/companies/:id/rank-radar/scan` for single keyword live SERP positioning and automatic competitor listing discovery.
- `POST /api/companies/:id/rank-radar/refresh-all` for asynchronous batch rank rescanning across all tracked local terms.
- Real-time data classification badges (`LIVE`, `VERIFIED`, `ESTIMATED`, `DEMO`) in `LocalSeoView.tsx`.
- Discovered competitor listing grid with one-click "+ Track" competitor ingestion into tenant database.

## [1.2.0] - 2026-09-18
### Added
- Live Google Business Profile Review Auto-Ingestion (`syncGoogleReviewsToDatabase`) in `server/db.ts` to sync real reviews into tenant reputation database.
- Dedicated `POST /api/companies/:id/google-profile/sync` endpoint for on-demand live Google Places API synchronization.
- Frontend sync button with live count of ingested reviews and sync status banners in `GoogleProfileView.tsx`.
- Remotion server-side rendering pipeline for 15-second vertical (9:16) MP4 video reels.
- Background rendering job pool with real-time status polling endpoint (`/api/ai/render-reel/:jobId`).
- Video post support in Content Studio and Calendar views with live video player and download options.
- `video_url` column in MySQL `content_posts` table with self-healing migration logic.
- Standard project governance files: `CODEBASE_MAP.md`, `GAP_REGISTER.md`, `AI_AGENT_STATE.md`, `CHANGELOG.md`.

### Fixed
- Development server execution environment symlink resolution and port binding.
- Per-tenant post persistence and Telegram alert format with video attachment indicators.
