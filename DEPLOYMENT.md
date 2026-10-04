# Production Deployment Guide

This document outlines the standard deployment architecture, pre-flight checks, and operations for the **Aaditech BGA / LocalPulse** multi-tenant platform.

---

## 1. Deployment Pipeline

The production deployment follows a deterministic, fail-closed pipeline:

```
[ Git Push to Main ]
        ↓
[ npm ci ] ------------------> Enforces reproducible lockfile dependencies
        ↓
[ npm run build ] -----------> Vite builds client into dist/client/
                               esbuild bundles server.ts into dist/server.cjs
        ↓
[ npm run db:migrate ] ------> Acquires distributed MySQL lock
                               Executes pending migrations in schema_migrations
                               Never touches already-applied migrations
        ↓
[ npm run db:seed:system ] --> Idempotently ensures required system_settings
                               Zero fake business telemetry inserted
        ↓
[ npm run db:verify ] -------> Audits all 27 tables, indexes, and constraints
                               Exits with code 1 if any table is missing
        ↓
[ npm run deploy:validate ] -> Verifies Node version, build artifacts, and DB
        ↓
[ npm start ] ---------------> Runs node dist/server.cjs on configured port
```

---

## 2. Environment Variables Matrix

| Variable | Type | Required | Description |
|---|---|---|---|
| `NODE_ENV` | string | **Yes** | `production` |
| `IS_PRODUCTION` | string | **Yes** | `true` |
| `PORT` | number | No | Server listen port (default: 3000) |
| `DB_HOST` | string | **Yes** | MySQL server host (e.g. `localhost`) |
| `DB_PORT` | number | No | MySQL port (default: 3306) |
| `DB_NAME` | string | **Yes** | MySQL database name |
| `DB_USER` | string | **Yes** | MySQL user account |
| `DB_PASSWORD` | string | **Yes** | MySQL user password |
| `AUTH_SECRET` | string | **Yes** | 32+ character JWT secret |
| `CREDENTIAL_ENCRYPTION_KEY` | string | No | 32-byte secret for AES-256-GCM (derived from AUTH_SECRET if omitted) |
| `INITIAL_ADMIN_EMAIL` | string | No | Optional first-run admin email |
| `INITIAL_ADMIN_PASSWORD` | string | No | Optional first-run admin password |
| `GEMINI_API_KEY` | string | Optional | Google Gemini API key |
| `SMTP_HOST` | string | Optional | SMTP host for transactional emails |
| `RAZORPAY_KEY_ID` | string | Optional | Razorpay Key ID |
| `RAZORPAY_KEY_SECRET` | string | Optional | Razorpay Key Secret |

---

## 3. Fail-Closed Production Guarantees

1. **No In-Memory Fallback in Production**:
   - In production (`NODE_ENV=production` or `IS_PRODUCTION=true`), if the database is unreachable or a query fails, the application throws `DATABASE_UNAVAILABLE` (HTTP 503) or `DATABASE_OPERATION_FAILED` (HTTP 500).
   - In-memory data structures are strictly isolated to `NODE_ENV=development` and `NODE_ENV=test`.
2. **Zero Fake Telemetry**:
   - Production databases receive only authentic user and provider telemetry.
   - Demo seed (`npm run db:seed:demo`) is blocked in production mode.
3. **Tenant Provider Credential Isolation**:
   - Outbound provider calls (Meta, WhatsApp, Google Places, DataForSEO, SerpAPI) use tenant-specific encrypted credentials stored in `company_integrations`.
   - Missing credentials return `NOT_CONFIGURED` without falling back to global secrets.
