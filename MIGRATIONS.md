# Database Migration System & Versioning Guide

This document explains the versioned migration lifecycle, distributed locking, and upgrade procedures for **Aaditech BGA / LocalPulse**.

---

## 1. Migration System Architecture

Migrations are defined in `server/migrator.ts` and managed via the `schema_migrations` tracking table:

```sql
CREATE TABLE schema_migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  migration_name VARCHAR(191) NOT NULL UNIQUE,
  checksum VARCHAR(64) NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  execution_time_ms INT NOT NULL DEFAULT 0,
  success TINYINT(1) NOT NULL DEFAULT 1
);
```

---

## 2. Distributed Concurrency Lock

To prevent race conditions during multi-instance or parallel deployments:
1. The migrator attempts to acquire a MySQL distributed lock via `SELECT GET_LOCK("localpulse_migration_lock", 15)`.
2. It simultaneously sets `is_locked = 1` in `schema_migrations_lock`.
3. If another process is running migrations, subsequent instances wait up to 15 seconds before failing gracefully.
4. Upon completion or error, the lock is released in a `finally` block.

---

## 3. Migration Registry

| Migration Name | Scope |
|---|---|
| `001_core_multi_tenant_schema` | Core authentication, password reset, companies, profile data, leads, reviews, posts, business profile |
| `002_integrations_and_billing_schema` | Company integrations, Google cache, assets, theme history, invoices, subscriptions, webhook deduplication |
| `003_websites_and_seo_telemetry_schema` | Custom domains, website configs, rank observations (3x3 grid), competitor observations |
| `004_publishing_campaigns_and_autonomous_schema` | Publishing records, internal campaigns, external ad telemetry, recommendations, autonomous actions, audit logs |
| `005_system_settings_and_metadata_schema` | Production system settings key-value registry |

---

## 4. How Migrations Run

### Fresh Database (Clean Install)
```bash
npm run db:migrate
```
- Creates `schema_migrations` and `schema_migrations_lock`
- Executes migrations `001` through `005` in sequential order
- Records timestamps and checksums
- Total tables created: 27

### Existing Database Upgrade
```bash
npm run db:migrate
```
- Reads existing records from `schema_migrations`
- Skips already executed migrations (`001` - `004`)
- Applies only new migrations (`005`)
- Preserves all existing tenant data without drops or truncations

---

## 5. Verification & Schema Drift Detection

Run anytime to verify schema health:
```bash
npm run db:verify
```

Expected Output:
```
DATABASE VERIFICATION
--------------------
Connection: PASS
Engine: 10.11.8-MariaDB-log
Migration table: PASS
Applied migrations: 5
Pending migrations: 0
Required tables: PASS
Required indexes: PASS
Schema version: 5
STATUS: READY
```

If pending migrations exist, it returns `DATABASE_SCHEMA_OUTDATED` and exits with code 1.
