# Gap Register

| Gap ID | Feature Area | Description | Status | Evidence Level | Priority | Phase |
|---|---|---|---|---|---|---|
| GAP-001 | Content Studio | Remotion Reel Video Rendering Engine & Job Pool | REAL | E5 (Verified) | P1 | Phase 1 |
| GAP-002 | Content & Calendar | Video Post Persistence & Scheduling Pipeline | REAL | E5 (Verified) | P1 | Phase 1 |
| GAP-003 | Database & Schema | MySQL Self-Healing Columns (`video_url`, etc.) | REAL | E4 (Verified) | P1 | Phase 1 |
| GAP-004 | Multi-tenant Auth | Per-tenant Company & Data Isolation | REAL | E4 (Verified) | P1 | Phase 1 |
| GAP-005 | Google Profile Sync | Live Google Business Profile & Places API Real-Time Review Ingestion | REAL | E5 (Verified) | P2 | Phase 2 |
| GAP-006 | Local SEO Rank Tracking | Provider-Based 3x3 Geo-Grid Rank Tracker & Historical Observations Engine (DataForSEO / SerpAPI adapter) | REAL | E5 (Verified) | P1 | Phase 2 |
| GAP-006-COMP | Competitor Intelligence | Provider-Based Competitor Intelligence, Historical Snapshot Engine & Change Detection (Places API / SerpAPI) | REAL | E5 (Verified) | P1 | Phase 2 |
| GAP-007 | WhatsApp / Meta Publishing | Real Cloud API Direct Dispatch for Meta & WhatsApp | REAL | E5 (Verified) | P2 | Phase 2 |
| GAP-007-HARDEN | Meta & WhatsApp Production Hardening | Mandatory HMAC-SHA256 webhook signature verification, strict multi-tenant isolation with zero generic routing leaks, authenticated & authorized direct send/publish routes, webhook event idempotency, provider ID persistence, and no fake success with NOT_CONFIGURED status | REAL | E5 (Verified) | P0 | Integration Hardening |
| GAP-008 | Billing & Payment Gateway | Real Razorpay Webhook Gateway, Settlement Capture & Invoice Ledger Sync | REAL | E5 (Verified) | P3 | Phase 3 |
| GAP-008-HARDEN | Razorpay Production Billing Hardening | Mandatory HMAC-SHA256 signature verification in prod, secret validation, webhook/event idempotency, duplicate invoice & subscription prevention, strict non-simulated live payment checks, and multi-state provider lifecycle mapping (trial, active, past_due, payment_failed, cancelled, expired) | REAL | E5 (Verified) | P0 | Billing Hardening |
| GAP-009 | Website Builder | Production Static Hosting Export & Custom Domain Binding with DNS Verification | REAL | E5 (Verified) | P3 | Phase 3 |
| GAP-P0-SEC | Tenant Security & IDOR | Strict authentication and tenant authorization on /api/integrations and /api/integrations/test | REAL | E5 (Verified) | P0 | Security Hardening |
| GAP-P0-TRUTH | Data Truth & Metric Integrity | Centralized DataStatusBadge with 10 states, dynamic dashboard calculations, elimination of unverified LIVE badges | REAL | E5 (Verified) | P0 | Production Safety |
| GAP-P0-PUB | No Fake Provider Success | Verified provider dispatch in /api/meta/publish-post and scheduler.ts cron auto-publish | REAL | E5 (Verified) | P0 | Production Safety |
| GAP-005-SEP | Google Integrations Separation | Strict separation of Google Places (API Key), Google Business Profile (OAuth), and Google Search Console with honest NOT_CONFIGURED status and deduplicated review pipeline | REAL | E5 (Verified) | P0 | Integration Integrity |
| GAP-GROWTH-SCORE | Growth Intelligence Score Engine | Single centralized deterministic Growth Score calculation service with full telemetry, audit trail, and zero metric invention | REAL | E5 (Verified) | P0 | Core Engine |
| GAP-AUTONOMOUS-GOV | Autonomous Governance & Lifecycle Engine | 8-Stage Lifecycle (OBSERVE → DETECT → ANALYZE → RECOMMEND → APPROVE → EXECUTE → VERIFY → MEASURE) with evidence IDs, zero metric invention, emergency kill switch, high-risk human approval policy, rate limiting, and immutable audit logs | REAL | E5 (Verified) | P0 | Governance & Autopilot |
| GAP-PHASE0-CONSOL | Core Capability Consolidation | Established ONE canonical implementation for all 17 core capabilities, eliminated publishing status mutation bypass in ContentStudio, and established truthful zero-metric baseline for newly provisioned company workspaces | REAL | E5 (Verified) | P0 | Phase 0 Consolidation |
| GAP-PHASE1-SEC | Production Security & Tenant Isolation | Production fail-fast on missing/short AUTH_SECRET, universal resolveUserCompanyId tenant isolation, removal of companies[0] silent fallbacks, integration state machine (SAVED -> VERIFIED), and mandatory webhook signature checks | REAL | E5 (Verified) | P0 | Phase 1 Security |
| GAP-PHASE1-DATA-TRUTH | Zero-Fabrication Data Truth & Authority | Strict client data authority boundaries on PUT /api/companies/:id/data, nullable ratings and dates without fake substitutions, no keyword default queries, strict revenue payment provider checks, and unified Growth Score calculation | REAL | E5 (Verified) | P0 | Phase 1 Data Truth |
| GAP-PHASE3-PROVIDER-TRUTH | Universal Provider State & Verified Telemetry | 9-state universal provider model, honest Google OAuth lifecycle without fake verification, nullable review ratings/dates, review reply LOCAL_ONLY vs GOOGLE_PUBLISHED states, 422 LOCATION_NOT_RESOLVED on unknown cities, and competitor identity confidence scoring | REAL | E5 (Verified) | P0 | Phase 3 Provider Truth |
| GAP-PHASE3-REAL-EXEC | Real Execution Only & Zero Fake Actions | Canonical publishing enforcement, disallowing PATCH status=published, real Meta & WhatsApp provider dispatch, deterministic intent scoring, autonomous action provider execution with no fake verified=true, and emergency kill switch | REAL | E5 (Verified) | P0 | Phase 3 Real Execution |

