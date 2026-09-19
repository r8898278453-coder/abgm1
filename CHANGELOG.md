# Changelog

All notable changes to this project will be documented in this file.

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
