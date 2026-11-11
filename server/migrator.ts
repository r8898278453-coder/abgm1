import {agencySecurityFoundation,AGENCY_TABLE_COLUMNS,AGENCY_COMPATIBILITY_CHECKS} from './migrations/034_agency_security_foundation';
import {structuredKnowledgeFacts,FACTS_CONFLICT_SQL} from './migrations/033_structured_knowledge_facts';
import {knowledgeIngestionQueue} from './migrations/032_knowledge_ingestion_queue';
import {websiteSourceProvenance} from './migrations/031_website_source_provenance';
import {privateKnowledgeSources} from './migrations/030_private_knowledge_sources';
import {migrationIdentity,validateMigrationRegistry,inspectMigrationLedger,MigrationLedgerError} from './migrationIdentity';
import {createPublicLeadIntakes} from './migrations/029_public_lead_intakes';
import {repairLegacyExport} from './migrations/028_legacy_export_compatibility';
import {createDispatcherJournal} from './migrations/027_dispatcher_journal';
import {addCompanyProfileRevision} from './migrations/026_company_profile_revision';
import {createMessageDeliveryReceipts} from './migrations/025_message_delivery_receipts';
import {createMessageDispatchIntents} from './migrations/024_message_dispatch_intents';
import {createPublicationAdmissionLimits} from './migrations/023_publication_admission_limits';
import {createPublicationScopedControls} from './migrations/022_publication_scoped_controls';
import {addDailyWorkReportIndexes} from './migrations/021_daily_work_report_indexes';
import {addQueuePauseDeferrals} from './migrations/020_queue_pause_deferrals';
import {addPublicationPolicyBinding} from './migrations/019_publication_policy_binding';
import {addPublicationScheduleHistory} from './migrations/018_publication_schedule_history';
import {createPublicationWorkflowAudit} from './migrations/017_publication_workflow_audit';
import {createPublicationDraftIntents} from './migrations/016_publication_draft_intents';
import { createPublishingVerificationAudit } from './migrations/015_publishing_verification_audit';
import { createPublishingReviewAudit } from './migrations/014_publishing_review_audit';
import { createPublishingDispatchClaims } from './migrations/013_publishing_dispatch_claims';
import { createScheduledPostDispatchCursors } from './migrations/012_scheduled_post_dispatch_cursors';
import { createNotificationDispatchCursors } from './migrations/011_notification_dispatch_cursors';
import { createNotificationOccurrences } from './migrations/010_notification_occurrences';
import { createInternalActionFeed } from './migrations/009_internal_action_feed';
import { createQueueActionLedger } from './migrations/008_queue_action_ledger';
import { alignSchemaIndexes } from './migrations/007_schema_index_alignment';
import { hasEquivalentIndex, INDEX_REQUIREMENTS, UNIQUE_REQUIREMENTS } from './schemaIndexes';
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
  ...Object.keys(AGENCY_TABLE_COLUMNS),
  'knowledge_facts',
  'knowledge_sources',
  'public_lead_intakes',
  'schema_migrations',
  'schema_migrations_lock',
  'users',
  'password_reset_tokens',
  'companies',
  'company_profiles_data',
  'dispatcher_state',
  'dispatcher_ticks',
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
  'job_queue',
  'job_action_runs',
  'job_action_events',
  'job_action_outbox',
  'job_action_feed_cursors',
  'job_action_receipts',
  'notification_occurrences',
  'notification_dispatch_cursors',
  'scheduled_post_dispatch_cursors',
  'publishing_dispatch_claims',
  'publishing_review_audit',
  'publishing_verification_audit',
  'publication_draft_intents',
  'publication_workflow_audit',
  'publication_execution_controls',
  'publication_control_audit',
  'publication_admission_reservations',
  'message_dispatch_intents',
  'message_delivery_receipts',
];

