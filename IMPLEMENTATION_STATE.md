# Implementation State

## Current Phase: Centralized Growth Intelligence Score Service & Forensic Audit
- **Completed in this Phase**:
  - **Forensic Audit of Legacy Score**:
    - Identified static/hardcoded scores (e.g., fixed `overall: 88` in `initialGrowthScore` and fixed fallbacks in modal/views).
    - Replaced all static growth score definitions with a single centralized deterministic calculation engine.
  - **Centralized Growth Intelligence Engine (`server/growthScoreEngine.ts`)**:
    - Pure, deterministic calculation based strictly on verified and calculated signals across 7 business pillars:
      1. Google Business Profile Health (Place ID, verified connection, address, phone, hours, description).
      2. Local SEO & Map Pack (Verified geo-radar observations, rank position, tracked keywords).
      3. Reviews & Reputation (Verified count, average rating, response rate).
      4. Content & Social Velocity (Published posts count, frequency, approved status).
      5. Website & Digital Presence (Custom domain verification, website URL, HTTPS).
      6. Lead Conversion Pipeline (Total leads, converted count, conversion efficiency).
      7. Campaign Performance (Active campaigns, reach, CTR, conversion rate).
    - **Never Invents Missing Inputs**:
      - If 0 pillars have data: `score = null`, `status = UNAVAILABLE`.
      - If < 3 pillars have data: `score = null`, `status = INCOMPLETE_DATA` with explicit reasons.
      - If >= 3 pillars have data: `status = CALCULATED` with dynamic weighted average normalized to 100%.
    - **Pillar Telemetry & Audit Trail**:
      - Every pillar records: `metricName`, `metric`, `weight`, `inputValues`, `formula`, `timestamp`, `status` (`LIVE`, `VERIFIED`, `CALCULATED`, `USER_ENTERED`, `INCOMPLETE_DATA`, `UNAVAILABLE`), and `notes`.
  - **Backend API Endpoints (`server.ts`)**:
    - `GET /api/companies/:id/growth-score`: Retrieves dynamic score calculation with complete pillar telemetry and audit trail based on current DB and payload state.
    - `POST /api/companies/:id/growth-score/recalculate`: Triggers immediate re-evaluation, persists the updated score to company storage, and returns detailed telemetry.
  - **Unit Test Suite (`test/growthScoreEngine.test.ts`)**:
    - Comprehensive unit tests verifying:
      - Test 1: Empty inputs produce `UNAVAILABLE` score without metric fabrication.
      - Test 2: Insufficient inputs (< 3 pillars) produce `INCOMPLETE_DATA` classification.
      - Test 3: Comprehensive inputs produce `CALCULATED` score with exact mathematical breakdown.
      - Test 4: Lead and campaign performance calculation.
    - Test runner configured in `package.json` (`npm test`).
  - **Frontend UI Preservation & Telemetry Inspector**:
    - `DashboardView.tsx`: Displays score, dynamic status classification label, and insufficient data warnings without redesigning layout.
    - `AuditView.tsx`: Added interactive "Telemetry & Formula Audit" inspector modal to examine input values, mathematical formulas, and data truth status for all pillars.
    - `MobileAppView.tsx` & `AgencyView.tsx`: Safely handles `null` score states without falling back to hardcoded numbers.
- **Validation**:
  - `npm test`: All unit tests passed.
  - `lint_applet`: Passed (`tsc --noEmit` 0 errors).
  - `compile_applet`: Passed (`vite build` succeeded).
