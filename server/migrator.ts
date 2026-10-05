import mysql from 'mysql2/promise';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { hashPassword } from './db';

export interface MigrationRecord {
  id: number;
  migration_name: string;
  checksum: string;
  applied_at: string;
  execution_time_ms: number;
  success: boolean;
}

export interface MigrationDefinition {
  name: string;
  up: (conn: mysql.Connection | mysql.Pool) => Promise<void>;
  checksum?: string;
}

export interface VerificationResult {
  connection: 'PASS' | 'FAIL';
  engine: string;
  migrationTable: 'PASS' | 'FAIL';
  appliedMigrations: number;
  pendingMigrations: number;
  requiredTables: 'PASS' | 'FAIL';
  requiredIndexes: 'PASS' | 'FAIL';
  schemaVersion: number;
  status: 'READY' | 'MIGRATION_REQUIRED' | 'DATABASE_SCHEMA_OUTDATED' | 'UNAVAILABLE';
  missingTables?: string[];
  missingColumns?: string[];
  missingIndexes?: string[];
  missingConstraints?: string[];
  error?: string;
}

// Canonical List of Required Database Tables for Production Multi-Tenant Platform
export const CANONICAL_REQUIRED_TABLES = [
  'schema_migrations',
  'schema_migrations_lock',
  'users',
  'password_reset_tokens',
  'companies',
  'company_profiles_data',
  'leads',
  'reviews',
  'content_posts',
  'autonomous_actions',
  'business_profile',
  'company_integrations',
  'google_profile_cache',
  'company_assets',
  'content_theme_history',
  'invoices',
  'subscriptions',
  'processed_webhook_events',
  'custom_domains',
  'website_configs',
  'rank_observations',
  'competitor_observations',
  'publishing_records',
  'internal_campaigns',
  'external_ad_campaigns',
  'autonomous_recommendations',
  'autonomous_audit_logs',
  'system_settings',
];

// Canonical List of Expected Critical Table Indexes
export const CANONICAL_EXPECTED_INDEXES: Record<string, string[]> = {
  users: ['PRIMARY', 'idx_user_email', 'idx_user_role'],
  password_reset_tokens: ['PRIMARY', 'idx_prt_token_hash', 'idx_prt_user_id'],
  companies: ['PRIMARY', 'idx_company_user', 'idx_company_city'],
  leads: ['PRIMARY', 'idx_leads_company', 'idx_leads_stage'],
  reviews: ['PRIMARY', 'idx_rev_company', 'idx_rev_rating', 'idx_rev_source'],
  content_posts: ['PRIMARY', 'idx_cp_company', 'idx_cp_status'],
  autonomous_actions: ['PRIMARY', 'idx_aa_company', 'idx_aa_approval', 'idx_aa_execution'],
  company_integrations: ['PRIMARY', 'idx_company_provider', 'idx_comp_integ'],
  google_profile_cache: ['PRIMARY', 'idx_gpc_comp'],
  company_assets: ['PRIMARY', 'idx_company_assets_comp'],
  content_theme_history: ['PRIMARY', 'idx_cth_company_used'],
  invoices: ['PRIMARY', 'idx_invoices_company', 'idx_invoices_payment'],
  subscriptions: ['PRIMARY', 'idx_company_sub'],
  custom_domains: ['PRIMARY', 'idx_custom_domains_domain', 'idx_custom_domains_company'],
  rank_observations: ['PRIMARY', 'idx_ro_comp_kw', 'idx_ro_timestamp'],
  competitor_observations: ['PRIMARY', 'idx_co_comp_competitor', 'idx_co_timestamp'],
  publishing_records: ['PRIMARY', 'idx_pub_post_plat', 'idx_pub_company', 'idx_pub_idempotency', 'idx_pub_status'],
  internal_campaigns: ['PRIMARY', 'idx_int_camp_company'],
  external_ad_campaigns: ['PRIMARY', 'idx_ext_camp_prov_id', 'idx_ext_camp_company'],
  autonomous_recommendations: ['PRIMARY', 'idx_ar_company', 'idx_ar_status'],
  autonomous_audit_logs: ['PRIMARY', 'idx_aal_company', 'idx_aal_timestamp'],
  schema_migrations: ['PRIMARY', 'migration_name'],
  schema_migrations_lock: ['PRIMARY'],
  system_settings: ['PRIMARY'],
};