// Canonical List of Expected Critical Table Indexes
export const CANONICAL_EXPECTED_INDEXES: Record<string, string[]> = {
  knowledge_facts:['PRIMARY','idx_facts_company_key'],
  knowledge_sources:['PRIMARY','idx_knowledge_company_created','uq_knowledge_company_sha'],
  public_lead_intakes:['PRIMARY','uq_public_intake_lead','idx_public_intake_created','idx_public_intake_notification'],
  dispatcher_state:['PRIMARY'],dispatcher_ticks:['PRIMARY','idx_dispatcher_status'],
  company_profiles_data:['PRIMARY'],
  message_delivery_receipts:['PRIMARY','idx_receipt_message','idx_receipt_day'],
  message_dispatch_intents:['PRIMARY','idx_message_intent_created','idx_message_intent_state'],
  publication_admission_reservations:['PRIMARY','idx_admission_post'],
  publication_execution_controls:['PRIMARY'],
  publication_control_audit:['PRIMARY','uq_publication_control_revision'],
  users: ['PRIMARY', 'idx_user_email', 'idx_user_role'],
  password_reset_tokens: ['PRIMARY', 'idx_prt_token_hash', 'idx_prt_user_id'],
  companies: ['PRIMARY', 'idx_company_user', 'idx_company_city'],
  leads: ['PRIMARY', 'idx_leads_company', 'idx_leads_stage'],
  reviews: ['PRIMARY', 'idx_rev_company', 'idx_rev_rating', 'idx_rev_source'],
  content_posts: ['idx_post_company_status','PRIMARY', 'idx_cp_company', 'idx_cp_status'],
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
  job_queue: ['idx_job_company_status','PRIMARY', 'idx_jq_status_sched', 'idx_jq_company'],
  job_action_feed_cursors: ['PRIMARY'],
  job_action_receipts: ['PRIMARY', 'uq_action_receipt_revision'],
  notification_occurrences: ['PRIMARY'],
  notification_dispatch_cursors: ['PRIMARY'],
  scheduled_post_dispatch_cursors: ['PRIMARY'],
  publishing_dispatch_claims: ['idx_claim_company_status','PRIMARY'],
  publishing_review_audit: ['PRIMARY','uq_pub_review_sequence','idx_pub_review_scope'],
  publication_workflow_audit: ['idx_workflow_day','PRIMARY','idx_workflow_scope','uq_workflow_sequence','idx_workflow_sequence'],
  publication_draft_intents: ['PRIMARY','uq_publication_intent_post'],
  publishing_verification_audit: ['PRIMARY','uq_pub_check_sequence','idx_pub_check_scope'],
  job_action_runs: ['PRIMARY', 'idx_action_runs_company'],
  job_action_events: ['PRIMARY', 'idx_action_events_company', 'idx_action_events_job', 'uq_action_event_sequence'],
  job_action_outbox: ['PRIMARY', 'uq_outbox_event', 'idx_outbox_pending'],
};