## Current Phase: Real Revenue Attribution & CRM Lifecycle Engine
- **Completed in this Phase**:
  - **Real Revenue Attribution Engine (`server/revenueAttribution.ts`)**:
    - Implemented strict lifecycle tracking: `SOURCE → LEAD → QUALIFIED → OPPORTUNITY → QUOTE/DEAL → WON/LOST → PAYMENT → REVENUE`.
    - Integrated with existing `leads` and `invoices` relational MySQL tables without creating duplicate CRM structures.
    - Supported Sources: Strictly limited to `Google`, `Organic`, `Website`, `WhatsApp`, `Telegram`, `Social`, `Referral`, `Campaign`, `Manual`, `Unknown`.
    - **Anti-Inference Rule**: Enforced strict `normalizeSource` — never guesses or infers unstated sources, returning `Unknown`.
    - **Provider-Verified Payments**: `isProviderVerifiedPayment` strictly accepts only provider-verified invoices (`status === 'Paid'`, real non-simulated `payment_id`, authentic provider method). Rejects simulated, mock, or client-only claimed payments.
    - **Calculated Metrics**: Accurately computes `leads`, `qualified leads`, `opportunities`, `quotes/deals`, `customers`, `conversion rate`, `total revenue`, and `revenue by source`.
    - **Zero-Fabrication ROI**: If marketing cost/spend data is missing, ROI is strictly set to `'UNAVAILABLE'`.
    - **Multi-Tenant Isolation**: Completely isolates all queries and calculations per `company_id`.
  - **Backend API Routes (`server.ts`)**:
    - Added `GET /api/companies/:id/revenue-attribution` with authentication and strict tenant IDOR verification.
    - Added `GET /api/revenue-attribution` for authenticated default company.
  - **CRM Pipeline Enhancement (`src/components/LeadsCrmView.tsx`)**:
    - Added `'opportunity'` stage support across the interactive CRM pipeline board and stage selector.
  - **Unit Test Suite (`test/revenueAttribution.test.ts`)**:
    - Test 1: Strict source normalization and anti-inference check.
    - Test 2: Provider-verified payment validation (simulated/mock rejected).
    - Test 3: Full CRM lifecycle (Source -> Lead -> Qualified -> Opportunity -> Quote -> Won -> Payment -> Revenue).
    - Test 4: Strict zero-fabrication of ROI (Cost missing = UNAVAILABLE vs. verified cost calculation).
    - Test 5: Multi-tenant data isolation with zero cross-tenant leakage.
- **Validation**:
  - `npm test`: All 3 test suites passed (14/14 tests passing, 100%).
  - `lint_applet`: Passed (`tsc --noEmit` 0 errors).
  - `compile_applet`: Passed (`vite build` succeeded).

## Current Phase: Production-Critical Razorpay Billing Hardening & Security
- **Completed in this Phase**:
  - **Billing & Verification Service (`server/billingService.ts`)**:
    - `verifyRazorpayWebhookSignature`: Constant-time cryptographic HMAC-SHA256 signature verification. Mandatory in production mode; strictly rejects requests if webhook secret or signature is missing in production.
    - `verifyRazorpayPaymentSignature`: Cryptographic HMAC-SHA256 verification against orderId and paymentId with timingSafeEqual.
    - `isProductionEnvironment`: Helper strictly detecting production environments.
    - `isWebhookEventProcessed` & `markWebhookEventProcessed`: Database (`processed_webhook_events`) and memory cache event idempotency.
    - `activateSubscriptionIdempotent`: Prevents duplicate subscription creation cycles while idempotently updating status.
    - `mapRazorpayEventToSubscriptionState`: Strict mapping of provider events to actual provider-supported states (`trial`, `active`, `past_due`, `payment_failed`, `cancelled`, `expired`).
  - **Database & Duplicate Prevention (`server/db.ts`)**:
    - Added `processed_webhook_events` table for resilient multi-tenant webhook event idempotency.
    - Added `getInvoiceByPaymentId` and `getInvoiceByOrderId` queries.
    - Updated `createInvoice` to automatically deduplicate by `payment_id` or `order_id` within a tenant workspace.
  - **Endpoint Hardening (`server.ts`)**:
    - `/api/razorpay/webhook`: Integrated mandatory signature verification, idempotency gate, provider state mapping, and duplicate-safe invoice sync.
    - `/api/razorpay/verify-payment`: Cryptographic HMAC verification, strict simulated payment rejection in production, idempotent subscription activation.
    - `/api/razorpay/create-order` & `/api/razorpay/create-payment-link`: Simulated payments strictly forbidden in production mode.
  - **Unit Test Suite (`test/billingRazorpay.test.ts`)**:
    - 10 exhaustive tests covering valid webhook, invalid signature, missing secret in prod, duplicate webhook idempotency, invalid payment signature, verified payment signature, simulated payment prohibition in prod, subscription state mappings, duplicate invoice prevention, and duplicate subscription activation idempotency.
- **Validation**:
  - `npm test`: All 4 test suites passed (24/24 tests passing, 100%).
  - `lint_applet`: Passed (`tsc --noEmit` 0 errors).
  - `compile_applet`: Passed (`vite build` succeeded).