// Canonical List of Expected Critical Table Constraints
export const CANONICAL_EXPECTED_CONSTRAINTS: Record<string, string[]> = {
  users: ['PRIMARY', 'email'],
  companies: ['PRIMARY', 'public_form_token'],
  company_integrations: ['PRIMARY', 'idx_company_provider'],
  external_ad_campaigns: ['PRIMARY', 'idx_ext_camp_prov_id'],
  custom_domains: ['PRIMARY', 'domain'],
  subscriptions: ['PRIMARY', 'idx_company_sub'],
  schema_migrations: ['PRIMARY', 'migration_name'],
  schema_migrations_lock: ['PRIMARY'],
  system_settings: ['PRIMARY'],
};

// Definition of Canonical Versioned Migrations
export const MIGRATIONS: MigrationDefinition[] = [
  {
    name: '001_core_multi_tenant_schema',
    up: async (db) => {
      // 1. Users table
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          email VARCHAR(191) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          salt VARCHAR(64) NOT NULL,
          full_name VARCHAR(128) NOT NULL,
          role VARCHAR(32) DEFAULT 'owner',
          is_platform_admin TINYINT(1) NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_email (email),
          INDEX idx_user_role (role)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 2. Password reset tokens
      await db.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL,
          token_hash VARCHAR(64) NOT NULL,
          expires_at DATETIME NOT NULL,
          used_at DATETIME DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_prt_token_hash (token_hash),
          INDEX idx_prt_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 3. Companies table
      await db.query(`
        CREATE TABLE IF NOT EXISTS companies (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL,
          name VARCHAR(191) NOT NULL,
          legal_name VARCHAR(191) DEFAULT NULL,
          category VARCHAR(128) NOT NULL,
          city VARCHAR(128) NOT NULL,
          phone VARCHAR(64) DEFAULT NULL,
          website VARCHAR(255) DEFAULT NULL,
          google_place_id VARCHAR(128) DEFAULT NULL,
          autopilot_enabled TINYINT(1) DEFAULT 0,
          score INT DEFAULT NULL,
          rank_position INT DEFAULT NULL,
          public_form_token VARCHAR(64) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY idx_comp_public_form_token (public_form_token),
          INDEX idx_company_user (user_id),
          INDEX idx_company_city (city)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 4. Company profiles data
      await db.query(`
        CREATE TABLE IF NOT EXISTS company_profiles_data (
          company_id VARCHAR(64) PRIMARY KEY,
          data_payload LONGTEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 5. Leads table
      await db.query(`
        CREATE TABLE IF NOT EXISTS leads (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) DEFAULT NULL,
          name VARCHAR(128) NOT NULL,
          company VARCHAR(128) DEFAULT NULL,
          phone VARCHAR(64) NOT NULL,
          email VARCHAR(191) DEFAULT NULL,
          service VARCHAR(191) NOT NULL,
          budget VARCHAR(64) DEFAULT NULL,
          stage VARCHAR(32) NOT NULL DEFAULT 'new',
          intent_score INT DEFAULT NULL,
          source VARCHAR(64) NOT NULL DEFAULT 'website',
          notes TEXT DEFAULT NULL,
          ai_suggested_reply TEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_company_lead (company_id),
          INDEX idx_lead_stage (stage),
          INDEX idx_lead_phone (phone)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 6. Reviews table
      await db.query(`
        CREATE TABLE IF NOT EXISTS reviews (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) DEFAULT NULL,
          author VARCHAR(255) NOT NULL,
          rating INT DEFAULT NULL,
          date VARCHAR(64) DEFAULT NULL,
          relative_time VARCHAR(64) DEFAULT NULL,
          content TEXT NOT NULL,
          sentiment VARCHAR(32) DEFAULT NULL,
          topic VARCHAR(128) DEFAULT NULL,
          is_operational_issue TINYINT(1) DEFAULT 0,
          replied TINYINT(1) DEFAULT 0,
          reply_text TEXT DEFAULT NULL,
          reply_date VARCHAR(64) DEFAULT NULL,
          reply_status VARCHAR(32) DEFAULT NULL,
          external_review_id VARCHAR(128) DEFAULT NULL,
          retrieved_at VARCHAR(64) DEFAULT NULL,
          source VARCHAR(64) DEFAULT 'manual',
          provenance_status VARCHAR(32) DEFAULT 'USER_ENTERED',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_company_review (company_id),
          INDEX idx_review_replied (replied),
          INDEX idx_review_rating (rating)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 7. Content posts table
      await db.query(`
        CREATE TABLE IF NOT EXISTS content_posts (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) DEFAULT NULL,
          title VARCHAR(255) DEFAULT NULL,
          type VARCHAR(64) DEFAULT 'offer',
          platforms TEXT DEFAULT NULL,
          channel VARCHAR(64) NOT NULL DEFAULT 'google',
          headline VARCHAR(255) DEFAULT NULL,
          caption TEXT NOT NULL,
          cta VARCHAR(255) DEFAULT NULL,
          image_url TEXT DEFAULT NULL,
          video_url TEXT DEFAULT NULL,
          status VARCHAR(32) DEFAULT 'draft',
          scheduled_date VARCHAR(64) DEFAULT NULL,
          scheduled_time VARCHAR(64) DEFAULT NULL,
          time_slot VARCHAR(64) DEFAULT NULL,
          hashtags TEXT DEFAULT NULL,
          reel_script TEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_company_post (company_id),
          INDEX idx_post_status (status),
          INDEX idx_post_scheduled (scheduled_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 8. Business profile table
      await db.query(`
        CREATE TABLE IF NOT EXISTS business_profile (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(255) NOT NULL,
          address TEXT NOT NULL,
          city VARCHAR(128) NOT NULL,
          phone VARCHAR(64) NOT NULL,
          email VARCHAR(255) NOT NULL,
          website VARCHAR(255) NOT NULL,
          whatsapp VARCHAR(64) NOT NULL,
          services_json JSON DEFAULT NULL,
          settings_json JSON DEFAULT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    },
  },
  {
    name: '002_integrations_and_billing_schema',
    up: async (db) => {
      // 9. Company integrations table
      await db.query(`
        CREATE TABLE IF NOT EXISTS company_integrations (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          provider VARCHAR(64) NOT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'not_configured',
          credentials TEXT DEFAULT NULL,
          config TEXT DEFAULT NULL,
          last_tested_at VARCHAR(64) DEFAULT NULL,
          last_error TEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY idx_company_provider (company_id, provider),
          INDEX idx_comp_integ (company_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 10. Google profile cache
      await db.query(`
        CREATE TABLE IF NOT EXISTS google_profile_cache (
          company_id VARCHAR(64) PRIMARY KEY,
          place_id VARCHAR(128) NOT NULL,
          data_payload LONGTEXT NOT NULL,
          cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_gpc_comp (company_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 11. Company assets
      await db.query(`
        CREATE TABLE IF NOT EXISTS company_assets (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          asset_type ENUM('logo', 'photo') NOT NULL,
          url VARCHAR(512) NOT NULL,
          label VARCHAR(255) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_company_assets_comp (company_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 12. Content theme history
      await db.query(`
        CREATE TABLE IF NOT EXISTS content_theme_history (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          template_id VARCHAR(64) NOT NULL,
          palette_id VARCHAR(64) NOT NULL,
          used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_cth_company_used (company_id, used_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 13. Invoices table
      await db.query(`
        CREATE TABLE IF NOT EXISTS invoices (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          date VARCHAR(32) NOT NULL,
          plan VARCHAR(128) NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          total_amount DECIMAL(10,2) NOT NULL,
          payment_method VARCHAR(128) NOT NULL DEFAULT 'UPI / Razorpay',
          payment_id VARCHAR(128) DEFAULT NULL,
          order_id VARCHAR(128) DEFAULT NULL,
          payment_link_id VARCHAR(128) DEFAULT NULL,
          customer_name VARCHAR(255) DEFAULT NULL,
          customer_email VARCHAR(255) DEFAULT NULL,
          customer_phone VARCHAR(64) DEFAULT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'Paid',
          hsn_code VARCHAR(32) DEFAULT '998314',
          pdf_url VARCHAR(512) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_invoices_company (company_id),
          INDEX idx_invoices_payment (payment_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 14. Subscriptions table
      await db.query(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          plan_id VARCHAR(64) NOT NULL DEFAULT 'growth',
          plan_name VARCHAR(128) NOT NULL DEFAULT 'Growth Tier',
          status VARCHAR(32) NOT NULL DEFAULT 'active',
          amount DECIMAL(10,2) NOT NULL DEFAULT 799.00,
          billing_cycle VARCHAR(32) NOT NULL DEFAULT 'monthly',
          current_period_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          current_period_end TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          razorpay_subscription_id VARCHAR(128) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY idx_company_sub (company_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 15. Processed webhook events table
      await db.query(`
        CREATE TABLE IF NOT EXISTS processed_webhook_events (
          id VARCHAR(128) PRIMARY KEY,
          event_type VARCHAR(64) NOT NULL,
          company_id VARCHAR(64) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_pwe_company (company_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    },
  },
  {
    name: '003_websites_and_seo_telemetry_schema',
    up: async (db) => {
      // 16. Custom domains table
      await db.query(`
        CREATE TABLE IF NOT EXISTS custom_domains (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          domain VARCHAR(255) NOT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'pending_verification',
          ssl_status VARCHAR(32) NOT NULL DEFAULT 'provisioning',
          cname_target VARCHAR(255) NOT NULL DEFAULT 'cname.bga.aaditechs.in',
          a_record_target VARCHAR(64) NOT NULL DEFAULT '77.37.54.108',
          dns_txt_record VARCHAR(255) DEFAULT NULL,
          verified_at TIMESTAMP NULL DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY idx_company_domain (company_id, domain),
          INDEX idx_domains_company (company_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 17. Website configs table
      await db.query(`
        CREATE TABLE IF NOT EXISTS website_configs (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          subdomain VARCHAR(128) NOT NULL,
          primary_color VARCHAR(32) NOT NULL DEFAULT '#4f46e5',
          secondary_color VARCHAR(32) NOT NULL DEFAULT '#06b6d4',
          tagline VARCHAR(255) DEFAULT NULL,
          hero_title VARCHAR(255) DEFAULT NULL,
          hero_subtitle TEXT DEFAULT NULL,
          meta_description TEXT DEFAULT NULL,
          keywords TEXT DEFAULT NULL,
          google_analytics_id VARCHAR(64) DEFAULT NULL,
          custom_header_html TEXT DEFAULT NULL,
          enable_whatsapp_cta BOOLEAN NOT NULL DEFAULT TRUE,
          enable_direct_call_cta BOOLEAN NOT NULL DEFAULT TRUE,
          enable_inquiry_form BOOLEAN NOT NULL DEFAULT TRUE,
          pages_json LONGTEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY idx_company_webconfig (company_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 18. Rank observations table
      await db.query(`
        CREATE TABLE IF NOT EXISTS rank_observations (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          keyword VARCHAR(191) NOT NULL,
          latitude DECIMAL(10,7) NOT NULL,
          longitude DECIMAL(10,7) NOT NULL,
          grid_index INT NOT NULL,
          grid_label VARCHAR(128) DEFAULT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          provider VARCHAR(64) NOT NULL,
          position INT DEFAULT NULL,
          status VARCHAR(32) NOT NULL,
          source_evidence TEXT DEFAULT NULL,
          top_competitors_json LONGTEXT DEFAULT NULL,
          INDEX idx_ro_comp_kw (company_id, keyword),
          INDEX idx_ro_timestamp (timestamp)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 19. Competitor observations table
      await db.query(`
        CREATE TABLE IF NOT EXISTS competitor_observations (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          competitor_id VARCHAR(64) NOT NULL,
          name VARCHAR(255) NOT NULL,
          place_id VARCHAR(128) DEFAULT NULL,
          address VARCHAR(512) DEFAULT NULL,
          rating DECIMAL(3,2) DEFAULT NULL,
          reviews_count INT DEFAULT NULL,
          photos_count INT DEFAULT NULL,
          posts_per_week DECIMAL(4,2) DEFAULT NULL,
          rank_position INT DEFAULT NULL,
          provider VARCHAR(64) NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(32) NOT NULL,
          raw_payload LONGTEXT DEFAULT NULL,
          INDEX idx_co_comp_competitor (company_id, competitor_id),
          INDEX idx_co_timestamp (timestamp)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    },
  },
  {
    name: '004_publishing_campaigns_and_autonomous_schema',
    up: async (db) => {
      // 20. Publishing records table
      await db.query(`
        CREATE TABLE IF NOT EXISTS publishing_records (
          id VARCHAR(64) PRIMARY KEY,
          post_id VARCHAR(64) NOT NULL,
          company_id VARCHAR(64) NOT NULL,
          platform VARCHAR(64) NOT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'RETRYING',
          provider_post_id VARCHAR(128) DEFAULT NULL,
          attempt_count INT NOT NULL DEFAULT 1,
          max_attempts INT NOT NULL DEFAULT 3,
          error_type VARCHAR(64) DEFAULT NULL,
          error_message TEXT DEFAULT NULL,
          idempotency_key VARCHAR(128) NOT NULL,
          published_at TIMESTAMP NULL DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_pub_post_plat (post_id, platform),
          INDEX idx_pub_company (company_id),
          INDEX idx_pub_idempotency (idempotency_key),
          INDEX idx_pub_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 21. Internal campaigns table
      await db.query(`
        CREATE TABLE IF NOT EXISTS internal_campaigns (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          name VARCHAR(255) NOT NULL,
          objective TEXT NOT NULL,
          status ENUM('draft', 'active', 'paused', 'completed') NOT NULL DEFAULT 'active',
          start_date VARCHAR(64) NOT NULL,
          end_date VARCHAR(64) NOT NULL,
          planned_budget DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          channels TEXT DEFAULT NULL,
          external_campaign_id VARCHAR(128) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_int_camp_company (company_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 22. External ad campaigns table
      await db.query(`
        CREATE TABLE IF NOT EXISTS external_ad_campaigns (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          internal_campaign_id VARCHAR(64) DEFAULT NULL,
          provider VARCHAR(64) NOT NULL,
          external_campaign_id VARCHAR(128) NOT NULL,
          name VARCHAR(255) NOT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN',
          fetched_at VARCHAR(64) DEFAULT NULL,
          spend DECIMAL(10,2) DEFAULT NULL,
          impressions BIGINT DEFAULT NULL,
          clicks BIGINT DEFAULT NULL,
          conversions BIGINT DEFAULT NULL,
          conversion_tracking_status VARCHAR(32) NOT NULL DEFAULT 'UNAVAILABLE',
          revenue DECIMAL(10,2) DEFAULT NULL,
          revenue_attribution_status VARCHAR(32) NOT NULL DEFAULT 'UNAVAILABLE',
          roas DECIMAL(10,2) DEFAULT NULL,
          raw_metrics_json LONGTEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY idx_ext_camp_prov_id (company_id, provider, external_campaign_id),
          INDEX idx_ext_camp_company (company_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 23. Autonomous recommendations table
      await db.query(`
        CREATE TABLE IF NOT EXISTS autonomous_recommendations (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          observation TEXT NOT NULL,
          evidence_ids TEXT NOT NULL,
          source VARCHAR(64) NOT NULL,
          timestamp VARCHAR(64) NOT NULL,
          recommended_action TEXT NOT NULL,
          action_type VARCHAR(64) NOT NULL,
          action_payload LONGTEXT DEFAULT NULL,
          affected_metric VARCHAR(128) NOT NULL,
          confidence INT NOT NULL DEFAULT 85,
          risk ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
          approval_requirement ENUM('auto', 'required') NOT NULL DEFAULT 'required',
          status VARCHAR(32) NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_ar_company (company_id),
          INDEX idx_ar_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 24. Autonomous actions table
      await db.query(`
        CREATE TABLE IF NOT EXISTS autonomous_actions (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          recommendation_id VARCHAR(64) DEFAULT NULL,
          action_type VARCHAR(64) NOT NULL,
          payload LONGTEXT DEFAULT NULL,
          source_evidence LONGTEXT DEFAULT NULL,
          approval_status VARCHAR(32) NOT NULL DEFAULT 'pending_approval',
          execution_state VARCHAR(32) NOT NULL DEFAULT 'idle',
          provider_response LONGTEXT DEFAULT NULL,
          verification_state VARCHAR(32) NOT NULL DEFAULT 'unverified',
          error TEXT DEFAULT NULL,
          executed_at VARCHAR(64) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_aa_company (company_id),
          INDEX idx_aa_approval (approval_status),
          INDEX idx_aa_execution (execution_state)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 25. Autonomous audit logs table
      await db.query(`
        CREATE TABLE IF NOT EXISTS autonomous_audit_logs (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          action_id VARCHAR(64) DEFAULT NULL,
          actor VARCHAR(128) NOT NULL,
          event_type VARCHAR(64) NOT NULL,
          details LONGTEXT DEFAULT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_aal_company (company_id),
          INDEX idx_aal_timestamp (timestamp)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    },
  },
  {
    name: '005_system_settings_and_metadata_schema',
    up: async (db) => {
      // 26. System settings table (Production Key-Value Registry)
      await db.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
          setting_key VARCHAR(128) PRIMARY KEY,
          setting_value LONGTEXT NOT NULL,
          setting_type VARCHAR(32) NOT NULL DEFAULT 'string',
          is_public TINYINT(1) NOT NULL DEFAULT 0,
          description VARCHAR(255) DEFAULT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    },
  },
];

// Helper to calculate migration checksum
function computeMigrationChecksum(m: MigrationDefinition): string {
  return crypto.createHash('sha256').update(m.name + m.up.toString()).digest('hex');
}

/**
 * Ensures the migration tracking and lock tables exist.
 */
export async function ensureMigrationInfrastructure(db: mysql.Connection | mysql.Pool): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      migration_name VARCHAR(191) NOT NULL UNIQUE,
      checksum VARCHAR(64) NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      execution_time_ms INT NOT NULL DEFAULT 0,
      success TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations_lock (
      lock_id VARCHAR(64) PRIMARY KEY,
      is_locked TINYINT(1) NOT NULL DEFAULT 0,
      locked_by VARCHAR(128) DEFAULT NULL,
      locked_at TIMESTAMP NULL DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Initialize lock row idempotently
  await db.query(`
    INSERT IGNORE INTO schema_migrations_lock (lock_id, is_locked)
    VALUES ('migration_lock', 0);
  `);
}

/**
 * Acquire distributed migration lock with timeout protection
 */
export async function acquireMigrationLock(db: mysql.Connection | mysql.Pool, timeoutSeconds = 15): Promise<boolean> {
  const instanceId = `deploy_${process.pid}_${Date.now()}`;
  const start = Date.now();

  while (Date.now() - start < timeoutSeconds * 1000) {
    try {
      // 1. Try MySQL GET_LOCK for server-level mutual exclusion
      const [lockRows]: any = await db.query('SELECT GET_LOCK("localpulse_migration_lock", 2) as acquired');
      if (lockRows && lockRows[0]?.acquired === 1) {
        // Also update table lock for visibility
        await db.query(`
          UPDATE schema_migrations_lock
          SET is_locked = 1, locked_by = ?, locked_at = CURRENT_TIMESTAMP
          WHERE lock_id = 'migration_lock'
        `, [instanceId]);
        return true;
      }
    } catch {
      // Fallback to table atomic update
      const [res]: any = await db.query(`
        UPDATE schema_migrations_lock
        SET is_locked = 1, locked_by = ?, locked_at = CURRENT_TIMESTAMP
        WHERE lock_id = 'migration_lock' AND (is_locked = 0 OR locked_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE))
      `, [instanceId]);
      if (res.affectedRows > 0) return true;
    }
    // Sleep 500ms before retrying
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

/**
 * Release distributed migration lock
 */
export async function releaseMigrationLock(db: mysql.Connection | mysql.Pool): Promise<void> {
  try {
    await db.query('SELECT RELEASE_LOCK("localpulse_migration_lock")');
  } catch {}
  try {
    await db.query(`
      UPDATE schema_migrations_lock
      SET is_locked = 0, locked_by = NULL, locked_at = NULL
      WHERE lock_id = 'migration_lock'
    `);
  } catch {}
}

/**
 * Run pending migrations sequentially in deterministic order
 */
export async function runMigrations(dbPool: mysql.Pool): Promise<{
  appliedCount: number;
  totalMigrations: number;
  appliedNames: string[];
}> {
  const conn = await dbPool.getConnection();
  let lockAcquired = false;

  try {
    await ensureMigrationInfrastructure(conn);

    lockAcquired = await acquireMigrationLock(conn, 15);
    if (!lockAcquired) {
      throw new Error('MIGRATION_LOCK_TIMEOUT: Could not acquire migration lock within 15 seconds. Another migration is running.');
    }

    const [rows]: any = await conn.query('SELECT migration_name, checksum FROM schema_migrations WHERE success = 1');
    const appliedMap = new Map<string, string>();
    for (const r of rows) {
      appliedMap.set(r.migration_name, r.checksum);
    }

    const appliedNames: string[] = [];

    for (const migration of MIGRATIONS) {
      const expectedChecksum = computeMigrationChecksum(migration);

      if (appliedMap.has(migration.name)) {
        const storedChecksum = appliedMap.get(migration.name);
        if (storedChecksum && storedChecksum !== expectedChecksum) {
          throw new Error(`MIGRATION_CHECKSUM_MISMATCH: Migration ${migration.name} has stored checksum '${storedChecksum}' but current definition checksum is '${expectedChecksum}'. Execution halted (FAIL CLOSED).`);
        }
        continue;
      }

      console.log(`[Database Migration] Applying migration: ${migration.name}...`);
      const startTime = Date.now();

      try {
        await migration.up(conn);
        const duration = Date.now() - startTime;

        await conn.query(`
          INSERT INTO schema_migrations (migration_name, checksum, execution_time_ms, success)
          VALUES (?, ?, ?, 1)
        `, [migration.name, expectedChecksum, duration]);

        appliedNames.push(migration.name);
        console.log(`[Database Migration] ✅ Successfully applied: ${migration.name} (${duration}ms)`);
      } catch (migErr: any) {
        console.error(`[Database Migration] ❌ Migration failed: ${migration.name}:`, migErr);
        throw new Error(`MIGRATION_FAILED: ${migration.name} failed (${migErr?.message})`);
      }
    }

    return {
      appliedCount: appliedNames.length,
      totalMigrations: MIGRATIONS.length,
      appliedNames,
    };
  } finally {
    if (lockAcquired) {
      await releaseMigrationLock(conn);
    }
    conn.release();
  }
}

/**
 * Verifies complete schema integrity against production requirements
 */
export async function verifySchema(dbPool: mysql.Pool): Promise<VerificationResult> {
  try {
    const conn = await dbPool.getConnection();
    try {
      // 1. Check MySQL Engine & Connectivity
      const [versionRows]: any = await conn.query('SELECT VERSION() as version');
      const engineVersion = versionRows?.[0]?.version || 'MySQL/MariaDB';

      // 2. Check schema_migrations table
      const [migTable]: any = await conn.query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'schema_migrations'
      `);

      if (!migTable || migTable.length === 0) {
        return {
          connection: 'PASS',
          engine: engineVersion,
          migrationTable: 'FAIL',
          appliedMigrations: 0,
          pendingMigrations: MIGRATIONS.length,
          requiredTables: 'FAIL',
          requiredIndexes: 'FAIL',
          schemaVersion: 0,
          status: 'MIGRATION_REQUIRED',
          error: 'schema_migrations table does not exist. Run "npm run db:migrate" to initialize.',
        };
      }

      // 3. Check applied migrations count and checksums
      const [appliedRows]: any = await conn.query('SELECT migration_name, checksum FROM schema_migrations WHERE success = 1');
      const appliedMap = new Map<string, string>();
      for (const r of (appliedRows || [])) {
        appliedMap.set(r.migration_name, r.checksum);
      }
      const pendingCount = MIGRATIONS.filter((m) => !appliedMap.has(m.name)).length;

      // Verify checksum integrity
      let checksumMismatch: string | null = null;
      for (const m of MIGRATIONS) {
        if (appliedMap.has(m.name)) {
          const stored = appliedMap.get(m.name);
          const computed = computeMigrationChecksum(m);
          if (stored && stored !== computed) {
            checksumMismatch = `Checksum mismatch on ${m.name} (stored: ${stored}, current: ${computed})`;
            break;
          }
        }
      }

      if (checksumMismatch) {
        return {
          connection: 'PASS',
          engine: engineVersion,
          migrationTable: 'PASS',
          appliedMigrations: appliedMap.size,
          pendingMigrations: pendingCount,
          requiredTables: 'FAIL',
          requiredIndexes: 'FAIL',
          schemaVersion: appliedMap.size,
          status: 'DATABASE_SCHEMA_OUTDATED',
          error: `MIGRATION_CHECKSUM_MISMATCH: ${checksumMismatch}`,
        };
      }

      // 4. Check all canonical tables exist
      const [existingTables]: any = await conn.query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
      `);
      const existingTableSet = new Set((existingTables || []).map((r: any) => r.TABLE_NAME));
      const missingTables = CANONICAL_REQUIRED_TABLES.filter((t) => !existingTableSet.has(t));

      // 5. Check all canonical indexes exist
      const [existingIndexes]: any = await conn.query(`
        SELECT TABLE_NAME, INDEX_NAME
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
      `);
      const existingIndexMap = new Map<string, Set<string>>();
      for (const idx of (existingIndexes || [])) {
        if (!existingIndexMap.has(idx.TABLE_NAME)) {
          existingIndexMap.set(idx.TABLE_NAME, new Set());
        }
        existingIndexMap.get(idx.TABLE_NAME)!.add(idx.INDEX_NAME);
      }

      const missingIndexes: string[] = [];
      for (const [tbl, expectedIdxs] of Object.entries(CANONICAL_EXPECTED_INDEXES)) {
        if (existingTableSet.has(tbl)) {
          const liveIdxs = existingIndexMap.get(tbl) || new Set();
          for (const expIdx of expectedIdxs) {
            if (!liveIdxs.has(expIdx)) {
              missingIndexes.push(`${tbl}.${expIdx}`);
            }
          }
        }
      }

      // 6. Check all canonical constraints exist
      const [existingConstraints]: any = await conn.query(`
        SELECT TABLE_NAME, CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
      `);
      const existingConstraintMap = new Map<string, Set<string>>();
      for (const c of (existingConstraints || [])) {
        if (!existingConstraintMap.has(c.TABLE_NAME)) {
          existingConstraintMap.set(c.TABLE_NAME, new Set());
        }
        existingConstraintMap.get(c.TABLE_NAME)!.add(c.CONSTRAINT_NAME);
      }

      const missingConstraints: string[] = [];
      for (const [tbl, expectedConsts] of Object.entries(CANONICAL_EXPECTED_CONSTRAINTS)) {
        if (existingTableSet.has(tbl)) {
          const liveConsts = existingConstraintMap.get(tbl) || new Set();
          for (const expConst of expectedConsts) {
            if (!liveConsts.has(expConst)) {
              missingConstraints.push(`${tbl}.${expConst}`);
            }
          }
        }
      }

      const isTablesPass = missingTables.length === 0;
      const isIndexesPass = missingIndexes.length === 0;
      const isConstraintsPass = missingConstraints.length === 0;
      const isSchemaPass = isTablesPass && isIndexesPass && isConstraintsPass;
      const status = pendingCount > 0 ? 'DATABASE_SCHEMA_OUTDATED' : (isSchemaPass ? 'READY' : 'MIGRATION_REQUIRED');

      return {
        connection: 'PASS',
        engine: engineVersion,
        migrationTable: 'PASS',
        appliedMigrations: appliedMap.size,
        pendingMigrations: pendingCount,
        requiredTables: isTablesPass ? 'PASS' : 'FAIL',
        requiredIndexes: isIndexesPass ? 'PASS' : 'FAIL',
        schemaVersion: appliedMap.size,
        status,
        missingTables: missingTables.length > 0 ? missingTables : undefined,
        missingIndexes: missingIndexes.length > 0 ? missingIndexes : undefined,
        missingConstraints: missingConstraints.length > 0 ? missingConstraints : undefined,
      };
    } finally {
      conn.release();
    }
  } catch (err: any) {
    return {
      connection: 'FAIL',
      engine: 'Unknown',
      migrationTable: 'FAIL',
      appliedMigrations: 0,
      pendingMigrations: MIGRATIONS.length,
      requiredTables: 'FAIL',
      requiredIndexes: 'FAIL',
      schemaVersion: 0,
      status: 'UNAVAILABLE',
      error: err?.message || 'Failed to connect to MySQL database',
    };
  }
}

/**
 * Seed required system settings (Safe system seed, zero fake business data)
 */
export async function seedSystemSettings(dbPool: mysql.Pool): Promise<{ seeded: number }> {
  const conn = await dbPool.getConnection();
  try {
    const defaultSettings = [
      { key: 'app.name', value: 'Aaditech BGA', type: 'string', is_public: 1, desc: 'Application Platform Name' },
      { key: 'app.version', value: '1.29.0', type: 'string', is_public: 1, desc: 'Application Release Version' },
      { key: 'app.subdomain_domain', value: 'bga.aaditechs.in', type: 'string', is_public: 1, desc: 'Root Domain for Storefront Subdomains' },
      { key: 'app.cname_target', value: 'cname.bga.aaditechs.in', type: 'string', is_public: 1, desc: 'CNAME Target for Custom Domains' },
      { key: 'app.a_record_target', value: '77.37.54.108', type: 'string', is_public: 1, desc: 'A Record Target for Custom Domains' },
      { key: 'security.lockout_minutes', value: '15', type: 'number', is_public: 0, desc: 'Account Lockout Duration Minutes' },
      { key: 'security.max_failed_attempts', value: '5', type: 'number', is_public: 0, desc: 'Max Failed Login Attempts Before Lockout' },
      { key: 'security.password_pbkdf2_iterations', value: '210000', type: 'number', is_public: 0, desc: 'OWASP PBKDF2 Iteration Count' },
      { key: 'autonomous.default_emergency_stop', value: 'false', type: 'boolean', is_public: 0, desc: 'Global Autopilot Emergency Stop' },
    ];

    let count = 0;
    for (const s of defaultSettings) {
      const [res]: any = await conn.query(`
        INSERT INTO system_settings (setting_key, setting_value, setting_type, is_public, description)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE description = VALUES(description)
      `, [s.key, s.value, s.type, s.is_public, s.desc]);
      if (res.affectedRows > 0) count++;
    }

    return { seeded: count };
  } finally {
    conn.release();
  }
}

/**
 * Safe first-run administrator creation (Idempotent, OWASP PBKDF2 password hashing)
 */
export async function initializeAdminUser(
  dbPool: mysql.Pool,
  email?: string,
  plainPassword?: string,
  fullName?: string
): Promise<{ created: boolean; email: string; userId: string } | null> {
  const adminEmail = (email || process.env.INITIAL_ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPass = plainPassword || process.env.INITIAL_ADMIN_PASSWORD || '';
  const adminName = (fullName || process.env.INITIAL_ADMIN_NAME || 'System Administrator').trim();

  if (!adminEmail || !adminPass) {
    return null;
  }

  const conn = await dbPool.getConnection();
  try {
    const [existing]: any = await conn.query('SELECT id, role, is_platform_admin FROM users WHERE email = ? LIMIT 1', [adminEmail]);
    if (existing && existing.length > 0) {
      // Ensure existing bootstrapped INITIAL_ADMIN has is_platform_admin = 1
      await conn.query('UPDATE users SET is_platform_admin = 1, role = "platform_admin" WHERE email = ?', [adminEmail]);
      return { created: false, email: adminEmail, userId: existing[0].id };
    }

    const { hash, salt } = hashPassword(adminPass);
    const userId = `usr_${crypto.randomUUID().replace(/-/g, '')}`;

    await conn.query(`
      INSERT INTO users (id, email, password_hash, salt, full_name, role, is_platform_admin)
      VALUES (?, ?, ?, ?, ?, 'platform_admin', 1)
    `, [userId, adminEmail, hash, salt, adminName]);

    return { created: true, email: adminEmail, userId };
  } finally {
    conn.release();
  }
}
