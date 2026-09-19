# Codebase Map

## Architecture Overview
- **Frontend**: React 18 + Vite SPA, Tailwind CSS, Lucide icons.
- **Backend**: Express.js server (`server.ts`) with custom routing, JWT auth, rate limiting, and Vite middleware.
- **Rendering Engines**:
  - Node Canvas template graphic renderer (`server/templateRenderer.ts`).
  - Remotion server-side 9:16 vertical video reel engine with ffmpeg bundle (`server/reelRenderer.ts`, `server/reelJobManager.ts`, `remotion/*`).
- **Database / Persistence**:
  - MySQL via `mysql2/promise` with auto self-healing schema creation/migrations (`schema.sql`, `server/db.ts`).
  - Memory fallback cache if MySQL is not configured or offline.
- **Scheduler & Automation**:
  - Background autonomous daemon (`server/scheduler.ts`) handling post publishing, review auto-responses, competitor analysis, and Telegram alerts.

## Entry Points
- **Client Entry**: `src/main.tsx` -> `src/App.tsx`
- **Server Entry**: `server.ts`
- **HTML Entry**: `index.html`

## Core Backend Routes & Handlers (`server.ts`)
- **Health**: `GET /api/health`
- **Authentication**:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- **Company & Tenant Management**:
  - `GET /api/companies`
  - `POST /api/companies`
  - `GET /api/companies/:id`
  - `PUT /api/companies/:id/profile`
- **CRM Leads**:
  - `GET /api/leads`
  - `POST /api/leads`
  - `PATCH /api/leads/:id/stage`
  - `DELETE /api/leads/:id`
- **Reviews & Reputation**:
  - `GET /api/reviews`
  - `POST /api/reviews`
  - `POST /api/reviews/:id/reply`
  - `DELETE /api/reviews/:id`
- **Content Studio & Calendar**:
  - `GET /api/content-posts`
  - `POST /api/content-posts`
  - `PATCH /api/content-posts/:id/status`
  - `DELETE /api/content-posts/:id`
  - `POST /api/ai/render-creative`
  - `POST /api/ai/render-reel`
  - `GET /api/ai/render-reel/:jobId`
- **Integrations & Messaging**:
  - `GET /api/integrations`
  - `POST /api/integrations`
  - `POST /api/integrations/test`
  - `POST /api/telegram/test-alert`
  - `GET /api/whatsapp/status`
  - `POST /api/whatsapp/send`
  - `POST /api/whatsapp/broadcast`
  - `GET /api/whatsapp/webhook` (Meta Webhook verification challenge)
  - `POST /api/whatsapp/webhook` (Inbound webhook with HMAC-SHA256 signature verification)
  - `GET /api/meta/status`
  - `POST /api/meta/publish-post` (Facebook Page & Instagram Business 2-step publishing)
- **Autonomous Engine**:
  - `GET /api/autonomous/actions`
  - `POST /api/autonomous/actions/:id/approve`
  - `POST /api/autonomous/run-cycle`

## Frontend Views (`src/components/`)
- `DashboardView.tsx`: Overview analytics and high-level summaries.
- `AuditView.tsx`: SEO & local business audit diagnostic tool.
- `GoogleProfileView.tsx`: Google Business Profile manager & sync.
- `LocalSeoView.tsx`: Keyword rankings and local map pack tracker.
- `CompetitorsView.tsx`: Competitor intelligence and benchmark analyzer.
- `ReviewsView.tsx`: Review aggregation and AI response management.
- `ContentStudioView.tsx`: Multiformat generator, graphic renderer, and Remotion video studio.
- `CalendarView.tsx`: Scheduled publishing calendar and multi-channel timeline.
- `CampaignsView.tsx`: Multi-channel marketing campaign planner.
- `LeadsCrmView.tsx`: Real-time pipeline CRM with intent scoring.
- `WebsiteBuilderView.tsx`: Interactive website builder and landing page editor.
- `TelegramBotView.tsx`: Real-time alert configuration and dispatch.
- `AutonomousEngineView.tsx`: Auto-pilot rules and execution controls.
- `TrustSafetyView.tsx`: Verification, rate limits, and audit logs.
- `AgencyView.tsx`: Multi-tenant organization and company switcher.
- `IntegrationsView.tsx`: Third-party service connections (Google, Meta, WhatsApp, Telegram).
- `BillingAdminView.tsx`: Subscription plans and billing management.
- `KnowledgeBaseView.tsx`: AI prompt knowledge & training documents.
- `MobileAppView.tsx`: Mobile PWA setup and installation preview.

## Build & Runtime Commands
- Dev Server: `npm run dev` (running `tsx server.ts` on port 3000)
- Build: `npm run build` (`vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs`)
- Start: `npm run start` (`node dist/server.cjs`)