## Current Phase: Meta & WhatsApp Integration Production Hardening
- **Completed in this Phase**:
  - **Meta & WhatsApp Centralized Service (`server/metaWhatsAppService.ts`)**:
    - `resolveWhatsAppCredentials` & `resolveMetaSocialCredentials`: Centralized per-tenant and environment credential resolution, masking secrets, and returning explicit `configured: boolean` status.
    - `findCompanyByWhatsAppIdentifier`: Strict multi-tenant mapping for inbound webhook messages by matching `phone_number_id`, `waba_id`, and `display_phone_number`. Strictly returns `null` for unmapped numbers, completely eliminating generic/default company routing leaks.
    - `verifyMetaWebhookHandshake`: Cryptographic verification of `hub.mode === 'subscribe'` and `hub.verify_token` for Meta Graph API webhooks.
    - `verifyWhatsAppWebhookSignature`: Constant-time HMAC-SHA256 signature verification (`x-hub-signature-256`) against `WHATSAPP_APP_SECRET`. Mandatory in production; rejects mismatched or missing signatures.
    - `publishToFacebookPage` & `publishToInstagram`: Two-step container creation & publishing workflow via Meta Graph API v21.0. Returns explicit `NOT_CONFIGURED` if credentials are missing and never marks posts as published until provider returns confirmed post/media ID.
    - `sendWhatsAppCloudMessage`: Direct Meta WhatsApp Cloud API v21.0 dispatch. Never returns fake success; returns `status: 'NOT_CONFIGURED'` when unconfigured.
  - **Multi-Tenant Integration Storage (`server/db.ts`)**:
    - Added `getCompanyIntegrationsByProvider` to query all company integration bindings for scalable webhook routing in both MySQL and in-memory store.
  - **Endpoint Authorization & Hardening (`server.ts`)**:
    - `/api/whatsapp/status` & `/api/meta/status`: Protected with user authentication (`getAuthUserFromRequest`) and tenant authorization.
    - `/api/whatsapp/send` & `/api/whatsapp/broadcast`: Protected with authenticated user + company authorization checks. Returns `status: 'NOT_CONFIGURED'` when credentials are missing and strictly marks fallback (`wa_link`) as manual client fallback with `fallbackNotice` without reporting it as Meta API delivery.
    - `/api/whatsapp/webhook` (GET): Secure handshake verification via `verifyMetaWebhookHandshake`.
    - `/api/whatsapp/webhook` (POST): Mandatory HMAC-SHA256 signature validation, event idempotency via `isWebhookEventProcessed`/`markWebhookEventProcessed`, strict tenant isolation via `findCompanyByWhatsAppIdentifier`, and CRM lead creation persisting `notes` with `[Provider Message ID: ...]`.
    - `/api/meta/publish-post`: Protected with authenticated user + company authorization checks. Does not mark posts as `published` until provider confirms with provider post/media ID.
  - **Unit Test Suite (`test/metaWhatsApp.test.ts`)**:
    - Comprehensive unit tests covering:
      - Test 1: Meta webhook handshake verification (`hub.challenge`).
      - Test 2: Inbound webhook HMAC-SHA256 signature verification.
      - Test 3: Strict multi-tenant mapping (isolated tenant routing with zero generic fallback leaks).
      - Test 4: Inbound webhook event idempotency (duplicate prevention).
      - Test 5: Credential resolution & `NOT_CONFIGURED` status enforcement (no fake success).
      - Test 6: Provider message ID persistence in CRM pipeline.
  - **Validation**:
    - `npm test`: All 5 test suites passed (30/30 tests passing, 100%).
    - `lint_applet`: Passed (`tsc --noEmit` 0 errors).
    - `compile_applet`: Passed (`vite build` succeeded).

