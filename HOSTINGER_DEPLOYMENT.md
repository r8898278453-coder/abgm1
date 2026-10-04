# Hostinger Production Git Deployment Guide

This guide documents the exact, verified procedure for deploying the **Aaditech BGA / LocalPulse** application on **Hostinger Git Deployment** with **Hostinger MySQL/MariaDB**.

---

## Architecture Overview

```
                  Developer Git Repository
                             ↓ (git push origin main)
              Hostinger hPanel Git Deployment
                             ↓
              1. npm ci (Clean Dependency Install)
                             ↓
              2. npm run build (Vite + Node Server Bundle)
                             ↓
              3. npm run db:migrate (Auto Schema Migration)
                             ↓
              4. npm run db:verify (Schema Integrity Check)
                             ↓
              5. Node.js Application Startup (dist/server.cjs)
                             ↓
              Health Check (/api/health) -> PASS
```

---

## Step-by-Step Hostinger Deployment Procedure

### Step 1: Create MySQL Database in Hostinger hPanel

1. Log in to your **Hostinger hPanel**.
2. Navigate to **Databases** → **MySQL Databases**.
3. Create a new MySQL database:
   - **Database Name**: e.g., `u123456789_bga_prod`
   - **Username**: e.g., `u123456789_bga_admin`
   - **Password**: Create a strong 16+ character password (e.g., `YourSecureMySQLPass2026!`)
4. Note your **Database Name**, **Username**, **Password**, and **Database Host** (usually `localhost` or `127.0.0.1` on Hostinger shared hosting).

> **Note**: You do **NOT** need to open phpMyAdmin or manually import SQL files. The application self-initializes all 27 tables, indexes, and constraints automatically via versioned migrations upon deployment.

---

### Step 2: Configure Node.js Application in Hostinger

1. In Hostinger hPanel, go to **Advanced** → **Node.js**.
2. Click **Create Application**:
   - **Node.js version**: `20.x` or `22.x` (Recommended: `22.x`)
   - **Application mode**: `Production`
   - **Application root**: `public_html` (or your chosen repository directory)
   - **Application startup file**: `dist/server.cjs`
3. Click **Create**.

---

### Step 3: Configure Environment Variables

In your Hostinger Node.js configuration (or via `.env` file in application root):

```env
# Database Credentials
DB_HOST=localhost
DB_PORT=3306
DB_NAME=u123456789_bga_prod
DB_USER=u123456789_bga_admin
DB_PASSWORD=YourSecureMySQLPass2026!

# Application Environment
NODE_ENV=production
IS_PRODUCTION=true
PORT=3000
APP_URL=https://bga.aaditechs.in
TRUST_PROXY_HOPS=1

# Security & Encryption Secrets
AUTH_SECRET=your_32_character_cryptographic_jwt_secret_key_here
CREDENTIAL_ENCRYPTION_KEY=your_32_character_aes256gcm_key_here

# First-Run Platform Administrator (Optional Auto-Provisioning)
INITIAL_ADMIN_EMAIL=admin@aaditechs.in
INITIAL_ADMIN_PASSWORD=YourAdminSecurePassword2026!
INITIAL_ADMIN_NAME="System Administrator"

# AI Engine
GEMINI_API_KEY=your_gemini_api_key

# Transactional Email (Hostinger SMTP)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=security@aaditechs.in
SMTP_PASS=your_mailbox_password
SMTP_FROM=security@aaditechs.in
SMTP_SECURE=true
```

---

### Step 4: Connect Git Repository & Set Deployment Hooks

1. In Hostinger hPanel, go to **Advanced** → **Git**.
2. Connect your Git repository (GitHub / GitLab / Bitbucket).
3. Set the target branch to `main`.
4. Configure the **Build & Deployment Script** (or run via SSH / Hostinger Terminal):

```bash
# 1. Install production dependencies
npm ci

# 2. Build frontend and backend bundle
npm run build

# 3. Execute automatic schema migrations with distributed lock
npm run db:migrate

# 4. Seed required system configuration (zero fake business telemetry)
npm run db:seed:system

# 5. Verify database integrity
npm run db:verify

# 6. Pre-flight deployment check
npm run deploy:validate
```

---

### Step 5: Start Application & Verify Health

1. In Hostinger Node.js manager, click **Restart** (or `npm start`).
2. Visit the health check endpoint:
   ```
   GET https://bga.aaditechs.in/api/health
   ```
3. Expected JSON response:
   ```json
   {
     "status": "ok",
     "database": "connected",
     "migrations": "current",
     "schemaVersion": 5,
     "version": "1.29.0",
     "timestamp": "2026-10-04T12:00:00.000Z"
   }
   ```

---

## Troubleshooting & Verification Commands

| Command | Purpose |
|---|---|
| `npm run db:migrate` | Runs all pending versioned migrations with distributed locking |
| `npm run db:verify` | Audits connection, all 27 tables, indexes, and schema version |
| `npm run db:status` | Shows migration history, timestamps, and table list |
| `npm run db:setup` | Complete one-shot setup (migrate + system seed + admin init + verify) |
| `npm run admin:create` | Creates or updates platform admin without editing database directly |
| `npm run deploy:validate` | Pre-flight validation of Node version, build artifacts, and DB |