// Canonical List of Expected Critical Table Constraints
export const CANONICAL_EXPECTED_CONSTRAINTS: Record<string, string[]> = {
  knowledge_facts:['PRIMARY','fk_facts_company'],
  knowledge_sources:['PRIMARY','fk_knowledge_company','uq_knowledge_company_sha'],
  public_lead_intakes:['PRIMARY','uq_public_intake_lead','fk_public_intake_company'],
  dispatcher_state:['PRIMARY'],dispatcher_ticks:['PRIMARY'],
  company_profiles_data:['PRIMARY'],
  message_delivery_receipts:['PRIMARY','fk_receipt_company'],
  message_dispatch_intents:['PRIMARY','fk_message_intent_company'],
  publication_admission_reservations:['PRIMARY','fk_admission_post'],
  publication_execution_controls:['PRIMARY','fk_publication_controls_company'],
  publication_control_audit:['PRIMARY','uq_publication_control_revision','fk_publication_control_audit'],
  users: ['PRIMARY', 'email'],
  companies: ['PRIMARY', 'public_form_token'],
  company_integrations: ['PRIMARY', 'idx_company_provider'],
  external_ad_campaigns: ['PRIMARY', 'idx_ext_camp_prov_id'],
  custom_domains: ['PRIMARY', 'domain'],
  website_configs:['PRIMARY','company_id'],
  subscriptions: ['PRIMARY', 'idx_company_sub'],
  schema_migrations: ['PRIMARY', 'migration_name'],
  schema_migrations_lock: ['PRIMARY'],
  system_settings: ['PRIMARY'],
  job_queue: ['PRIMARY', 'uq_jq_company_idempotency'],
  job_action_feed_cursors: ['PRIMARY'],
  job_action_receipts: ['PRIMARY', 'uq_action_receipt_revision', 'fk_action_receipt_event'],
  notification_occurrences: ['PRIMARY'],
  notification_dispatch_cursors: ['PRIMARY'],
  scheduled_post_dispatch_cursors: ['PRIMARY'],
  publishing_dispatch_claims: ['PRIMARY'],
  publishing_review_audit: ['PRIMARY','uq_pub_review_sequence','fk_pub_review_claim'],
  publication_workflow_audit: ['PRIMARY','uq_workflow_sequence','fk_workflow_post'],
  publication_draft_intents: ['PRIMARY','uq_publication_intent_post','fk_publication_intent_post'],
  publishing_verification_audit: ['PRIMARY','uq_pub_check_sequence','fk_pub_check_claim'],
  job_action_runs: ['PRIMARY', 'fk_action_run_job'],
  job_action_events: ['PRIMARY', 'fk_action_event_run'],
  job_action_outbox: ['PRIMARY', 'uq_outbox_event', 'fk_action_outbox_event'],
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
  {
    name: '006_durable_job_queue_and_campaign_binding',
    up: async (db) => {
      // 1. Add campaign_id to content_posts if missing
      try {
        await db.query(`
          ALTER TABLE content_posts 
          ADD COLUMN campaign_id VARCHAR(64) DEFAULT NULL AFTER company_id,
          ADD INDEX idx_post_campaign (company_id, campaign_id);
        `);
      } catch {}

      // 2. Create job_queue table
      await db.query(`
        CREATE TABLE IF NOT EXISTS job_queue (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          job_type VARCHAR(64) NOT NULL,
          payload LONGTEXT NOT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
          attempts INT NOT NULL DEFAULT 0,
          max_attempts INT NOT NULL DEFAULT 3,
          locked_at TIMESTAMP NULL DEFAULT NULL,
          locked_by VARCHAR(128) DEFAULT NULL,
          idempotency_key VARCHAR(128) DEFAULT NULL,
          result LONGTEXT DEFAULT NULL,
          error_message TEXT DEFAULT NULL,
          scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_jq_status_sched (status, scheduled_for),
          INDEX idx_jq_company (company_id),
          INDEX idx_jq_idempotency (idempotency_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    },
  },
  { name: '007_schema_index_alignment', up: alignSchemaIndexes },
  { name: '008_queue_action_ledger', up: createQueueActionLedger },
  { name: '009_internal_action_feed', up: createInternalActionFeed },
  { name: '010_notification_occurrences', up: createNotificationOccurrences },
  { name: '011_notification_dispatch_cursors', up: createNotificationDispatchCursors },
  { name: '012_scheduled_post_dispatch_cursors', up: createScheduledPostDispatchCursors },
  { name: '013_publishing_dispatch_claims', up: createPublishingDispatchClaims },
  { name: '014_publishing_review_audit', up: createPublishingReviewAudit },
  { name: '015_publishing_verification_audit', up: createPublishingVerificationAudit },
  { name: '016_publication_draft_intents', up: createPublicationDraftIntents },
  { name: '017_publication_workflow_audit', up: createPublicationWorkflowAudit },
  { name: '018_publication_schedule_history', up: addPublicationScheduleHistory },
  { name: '019_publication_policy_binding', up: addPublicationPolicyBinding },
  { name: '020_queue_pause_deferrals', up: addQueuePauseDeferrals },
  { name: '021_daily_work_report_indexes', up: addDailyWorkReportIndexes },
  { name: '022_publication_scoped_controls', up: createPublicationScopedControls },
  { name: '023_publication_admission_limits', up: createPublicationAdmissionLimits },
  { name:'024_message_dispatch_intents',up:createMessageDispatchIntents },
  {name:'025_message_delivery_receipts',up:createMessageDeliveryReceipts},
  {name:'026_company_profile_revision',up:addCompanyProfileRevision},
  {name:'027_dispatcher_journal',up:createDispatcherJournal},
  {name:'028_legacy_export_compatibility',up:repairLegacyExport},
  {name:'029_public_lead_intakes',up:createPublicLeadIntakes},
  privateKnowledgeSources,
  websiteSourceProvenance,
  knowledgeIngestionQueue,
  structuredKnowledgeFacts,
  agencySecurityFoundation,
];

// Frozen legacy definitions remain compatible;030+ identities come from immutable manifest data.
for(const migration of MIGRATIONS){Object.freeze(migration.up);Object.freeze(migration);}Object.freeze(MIGRATIONS);
declare const __MIGRATION_SOURCE_CHECKSUMS__: Readonly<Record<string, string>>;
export function computeMigrationChecksum(m: MigrationDefinition): string {
 return migrationIdentity(m,MIGRATIONS,typeof __MIGRATION_SOURCE_CHECKSUMS__==='undefined'?undefined:__MIGRATION_SOURCE_CHECKSUMS__);
}
export function validateRegisteredMigrations(registry:readonly MigrationDefinition[]=MIGRATIONS){validateMigrationRegistry(registry,m=>computeMigrationChecksum(m as MigrationDefinition));}

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
export async function runMigrations(dbPool: mysql.Pool,registry:readonly MigrationDefinition[]=MIGRATIONS): Promise<{
  appliedCount: number;
  totalMigrations: number;
  appliedNames: string[];
}> {
  validateRegisteredMigrations(registry);
  const conn = await dbPool.getConnection();
  let lockAcquired = false;

  try {
    await ensureMigrationInfrastructure(conn);

    lockAcquired = await acquireMigrationLock(conn, 15);
    if (!lockAcquired) {
      throw new Error('MIGRATION_LOCK_TIMEOUT: Could not acquire migration lock within 15 seconds. Another migration is running.');
    }

    const [rows]: any = await conn.query('SELECT migration_name, checksum, success FROM schema_migrations');
    const appliedMap=inspectMigrationLedger(rows,registry);

    const appliedNames: string[] = [];

    for (const migration of registry) {
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
        console.error(`[Database Migration] Migration failed: ${migration.name}`);
        const code=String(migErr?.code||migErr?.message||'').match(/^[A-Z][A-Z0-9_]*(?=:|$)/)?.[0]||'MIGRATION_STEP_UNCONFIRMED';
        throw new Error(`MIGRATION_FAILED: ${migration.name} (${code})`);
      }
    }

    return {
      appliedCount: appliedNames.length,
      totalMigrations: registry.length,
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
export async function verifySchema(dbPool: mysql.Pool,registry:readonly MigrationDefinition[]=MIGRATIONS): Promise<VerificationResult> {
  let observedEngine='Unknown';
  try {
    validateRegisteredMigrations(registry);
    const conn = await dbPool.getConnection();
    try {
      // 1. Check MySQL Engine & Connectivity
      const [versionRows]: any = await conn.query('SELECT VERSION() as version');
      const engineVersion = versionRows?.[0]?.version || 'MySQL/MariaDB';observedEngine=engineVersion;

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
          pendingMigrations: registry.length,
          requiredTables: 'FAIL',
          requiredIndexes: 'FAIL',
          schemaVersion: 0,
          status: 'MIGRATION_REQUIRED',
          error: 'schema_migrations table does not exist. Run "npm run db:migrate" to initialize.',
        };
      }

      // 3. Check applied migrations count and checksums
      const [appliedRows]: any = await conn.query('SELECT migration_name, checksum, success FROM schema_migrations');
      const appliedMap=inspectMigrationLedger(appliedRows,registry);
      const pendingCount = registry.filter((m) => !appliedMap.has(m.name)).length;

      // Verify checksum integrity
      let checksumMismatch: string | null = null;
      for (const m of registry) {
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
        SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX, NON_UNIQUE, SUB_PART
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

      const hasColumnMetadata = existingIndexes.some((row: any) => 'COLUMN_NAME' in row);
      const missingIndexes: string[] = [];
      for (const [tbl, expectedIdxs] of Object.entries(CANONICAL_EXPECTED_INDEXES)) {
        if (existingTableSet.has(tbl)) {
          const liveIdxs = existingIndexMap.get(tbl) || new Set();
          for (const expIdx of expectedIdxs) {
            const columns = INDEX_REQUIREMENTS[`${tbl}.${expIdx}`];
            const equivalent = columns && hasEquivalentIndex(existingIndexes, tbl, columns);
            if (columns && hasColumnMetadata ? !equivalent : !liveIdxs.has(expIdx) && !equivalent) {
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
            const columns = UNIQUE_REQUIREMENTS[`${tbl}.${expConst}`];
            const equivalent = columns && hasEquivalentIndex(existingIndexes, tbl, columns, true);
            if (columns && hasColumnMetadata ? !equivalent : !liveConsts.has(expConst) && !equivalent) {
              missingConstraints.push(`${tbl}.${expConst}`);
            }
          }
        }
      }

      const [workflowColumns]:any=await conn.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'content_posts' AND COLUMN_NAME = 'workflow_revision'");
      const missingColumns=workflowColumns.length?[]:['content_posts.workflow_revision'];
      const [queueColumns]:any=await conn.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'job_queue' AND COLUMN_NAME = 'deferrals'");
      if(!queueColumns.length)missingColumns.push('job_queue.deferrals');
      const [historyColumns]:any=await conn.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'publication_workflow_audit'");
      const historyNames=new Set(historyColumns.map((row:any)=>row.COLUMN_NAME));
      for(const name of ['change_kind','schedule_before','schedule_after','audit_sequence','policy_version'])if(!historyNames.has(name))missingColumns.push(`publication_workflow_audit.${name}`);

      const [controlColumns]:any=await conn.query("SELECT TABLE_NAME,COLUMN_NAME,DATA_TYPE,CHARACTER_MAXIMUM_LENGTH,COLUMN_TYPE,IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('knowledge_sources','publication_execution_controls','publication_control_audit','publication_admission_reservations','message_dispatch_intents','message_delivery_receipts','company_profiles_data','dispatcher_state','dispatcher_ticks','autonomous_actions','reviews','public_lead_intakes','knowledge_facts')");
      for(const [table,names] of Object.entries({knowledge_facts:['id','company_id','fact_key','value_text','origin','source_id','source_revision','chunk_index','page_number','excerpt_start','excerpt_end','status','revision','created_at','updated_at'],knowledge_sources:['extraction_job_id','extraction_attempt','source_url','fetched_at_ms','id','company_id','filename','media_type','byte_size','content_sha','content_bytes','extraction_state','extraction_code','extracted_text','chunks_json','revision','claimed_at','approved_by','approved_at','created_at','updated_at'],public_lead_intakes:['company_id','request_key','input_hash','lead_id','notification_state','created_at','updated_at'],autonomous_actions:['recommendation_id','payload','source_evidence','approval_status','execution_state','provider_response','verification_state','error','executed_at'],reviews:['reply_status','external_review_id','retrieved_at','provenance_status'],dispatcher_state:['cursor_key','next_group','updated_at'],dispatcher_ticks:['slot_key','owner_token','first_group','status','stage_states','started_at','finished_at'],company_profiles_data:['company_id','data_payload','revision'],message_delivery_receipts:['company_id','event_key','phone_number_id','provider_id','status','occurred_at_ms','error_code','received_at'],message_dispatch_intents:['company_id','request_key','input_hash','actor_id','status','claim_token','provider_id','sender_id','created_at','updated_at'],publication_admission_reservations:['company_id','quota_day','post_id','claim_token','recorded_at'],publication_execution_controls:['company_id','paused','paused_channels','revision','updated_by','updated_at','daily_post_limit'],publication_control_audit:['id','company_id','revision','actor_id','before_state','after_state','recorded_at']})){
        for(const name of names)if(!controlColumns.some((row:any)=>row.TABLE_NAME===table&&row.COLUMN_NAME===name))missingColumns.push(`${table}.${name}`);
      }
      const [factConflicts]:any=await conn.query(FACTS_CONFLICT_SQL);if(factConflicts.length)missingConstraints.push('knowledge_facts.shape');
      const [agencyColumns]:any=await conn.query("SELECT TABLE_NAME,COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('agencies','agency_memberships','agency_clients','client_assignments','client_operations','client_locations','auth_revocations','security_limits')");
      for(const [table,names]of Object.entries(AGENCY_TABLE_COLUMNS))for(const name of names)if(!agencyColumns.some((r:any)=>r.TABLE_NAME===table&&r.COLUMN_NAME===name))missingColumns.push(`${table}.${name}`);
      for(const step of AGENCY_COMPATIBILITY_CHECKS){const [bad]:any=await conn.query(step.sql);if(bad.length)missingConstraints.push('agency_security.shape');}
      const websiteUrlShape=controlColumns.find((row:any)=>row.TABLE_NAME==='knowledge_sources'&&row.COLUMN_NAME==='source_url');
      const websiteTimeShape=controlColumns.find((row:any)=>row.TABLE_NAME==='knowledge_sources'&&row.COLUMN_NAME==='fetched_at_ms');
      if(!websiteUrlShape||websiteUrlShape.DATA_TYPE!=='varchar'||Number(websiteUrlShape.CHARACTER_MAXIMUM_LENGTH)<2048||!websiteTimeShape||websiteTimeShape.DATA_TYPE!=='bigint'||!String(websiteTimeShape.COLUMN_TYPE).includes('unsigned'))missingConstraints.push('knowledge_sources.website_provenance_shape');
      const jobReferenceShape=controlColumns.find((row:any)=>row.TABLE_NAME==='knowledge_sources'&&row.COLUMN_NAME==='extraction_job_id');
      const jobAttemptShape=controlColumns.find((row:any)=>row.TABLE_NAME==='knowledge_sources'&&row.COLUMN_NAME==='extraction_attempt');
      if(!jobReferenceShape||jobReferenceShape.DATA_TYPE!=='varchar'||Number(jobReferenceShape.CHARACTER_MAXIMUM_LENGTH)<64||jobReferenceShape.IS_NULLABLE!=='YES'||!jobAttemptShape||jobAttemptShape.DATA_TYPE!=='int'||!String(jobAttemptShape.COLUMN_TYPE).includes('unsigned')||jobAttemptShape.IS_NULLABLE!=='YES')missingConstraints.push('knowledge_sources.ingestion_reference_shape');
      const [legacyActionColumns]:any=await conn.query("SELECT COLUMN_NAME,IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='autonomous_actions' AND COLUMN_NAME IN ('type','title','description')");
      if(legacyActionColumns.some((row:any)=>row.IS_NULLABLE==='NO'))missingConstraints.push('autonomous_actions.legacy_display_fields_optional');
      const isTablesPass = missingTables.length === 0;
      const isIndexesPass = missingIndexes.length === 0;
      const isConstraintsPass = missingConstraints.length === 0;
      const isSchemaPass = isTablesPass && isIndexesPass && isConstraintsPass && missingColumns.length===0;
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
        missingColumns:missingColumns.length?missingColumns:undefined,
        missingTables: missingTables.length > 0 ? missingTables : undefined,
        missingIndexes: missingIndexes.length > 0 ? missingIndexes : undefined,
        missingConstraints: missingConstraints.length > 0 ? missingConstraints : undefined,
      };
    } finally {
      conn.release();
    }
  } catch (err: any) {
    return {
      connection: err instanceof MigrationLedgerError?'PASS':'FAIL',
      engine: observedEngine,
      migrationTable: err instanceof MigrationLedgerError?'PASS':'FAIL',
      appliedMigrations: 0,
      pendingMigrations: registry.length,
      requiredTables: 'FAIL',
      requiredIndexes: 'FAIL',
      schemaVersion: 0,
      status: err instanceof MigrationLedgerError?'DATABASE_SCHEMA_OUTDATED':'UNAVAILABLE',
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