### Current Phase: Production Transactional Email & Password Reset Hardening
- **Completed in this Phase**:
  - **Transactional Email Service (`server/emailService.ts`)**:
    - Created unified email dispatcher supporting standard SMTP (Hostinger/custom via `nodemailer`), Resend (`RESEND_API_KEY`), SendGrid (`SENDGRID_API_KEY`), and Postmark (`POSTMARK_SERVER_TOKEN`).
    - Enforced strict provider check: returns explicit `NOT_CONFIGURED` configuration error (HTTP 503) if no email transport credentials are configured.
    - Never pretends an email was sent if unconfigured or if dispatch fails.
  - **Secure Password Reset Lifecycle (`server.ts`)**:
    - Generates 32 cryptographically random bytes (`crypto.randomBytes(32)` -> 64-character hex string).
    - Persists only the SHA-256 hash (`crypto.createHash('sha256').update(rawToken).digest('hex')`) in MySQL / fallback store.
    - 30-minute expiration window strictly enforced.
    - Single-use guarantee: marks token as `used_at` upon reset and immediately invalidates all outstanding reset tokens for the user.
    - User identity verified before allowing password upgrade.
    - Upgrades password hash using PBKDF2 with OWASP parameters (210,000 iterations, 64-byte keylen, sha512).
  - **Zero Token Exposure & Audit Security**:
    - Completely removed all console log outputs containing raw tokens or password reset URLs.
    - Emits security audit events without leaking sensitive credentials or links.
  - **Documentation (`.env.example`)**:
    - Added comprehensive SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE`) and API provider configurations.
  - **Unit & Integration Test Suite (`test/passwordResetEmail.test.ts`)**:
    - Test 1: Unconfigured transactional email provider returns explicit error without pretending success.
    - Test 2: Cryptographic token generation and SHA-256 hashed persistence.
    - Test 3: Expired token verification strictly rejects stale tokens.
    - Test 4: Single-use verification and token invalidation.
    - Test 5: Full password reset lifecycle and credential update.
- **Validation**:
  - `npm test`: All 7 test suites passed (41/41 tests passing, 100%).
  - `lint_applet`: Passed (`tsc --noEmit` 0 errors).
  - `compile_applet`: Passed (`vite build` succeeded).

### Current Phase: Autonomous Governance & 8-Stage Lifecycle Engine
- **Completed in this Phase**:
  - **8-Stage Autonomous Lifecycle Engine (`server/autonomousEngine.ts`)**:
    - Implemented strict lifecycle: `OBSERVE → DETECT → ANALYZE → RECOMMEND → APPROVE → EXECUTE → VERIFY → MEASURE`.
    - **Anti-Fabrication & Zero-Invention Rule**: Evaluates strictly verified database observations (`rank_observations`, `competitor_observations`, `reviews`, `leads`, `external_ad_campaigns`). If 0 verified signals exist, returns `status = INSUFFICIENT_EVIDENCE` with 0 recommendations generated.
    - **Evidence-Linked Recommendations**: Every recommendation includes:
      - `id`, `company_id`, `observation`, `evidence_ids`, `source`, `timestamp`, `recommended_action`, `affected_metric`, `confidence`, `risk` (`low` | `medium` | `high`), `approval_requirement` (`auto` | `required`).
    - **Outbound 8-Gate Safety Enforcement**:
      1. Authentication: Verified session or authorized system context.
      2. Authorization: Multi-tenant workspace isolation (`company_id` IDOR protection).
      3. Kill Switch: Global emergency stop & per-company autopilot toggle (`isEmergencyPaused` / `isAutopilotOn`).
      4. Approval Policy: High-risk actions (budgets, offers, profile edits) strictly require human approval before execution.
      5. Rate Limit: Throttles executions per company workspace (max 10 actions/minute).
      6. Idempotency: Deduplicates repeated execution attempts.
      7. Provider Availability Check: Direct verification of live credentials before dispatch (aborts with `BLOCKED_PROVIDER_NOT_CONFIGURED` if unconfigured; never claims false success).
      8. Immutable Audit Logging: Structured audit record stored in `autonomous_audit_logs`.
  - **Persistence Schema & Database Models (`server/db.ts` & `schema.sql`)**:
    - Added tables `autonomous_recommendations`, `autonomous_actions`, and `autonomous_audit_logs`.
    - Implemented database and in-memory CRUD operations with self-healing migrations.
  - **Backend API Endpoints (`server.ts`)**:
    - `GET /api/autonomous/status`: Health check, active kill-switch status, pending approval counts.
    - `POST /api/autonomous/kill-switch`: Toggles emergency stop or autopilot.
    - `POST /api/autonomous/run-cycle`: Runs observation and recommendation cycle on real evidence.
    - `GET /api/autonomous/recommendations`: Lists grounded recommendations.
    - `GET /api/autonomous/actions`: Lists queued/executed actions.
    - `POST /api/autonomous/actions/:id/approve`: Human approval workflow.
    - `POST /api/autonomous/actions/:id/reject`: Human rejection.
    - `POST /api/autonomous/actions/:id/execute`: Verified execution through the 8-stage gate.
    - `GET /api/autonomous/audit-logs`: Immutable audit trail.
  - **Frontend UI & Telemetry Inspector (`src/components/AutonomousEngineView.tsx`)**:
    - Connected real API endpoints for running cycles, viewing evidence-grounded recommendations, human approvals, verified executions, and audit logs.
    - Preserved existing layout while adding real-time Kill Switch status banners and lifecycle visualizers.
  - **Unit & Integration Test Suite (`test/autonomousGovernance.test.ts`)**:
    - 8 comprehensive tests covering zero-invention, evidence-linked recommendations, high-risk approval gates, kill switch, unconfigured provider blocking, verified execution, idempotency, and multi-tenant isolation.
- **Validation**:
  - `npm test`: All 9 test suites passed (54/54 tests passing, 100%).
  - `lint_applet`: Passed (`tsc --noEmit` 0 errors).
  - `compile_applet`: Passed (`vite build` succeeded).



