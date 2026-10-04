# Database Architecture & Canonical Schema Specification

This document details the database architecture, entity relationships, and table definitions for **Aaditech BGA / LocalPulse**.

---

## 1. Canonical Schema Overview

The database is built on **MySQL 8.0+ / MariaDB 10.6+** with `InnoDB` storage engine and `utf8mb4` encoding (`utf8mb4_unicode_ci`).

All tables are created and managed via versioned migrations (`server/migrator.ts`).

---

## 2. Table Inventory (27 Required Tables)

### Authentication & Recovery
1. **`users`**: Platform administrators, business owners, agency accounts, and managers. Passwords hashed using OWASP-standard PBKDF2 (HMAC-SHA512 with 210,000 iterations).
2. **`password_reset_tokens`**: Time-limited (30-minute), single-use recovery tokens stored as SHA-256 hashes.

### Multi-Tenant Core
3. **`companies`**: Tenant organization root with slug, category, city, and optional public form token.
4. **`company_profiles_data`**: Isolated JSON document store for flexible telemetry and unstructured metrics.
5. **`business_profile`**: Company physical address, hours, contact points, and settings.

### CRM & Reputation
6. **`leads`**: Inbound multi-tenant CRM leads with stage tracking, intent score, and AI reply drafts.
7. **`reviews`**: Provider-synced and user-entered customer reviews with provenance status and response tracking.

### Content & Publishing
8. **`content_posts`**: Social posts, reels, and scheduled marketing content.
9. **`publishing_records`**: Multi-platform publishing state machine with idempotency keys and error retry tracking.
10. **`content_theme_history`**: Combinatorial palette and template rotation history to prevent visual fatigue.
11. **`company_assets`**: Brand asset library (logos, cover photos, high-res photos).

### Local SEO & Competitor Tracking
12. **`rank_observations`**: Historical 3x3 geocoded local ranking observations with provider evidence.
13. **`competitor_observations`**: Competitor snapshots, review delta counts, posting cadence, and place metadata.
14. **`google_profile_cache`**: Short TTL cache for Google Places and Business Profile API responses.

### Integrations & Infrastructure
15. **`company_integrations`**: Encrypted API credentials (AES-256-GCM) for WhatsApp, Meta, Google, etc.
16. **`custom_domains`**: Custom domain routing, CNAME/A-record DNS status, and SSL state.
17. **`website_configs`**: Fast storefront configuration, subdomains, SEO tags, and page definitions.
18. **`processed_webhook_events`**: Cryptographic idempotency deduplication table for webhooks (Razorpay, WhatsApp, Meta).

### Billing & Monetization
19. **`invoices`**: GST-compliant invoices with HSN codes, Razorpay payment IDs, and customer metadata.
20. **`subscriptions`**: Active subscription plans, billing cycles, and payment provider references.

### Autonomous Marketing & Governance
21. **`internal_campaigns`**: Strategic marketing initiatives with timelines and planned budgets.
22. **`external_ad_campaigns`**: Verified external ad telemetry (spend, impressions, clicks, ROAS).
23. **`autonomous_recommendations`**: Evidence-linked AI recommendations with confidence and risk classifications.
24. **`autonomous_actions`**: 8-stage state machine execution records with approval tracking.
25. **`autonomous_audit_logs`**: Immutable governance audit trail recording every autonomous action.

### System & Migration Infrastructure
26. **`schema_migrations`**: Versioned migration execution ledger with SHA-256 checksums and timing.
27. **`system_settings`**: Global configuration key-value pairs (public and private).

---

## 3. Security & Integrity Highlights

- **AES-256-GCM Credential Encryption**: All third-party provider credentials are encrypted at rest with per-record IV and authentication tag (`enc:v1:iv:tag:ciphertext`).
- **OWASP PBKDF2 Password Hashing**: HMAC-SHA512 with 210,000 iterations and cryptographic 16-byte salt per user.
- **Fail-Closed Execution**: If MySQL fails in production, requests abort with 503 `DATABASE_UNAVAILABLE` rather than returning corrupt or fake memory data.
