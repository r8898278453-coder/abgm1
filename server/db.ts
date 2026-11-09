import {updateInternalCampaignSql} from './internalCampaignStore';
import {isIntegrationSecret} from '../shared/integrationCredentials';
import {consumePasswordResetSql} from './passwordResetStore';
import {ObservationError,normalizeRanks,normalizeCompetitor,observationLimit,saveRanksSql,saveCompetitorSql,readRanksSql,readCompetitorsSql,rankTrendSql} from './observationStore';
import {insertLeadRow} from './leadWriter';
import {readDomainsSql,readDomainSql,readWebsiteConfigSql,saveWebsiteConfigSql,createDomainSql,saveDomainDnsSql,deleteDomainSql} from './websiteStore';
import type {DomainDnsSnapshot} from '../shared/website';
import {normalizeWebsiteDomain,WebsiteError,websiteConfigPatch} from '../shared/website';
import {readCompanyProfile,writeCompanyProfile} from './companyProfileStore';
import {WorkspaceConflict} from '../shared/workspaceRevision';
import {isGlobalEmergencyStopActive} from './executionStop';
import type {LeadStage} from '../shared/leadStages';
import {updateLeadStageSql} from './leadStageSql';
import {deleteContentPostSql} from './contentMutationSql';
import {saveReviewReplySql,deleteReviewSql} from './reviewMutationSql';
import {deferSqlJob,PAUSE_REASONS,type PauseReason} from './queueSql';
import {publicationPolicy,publicationNeedsApproval} from './publicationPolicy';
import {normalizeContentPost,insertContentPost} from './contentPostWriter';
import {publishingSourceVersion} from './publishingSource';
import { claimSqlPublishing, ownsSqlPublishing, settleSqlPublishing, type PublishingClaim } from './publishingClaims';
import { findUnconfirmedPublishingEvidence, type UnconfirmedPublishingEvidence } from './publishingEvidence';
import { enqueueSqlJob } from './queueEnqueue';
import { claimSqlJob, cancelSqlJob, completeSqlJob, failSqlJob, renewSqlJobLease, ownsJobLease, type QueueLease } from './queueSql';
import mysql from 'mysql2/promise';
import crypto from 'crypto';

export interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  full_name: string;
  role: 'platform_admin' | 'owner' | 'manager' | 'agency';
  is_platform_admin: boolean;
  created_at?: string;
}

export interface DbCompany {
  id: string;
  user_id: string;
  name: string;
  legal_name?: string;
  category: string;
  city: string;
  phone?: string;
  website?: string;
  google_place_id?: string;
  autopilot_enabled: boolean;
  score?: number | null;
  rank_position?: number | null;
  public_form_token?: string | null;
  created_at?: string;
}

export interface DbLead {
  id: string;
  company_id?: string;
  name: string;
  company?: string;
  phone: string;
  email?: string;
  service: string;
  budget?: string;
  stage:LeadStage;
  intent_score: number;
  source: string;
  notes?: string;
  ai_suggested_reply?: string;
  created_at?: string;
}

export interface DbCompanyData {
  company_id: string;
  growth_score: any;
  audit_items: any[];
  reviews: any[];
  keywords: any[];
  competitors: any[];
  posts: any[];
  campaigns: any[];
  autonomous_actions: any[];
  updated_at?: string;
}

export type UniversalProviderStatus =
  | 'NOT_CONFIGURED'
  | 'CONFIGURED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'VERIFIED'
  | 'STALE'
  | 'NOT_FOUND'
  | 'FAILED'
  | 'UNAVAILABLE';

export function normalizeProviderStatus(
  status?: string | null,
  hasCredentials = false,
  _lastTested?: string | null,
  error?: string | null
): UniversalProviderStatus {
  if (!hasCredentials) return 'NOT_CONFIGURED';
  if (error) return 'FAILED';
  const clean = (status || '').toUpperCase().trim();
  if (clean === 'CONNECTED' || clean === 'ACTIVE') return 'CONNECTED';
  if (clean === 'VERIFIED') return 'VERIFIED';
  if (clean === 'CONNECTING' || clean === 'TESTING') return 'CONNECTING';
  if (clean === 'STALE') return 'STALE';
  if (clean === 'NOT_FOUND') return 'NOT_FOUND';
  if (clean === 'FAILED' || clean === 'ERROR') return 'FAILED';
  if (clean === 'UNAVAILABLE') return 'UNAVAILABLE';
  if (clean === 'CONFIGURED' || clean === 'SAVED') return 'CONFIGURED';
  return hasCredentials ? 'CONFIGURED' : 'NOT_CONFIGURED';
}

export interface DbReview {
  id: string;
  company_id: string;
  author: string;
  rating: number | null;
  date: string | null;
  relative_time?: string | null;
  content: string;
  sentiment?: 'positive' | 'neutral' | 'negative' | null;
  topic?: string | null;
  is_operational_issue?: boolean;
  replied: boolean;
  reply_text?: string | null;
  reply_date?: string | null;
  reply_status?: 'LOCAL_ONLY' | 'GOOGLE_PUBLISHED' | 'GOOGLE_VERIFIED' | 'FAILED' | null;
  external_review_id?: string | null;
  retrieved_at?: string | null;
  source: 'google' | 'facebook' | 'justdial' | 'manual' | 'google_verified' | 'facebook_verified' | 'other_provider_verified' | 'user_entered' | 'unknown' | string;
  provenance_status?: 'USER_ENTERED' | 'GOOGLE_VERIFIED' | 'FACEBOOK_VERIFIED' | 'OTHER_PROVIDER_VERIFIED' | 'UNKNOWN';
  created_at?: string;
}

export interface DbContentPost {
  workflow_revision?:string|number;
  id: string;
  company_id: string;
  campaign_id?: string | null;
  title?: string;
  type?: string;
  platforms?: string[];
  channel?: string;
  headline?: string;
  caption: string;
  cta?: string;
  image_url?: string;
  video_url?: string;
  status: 'draft' | 'pending_approval' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'unknown';
  scheduled_date?: string;
  scheduled_time?: string;
  time_slot?: string;
  hashtags?: string[];
  reel_script?: any[];
  created_at?: string;
}

export type IntegrationStatus = 'not_configured' | 'saved' | 'testing' | 'verified' | 'connected' | 'disconnected' | 'error';

export interface DbIntegration {
  id: string;
  company_id: string;
  provider: string;
  status: IntegrationStatus;
  credentials?: Record<string, any>;
  config?: Record<string, any>;
  last_tested_at?: string | null;
  last_error?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbGoogleProfileCache {
  company_id: string;
  place_id: string;
  data: any;
  cached_at: string;
}

export interface DbPasswordResetToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface DbCompanyAsset {
  id: string;
  company_id: string;
  asset_type: 'logo' | 'photo';
  url: string;
  label?: string | null;
  created_at?: string;
}

export interface DbThemeHistory {
  id: string;
  company_id: string;
  template_id: string;
  palette_id: string;
  used_at: string;
}

export interface DbInvoice {
  id: string;
  company_id: string;
  lead_id?: string;
  deal_id?: string;
  date: string;
  plan: string;
  amount: number;
  gst_amount: number;
  total_amount: number;
  payment_method: string;
  payment_id?: string;
  order_id?: string;
  payment_link_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  status: 'Paid' | 'Pending' | 'Failed' | 'Refunded';
  hsn_code?: string;
  pdf_url?: string;
  created_at?: string;
}

export interface DbSubscription {
  id: string;
  company_id: string;
  plan_id: string;
  plan_name: string;
  status: 'trial' | 'active' | 'past_due' | 'payment_failed' | 'cancelled' | 'expired' | 'trialing';
  amount: number;
  billing_cycle: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  razorpay_subscription_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbCustomDomain {
  id: string;
  company_id: string;
  domain: string;
  status: 'active' | 'dns_verified' | 'pending_verification' | 'failed';
  ssl_status: 'active' | 'unverified' | 'provisioning' | 'expired';
  cname_target: string;
  a_record_target: string;
  dns_txt_record: string;
  verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbWebsiteConfig {
  id: string;
  company_id: string;
  subdomain: string;
  primary_color: string;
  secondary_color: string;
  tagline?: string;
  hero_title?: string;
  hero_subtitle?: string;
  meta_description?: string;
  keywords?: string;
  google_analytics_id?: string;
  custom_header_html?: string;
  enable_whatsapp_cta: boolean;
  enable_direct_call_cta: boolean;
  enable_inquiry_form: boolean;
  pages_json?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbRankObservation {
  id: string;
  company_id: string;
  keyword: string;
  latitude: number;
  longitude: number;
  grid_index: number;
  grid_label?: string;
  timestamp: string;
  provider: string;
  position: number | null;
  status: 'LIVE' | 'VERIFIED' | 'UNAVAILABLE' | 'FAILED';
  source_evidence?: string;
  top_competitors_json?: string;
}

export interface DbCompetitorObservation {
  id: string;
  company_id: string;
  competitor_id: string;
  name: string;
  place_id?: string | null;
  address?: string | null;
  rating: number | null;
  reviews_count: number | null;
  photos_count: number | null;
  posts_per_week: number | null;
  rank_position: number | null;
  provider: string;
  timestamp: string;
  status: 'LIVE' | 'VERIFIED' | 'USER_ENTERED' | 'UNAVAILABLE' | 'ESTIMATED';
  raw_payload?: string | null;
}

export interface DbPublishingRecord {
  id: string;
  post_id: string;
  company_id: string;
  platform: string;
  status: 'PUBLISHED' | 'FAILED' | 'UNKNOWN' | 'RETRYING';
  provider_post_id?: string | null;
  attempt_count: number;
  max_attempts: number;
  error_type?: 'PERMANENT' | 'RETRYABLE' | 'TIMEOUT_UNKNOWN' | null;
  error_message?: string | null;
  idempotency_key: string;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbInternalCampaign {
  id: string;
  company_id: string;
  name: string;
  objective: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  start_date: string;
  end_date: string;
  planned_budget: number;
  channels: string[];
  external_campaign_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbExternalAdCampaign {
  id: string;
  company_id: string;
  internal_campaign_id?: string | null;
  provider: string; // 'meta_ads' | 'google_ads'
  external_campaign_id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'UNKNOWN' | 'NOT_CONFIGURED';
  fetched_at: string | null;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  conversions: number | null;
  conversion_tracking_status: 'ACTIVE' | 'UNAVAILABLE';
  revenue: number | null;
  revenue_attribution_status: 'VERIFIED' | 'UNAVAILABLE';
  roas: number | null;
  raw_metrics_json?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbAutonomousRecommendation {
  id: string;
  company_id: string;
  observation: string;
  evidence_ids: string[];
  source: string;
  timestamp: string;
  recommended_action: string;
  action_type: string;
  action_payload?: any;
  affected_metric: string;
  confidence: number;
  risk: 'low' | 'medium' | 'high';
  approval_requirement: 'auto' | 'required';
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'dismissed';
  created_at?: string;
}

export interface DbAutonomousAction {
  id: string;
  company_id: string;
  recommendation_id?: string | null;
  action_type: string;
  payload?: any;
  source_evidence?: any;
  approval_status: 'pending_approval' | 'approved' | 'rejected' | 'auto_approved';
  execution_state: 'idle' | 'queued' | 'executing' | 'executed' | 'failed' | 'blocked';
  provider_response?: any;
  verification_state: 'unverified' | 'verified' | 'failed' | 'unavailable';
  error?: string | null;
  executed_at?: string | null;
  created_at?: string;
}

export interface DbAutonomousAuditLog {
  id: string;
  company_id: string;
  action_id?: string | null;
  actor: string;
  event_type: string;
  details?: any;
  timestamp?: string;
}

export type JobQueueStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'RETRY_WAIT' | 'FAILED' | 'CANCELLED';

export interface DbJobQueue {
  deferrals?:number;
  id: string;
  company_id: string;
  job_type: 'publishing' | 'ai_summary' | 'seo_scan' | 'competitor_scan' | 'lead_nurture' | 'report' | 'media_render' | string;
  payload: Record<string, any>;
  status: JobQueueStatus;
  attempts: number;
  max_attempts: number;
  locked_at?: string | null;
  locked_by?: string | null;
  idempotency_key?: string | null;
  result?: Record<string, any> | null;
  error_message?: string | null;
  scheduled_for: string;
  created_at?: string;
  updated_at?: string;
  requested_by?: string;
}

let pool: mysql.Pool | null = null;
let isMySqlAvailable = false;
let poolInitPromise: Promise<mysql.Pool | null> | null = null;
let lastFailureTime = 0;
let hasLoggedFailure = false;
const RETRY_COOLDOWN_MS = 60000;
const inMemoryCompanyAssets: DbCompanyAsset[] = [];
const inMemoryThemeHistory: DbThemeHistory[] = [];
const inMemoryRankObservations: DbRankObservation[] = [];
const inMemoryCompetitorObservations: DbCompetitorObservation[] = [];
const inMemoryPublishingRecords: DbPublishingRecord[] = [];
const inMemoryAutonomousRecommendations: DbAutonomousRecommendation[] = [];
const inMemoryAutonomousActions: DbAutonomousAction[] = [];
const inMemoryAutonomousAuditLogs: DbAutonomousAuditLog[] = [];
const inMemoryInternalCampaigns: DbInternalCampaign[] = [];
const inMemoryExternalAdCampaigns: DbExternalAdCampaign[] = [];
const inMemoryCustomDomains: DbCustomDomain[] = [];
const inMemoryWebsiteConfigs: DbWebsiteConfig[] = [];
const inMemoryInvoices: DbInvoice[] = [];
const inMemorySubscriptions: DbSubscription[] = [];
const inMemoryJobQueue: DbJobQueue[] = [];

export function isProductionDatabaseMode(): boolean {
  return process.env.NODE_ENV === 'production' || (process.env.IS_PRODUCTION === 'true' && process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test');
}

export function assertNotProductionFallback(operation: string): void {
  if (isProductionDatabaseMode()) {
    const prodErr: any = new Error(`DATABASE_UNAVAILABLE: Database is unreachable in production mode for operation: ${operation}. In-memory fallback is strictly disabled.`);
    prodErr.code = 'DATABASE_UNAVAILABLE';
    prodErr.status = 503;
    throw prodErr;
  }
}

export function handleDbError(context: string, err: any): never | void {
  const isProd = isProductionDatabaseMode();
  if (isProd) {
    const errMsg = String(err?.message || '');
    const isConnErr =
      err?.code === 'ECONNREFUSED' ||
      err?.code === 'ETIMEDOUT' ||
      err?.code === 'ENOTFOUND' ||
      err?.code === 'PROTOCOL_CONNECTION_LOST' ||
      err?.code === 'DATABASE_UNAVAILABLE' ||
      errMsg.includes('ECONNREFUSED') ||
      errMsg.includes('DATABASE_UNAVAILABLE') ||
      errMsg.includes('connect ECONNREFUSED');

    if (isConnErr) {
      isMySqlAvailable = false;
      if (pool) {
        pool.end().catch(() => {});
        pool = null;
      }
      lastFailureTime = Date.now();
      const prodErr: any = new Error(`DATABASE_UNAVAILABLE: Connection to database failed in production mode (${err?.message || context})`);
      prodErr.code = 'DATABASE_UNAVAILABLE';
      prodErr.status = 503;
      throw prodErr;
    }

    const prodErr: any = new Error(`DATABASE_OPERATION_FAILED: ${context} failed (${err?.message || 'Database operation error'})`);
    prodErr.code = err?.code || 'DATABASE_OPERATION_FAILED';
    prodErr.status = 500;
    throw prodErr;
  }

  if (isMySqlAvailable) {
    console.warn(`[${context}] MySQL error:`, err?.message);
  }
}

export function getDbStatus(): { connected: boolean; provider: 'mysql' | 'in-memory'; configured: boolean } {
  return {
    connected: isMySqlAvailable,
    provider: isMySqlAvailable ? 'mysql' : 'in-memory',
    configured: Boolean(process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER),
  };
}

// OWASP standard PBKDF2 iteration count for HMAC-SHA512 (minimum 210,000 iterations)
export const PBKDF2_ITERATIONS = 210000;
const LEGACY_PBKDF2_ITERATIONS = 1000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';

// Authenticated Encryption at Rest for Provider Credentials (AES-256-GCM with key-rotation versioning)
function getCredentialEncryptionSecret(): string {
  const secret = process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    if (isProductionDatabaseMode()) {
      throw new Error('FATAL_SECURITY_ERROR: CREDENTIAL_ENCRYPTION_KEY or AUTH_SECRET is strictly mandatory in production mode.');
    }
    return 'localpulse_default_sec_enc_key_32b_aes256gcm';
  }
  return secret;
}

const CRED_ENC_KEY = crypto.createHash('sha256').update(getCredentialEncryptionSecret()).digest();

export function encryptCredential(plainText: string): string {
  if (!plainText || typeof plainText !== 'string') return '';
  if (plainText.startsWith('enc:v1:')) return plainText; // already encrypted
  const iv = crypto.randomBytes(12); // 12-byte IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', CRED_ENC_KEY, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `enc:v1:${iv.toString('hex')}:${tag}:${encrypted}`;
}

export function decryptCredential(cipherText: string): string {
  if (!cipherText || typeof cipherText !== 'string') return '';
  if (!cipherText.startsWith('enc:v1:')) return cipherText; // unencrypted legacy plaintext
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 5) return cipherText;
    const [, , ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', CRED_ENC_KEY, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.warn('[decryptCredential] Decryption failed:', err);
    return '';
  }
}

export function encryptCredentialsObject(creds: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(creds)) {
    const lower = k.toLowerCase();
    const isSensitive=isIntegrationSecret(k);
    if (isSensitive && typeof v === 'string' && v.trim() && !v.includes('••••')) {
      result[k] = encryptCredential(v.trim());
    } else {
      result[k] = v;
    }
  }
  return result;
}

export function decryptCredentialsObject(creds: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(creds)) {
    if (typeof v === 'string' && v.startsWith('enc:v1:')) {
      result[k] = decryptCredential(v);
    } else {
      result[k] = v;
    }
  }
  return result;
}

function safeTimingCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// Password security helpers using native Node crypto with OWASP-hardened parameters
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  if (!password || !hash || !salt) return false;

  // Primary verification using OWASP 210,000 iterations
  const primaryHash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
  if (safeTimingCompare(primaryHash, hash)) {
    return true;
  }

  // Graceful backward-compatibility check for any pre-existing legacy hashes
  const legacyHash = crypto.pbkdf2Sync(password, salt, LEGACY_PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
  if (safeTimingCompare(legacyHash, hash)) {
    return true;
  }

  return false;
}

export async function upgradeUserPassword(userId:string,password:string):Promise<void>{
 const db=await getDbPool();
 const user=db?await findUserById(userId):inMemoryUsers.find(row=>row.id===userId);
 if(!user||!verifyPassword(password,user.password_hash,user.salt))return;
 const primary=crypto.pbkdf2Sync(password,user.salt,PBKDF2_ITERATIONS,PBKDF2_KEYLEN,PBKDF2_DIGEST).toString('hex');
 if(safeTimingCompare(primary,user.password_hash))return;
 const previousHash=user.password_hash,previousSalt=user.salt,{hash,salt}=hashPassword(password);
 if(db){await db.query('UPDATE users SET password_hash=?,salt=? WHERE id=? AND password_hash=? AND salt=?',[hash,salt,userId,previousHash,previousSalt]);return;}
 assertNotProductionFallback('upgradeUserPassword');
 if(user.password_hash===previousHash&&user.salt===previousSalt){user.password_hash=hash;user.salt=salt;}
}

// In-Memory stores for development fallback (no hardcoded backdoor credentials)
function getInitialEnvAdmin(): DbUser[] {
  const envEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const envPass = process.env.INITIAL_ADMIN_PASSWORD?.trim();
  if (envEmail && envPass) {
    const { hash, salt } = hashPassword(envPass);
    return [{
      id: `usr_${crypto.randomUUID().replace(/-/g, '')}`,
      email: envEmail,
      password_hash: hash,
      salt,
      full_name: process.env.INITIAL_ADMIN_NAME?.trim() || 'System Administrator',
      role: 'platform_admin',
      is_platform_admin: true,
      created_at: new Date().toISOString(),
    }];
  }
  return [];
}

const inMemoryUsers: DbUser[] = getInitialEnvAdmin();

const inMemoryCompanies: DbCompany[] = [];
const inMemoryCompanyData: Record<string, DbCompanyData> = {};
const inMemoryLeads: DbLead[] = [];
const inMemoryPasswordResetTokens: DbPasswordResetToken[] = [];
const inMemoryReviews: DbReview[] = [];
const inMemoryContentPosts: DbContentPost[] = [];

/**
 * Returns the primary/default company ID from MySQL or in-memory fallback.
 * Ensures leads submitted via public channels are never orphaned.
 */
export async function getDefaultCompanyId(): Promise<string | null> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query('SELECT id FROM companies ORDER BY created_at ASC LIMIT 1');
      if (rows && rows.length > 0) return rows[0].id;
    }
  } catch (err: any) {
    handleDbError('getDefaultCompanyId', err);
  }
  assertNotProductionFallback('getDefaultCompanyId');
  return inMemoryCompanies[0]?.id || null;
}

export async function getDbPool(): Promise<mysql.Pool | null> {
  if (pool && isMySqlAvailable) return pool;

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  const port = Number(process.env.DB_PORT) || 3306;

  if (!host || !database || !user) {
    if (isProductionDatabaseMode()) {
      const prodErr: any = new Error('DATABASE_UNAVAILABLE: MySQL connection parameters (DB_HOST, DB_NAME, DB_USER) are missing in production mode.');
      prodErr.code = 'DATABASE_UNAVAILABLE';
      prodErr.status = 503;
      throw prodErr;
    }
    return null;
  }

  // If connection recently failed, do not hammer unreachable host on every query
  const now = Date.now();
  if (!isMySqlAvailable && lastFailureTime > 0 && now - lastFailureTime < RETRY_COOLDOWN_MS) {
    if (isProductionDatabaseMode()) {
      const prodErr: any = new Error('DATABASE_UNAVAILABLE: MySQL database is currently unreachable in production mode.');
      prodErr.code = 'DATABASE_UNAVAILABLE';
      prodErr.status = 503;
      throw prodErr;
    }
    return null;
  }

  // If a connection attempt is already in flight, await the same single promise
  if (poolInitPromise) {
    return poolInitPromise;
  }

  poolInitPromise = (async () => {
    let candidatePool: mysql.Pool | null = null;
    try {
      candidatePool = mysql.createPool({
        host,
        user,
        password: password || '',
        database,
        port,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 3000,
      });

      // Verify connection before assigning to global pool
      const connection = await candidatePool.getConnection();
      connection.release();

      pool = candidatePool;
      isMySqlAvailable = true;
      lastFailureTime = 0;
      hasLoggedFailure = false;
      console.log('[Database] Connected to the configured MySQL endpoint');

      return pool;
    } catch (err: any) {
      if (!hasLoggedFailure) {
        const code=/^[A-Z0-9_]+$/.test(err?.code||'')?err.code:'CONNECTION_UNAVAILABLE';
        console.warn(`[Database] Connection unavailable (${code}). ${isProductionDatabaseMode()?'Production requests remain blocked.':'Development memory mode only.'}`);
        hasLoggedFailure = true;
      }
      if (candidatePool) {
        candidatePool.end().catch(() => {});
      }
      pool = null;
      isMySqlAvailable = false;
      lastFailureTime = Date.now();
      if (isProductionDatabaseMode()) {
        const prodErr: any = new Error('DATABASE_UNAVAILABLE: Could not connect to configured database in production mode');
        prodErr.code = 'DATABASE_UNAVAILABLE';
        prodErr.status = 503;
        throw prodErr;
      }
      return null;
    } finally {
      poolInitPromise = null;
    }
  })();

  return poolInitPromise;
}

// Schema changes and administrator provisioning belong to explicit migration/setup commands.

// ---------------- USER AUTHENTICATION ---------------- //

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const cleanEmail = email.toLowerCase().trim();
  let connected=false;
  try {
    const db = await getDbPool();
    if (db) {
      connected=true;
      const [rows]: any = await db.query('SELECT * FROM users WHERE email = ? LIMIT 1', [cleanEmail]);
      if (rows && rows.length > 0) {
        const u = rows[0];
        return {
          ...u,
          is_platform_admin: Boolean(u.is_platform_admin),
        } as DbUser;
      }
      return null;
    }
  } catch (err: any) {
    if(connected)throw new Error('AUTH_STORAGE_UNAVAILABLE');
    handleDbError('findUserByEmail', err);
  }

  assertNotProductionFallback('findUserByEmail');
  const memUser = inMemoryUsers.find((u) => u.email.toLowerCase() === cleanEmail);
  return memUser ? { ...memUser, is_platform_admin: Boolean(memUser.is_platform_admin) } : null;
}

export async function findUserById(id: string): Promise<DbUser | null> {
  let connected=false;
  try {
    const db = await getDbPool();
    if (db) {
      connected=true;
      const [rows]: any = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
      if (rows && rows.length > 0) {
        const u = rows[0];
        return {
          ...u,
          is_platform_admin: Boolean(u.is_platform_admin),
        } as DbUser;
      }
      return null;
    }
  } catch (err: any) {
    if(connected)throw new Error('AUTH_STORAGE_UNAVAILABLE');
    handleDbError('findUserById', err);
  }

  assertNotProductionFallback('findUserById');
  const memUser = inMemoryUsers.find((u) => u.id === id);
  return memUser ? { ...memUser, is_platform_admin: Boolean(memUser.is_platform_admin) } : null;
}

export const getUserByEmail = findUserByEmail;
export const getUserById = findUserById;

export async function createUser(data: {
  email: string;
  password: string;
  full_name: string;
  role?: 'owner' | 'manager' | 'agency';
}): Promise<DbUser> {
  const { hash, salt } = hashPassword(data.password);
  const allowedRoles = ['owner', 'manager', 'agency'] as const;
  const safeRole: DbUser['role'] = (data.role && allowedRoles.includes(data.role as any)) ? data.role : 'owner';

  const newUser: DbUser = {
    id: `usr_${crypto.randomUUID().replace(/-/g, '')}`,
    email: data.email.toLowerCase().trim(),
    password_hash: hash,
    salt,
    full_name: data.full_name.trim(),
    role: safeRole,
    is_platform_admin: false, // Never settable via public registration
    created_at: new Date().toISOString(),
  };

  let connected=false;
  try {
    const db = await getDbPool();
    if (db) {
      connected=true;
      await db.query(
        'INSERT INTO users (id, email, password_hash, salt, full_name, role, is_platform_admin) VALUES (?, ?, ?, ?, ?, ?, 0)',
        [newUser.id, newUser.email, newUser.password_hash, newUser.salt, newUser.full_name, newUser.role]
      );
      return newUser;
    }
  } catch (err: any) {
    if(connected)throw new Error('AUTH_STORAGE_UNAVAILABLE');
    handleDbError('createUser', err);
  }

  assertNotProductionFallback('createUser');
  inMemoryUsers.push(newUser);
  return newUser;
}

export async function updateUserPassword(userId:string,password:string):Promise<boolean>{
 const {hash,salt}=hashPassword(password),db=await getDbPool();
 if(db){const [result]:any=await db.query('UPDATE users SET password_hash=?,salt=? WHERE id=?',[hash,salt,userId]);return result.affectedRows===1;}
 assertNotProductionFallback('updateUserPassword');const user=inMemoryUsers.find(row=>row.id===userId);if(!user)return false;user.password_hash=hash;user.salt=salt;return true;
}
export async function consumePasswordReset(tokenHash:string,password:string):Promise<{userId:string}|null>{
 if(!/^[a-f0-9]{64}$/.test(tokenHash)||typeof password!=='string'||password.length<8||password.length>100)throw new Error('RESET_INPUT_INVALID');
 const db=await getDbPool();if(db)return consumePasswordResetSql(db,tokenHash,()=>hashPassword(password));
 assertNotProductionFallback('consumePasswordReset');const matches=inMemoryPasswordResetTokens.filter(row=>row.token_hash===tokenHash);
 if(matches.length!==1)return null;const token=matches[0],user=inMemoryUsers.find(row=>row.id===token.user_id);
 if(!user||token.used_at||Date.parse(token.expires_at)<=Date.now())return null;
 const {hash,salt}=hashPassword(password);user.password_hash=hash;user.salt=salt;const now=new Date().toISOString();for(const row of inMemoryPasswordResetTokens)if(row.user_id===user.id&&!row.used_at)row.used_at=now;return {userId:user.id};
}

export async function createPasswordResetToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date
): Promise<string> {
  const id = `prt_${crypto.randomUUID().replace(/-/g, '')}`;
  const expiresAtIso = expiresAt.toISOString();
  const mysqlExpiresAt = expiresAtIso.slice(0, 19).replace('T', ' ');
  const nowIso = new Date().toISOString();

  let connected=false;
  try {
    const db = await getDbPool();
    if (db) {
      connected=true;
      await db.query(
        'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
        [id, userId, tokenHash, mysqlExpiresAt]
      );
      return id;
    }
  } catch (err: any) {
    if(connected)throw new Error('AUTH_STORAGE_UNAVAILABLE');
    handleDbError('createPasswordResetToken', err);
  }

  assertNotProductionFallback('createPasswordResetToken');
  inMemoryPasswordResetTokens.push({
    id,
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAtIso,
    used_at: null,
    created_at: nowIso,
  });

  return id;
}

export async function findPasswordResetToken(tokenHash: string): Promise<DbPasswordResetToken | null> {
  let connected=false;
  try {
    const db = await getDbPool();
    if (db) {
      connected=true;
      const [rows]: any = await db.query(
        "SELECT *,TIMESTAMPDIFF(SECOND,'1970-01-01',expires_at)*1000 expires_ms,TIMESTAMPDIFF(SECOND,'1970-01-01',used_at)*1000 used_ms,UNIX_TIMESTAMP(created_at)*1000 created_ms FROM password_reset_tokens WHERE token_hash = ? LIMIT 1",
        [tokenHash]
      );
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id,
          user_id: r.user_id,
          token_hash: r.token_hash,
          expires_at: new Date(Number(r.expires_ms)).toISOString(),
          used_at: r.used_ms==null?null:new Date(Number(r.used_ms)).toISOString(),
          created_at: new Date(Number(r.created_ms)).toISOString(),
        };
      }
      return null;
    }
  } catch (err: any) {
    if(connected)throw new Error('AUTH_STORAGE_UNAVAILABLE');
    handleDbError('findPasswordResetToken', err);
  }

  assertNotProductionFallback('findPasswordResetToken');
  const mem = inMemoryPasswordResetTokens.find((t) => t.token_hash === tokenHash);
  return mem ? { ...mem } : null;
}

export async function markPasswordResetTokenUsed(tokenId: string, userId: string): Promise<void> {
  const now = new Date();
  const mysqlNow = now.toISOString().slice(0, 19).replace('T', ' ');
  const nowIso = now.toISOString();

  let connected=false;
  try {
    const db = await getDbPool();
    if (db) {
      connected=true;
      await db.query(
        'UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP() WHERE user_id = ? AND (id = ? OR used_at IS NULL)',
        [userId, tokenId]
      );
      return;
    }
  } catch (err: any) {
    if(connected)throw new Error('AUTH_STORAGE_UNAVAILABLE');
    handleDbError('markPasswordResetTokenUsed', err);
  }

  assertNotProductionFallback('markPasswordResetTokenUsed');

  for (const t of inMemoryPasswordResetTokens) {
    if (t.user_id===userId&&(t.id===tokenId||!t.used_at)) {
      t.used_at = nowIso;
    }
  }
}

// ---------------- MULTI-COMPANY MANAGEMENT ---------------- //

export async function getAllCompanies(): Promise<DbCompany[]> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query('SELECT * FROM companies ORDER BY created_at ASC');
      return rows as DbCompany[];
    }
  } catch (err: any) {
    handleDbError('getAllCompanies', err);
  }

  assertNotProductionFallback('getAllCompanies');
  return inMemoryCompanies;
}

export async function getUserCompanies(userId: string): Promise<DbCompany[]> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query('SELECT * FROM companies WHERE user_id = ? ORDER BY created_at ASC', [userId]);
      return rows as DbCompany[];
    }
  } catch (err: any) {
    handleDbError('getUserCompanies', err);
  }

  assertNotProductionFallback('getUserCompanies');
  return inMemoryCompanies.filter((c) => c.user_id === userId);
}

export async function getCompanyById(companyId: string): Promise<DbCompany | null> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query('SELECT * FROM companies WHERE id = ? LIMIT 1', [companyId]);
      if (rows && rows.length > 0) return rows[0] as DbCompany;
      return null;
    }
  } catch (err: any) {
    handleDbError('getCompanyById', err);
  }

  assertNotProductionFallback('getCompanyById');
  return inMemoryCompanies.find((c) => c.id === companyId) || null;
}

export async function createCompany(data: {
  id?: string;
  user_id: string;
  name: string;
  legal_name?: string;
  category: string;
  city: string;
  phone?: string;
  website?: string;
  google_place_id?: string;
  autopilot_enabled?: boolean | number;
  score?: number | null;
  rank_position?: number | null;
  public_form_token?: string;
}): Promise<DbCompany> {
  const publicFormToken = data.public_form_token || `pft_${crypto.randomUUID().replace(/-/g, '')}`;
  const newCompany: DbCompany = {
    id: data.id || `comp_${crypto.randomUUID().replace(/-/g, '')}`,
    user_id: data.user_id,
    name: data.name.trim(),
    legal_name: data.legal_name?.trim() || data.name.trim(),
    category: data.category.trim(),
    city: data.city.trim(),
    phone: data.phone || '',
    website: data.website || '',
    google_place_id: data.google_place_id || '',
    autopilot_enabled: data.autopilot_enabled !== undefined ? Boolean(data.autopilot_enabled) : false,
    score: data.score !== undefined && data.score !== null ? data.score : null,
    rank_position: data.rank_position !== undefined ? data.rank_position : undefined,
    public_form_token: publicFormToken,
    created_at: new Date().toISOString(),
  };

  try {
    const db = await getDbPool();
    if (db) {
      await db.query(
        `INSERT INTO companies (id, user_id, name, legal_name, category, city, phone, website, google_place_id, autopilot_enabled, score, rank_position, public_form_token)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newCompany.id,
          newCompany.user_id,
          newCompany.name,
          newCompany.legal_name,
          newCompany.category,
          newCompany.city,
          newCompany.phone,
          newCompany.website,
          newCompany.google_place_id,
          newCompany.autopilot_enabled ? 1 : 0,
          newCompany.score,
          newCompany.rank_position !== undefined ? newCompany.rank_position : null,
          newCompany.public_form_token,
        ]
      );
      return newCompany;
    }
  } catch (err: any) {
    handleDbError('createCompany', err);
  }

  assertNotProductionFallback('createCompany');
  inMemoryCompanies.push(newCompany);
  return newCompany;
}

export async function findCompanyByPublicFormToken(token: string): Promise<DbCompany | null> {
  if (!token || typeof token !== 'string') return null;
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query('SELECT * FROM companies WHERE public_form_token = ? LIMIT 1', [token]);
      if (rows && rows.length > 0) return rows[0] as DbCompany;
      return null;
    }
  } catch (err: any) {
    handleDbError('findCompanyByPublicFormToken', err);
  }

  assertNotProductionFallback('findCompanyByPublicFormToken');
  return inMemoryCompanies.find((c) => c.public_form_token === token) || null;
}

const profileVersions=new WeakMap<object,{company:string;version:string}>();
const memoryProfileVersions:Record<string,string>={};
export function companyDataVersion(payload:any):string{return payload&&typeof payload==='object'?profileVersions.get(payload)?.version||'0':'0';}

export async function getCompanyDataPayload(companyId: string): Promise<DbCompanyData | null> {
  let connected=false;
  try {
    const db = await getDbPool();
    if (db) {
      connected=true;
      const snapshot=await readCompanyProfile(db,companyId);
      if(snapshot.data)profileVersions.set(snapshot.data,{company:companyId,version:snapshot.version});
      return snapshot.data;
    }
  } catch (err: any) {
    if(connected)throw new Error('Workspace snapshot storage unavailable');
    handleDbError('getCompanyDataPayload', err);
  }

  assertNotProductionFallback('getCompanyDataPayload');
  const stored=inMemoryCompanyData[companyId];const value=stored?JSON.parse(JSON.stringify(stored)):null;if(value)profileVersions.set(value,{company:companyId,version:memoryProfileVersions[companyId]||'0'});return value;
}

export async function saveCompanyDataPayload(companyId:string,payload:any,expectedVersion?:string):Promise<boolean>{
  const origin=payload&&profileVersions.get(payload);if(origin&&origin.company!==companyId)throw new Error('Workspace snapshot scope mismatch');
  let connected=false;
  try{
    const db=await getDbPool();
    if(db){connected=true;const expected=expectedVersion??(payload&&profileVersions.get(payload)?.version)??'0';const version=await writeCompanyProfile(db,companyId,payload,expected);profileVersions.set(payload,{company:companyId,version});return true;}
  }catch(error){if(error instanceof WorkspaceConflict)throw error;if(connected)throw new Error('Workspace save storage unavailable');handleDbError('saveCompanyDataPayload',error);}
  assertNotProductionFallback('saveCompanyDataPayload');
  const actual=memoryProfileVersions[companyId]||'0';const expected=expectedVersion??(payload&&profileVersions.get(payload)?.version)??actual;
  if(expected!==actual)throw new WorkspaceConflict();
  const version=String(BigInt(actual)+1n);memoryProfileVersions[companyId]=version;
  inMemoryCompanyData[companyId]=JSON.parse(JSON.stringify(payload));profileVersions.set(inMemoryCompanyData[companyId],{company:companyId,version});profileVersions.set(payload,{company:companyId,version});return true;
}

// ---------------- LEADS MANAGEMENT ---------------- //

export async function getAllLeads(companyId?: string): Promise<DbLead[]> {
  try {
    const db = await getDbPool();
    if (db) {
      if (companyId) {
        const [rows] = await db.query('SELECT * FROM leads WHERE company_id = ? ORDER BY created_at DESC', [companyId]);
        return rows as DbLead[];
      }
      const [rows] = await db.query('SELECT * FROM leads ORDER BY created_at DESC');
      return rows as DbLead[];
    }
  } catch (err: any) {
    handleDbError('getAllLeads', err);
  }

  assertNotProductionFallback('getAllLeads');
  if (companyId) {
    // Strict isolation: only return leads explicitly linked to this company
    return inMemoryLeads.filter((l) => l.company_id === companyId);
  }
  return inMemoryLeads;
}

export async function createLead(lead: Omit<DbLead, 'id'> & { id?: string }): Promise<DbLead> {
  const resolvedCompanyId = lead.company_id || undefined;

  let companyName = 'Our Team';
  if (resolvedCompanyId) {
    const comp = await getCompanyById(resolvedCompanyId);
    if (comp?.name) companyName = comp.name;
  }

  const newLead: DbLead = {
    id: lead.id || `lead_${crypto.randomUUID().replace(/-/g, '')}`,
    company_id: resolvedCompanyId,
    name: lead.name,
    company: lead.company || 'Direct Client',
    phone: lead.phone,
    email: lead.email || '',
    service: lead.service || 'General Inquiry',
    budget: lead.budget || 'Custom Quote',
    stage: lead.stage || 'new',
    intent_score: lead.intent_score !== undefined && lead.intent_score !== null ? lead.intent_score : null,
    source: lead.source || 'Website Lead Form',
    notes: lead.notes || '',
    ai_suggested_reply:
      lead.ai_suggested_reply ||
      `Hello ${lead.name}, thank you for contacting ${companyName}. We have received your inquiry regarding ${lead.service || 'our services'} and our team will get in touch with you shortly.`,
  };

  try {
    const db = await getDbPool();
    if (db) {
      await insertLeadRow(db,newLead);
      return newLead;
    }
  } catch (err: any) {
    handleDbError('createLead', err);
  }

  assertNotProductionFallback('createLead');
  inMemoryLeads.unshift(newLead);
  return newLead;
}

export async function getLeadById(id: string): Promise<DbLead | null> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query('SELECT * FROM leads WHERE id = ? LIMIT 1', [id]);
      if (rows && rows.length > 0) return rows[0] as DbLead;
      return null;
    }
  } catch (err: any) {
    handleDbError('getLeadById', err);
  }

  assertNotProductionFallback('getLeadById');
  return inMemoryLeads.find((l) => l.id === id) || null;
}

export async function updateLeadStatus(id: string, stage: DbLead['stage'],companyId?:string,expectedStage?:LeadStage): Promise<boolean> {
  try {
    const db = await getDbPool();
    if (db) {
      return await updateLeadStageSql(db,id,stage,companyId,expectedStage);
    }
  } catch (err: any) {
    handleDbError('updateLeadStatus', err);
  }

  assertNotProductionFallback('updateLeadStatus');
  const existing = inMemoryLeads.find((l) => l.id === id && (!companyId||l.company_id===companyId) && (!expectedStage||l.stage===expectedStage));
  if (existing) {
    existing.stage = stage;
    return true;
  }
  return false;
}

// ---------------- TELEGRAM DISPATCH ---------------- //

export async function sendTelegramPushAlert(message: string): Promise<boolean> {
  if(isGlobalEmergencyStopActive())return false;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch (err: any) {
    console.warn('[sendTelegramPushAlert] Failed to send Telegram alert:', err?.message);
    return false;
  }
}

// ---------------- INTEGRATIONS MANAGEMENT ---------------- //

const inMemoryIntegrations: DbIntegration[] = [];

export async function getCompanyIntegrations(companyId: string): Promise<DbIntegration[]> {
  let connected=false;
  try {
    const db = await getDbPool();
    if (db) {
      connected=true;
      const [rows]: any = await db.query(
        'SELECT id, company_id, provider, status, credentials, config, last_tested_at, last_error, created_at, updated_at FROM company_integrations WHERE company_id = ?',
        [companyId]
      );
      return rows.map((r: any) => {
        const parsedCreds = r.credentials ? (typeof r.credentials === 'string' ? JSON.parse(r.credentials) : r.credentials) : {};
        return {
          ...r,
          credentials: decryptCredentialsObject(parsedCreds),
          config: r.config ? (typeof r.config === 'string' ? JSON.parse(r.config) : r.config) : {},
        };
      });
    }
  } catch (err: any) {
    if(connected)throw new Error('INTEGRATION_STORAGE_UNAVAILABLE');
    handleDbError('getCompanyIntegrations', err);
  }

  assertNotProductionFallback('getCompanyIntegrations');
  return inMemoryIntegrations.filter((i) => i.company_id === companyId).map((i) => ({
    ...i,
    credentials: decryptCredentialsObject(i.credentials || {}),
  }));
}

export async function getCompanyIntegration(companyId: string, provider: string): Promise<DbIntegration | null> {
  let connected=false;
  try {
    const db = await getDbPool();
    if (db) {
      connected=true;
      const [rows]: any = await db.query(
        'SELECT id, company_id, provider, status, credentials, config, last_tested_at, last_error, created_at, updated_at FROM company_integrations WHERE company_id = ? AND provider = ? LIMIT 1',
        [companyId, provider]
      );
      if (rows && rows.length > 0) {
        const r = rows[0];
        const parsedCreds = r.credentials ? (typeof r.credentials === 'string' ? JSON.parse(r.credentials) : r.credentials) : {};
        return {
          ...r,
          credentials: decryptCredentialsObject(parsedCreds),
          config: r.config ? (typeof r.config === 'string' ? JSON.parse(r.config) : r.config) : {},
        };
      }
      return null;
    }
  } catch (err: any) {
    if(connected)throw new Error('INTEGRATION_STORAGE_UNAVAILABLE');
    handleDbError('getCompanyIntegration', err);
  }

  assertNotProductionFallback('getCompanyIntegration');
  const mem = inMemoryIntegrations.find((i) => i.company_id === companyId && i.provider === provider);
  return mem ? { ...mem, credentials: decryptCredentialsObject(mem.credentials || {}) } : null;
}

export async function getCompanyIntegrationsByProvider(provider: string, requireDurable = false): Promise<DbIntegration[]> {
  let connected=false;
  try {
    const db = await getDbPool();
    if (db) {
      connected=true;
      const [rows]: any = await db.query(
        'SELECT id, company_id, provider, status, credentials, config, last_tested_at, last_error, created_at, updated_at FROM company_integrations WHERE provider = ?',
        [provider]
      );
      if (rows && Array.isArray(rows)) {
        return rows.map((r: any) => {
          const parsedCreds = r.credentials ? (typeof r.credentials === 'string' ? JSON.parse(r.credentials) : r.credentials) : {};
          return {
            ...r,
            credentials: decryptCredentialsObject(parsedCreds),
            config: r.config ? (typeof r.config === 'string' ? JSON.parse(r.config) : r.config) : {},
          };
        });
      }
    }
  } catch (err: any) {
    if(connected)throw new Error('INTEGRATION_STORAGE_UNAVAILABLE');
    if (requireDurable) throw new Error('Integration storage unavailable');
    handleDbError('getCompanyIntegrationsByProvider', err);
  }

  if (requireDurable) throw new Error('Integration storage unavailable');
  assertNotProductionFallback('getCompanyIntegrationsByProvider');
  return inMemoryIntegrations.filter((i) => i.provider === provider).map((i) => ({
    ...i,
    credentials: decryptCredentialsObject(i.credentials || {}),
  }));
}

export async function saveCompanyIntegration(
  companyId: string,
  provider: string,
  data: {
    status: IntegrationStatus;
    credentials?: Record<string, any>;
    config?: Record<string, any>;
    last_tested_at?: string|null;
    last_error?: string | null;
  }
): Promise<DbIntegration> {
  const id = `int_${crypto.randomUUID().replace(/-/g, '')}`;
  const encryptedCreds = encryptCredentialsObject(data.credentials || {});
  const credsJson = JSON.stringify(encryptedCreds);
  const configJson = JSON.stringify(data.config || {});
  const now = new Date().toISOString();

  let connected=false;
  try {
    const db = await getDbPool();
    if (db) {
      connected=true;const connection=await db.getConnection();try{
      await connection.beginTransaction();const [owners]:any=await connection.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[companyId]);if(owners.length!==1)throw new Error('Integration workspace unavailable');
      await connection.query(
        `INSERT INTO company_integrations (id, company_id, provider, status, credentials, config, last_tested_at, last_error)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status = VALUES(status),
           credentials = VALUES(credentials),
           config = VALUES(config),
           last_tested_at = VALUES(last_tested_at),
           last_error = VALUES(last_error)`,
        [id, companyId, provider, data.status, credsJson, configJson, data.last_tested_at ?? null, data.last_error || null]
      );
      const [stored]:any=await connection.query('SELECT * FROM company_integrations WHERE company_id=? AND provider=?',[companyId,provider]);if(stored.length!==1)throw new Error('Integration save unconfirmed');
      const record=stored[0];const raw=typeof record.credentials==='string'?JSON.parse(record.credentials):record.credentials;const config=typeof record.config==='string'?JSON.parse(record.config):record.config;
      await connection.commit();return {...record,credentials:decryptCredentialsObject(raw||{}),config:config||{}};
      }catch(error){await connection.rollback();throw error;}finally{connection.release();}
    }
  } catch (err: any) {
    if(connected)throw new Error('INTEGRATION_STORAGE_UNAVAILABLE');
    handleDbError('saveCompanyIntegration', err);
  }

  assertNotProductionFallback('saveCompanyIntegration');
  const existingIdx = inMemoryIntegrations.findIndex((i) => i.company_id === companyId && i.provider === provider);
  const record: DbIntegration = {
    id: existingIdx >= 0 ? inMemoryIntegrations[existingIdx].id : id,
    company_id: companyId,
    provider,
    status: data.status,
    credentials: encryptedCreds,
    config: data.config || {},
    last_tested_at: data.last_tested_at ?? null,
    last_error: data.last_error || null,
    updated_at: now,
  };

  if (existingIdx >= 0) {
    inMemoryIntegrations[existingIdx] = record;
  } else {
    inMemoryIntegrations.push(record);
  }

  return {
    ...record,
    credentials: decryptCredentialsObject(record.credentials || {}),
  };
}

export async function deleteCompanyIntegration(companyId: string, provider: string): Promise<boolean> {
  let connected=false;
  try {
    const db = await getDbPool();
    if (db) {
      connected=true;
      const [result]:any=await db.query('DELETE FROM company_integrations WHERE company_id = ? AND provider = ?', [companyId, provider]);
      return result.affectedRows===1;
    }
  } catch (err: any) {
    if(connected)throw new Error('INTEGRATION_STORAGE_UNAVAILABLE');
    handleDbError('deleteCompanyIntegration', err);
  }

  assertNotProductionFallback('deleteCompanyIntegration');
  const idx = inMemoryIntegrations.findIndex((i) => i.company_id === companyId && i.provider === provider);
  if (idx >= 0) {
    inMemoryIntegrations.splice(idx, 1);
    return true;
  }
  return false;
}

// ---------------- GOOGLE PROFILE & PLACES DATA CACHE ---------------- //

const inMemoryGoogleProfileCache = new Map<
  string,
  { company_id: string; place_id: string; data: any; cached_at: string }
>();

export async function getGoogleProfileCache(companyId: string): Promise<DbGoogleProfileCache | null> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query(
        'SELECT company_id, place_id, data_payload, cached_at FROM google_profile_cache WHERE company_id = ? LIMIT 1',
        [companyId]
      );
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          company_id: r.company_id,
          place_id: r.place_id,
          data: typeof r.data_payload === 'string' ? JSON.parse(r.data_payload) : r.data_payload,
          cached_at: r.cached_at instanceof Date ? r.cached_at.toISOString() : String(r.cached_at),
        };
      }
      return null;
    }
  } catch (err: any) {
    handleDbError('getGoogleProfileCache', err);
  }
  assertNotProductionFallback('getGoogleProfileCache');
  return inMemoryGoogleProfileCache.get(companyId) || null;
}

export async function saveGoogleProfileCache(
  companyId: string,
  placeId: string,
  data: any
): Promise<boolean> {
  const jsonPayload = JSON.stringify(data);
  const now = new Date().toISOString();
  try {
    const db = await getDbPool();
    if (db) {
      await db.query(
        `INSERT INTO google_profile_cache (company_id, place_id, data_payload, cached_at)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           place_id = VALUES(place_id),
           data_payload = VALUES(data_payload),
           cached_at = NOW()`,
        [companyId, placeId, jsonPayload]
      );
      return true;
    }
  } catch (err: any) {
    handleDbError('saveGoogleProfileCache', err);
  }
  assertNotProductionFallback('saveGoogleProfileCache');
  inMemoryGoogleProfileCache.set(companyId, {
    company_id: companyId,
    place_id: placeId,
    data,
    cached_at: now,
  });
  return true;
}

// ---------------- REVIEWS MANAGEMENT (PER-TENANT MYSQL PERSISTENCE) ---------------- //

export async function getCompanyReviews(companyId?: string): Promise<DbReview[]> {
  if (!companyId) return [];
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query('SELECT * FROM reviews WHERE company_id = ? ORDER BY date DESC, created_at DESC', [companyId]);
      return rows.map((r: any) => ({
        ...r,
        rating: r.rating !== null && r.rating !== undefined ? Number(r.rating) : null,
        is_operational_issue: Boolean(r.is_operational_issue),
        replied: Boolean(r.replied),
      }));
    }
  } catch (err: any) {
    handleDbError('getCompanyReviews', err);
  }

  assertNotProductionFallback('getCompanyReviews');
  return inMemoryReviews.filter((r) => r.company_id === companyId);
}

export async function getReviewById(id: string): Promise<DbReview | null> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query('SELECT * FROM reviews WHERE id = ? LIMIT 1', [id]);
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          ...r,
          rating: r.rating !== null && r.rating !== undefined ? Number(r.rating) : null,
          is_operational_issue: Boolean(r.is_operational_issue),
          replied: Boolean(r.replied),
        };
      }
      return null;
    }
  } catch (err: any) {
    handleDbError('getReviewById', err);
  }

  assertNotProductionFallback('getReviewById');
  return inMemoryReviews.find((r) => r.id === id) || null;
}

export async function getReviewCompanyId(reviewId: string): Promise<string | null> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query('SELECT company_id FROM reviews WHERE id = ? LIMIT 1', [reviewId]);
      if (rows && rows.length > 0 && rows[0].company_id) {
        return rows[0].company_id;
      }
    }
  } catch (err: any) {
    handleDbError('getReviewCompanyId', err);
  }

  assertNotProductionFallback('getReviewCompanyId');
  const inMem = inMemoryReviews.find((r) => r.id === reviewId);
  return inMem ? inMem.company_id : null;
}

export async function createReview(review: Omit<DbReview, 'id'> & { id?: string }): Promise<DbReview> {
  const ratingNum = review.rating !== undefined && review.rating !== null ? Number(review.rating) : null;
  const newReview: DbReview = {
    id: review.id || `rev_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
    company_id: review.company_id,
    author: review.author,
    rating: ratingNum !== null && !isNaN(ratingNum) ? ratingNum : null,
    date: review.date !== undefined && review.date !== null ? review.date : null,
    relative_time: review.relative_time || null,
    content: review.content,
    sentiment: review.sentiment || (ratingNum !== null ? (ratingNum >= 4 ? 'positive' : ratingNum === 3 ? 'neutral' : 'negative') : null),
    topic: review.topic || 'General Feedback',
    is_operational_issue: Boolean(review.is_operational_issue),
    replied: Boolean(review.replied),
    reply_text: review.reply_text || undefined,
    reply_date: review.reply_date || undefined,
    source: review.source || 'manual',
    provenance_status: (review as any).provenance_status || (review.source === 'google' ? 'GOOGLE_VERIFIED' : review.source === 'facebook' ? 'FACEBOOK_VERIFIED' : 'USER_ENTERED'),
    created_at: new Date().toISOString(),
  };

  try {
    const db = await getDbPool();
    if (db) {
      await db.query(
        `INSERT INTO reviews (id, company_id, author, rating, date, relative_time, content, sentiment, topic, is_operational_issue, replied, reply_text, reply_date, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newReview.id,
          newReview.company_id || null,
          newReview.author,
          newReview.rating,
          newReview.date,
          newReview.relative_time || null,
          newReview.content,
          newReview.sentiment || null,
          newReview.topic || null,
          newReview.is_operational_issue ? 1 : 0,
          newReview.replied ? 1 : 0,
          newReview.reply_text || null,
          newReview.reply_date || null,
          newReview.source,
        ]
      );
      return newReview;
    }
  } catch (err: any) {
    handleDbError('createReview', err);
  }

  assertNotProductionFallback('createReview');
  inMemoryReviews.unshift(newReview);
  return newReview;
}

export async function updateReviewReply(
  reviewId: string,
  replyText: string,
  companyId?: string,
  replyStatus: 'LOCAL_ONLY' | 'GOOGLE_PUBLISHED' | 'GOOGLE_VERIFIED' | 'FAILED' = 'LOCAL_ONLY'
): Promise<boolean> {
  const replyDate = new Date().toISOString().split('T')[0];
  try {
    const db = await getDbPool();
    if (db) {
      return await saveReviewReplySql(db,reviewId,replyText,replyDate,replyStatus,companyId);
    }
  } catch (err: any) {
    handleDbError('updateReviewReply', err);
  }

  assertNotProductionFallback('updateReviewReply');
  const existing = inMemoryReviews.find((r) => r.id === reviewId && (!companyId || r.company_id === companyId));
  if (existing) {
    existing.replied = true;
    existing.reply_text = replyText;
    existing.reply_date = replyDate;
    existing.reply_status = replyStatus;
    return true;
  }
  return false;
}

export async function deleteReview(reviewId: string, companyId?: string): Promise<boolean> {
  try {
    const db = await getDbPool();
    if (db) {
      return await deleteReviewSql(db,reviewId,companyId);
    }
  } catch (err: any) {
    handleDbError('deleteReview', err);
  }

  assertNotProductionFallback('deleteReview');
  const idx = inMemoryReviews.findIndex((r) => r.id === reviewId && (!companyId || r.company_id === companyId));
  if (idx >= 0) {
    inMemoryReviews.splice(idx, 1);
    return true;
  }
  return false;
}

export async function syncGoogleReviewsToDatabase(companyId: string, googleReviews: any[]): Promise<number> {
  if (!Array.isArray(googleReviews) || googleReviews.length === 0) return 0;
  let insertedCount = 0;
  const retrievedAt = new Date().toISOString();

  for (const gr of googleReviews) {
    const author = gr.author_name || gr.author || 'Google User';
    const content = (gr.text || gr.content || '').trim();
    if (!content && typeof gr.rating !== 'number') continue;

    const rating = typeof gr.rating === 'number' ? gr.rating : null;
    const sentiment = typeof gr.rating === 'number' ? (gr.rating >= 4 ? 'positive' : gr.rating === 3 ? 'neutral' : 'negative') : null;
    const date = gr.time ? new Date(gr.time * 1000).toISOString().split('T')[0] : null;
    const relativeTime = gr.relative_time_description || null;
    const externalReviewId = gr.review_id || gr.name || (gr.time ? `gmb_${author}_${gr.time}` : null);

    try {
      const db = await getDbPool();
      if (db) {
        // Check for duplicates
        const [existing]: any = await db.query(
          'SELECT id FROM reviews WHERE company_id = ? AND author = ? AND (content = ? OR content LIKE ?) LIMIT 1',
          [companyId, author, content, `${content.slice(0, 50)}%`]
        );
        if (!existing || existing.length === 0) {
          const id = `rev_gmb_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
          await db.query(
            `INSERT INTO reviews (id, company_id, author, rating, date, relative_time, content, sentiment, topic, is_operational_issue, replied, source)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              companyId,
              author,
              rating,
              date,
              relativeTime,
              content,
              sentiment,
              'Google Review',
              rating !== null && rating <= 2 ? 1 : 0,
              0,
              'google',
            ]
          );
          insertedCount++;
        }
      }
    } catch (err: any) {
      console.warn('[syncGoogleReviewsToDatabase] error:', err?.message);
    }

    const memExisting = inMemoryReviews.find((r) => r.company_id === companyId && r.author === author && r.content === content);
    if (!memExisting) {
      inMemoryReviews.unshift({
        id: `rev_gmb_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`,
        company_id: companyId,
        author,
        rating,
        date,
        relative_time: relativeTime,
        content,
        sentiment,
        topic: 'Google Review',
        is_operational_issue: rating !== null && rating <= 2,
        replied: false,
        source: 'google',
        provenance_status: 'GOOGLE_VERIFIED',
        external_review_id: externalReviewId,
        retrieved_at: retrievedAt,
        reply_status: null,
      });
      insertedCount++;
    }
  }
  return insertedCount;
}

// ---------------- CONTENT POSTS MANAGEMENT (PER-TENANT MYSQL PERSISTENCE) ---------------- //

export async function getCompanyPosts(companyId?: string): Promise<DbContentPost[]> {
  if (!companyId) return [];
  try {
    const db = await getDbPool();
    if (db) {
      // Query content posts from database
      const [rows]: any = await db.query('SELECT * FROM content_posts WHERE company_id = ? ORDER BY created_at DESC', [companyId]);
      return rows.map((r: any) => {
        let platforms: string[] = ['google'];
        if (r.platforms) {
          try {
            platforms = typeof r.platforms === 'string' ? JSON.parse(r.platforms) : r.platforms;
          } catch {
            platforms = String(r.platforms).split(',').map((s: string) => s.trim());
          }
        }

        let hashtags: string[] = [];
        if (r.hashtags) {
          try {
            hashtags = typeof r.hashtags === 'string' ? JSON.parse(r.hashtags) : r.hashtags;
          } catch {
            hashtags = String(r.hashtags).split(',').map((s: string) => s.trim());
          }
        }

        let reel_script = undefined;
        if (r.reel_script) {
          try {
            reel_script = typeof r.reel_script === 'string' ? JSON.parse(r.reel_script) : r.reel_script;
          } catch {
            reel_script = undefined;
          }
        }

        return {
          ...r,
          platforms,
          hashtags,
          reel_script,
        };
      });
    }
  } catch (err: any) {
    handleDbError('getCompanyPosts', err);
  }

  assertNotProductionFallback('getCompanyPosts');
  return inMemoryContentPosts.filter((p) => p.company_id === companyId);
}

export const getContentPosts = getCompanyPosts;

export async function getPostById(id: string): Promise<DbContentPost | null> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query('SELECT * FROM content_posts WHERE id = ? LIMIT 1', [id]);
      if (rows && rows.length > 0) {
        const r = rows[0];
        let platforms = ['google'];
        if (r.platforms) {
          try {
            platforms = typeof r.platforms === 'string' ? JSON.parse(r.platforms) : r.platforms;
          } catch {
            platforms = String(r.platforms).split(',').map((s: string) => s.trim());
          }
        }
        let hashtags: string[] = [];
        if (r.hashtags) {
          try {
            hashtags = typeof r.hashtags === 'string' ? JSON.parse(r.hashtags) : r.hashtags;
          } catch {
            hashtags = String(r.hashtags).split(',').map((s: string) => s.trim());
          }
        }
        return { ...r, platforms, hashtags };
      }
      return null;
    }
  } catch (err: any) {
    handleDbError('getPostById', err);
  }

  assertNotProductionFallback('getPostById');
  return inMemoryContentPosts.find((p) => p.id === id) || null;
}

export async function getContentPostCompanyId(postId: string): Promise<string | null> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query('SELECT company_id FROM content_posts WHERE id = ? LIMIT 1', [postId]);
      if (rows && rows.length > 0 && rows[0].company_id) {
        return rows[0].company_id;
      }
    }
  } catch (err: any) {
    handleDbError('getContentPostCompanyId', err);
  }

  assertNotProductionFallback('getContentPostCompanyId');
  const inMem = inMemoryContentPosts.find((p) => p.id === postId);
  return inMem ? inMem.company_id : null;
}

export async function createContentPost(post: Omit<DbContentPost, 'id'> & { id?: string }): Promise<DbContentPost> {
  const newPost=normalizeContentPost(post);

  try {
    const db = await getDbPool();
    if (db) {
      await insertContentPost(db,newPost);
      return newPost;
    }
  } catch (err: any) {
    handleDbError('createContentPost', err);
  }

  assertNotProductionFallback('createContentPost');
  inMemoryContentPosts.unshift(newPost);
  return newPost;
}

export async function getCompanyPostsByCampaignId(companyId: string, campaignId: string): Promise<DbContentPost[]> {
  if (!companyId || !campaignId) return [];
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query(
        'SELECT * FROM content_posts WHERE company_id = ? AND campaign_id = ? ORDER BY created_at DESC',
        [companyId, campaignId]
      );
      if (rows && Array.isArray(rows)) {
        return rows.map((r: any) => {
          let platforms: string[] = ['google'];
          if (r.platforms) {
            try {
              platforms = typeof r.platforms === 'string' ? JSON.parse(r.platforms) : r.platforms;
            } catch {
              platforms = String(r.platforms).split(',').map((s: string) => s.trim());
            }
          }
          let hashtags: string[] = [];
          if (r.hashtags) {
            try {
              hashtags = typeof r.hashtags === 'string' ? JSON.parse(r.hashtags) : r.hashtags;
            } catch {
              hashtags = String(r.hashtags).split(',').map((s: string) => s.trim());
            }
          }
          return { ...r, platforms, hashtags };
        });
      }
      return [];
    }
  } catch (err: any) {
    handleDbError('getCompanyPostsByCampaignId', err);
  }

  assertNotProductionFallback('getCompanyPostsByCampaignId');
  return inMemoryContentPosts.filter((p) => p.company_id === companyId && p.campaign_id === campaignId);
}

export async function getAllScheduledPosts(): Promise<DbContentPost[]> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query("SELECT * FROM content_posts WHERE status = 'scheduled' ORDER BY created_at ASC");
      if (rows && Array.isArray(rows)) {
        return rows.map((r: any) => {
          let platforms: string[] = ['google'];
          if (r.platforms) {
            try {
              platforms = typeof r.platforms === 'string' ? JSON.parse(r.platforms) : r.platforms;
            } catch {
              platforms = String(r.platforms).split(',').map((s: string) => s.trim());
            }
          }
          let hashtags: string[] = [];
          if (r.hashtags) {
            try {
              hashtags = typeof r.hashtags === 'string' ? JSON.parse(r.hashtags) : r.hashtags;
            } catch {
              hashtags = String(r.hashtags).split(',').map((s: string) => s.trim());
            }
          }
          return {
            id: r.id,
            workflow_revision:r.workflow_revision,
            company_id: r.company_id,
            title: r.title,
            type: r.type,
            platforms,
            channel: r.channel,
            headline: r.headline,
            caption: r.caption,
            cta: r.cta,
            image_url: r.image_url,
            video_url: r.video_url || undefined,
            status: r.status,
            scheduled_date: r.scheduled_date,
            scheduled_time: r.scheduled_time,
            time_slot: r.time_slot,
            hashtags,
            reel_script: r.reel_script ? (typeof r.reel_script === 'string' ? JSON.parse(r.reel_script) : r.reel_script) : undefined,
            created_at: r.created_at,
          };
        });
      }
    }
  } catch (err: any) {
    handleDbError('getAllScheduledPosts', err);
  }

  assertNotProductionFallback('getAllScheduledPosts');
  return inMemoryContentPosts.filter((p) => p.status === 'scheduled');
}

export async function updateContentPostStatus(postId: string, status: DbContentPost['status'], companyId?: string): Promise<boolean> {
  let dbSuccess = false;
  try {
    const db = await getDbPool();
    if (db) {
      if (companyId) {
        await db.query('UPDATE content_posts SET status = ? WHERE id = ? AND company_id = ?', [status, postId, companyId]);
      } else {
        await db.query('UPDATE content_posts SET status = ? WHERE id = ?', [status, postId]);
      }
      return true;
    }
  } catch (err: any) {
    handleDbError('updateContentPostStatus', err);
  }

  assertNotProductionFallback('updateContentPostStatus');
  const existing = inMemoryContentPosts.find((p) => p.id === postId && (!companyId || p.company_id === companyId));
  if (existing) {
    existing.status = status;
    return true;
  }
  return dbSuccess;
}

export async function deleteContentPost(postId: string, companyId?: string): Promise<boolean> {
  try {
    const db = await getDbPool();
    if (db) {
      return await deleteContentPostSql(db,postId,companyId);
    }
  } catch (err: any) {
    handleDbError('deleteContentPost', err);
  }

  assertNotProductionFallback('deleteContentPost');
  const idx = inMemoryContentPosts.findIndex((p) => p.id === postId && (!companyId || p.company_id === companyId) && ['draft','pending_approval','scheduled','failed'].includes(p.status) && !inMemoryPublishingClaims.has(postId));
  if (idx >= 0) {
    inMemoryContentPosts.splice(idx, 1);
    return true;
  }
  return false;
}

// ---------------- CONTENT PUBLISHING RECORDS & IDEMPOTENCY ---------------- //

const inMemoryPublishingClaims = new Map<string, {companyId:string;token:string;status:string;started:number}>();
export async function claimPublishingDispatch(postId:string,companyId:string,expectedVersion?:string) {
  const claim:PublishingClaim={postId,companyId,token:crypto.randomUUID()};
  const db=await getDbPool();
  if(db) return {...await claimSqlPublishing(db,claim,expectedVersion),claim};
  assertNotProductionFallback('claimPublishingDispatch');
  if(!inMemoryContentPosts.some(post=>post.id===postId && post.company_id===companyId)) throw new Error('PUBLISHING_POST_SCOPE_MISMATCH');
  if(expectedVersion && publishingSourceVersion(inMemoryContentPosts.find(post=>post.id===postId)!)!==expectedVersion)return {acquired:false,status:'SOURCE_CHANGED',claim};
  const previous=inMemoryPublishingClaims.get(postId);
  if(previous && previous.companyId!==companyId) throw new Error('PUBLISHING_CLAIM_SCOPE_MISMATCH');
  if(previous?.status==='IN_PROGRESS' && Date.now()-previous.started>300000) previous.status='UNKNOWN';
  if(previous && !['READY','FAILED'].includes(previous.status)) return {acquired:false,status:previous.status,claim};
  if(publicationNeedsApproval(inMemoryContentPosts.find(post=>post.id===postId)!,publicationPolicy(companyId,inMemoryCompanyData[companyId])))return {acquired:false,status:'APPROVAL_REQUIRED',claim};
  inMemoryPublishingClaims.set(postId,{companyId,token:claim.token,status:'IN_PROGRESS',started:Date.now()});
  return {acquired:true,status:'IN_PROGRESS',claim};
}
export async function ownsPublishingDispatch(claim:PublishingClaim) {
  const db=await getDbPool();if(db)return ownsSqlPublishing(db,claim);
  assertNotProductionFallback('ownsPublishingDispatch');
  const current=inMemoryPublishingClaims.get(claim.postId);
  return current?.companyId===claim.companyId && current.token===claim.token && current.status==='IN_PROGRESS';
}
export async function settlePublishingDispatch(claim:PublishingClaim,status:'PUBLISHED'|'FAILED'|'UNKNOWN') {
  const db=await getDbPool();if(db)return settleSqlPublishing(db,claim,status);
  assertNotProductionFallback('settlePublishingDispatch');
  const current=inMemoryPublishingClaims.get(claim.postId);
  if(current?.companyId!==claim.companyId || current.token!==claim.token || current.status!=='IN_PROGRESS')return false;
  const post=inMemoryContentPosts.find(post=>post.id===claim.postId && post.company_id===claim.companyId);
  if(!post)return false;
  post.status=status.toLowerCase() as DbContentPost['status'];
  current.status=status;return true;
}

export async function createPublishingRecord(
  data: Omit<DbPublishingRecord, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<DbPublishingRecord> {
  const id = data.id || `pubrec_${crypto.randomUUID().replace(/-/g, '')}`;
  const now = new Date().toISOString();
  const record: DbPublishingRecord = {
    id,
    post_id: data.post_id,
    company_id: data.company_id,
    platform: data.platform,
    status: data.status,
    provider_post_id: data.provider_post_id || null,
    attempt_count: data.attempt_count || 1,
    max_attempts: data.max_attempts || 3,
    error_type: data.error_type || null,
    error_message: data.error_message || null,
    idempotency_key: data.idempotency_key,
    published_at: data.published_at || null,
    created_at: now,
    updated_at: now,
  };

  try {
    const db = await getDbPool();
    if (db) {
      await db.query(`
        INSERT INTO publishing_records (
          id, post_id, company_id, platform, status, provider_post_id,
          attempt_count, max_attempts, error_type, error_message,
          idempotency_key, published_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        record.id,
        record.post_id,
        record.company_id,
        record.platform,
        record.status,
        record.provider_post_id,
        record.attempt_count,
        record.max_attempts,
        record.error_type,
        record.error_message,
        record.idempotency_key,
        record.published_at,
        record.created_at,
        record.updated_at,
      ]);
      return record;
    }
  } catch (err: any) {
    handleDbError('createPublishingRecord', err);
  }

  assertNotProductionFallback('createPublishingRecord');
  inMemoryPublishingRecords.unshift(record);
  return record;
}

export async function updatePublishingRecord(
  id: string,
  updates: Partial<DbPublishingRecord>
): Promise<boolean> {
  const now = new Date().toISOString();

  try {
    const db = await getDbPool();
    if (db) {
      const setClauses: string[] = ['updated_at = ?'];
      const setValues: any[] = [now];

      if (updates.status !== undefined) {
        setClauses.push('status = ?');
        setValues.push(updates.status);
      }
      if (updates.provider_post_id !== undefined) {
        setClauses.push('provider_post_id = ?');
        setValues.push(updates.provider_post_id);
      }
      if (updates.attempt_count !== undefined) {
        setClauses.push('attempt_count = ?');
        setValues.push(updates.attempt_count);
      }
      if (updates.error_type !== undefined) {
        setClauses.push('error_type = ?');
        setValues.push(updates.error_type);
      }
      if (updates.error_message !== undefined) {
        setClauses.push('error_message = ?');
        setValues.push(updates.error_message);
      }
      if (updates.published_at !== undefined) {
        setClauses.push('published_at = ?');
        setValues.push(updates.published_at);
      }

      setValues.push(id);
      await db.query(`UPDATE publishing_records SET ${setClauses.join(', ')} WHERE id = ?`, setValues);
      return true;
    }
  } catch (err: any) {
    handleDbError('updatePublishingRecord', err);
  }

  assertNotProductionFallback('updatePublishingRecord');
  const inMem = inMemoryPublishingRecords.find((r) => r.id === id);
  if (inMem) {
    Object.assign(inMem, updates, { updated_at: now });
    return true;
  }

  return false;
}

export async function getPublishingRecordsByPostId(postId: string): Promise<DbPublishingRecord[]> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query(
        'SELECT * FROM publishing_records WHERE post_id = ? ORDER BY created_at DESC',
        [postId]
      );
      if (Array.isArray(rows)) {
        return rows.map((r: any) => ({
          ...r,
          published_at: r.published_at ? new Date(r.published_at).toISOString() : null,
          created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
        }));
      }
    }
  } catch (err: any) {
    handleDbError('getPublishingRecordsByPostId', err);
  }

  assertNotProductionFallback('getPublishingRecordsByPostId');
  return inMemoryPublishingRecords.filter((r) => r.post_id === postId);
}

export async function getUnconfirmedPublishingEvidence(postId: string, platform: string): Promise<UnconfirmedPublishingEvidence | null> {
  try {
    const db = await getDbPool();
    if (db) return await findUnconfirmedPublishingEvidence(db,postId,platform);
  } catch (error) { handleDbError('getUnconfirmedPublishingEvidence',error); }
  assertNotProductionFallback('getUnconfirmedPublishingEvidence');
  return inMemoryPublishingRecords.find(record => record.post_id === postId && record.platform === platform && ['UNKNOWN','RETRYING'].includes(record.status)) || null;
}

export async function getLatestPublishingRecord(
  postId: string,
  platform?: string
): Promise<DbPublishingRecord | null> {
  try {
    const db = await getDbPool();
    if (db) {
      let query = 'SELECT * FROM publishing_records WHERE post_id = ?';
      const params: any[] = [postId];
      if (platform) {
        query += ' AND platform = ?';
        params.push(platform);
      }
      query += ' ORDER BY created_at DESC LIMIT 1';
      const [rows]: any = await db.query(query, params);
      if (Array.isArray(rows) && rows.length > 0) {
        const r = rows[0];
        return {
          ...r,
          published_at: r.published_at ? new Date(r.published_at).toISOString() : null,
          created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
        };
      }
      return null;
    }
  } catch (err: any) {
    handleDbError('getLatestPublishingRecord', err);
  }

  assertNotProductionFallback('getLatestPublishingRecord');
  const filtered = inMemoryPublishingRecords.filter(
    (r) => r.post_id === postId && (!platform || r.platform === platform)
  );
  return filtered[0] || null;
}

export async function isPostAlreadyPublished(postId: string, platform?: string): Promise<boolean> {
  try {
    const db = await getDbPool();
    if (db) {
      let query = "SELECT id FROM publishing_records WHERE post_id = ? AND status = 'PUBLISHED'";
      const params: any[] = [postId];
      if (platform) {
        query += ' AND platform = ?';
        params.push(platform);
      }
      query += ' LIMIT 1';
      const [rows]: any = await db.query(query, params);
      if (Array.isArray(rows) && rows.length > 0) {
        return true;
      }
    }
  } catch (err: any) {
    handleDbError('isPostAlreadyPublished', err);
  }

  assertNotProductionFallback('isPostAlreadyPublished');
  return inMemoryPublishingRecords.some(
    (r) => r.post_id === postId && r.status === 'PUBLISHED' && (!platform || r.platform === platform)
  );
}

// ---------------- INTERNAL & EXTERNAL CAMPAIGNS (METRIC SEPARATION) ---------------- //

export async function getInternalCampaigns(companyId?: string): Promise<DbInternalCampaign[]> {
  if (!companyId) return [];
  let connected=false;
  try {
    const db = await getDbPool();
    if (db) {
      connected=true;
      const [rows]: any = await db.query(
        'SELECT *,UNIX_TIMESTAMP(created_at)*1000 created_ms,UNIX_TIMESTAMP(updated_at)*1000 updated_ms FROM internal_campaigns WHERE company_id = ? ORDER BY created_at DESC',
        [companyId]
      );
      if (Array.isArray(rows)) {
        return rows.map((r: any) => {
          let channels: string[] = [];
          if (r.channels) {
            try {
              channels = typeof r.channels === 'string' ? JSON.parse(r.channels) : r.channels;
            } catch {
              channels = String(r.channels).split(',').map((s: string) => s.trim());
            }
          }
          return {
            id: r.id,
            company_id: r.company_id,
            name: r.name,
            objective: r.objective,
            status: r.status,
            start_date: r.start_date,
            end_date: r.end_date,
            planned_budget: Number(r.planned_budget) || 0,
            channels,
            external_campaign_id: r.external_campaign_id || null,
            created_at:r.created_ms==null?undefined:new Date(Number(r.created_ms)).toISOString(),
            updated_at:r.updated_ms==null?undefined:new Date(Number(r.updated_ms)).toISOString(),
          };
        });
      }
    }
  } catch (err: any) {
    if(connected)throw new Error('CAMPAIGN_STORAGE_UNAVAILABLE');
    handleDbError('getInternalCampaigns', err);
  }

  assertNotProductionFallback('getInternalCampaigns');
  return inMemoryInternalCampaigns.filter((c) => c.company_id === companyId);
}

export async function createInternalCampaign(
  data: Omit<DbInternalCampaign, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<DbInternalCampaign> {
  const id = data.id || `camp_${crypto.randomUUID().replace(/-/g, '')}`;
  const now = new Date().toISOString();
  const campaign: DbInternalCampaign = {
    id,
    company_id: data.company_id,
    name: data.name,
    objective: data.objective,
    status: data.status || 'active',
    start_date: data.start_date,
    end_date: data.end_date,
    planned_budget: Number(data.planned_budget) || 0,
    channels: Array.isArray(data.channels) ? data.channels : [],
    external_campaign_id: data.external_campaign_id || null,
    created_at: now,
    updated_at: now,
  };

  let connected=false;
  try {
    const db = await getDbPool();
    if (db) {
      connected=true;
      await db.query(
        `INSERT INTO internal_campaigns (id, company_id, name, objective, status, start_date, end_date, planned_budget, channels, external_campaign_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?), FROM_UNIXTIME(?))`,
        [
          campaign.id,
          campaign.company_id,
          campaign.name,
          campaign.objective,
          campaign.status,
          campaign.start_date,
          campaign.end_date,
          campaign.planned_budget,
          JSON.stringify(campaign.channels),
          campaign.external_campaign_id,
          Date.parse(campaign.created_at!)/1000,
          Date.parse(campaign.updated_at!)/1000,
        ]
      );
      return campaign;
    }
  } catch (err: any) {
    if(connected)throw new Error('CAMPAIGN_STORAGE_UNAVAILABLE');
    handleDbError('createInternalCampaign', err);
  }

  assertNotProductionFallback('createInternalCampaign');
  inMemoryInternalCampaigns.unshift(campaign);
  return campaign;
}

export async function updateInternalCampaign(id:string,updates:Partial<DbInternalCampaign>,companyId?:string):Promise<boolean>{
 if(!companyId)return false;const db=await getDbPool();if(db)return updateInternalCampaignSql(db,id,updates,companyId);
 assertNotProductionFallback('updateInternalCampaign');const existing=inMemoryInternalCampaigns.find(row=>row.id===id&&row.company_id===companyId);if(!existing)return false;
 const allowed=['name','objective','status','start_date','end_date','planned_budget','channels','external_campaign_id'];for(const key of allowed)if((updates as any)[key]!==undefined)(existing as any)[key]=(updates as any)[key];existing.updated_at=new Date().toISOString();return true;
}

export async function deleteInternalCampaign(id: string, companyId?: string): Promise<boolean> {
  if(!companyId)return false;
  let connected=false;
  try {
    const db = await getDbPool();
    if (db) {
      connected=true;
      const [result]:any=await db.query('DELETE FROM internal_campaigns WHERE id=? AND company_id=?',[id,companyId]);return result.affectedRows===1;
    }
  } catch (err: any) {
    if(connected)throw new Error('CAMPAIGN_STORAGE_UNAVAILABLE');
    handleDbError('deleteInternalCampaign', err);
  }

  assertNotProductionFallback('deleteInternalCampaign');
  const idx = inMemoryInternalCampaigns.findIndex((c) => c.id === id && (!companyId || c.company_id === companyId));
  if (idx >= 0) {
    inMemoryInternalCampaigns.splice(idx, 1);
    return true;
  }
  return false;
}

export async function getExternalAdCampaigns(companyId?: string): Promise<DbExternalAdCampaign[]> {
  if (!companyId) return [];
  let connected=false;
  try {
    const db = await getDbPool();
    if (db) {
      connected=true;
      const [rows]: any = await db.query(
        'SELECT *,UNIX_TIMESTAMP(created_at)*1000 created_ms,UNIX_TIMESTAMP(updated_at)*1000 updated_ms FROM external_ad_campaigns WHERE company_id = ? ORDER BY fetched_at DESC, created_at DESC',
        [companyId]
      );
      if (Array.isArray(rows)) {
        return rows.map((r: any) => ({
          id: r.id,
          company_id: r.company_id,
          internal_campaign_id: r.internal_campaign_id || null,
          provider: r.provider,
          external_campaign_id: r.external_campaign_id,
          name: r.name,
          status: r.status,
          fetched_at: r.fetched_at ? new Date(r.fetched_at).toISOString() : null,
          spend: r.spend !== null ? Number(r.spend) : null,
          impressions: r.impressions !== null ? Number(r.impressions) : null,
          clicks: r.clicks !== null ? Number(r.clicks) : null,
          conversions: r.conversions !== null ? Number(r.conversions) : null,
          conversion_tracking_status: r.conversion_tracking_status || 'UNAVAILABLE',
          revenue: r.revenue !== null ? Number(r.revenue) : null,
          revenue_attribution_status: r.revenue_attribution_status || 'UNAVAILABLE',
          roas: r.roas !== null ? Number(r.roas) : null,
          raw_metrics_json: r.raw_metrics_json || null,
          created_at:r.created_ms==null?undefined:new Date(Number(r.created_ms)).toISOString(),
          updated_at:r.updated_ms==null?undefined:new Date(Number(r.updated_ms)).toISOString(),
        }));
      }
    }
  } catch (err: any) {
    if(connected)throw new Error('CAMPAIGN_STORAGE_UNAVAILABLE');
    handleDbError('getExternalAdCampaigns', err);
  }

  assertNotProductionFallback('getExternalAdCampaigns');
  return inMemoryExternalAdCampaigns.filter((c) => c.company_id === companyId);
}

export async function upsertExternalAdCampaign(
  campaign: Omit<DbExternalAdCampaign, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<DbExternalAdCampaign> {
  const id = `extcamp_${crypto.randomUUID().replace(/-/g, '')}`;
  const now = new Date().toISOString();

  const record: DbExternalAdCampaign = {
    id,
    company_id: campaign.company_id,
    internal_campaign_id: campaign.internal_campaign_id || null,
    provider: campaign.provider,
    external_campaign_id: campaign.external_campaign_id,
    name: campaign.name,
    status: campaign.status,
    fetched_at: campaign.fetched_at || now,
    spend: campaign.spend !== undefined ? campaign.spend : null,
    impressions: campaign.impressions !== undefined ? campaign.impressions : null,
    clicks: campaign.clicks !== undefined ? campaign.clicks : null,
    conversions: campaign.conversions !== undefined ? campaign.conversions : null,
    conversion_tracking_status: campaign.conversion_tracking_status || 'UNAVAILABLE',
    revenue: campaign.revenue !== undefined ? campaign.revenue : null,
    revenue_attribution_status: campaign.revenue_attribution_status || 'UNAVAILABLE',
    roas: campaign.roas !== undefined ? campaign.roas : null,
    raw_metrics_json: campaign.raw_metrics_json || null,
    created_at: now,
    updated_at: now,
  };

  let connected=false;
  try {
    const db = await getDbPool();
    if (db) {
      connected=true;
      const connection=await db.getConnection();
      try{
      await connection.beginTransaction();
      const [companies]:any=await connection.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[record.company_id]);if(companies.length!==1)throw new Error('CAMPAIGN_COMPANY_MISSING');
      const [existing]:any=await connection.query('SELECT id,internal_campaign_id,fetched_at,UNIX_TIMESTAMP(created_at)*1000 created_ms FROM external_ad_campaigns WHERE company_id=? AND provider=? AND external_campaign_id=? FOR UPDATE',[record.company_id,record.provider,record.external_campaign_id]);
      if(!Number.isFinite(Date.parse(record.fetched_at!)))throw new Error('CAMPAIGN_FETCH_TIME_INVALID');
      if(existing.length&&Date.parse(record.fetched_at!)<Date.parse(existing[0].fetched_at))throw new Error('CAMPAIGN_STALE_SYNC');
      if(existing.length){record.id=existing[0].id;record.internal_campaign_id=existing[0].internal_campaign_id;record.created_at=new Date(Number(existing[0].created_ms)).toISOString();}
      await connection.query(
        `INSERT INTO external_ad_campaigns (
          id, company_id, internal_campaign_id, provider, external_campaign_id,
          name, status, fetched_at, spend, impressions, clicks, conversions,
          conversion_tracking_status, revenue, revenue_attribution_status, roas,
          raw_metrics_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?), FROM_UNIXTIME(?))
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          status = VALUES(status),
          fetched_at = VALUES(fetched_at),
          spend = VALUES(spend),
          impressions = VALUES(impressions),
          clicks = VALUES(clicks),
          conversions = VALUES(conversions),
          conversion_tracking_status = VALUES(conversion_tracking_status),
          revenue = VALUES(revenue),
          revenue_attribution_status = VALUES(revenue_attribution_status),
          roas = VALUES(roas),
          raw_metrics_json = VALUES(raw_metrics_json),
          updated_at = VALUES(updated_at)`,
        [
          record.id,
          record.company_id,
          record.internal_campaign_id,
          record.provider,
          record.external_campaign_id,
          record.name,
          record.status,
          record.fetched_at,
          record.spend,
          record.impressions,
          record.clicks,
          record.conversions,
          record.conversion_tracking_status,
          record.revenue,
          record.revenue_attribution_status,
          record.roas,
          record.raw_metrics_json,
          Date.parse(record.created_at!)/1000,
          Date.parse(record.updated_at!)/1000,
        ]
      );
      await connection.commit();return record;
      }catch(error){await connection.rollback();throw error;}finally{connection.release();}
    }
  } catch (err: any) {
    if(connected)throw new Error('CAMPAIGN_STORAGE_UNAVAILABLE');
    handleDbError('upsertExternalAdCampaign', err);
  }

  assertNotProductionFallback('upsertExternalAdCampaign');
  const existingIdx = inMemoryExternalAdCampaigns.findIndex(
    (c) => c.company_id === record.company_id && c.provider === record.provider && c.external_campaign_id === record.external_campaign_id
  );
  if (existingIdx >= 0) {
    record.id = inMemoryExternalAdCampaigns[existingIdx].id;
    record.created_at = inMemoryExternalAdCampaigns[existingIdx].created_at;
    record.internal_campaign_id = inMemoryExternalAdCampaigns[existingIdx].internal_campaign_id;
    inMemoryExternalAdCampaigns[existingIdx] = record;
  } else {
    inMemoryExternalAdCampaigns.unshift(record);
  }

  return record;
}

// ---------------- COMPANY ASSETS (LOGO, PHOTOS, BRAND MEDIA) ---------------- //

export async function createCompanyAsset(
  companyId: string,
  assetType: 'logo' | 'photo',
  url: string,
  label?: string | null
): Promise<DbCompanyAsset> {
  const asset: DbCompanyAsset = {
    id: `ast_${crypto.randomUUID().replace(/-/g, '')}`,
    company_id: companyId,
    asset_type: assetType,
    url,
    label: label || null,
    created_at: new Date().toISOString(),
  };

  try {
    const db = await getDbPool();
    if (db) {
      await db.query(
        'INSERT INTO company_assets (id, company_id, asset_type, url, label, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [asset.id, asset.company_id, asset.asset_type, asset.url, asset.label]
      );
      return asset;
    }
  } catch (err: any) {
    handleDbError('createCompanyAsset', err);
  }

  assertNotProductionFallback('createCompanyAsset');
  inMemoryCompanyAssets.push(asset);
  return asset;
}

export async function getCompanyAssets(companyId: string): Promise<DbCompanyAsset[]> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query(
        'SELECT * FROM company_assets WHERE company_id = ? ORDER BY created_at DESC',
        [companyId]
      );
      return rows || [];
    }
  } catch (err: any) {
    handleDbError('getCompanyAssets', err);
  }

  assertNotProductionFallback('getCompanyAssets');
  return inMemoryCompanyAssets.filter((a) => a.company_id === companyId);
}

export async function getCompanyAssetById(assetId: string): Promise<DbCompanyAsset | null> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query(
        'SELECT * FROM company_assets WHERE id = ? LIMIT 1',
        [assetId]
      );
      if (rows && rows.length > 0) return rows[0];
      return null;
    }
  } catch (err: any) {
    handleDbError('getCompanyAssetById', err);
  }

  assertNotProductionFallback('getCompanyAssetById');
  const found = inMemoryCompanyAssets.find((a) => a.id === assetId);
  return found || null;
}

export async function deleteCompanyAsset(assetId: string): Promise<boolean> {
  let deleted = false;
  try {
    const db = await getDbPool();
    if (db) {
      const [res]: any = await db.query('DELETE FROM company_assets WHERE id = ?', [assetId]);
      return res?.affectedRows > 0;
    }
  } catch (err: any) {
    handleDbError('deleteCompanyAsset', err);
  }

  assertNotProductionFallback('deleteCompanyAsset');
  const idx = inMemoryCompanyAssets.findIndex((a) => a.id === assetId);
  if (idx !== -1) {
    inMemoryCompanyAssets.splice(idx, 1);
    deleted = true;
  }
  return deleted;
}

// ---------------- THEME COMBINATORIAL ROTATION HISTORY ---------------- //

export async function recordThemeUsage(
  companyId: string,
  templateId: string,
  paletteId: string
): Promise<void> {
  if(!companyId||companyId.length>64||!templateId||templateId.length>64||!paletteId||paletteId.length>64)throw new ObservationError('THEME_USAGE_INVALID');
  const id = `cth_${crypto.randomUUID().replace(/-/g, '')}`;
  const nowIso = new Date().toISOString();

  try {
    const db = await getDbPool();
    if (db) {
      await db.query(
        'INSERT INTO content_theme_history (id, company_id, template_id, palette_id) VALUES (?, ?, ?, ?)',
        [id, companyId, templateId, paletteId]
      );
      return;
    }
  } catch (err: any) {
    handleDbError('recordThemeUsage', err);
  }

  assertNotProductionFallback('recordThemeUsage');
  inMemoryThemeHistory.unshift({
    id,
    company_id: companyId,
    template_id: templateId,
    palette_id: paletteId,
    used_at: nowIso,
  });

  // Keep memory footprint bounded
  if (inMemoryThemeHistory.length > 500) {
    inMemoryThemeHistory.splice(500);
  }
}

export async function getRecentThemeHistory(
  companyId: string,
  limit = 5
): Promise<Array<{ templateId: string; paletteId: string; usedAt: string }>> {
  observationLimit(limit);
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query(
        'SELECT template_id, palette_id, UNIX_TIMESTAMP(used_at)*1000 stamp_ms FROM content_theme_history WHERE company_id = ? ORDER BY used_at DESC LIMIT ?',
        [companyId, limit]
      );
      if (rows && Array.isArray(rows)) {
        return rows.map((r: any) => ({
          templateId: r.template_id,
          paletteId: r.palette_id,
          usedAt: new Date(Number(r.stamp_ms)).toISOString(),
        }));
      }
    }
  } catch (err: any) {
    handleDbError('getRecentThemeHistory', err);
  }

  assertNotProductionFallback('getRecentThemeHistory');
  return inMemoryThemeHistory
    .filter((h) => h.company_id === companyId)
    .slice(0, limit)
    .map((h) => ({
      templateId: h.template_id,
      paletteId: h.palette_id,
      usedAt: h.used_at,
    }));
}

// ---------------- INVOICES & SUBSCRIPTIONS (BILLING & LEDGER) ---------------- //

export async function getInvoicesByCompany(companyId: string): Promise<DbInvoice[]> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query(
        'SELECT * FROM invoices WHERE company_id = ? ORDER BY created_at DESC',
        [companyId]
      );
      if (rows && Array.isArray(rows)) {
        return rows.map((r: any) => ({
          ...r,
          amount: Number(r.amount),
          gst_amount: Number(r.gst_amount),
          total_amount: Number(r.total_amount),
          created_at: new Date(Number(r.created_ms)).toISOString(),
        }));
      }
    }
  } catch (err: any) {
    handleDbError('getInvoicesByCompany', err);
  }

  assertNotProductionFallback('getInvoicesByCompany');
  return inMemoryInvoices
    .filter((inv) => inv.company_id === companyId)
    .sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
}

export async function getInvoiceById(invoiceId: string): Promise<DbInvoice | null> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query(
        'SELECT * FROM invoices WHERE id = ? LIMIT 1',
        [invoiceId]
      );
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          ...r,
          amount: Number(r.amount),
          gst_amount: Number(r.gst_amount),
          total_amount: Number(r.total_amount),
          created_at: new Date(Number(r.created_ms)).toISOString(),
        };
      }
    }
  } catch (err: any) {
    handleDbError('getInvoiceById', err);
  }

  assertNotProductionFallback('getInvoiceById');
  const found = inMemoryInvoices.find((inv) => inv.id === invoiceId);
  return found || null;
}

export async function getInvoiceByPaymentId(paymentId: string, companyId?: string): Promise<DbInvoice | null> {
  if (!paymentId) return null;
  try {
    const db = await getDbPool();
    if (db) {
      const sql = companyId
        ? 'SELECT * FROM invoices WHERE payment_id = ? AND company_id = ? LIMIT 1'
        : 'SELECT * FROM invoices WHERE payment_id = ? LIMIT 1';
      const params = companyId ? [paymentId, companyId] : [paymentId];
      const [rows]: any = await db.query(sql, params);
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          ...r,
          amount: Number(r.amount),
          gst_amount: Number(r.gst_amount),
          total_amount: Number(r.total_amount),
          created_at: new Date(Number(r.created_ms)).toISOString(),
        };
      }
    }
  } catch (err: any) {
    handleDbError('getInvoiceByPaymentId', err);
  }

  assertNotProductionFallback('getInvoiceByPaymentId');
  const found = inMemoryInvoices.find(
    (inv) => inv.payment_id === paymentId && (!companyId || inv.company_id === companyId)
  );
  return found || null;
}

export async function getInvoiceByOrderId(orderId: string, companyId?: string): Promise<DbInvoice | null> {
  if (!orderId) return null;
  try {
    const db = await getDbPool();
    if (db) {
      const sql = companyId
        ? 'SELECT * FROM invoices WHERE order_id = ? AND company_id = ? LIMIT 1'
        : 'SELECT * FROM invoices WHERE order_id = ? LIMIT 1';
      const params = companyId ? [orderId, companyId] : [orderId];
      const [rows]: any = await db.query(sql, params);
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          ...r,
          amount: Number(r.amount),
          gst_amount: Number(r.gst_amount),
          total_amount: Number(r.total_amount),
          created_at: new Date(Number(r.created_ms)).toISOString(),
        };
      }
    }
  } catch (err: any) {
    handleDbError('getInvoiceByOrderId', err);
  }

  assertNotProductionFallback('getInvoiceByOrderId');
  const found = inMemoryInvoices.find(
    (inv) => inv.order_id === orderId && (!companyId || inv.company_id === companyId)
  );
  return found || null;
}

export async function createInvoice(invoice: Partial<DbInvoice> & { company_id: string }): Promise<DbInvoice> {
  // Duplicate prevention check: Check if an invoice with matching payment_id or order_id already exists
  if (invoice.payment_id) {
    const existingByPayment = await getInvoiceByPaymentId(invoice.payment_id, invoice.company_id);
    if (existingByPayment) {
      return existingByPayment;
    }
  }
  if (invoice.order_id) {
    const existingByOrder = await getInvoiceByOrderId(invoice.order_id, invoice.company_id);
    if (existingByOrder) {
      return existingByOrder;
    }
  }

  const now = new Date();
  const dateFormatted = invoice.date || now.toISOString().split('T')[0];
  const yearMonth = now.toISOString().replace(/-/g, '').slice(0, 6);
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const invoiceId = invoice.id || `INV-${yearMonth}-${randomSuffix}`;
  
  const baseAmount = Number(invoice.amount || 0);
  const gstAmount = Number(invoice.gst_amount !== undefined ? invoice.gst_amount : +(baseAmount * 0.18).toFixed(2));
  const totalAmount = Number(invoice.total_amount !== undefined ? invoice.total_amount : +(baseAmount + gstAmount).toFixed(2));

  const newInvoice: DbInvoice = {
    id: invoiceId,
    company_id: invoice.company_id,
    lead_id: invoice.lead_id,
    deal_id: invoice.deal_id,
    date: dateFormatted,
    plan: invoice.plan || 'Growth Tier (Monthly)',
    amount: baseAmount,
    gst_amount: gstAmount,
    total_amount: totalAmount,
    payment_method: invoice.payment_method || 'UPI / Razorpay',
    payment_id: invoice.payment_id,
    order_id: invoice.order_id,
    payment_link_id: invoice.payment_link_id,
    customer_name: invoice.customer_name || 'Aaditech Solution Client',
    customer_email: invoice.customer_email || 'billing@aaditechs.in',
    customer_phone: invoice.customer_phone || '+91 22 4963 8603',
    status: invoice.status || 'Paid',
    hsn_code: invoice.hsn_code || '998314',
    pdf_url: invoice.pdf_url,
    created_at: now.toISOString(),
  };

  try {
    const db = await getDbPool();
    if (db) {
      await db.query(
        `INSERT INTO invoices (
          id, company_id, date, plan, amount, gst_amount, total_amount,
          payment_method, payment_id, order_id, payment_link_id,
          customer_name, customer_email, customer_phone, status, hsn_code, pdf_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          status = VALUES(status),
          payment_id = VALUES(payment_id),
          order_id = VALUES(order_id)`,
        [
          newInvoice.id,
          newInvoice.company_id,
          newInvoice.date,
          newInvoice.plan,
          newInvoice.amount,
          newInvoice.gst_amount,
          newInvoice.total_amount,
          newInvoice.payment_method,
          newInvoice.payment_id || null,
          newInvoice.order_id || null,
          newInvoice.payment_link_id || null,
          newInvoice.customer_name || null,
          newInvoice.customer_email || null,
          newInvoice.customer_phone || null,
          newInvoice.status,
          newInvoice.hsn_code || '998314',
          newInvoice.pdf_url || null,
        ]
      );
    }
  } catch (err: any) {
    handleDbError('createInvoice', err);
  }

  assertNotProductionFallback('createInvoice');
  // Update in-memory store
  const existingIdx = inMemoryInvoices.findIndex((inv) => inv.id === newInvoice.id);
  if (existingIdx >= 0) {
    inMemoryInvoices[existingIdx] = newInvoice;
  } else {
    inMemoryInvoices.unshift(newInvoice);
  }

  return newInvoice;
}

export async function getSubscriptionByCompany(companyId: string): Promise<DbSubscription | null> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query(
        'SELECT * FROM subscriptions WHERE company_id = ? LIMIT 1',
        [companyId]
      );
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          ...r,
          amount: Number(r.amount),
          current_period_start: r.current_period_start instanceof Date ? r.current_period_start.toISOString() : String(r.current_period_start),
          current_period_end: r.current_period_end instanceof Date ? r.current_period_end.toISOString() : String(r.current_period_end),
          created_at: new Date(Number(r.created_ms)).toISOString(),
          updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
        };
      }
    }
  } catch (err: any) {
    handleDbError('getSubscriptionByCompany', err);
  }

  assertNotProductionFallback('getSubscriptionByCompany');
  const found = inMemorySubscriptions.find((sub) => sub.company_id === companyId);
  return found || null;
}

export async function upsertSubscription(
  sub: Partial<DbSubscription> & { company_id: string; plan_id: string }
): Promise<DbSubscription> {
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const subId = sub.id || `sub_${sub.company_id}_${sub.plan_id}`;

  const planNames: Record<string, string> = {
    starter: 'Starter Tier',
    growth: 'Growth Tier',
    pro: 'Pro Automation Tier',
    agency: 'Agency Multi-Client',
  };
  const planPrices: Record<string, number> = {
    starter: 499,
    growth: 799,
    pro: 1499,
    agency: 4999,
  };

  const updatedSub: DbSubscription = {
    id: subId,
    company_id: sub.company_id,
    plan_id: sub.plan_id,
    plan_name: sub.plan_name || planNames[sub.plan_id] || 'Custom Plan',
    status: sub.status || 'active',
    amount: sub.amount !== undefined ? Number(sub.amount) : (planPrices[sub.plan_id] || 799),
    billing_cycle: sub.billing_cycle || 'monthly',
    current_period_start: sub.current_period_start || now.toISOString(),
    current_period_end: sub.current_period_end || nextMonth.toISOString(),
    razorpay_subscription_id: sub.razorpay_subscription_id,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  try {
    const db = await getDbPool();
    if (db) {
      await db.query(
        `INSERT INTO subscriptions (
          id, company_id, plan_id, plan_name, status, amount,
          billing_cycle, current_period_start, current_period_end, razorpay_subscription_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          plan_id = VALUES(plan_id),
          plan_name = VALUES(plan_name),
          status = VALUES(status),
          amount = VALUES(amount),
          billing_cycle = VALUES(billing_cycle),
          current_period_start = VALUES(current_period_start),
          current_period_end = VALUES(current_period_end),
          razorpay_subscription_id = VALUES(razorpay_subscription_id)`,
        [
          updatedSub.id,
          updatedSub.company_id,
          updatedSub.plan_id,
          updatedSub.plan_name,
          updatedSub.status,
          updatedSub.amount,
          updatedSub.billing_cycle,
          new Date(updatedSub.current_period_start),
          new Date(updatedSub.current_period_end),
          updatedSub.razorpay_subscription_id || null,
        ]
      );
    }
  } catch (err: any) {
    handleDbError('upsertSubscription', err);
  }

  assertNotProductionFallback('upsertSubscription');
  const existingIdx = inMemorySubscriptions.findIndex((s) => s.company_id === updatedSub.company_id);
  if (existingIdx >= 0) {
    inMemorySubscriptions[existingIdx] = updatedSub;
  } else {
    inMemorySubscriptions.push(updatedSub);
  }

  return updatedSub;
}

// ---------------- CUSTOM DOMAINS & WEBSITE CONFIGURATION ---------------- //

export async function getCustomDomainsByCompany(companyId:string):Promise<DbCustomDomain[]>{
 try{const db=await getDbPool();if(db)return await readDomainsSql(db,companyId);}catch(error){handleDbError('getCustomDomainsByCompany',error);}
 assertNotProductionFallback('getCustomDomainsByCompany');return inMemoryCustomDomains.filter(row=>row.company_id===companyId).map(row=>({...row}));
}
export async function getCustomDomainById(id:string):Promise<DbCustomDomain|null>{
 try{const db=await getDbPool();if(db)return await readDomainSql(db,id);}catch(error){handleDbError('getCustomDomainById',error);}
 assertNotProductionFallback('getCustomDomainById');const row=inMemoryCustomDomains.find(row=>row.id===id);return row?{...row}:null;
}

export async function createCustomDomain(data:Partial<DbCustomDomain>&{company_id:string;domain:string}):Promise<DbCustomDomain>{
 const domain=normalizeWebsiteDomain(data.domain);const record:DbCustomDomain={id:'dom_'+crypto.randomUUID().replaceAll('-',''),company_id:data.company_id,domain,status:'pending_verification',ssl_status:'unverified',cname_target:'cname.bga.aaditechs.in',a_record_target:'77.37.54.108',dns_txt_record:'bga-site-verification='+crypto.randomBytes(24).toString('hex'),verified_at:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
 try{const db=await getDbPool();if(db)return await createDomainSql(db,record);}catch(error){if(error instanceof WebsiteError)throw error;handleDbError('createCustomDomain',error);}
 assertNotProductionFallback('createCustomDomain');
 const existing=inMemoryCustomDomains.find(row=>row.domain===domain);if(existing){if(existing.company_id!==data.company_id)throw new WebsiteError(409,'DOMAIN_CONFLICT','Domain registration conflicts with an existing record');return {...existing};}
 inMemoryCustomDomains.push(record);return {...record};
}

export const getCompanyLeads = getAllLeads;
export const getInvoices = getInvoicesByCompany;
export const getSubscription = getSubscriptionByCompany;
export const getCustomDomain = getCustomDomainsByCompany;
export const getCustomDomains = getCustomDomainsByCompany;

export async function updateCustomDomainStatus(company:string,id:string,proof:DomainDnsSnapshot,verified:boolean):Promise<DbCustomDomain|null>{
 try{const db=await getDbPool();if(db)return await saveDomainDnsSql(db,company,id,proof,verified);}catch(error){handleDbError('updateCustomDomainStatus',error);}
 assertNotProductionFallback('updateCustomDomainStatus');const record=inMemoryCustomDomains.find(row=>row.company_id===company&&row.id===id&&row.dns_txt_record===proof.dns_txt_record&&row.domain===proof.domain&&row.cname_target===proof.cname_target&&row.a_record_target===proof.a_record_target);if(!record)return null;
 Object.assign(record,{status:verified?'dns_verified':'pending_verification',ssl_status:'unverified',verified_at:verified?new Date().toISOString():null,updated_at:new Date().toISOString()});return {...record};
}
export async function deleteCustomDomain(company:string,id:string):Promise<boolean>{
 try{const db=await getDbPool();if(db)return await deleteDomainSql(db,company,id);}catch(error){handleDbError('deleteCustomDomain',error);}
 assertNotProductionFallback('deleteCustomDomain');const index=inMemoryCustomDomains.findIndex(row=>row.company_id===company&&row.id===id);if(index<0)return false;inMemoryCustomDomains.splice(index,1);return true;
}
export async function getWebsiteConfigByCompany(company:string):Promise<DbWebsiteConfig|null>{
 try{const db=await getDbPool();if(db)return await readWebsiteConfigSql(db,company);}catch(error){handleDbError('getWebsiteConfigByCompany',error);}
 assertNotProductionFallback('getWebsiteConfigByCompany');const record=inMemoryWebsiteConfigs.find(row=>row.company_id===company);return record?{...record}:null;
}
export async function upsertWebsiteConfig(data:Partial<DbWebsiteConfig>&{company_id:string}):Promise<DbWebsiteConfig>{
 const {company_id,...input}=data;
 try{const db=await getDbPool();if(db)return await saveWebsiteConfigSql(db,company_id,input);}catch(error){if(error instanceof WebsiteError)throw error;handleDbError('upsertWebsiteConfig',error);}
 assertNotProductionFallback('upsertWebsiteConfig');const patch=websiteConfigPatch.parse(input);const existing=inMemoryWebsiteConfigs.find(row=>row.company_id===company_id);const now=new Date().toISOString();
 const saved:DbWebsiteConfig={id:'web_'+crypto.createHash('sha256').update(company_id).digest('hex').slice(0,48),company_id,subdomain:company_id,primary_color:'#4f46e5',secondary_color:'#06b6d4',tagline:'',hero_title:'',hero_subtitle:'',meta_description:'',keywords:'',enable_whatsapp_cta:true,enable_direct_call_cta:true,enable_inquiry_form:true,created_at:now,...existing,...patch,updated_at:now};
 if(existing)Object.assign(existing,saved);else inMemoryWebsiteConfigs.push(saved);return {...saved};
}

// ---------------- LOCAL SEO RANK OBSERVATIONS & HISTORICAL PERSISTENCE ---------------- //

function observationFailure(error:any):never{
 if(error instanceof ObservationError)throw error;
 let code=error?.code==='DATABASE_UNAVAILABLE'?'DATABASE_UNAVAILABLE':'DATABASE_OPERATION_FAILED';
 if(isProductionDatabaseMode())try{handleDbError('observation',error);}catch(mapped:any){if(mapped?.code==='DATABASE_UNAVAILABLE')code='DATABASE_UNAVAILABLE';}
 throw Object.assign(new Error('Observation storage unavailable'),{code,status:503});
}
export async function saveRankObservations(source:DbRankObservation[]|string,keyword?:string,rows?:any[]):Promise<void>{
 const records=normalizeRanks(typeof source==='string'?rows:source,typeof source==='string'?source:undefined,keyword);if(!records.length)return;
 try{const db=await getDbPool();if(db){await saveRanksSql(db,records);return;}}catch(error){observationFailure(error);}
 assertNotProductionFallback('saveRankObservations');
 for(const row of records){const existing=inMemoryRankObservations.find(old=>old.id===row.id);if(existing&&JSON.stringify(existing)!==JSON.stringify(row))throw new ObservationError('OBSERVATION_IDENTITY_CONFLICT',409);}
 for(const row of records)if(!inMemoryRankObservations.some(old=>old.id===row.id))inMemoryRankObservations.unshift({...row});
}
function memoryLatestRanks(company:string,keyword?:string){
 const rows=inMemoryRankObservations.filter(row=>row.company_id===company&&(keyword===undefined||row.keyword.toLowerCase()===keyword.toLowerCase())).sort((a,b)=>b.timestamp.localeCompare(a.timestamp)||b.id.localeCompare(a.id));
 const latest=new Map<string,string>(),points=new Map<string,DbRankObservation>();for(const row of rows){const word=row.keyword.toLowerCase();if(!latest.has(word))latest.set(word,row.timestamp);if(latest.get(word)!==row.timestamp)continue;const key=JSON.stringify([word,row.grid_index]);if(!points.has(key))points.set(key,row);}
 return [...points.values()].sort((a,b)=>a.keyword.localeCompare(b.keyword)||a.grid_index-b.grid_index).map(row=>({...row}));
}
export async function getLatestKeywordObservations(company:string,keyword?:string):Promise<DbRankObservation[]>{
 try{const db=await getDbPool();if(db)return await readRanksSql(db,company,keyword);}catch(error){observationFailure(error);}
 assertNotProductionFallback('getLatestKeywordObservations');return memoryLatestRanks(company,keyword);
}
export async function getKeywordObservationHistory(company:string,keyword:string,limit=50):Promise<DbRankObservation[]>{
 observationLimit(limit);try{const db=await getDbPool();if(db)return await readRanksSql(db,company,keyword,limit);}catch(error){observationFailure(error);}
 assertNotProductionFallback('getKeywordObservationHistory');return inMemoryRankObservations.filter(row=>row.company_id===company&&row.keyword.toLowerCase()===keyword.toLowerCase()).sort((a,b)=>b.timestamp.localeCompare(a.timestamp)||a.grid_index-b.grid_index||b.id.localeCompare(a.id)).slice(0,limit).map(row=>({...row}));
}
export async function calculateHistoricalTrend(company:string,keyword:string,current:number|null):Promise<{previousRank:number|null;diff:number|null;historyCount:number}>{
 try{const db=await getDbPool();if(db)return await rankTrendSql(db,company,keyword,current);}catch(error){observationFailure(error);}
 assertNotProductionFallback('calculateHistoricalTrend');const rows=inMemoryRankObservations.filter(row=>row.company_id===company&&row.keyword.toLowerCase()===keyword.toLowerCase()).sort((a,b)=>b.timestamp.localeCompare(a.timestamp)||b.id.localeCompare(a.id));
 const times=[...new Set(rows.map(row=>row.timestamp))].slice(0,5),empty={previousRank:null,diff:null,historyCount:times.length};if(times.length<2)return empty;
 const latest=rows.find(row=>row.timestamp===times[0]&&row.grid_index===4),previous=rows.find(row=>row.timestamp===times[1]&&row.grid_index===4);
 if(!latest||!previous||![latest,previous].every(row=>['LIVE','VERIFIED'].includes(row.status))||latest.provider!==previous.provider||latest.latitude!==previous.latitude||latest.longitude!==previous.longitude||latest.position!==current)return empty;
 return {previousRank:previous.position,diff:previous.position!==null&&current!==null?previous.position-current:null,historyCount:times.length};
}
export async function saveCompetitorObservation(input:DbCompetitorObservation):Promise<void>{
 const row=normalizeCompetitor(input);try{const db=await getDbPool();if(db){await saveCompetitorSql(db,row);return;}}catch(error){observationFailure(error);}
 assertNotProductionFallback('saveCompetitorObservation');const existing=inMemoryCompetitorObservations.find(old=>old.id===row.id);if(existing&&JSON.stringify(existing)!==JSON.stringify(row))throw new ObservationError('OBSERVATION_IDENTITY_CONFLICT',409);if(!existing)inMemoryCompetitorObservations.unshift({...row});
}
export async function saveCompetitorObservations(rows:DbCompetitorObservation[]):Promise<void>{for(const row of rows)await saveCompetitorObservation(row);}
export async function getCompetitorObservationHistory(company:string,competitor:string,limit=50):Promise<DbCompetitorObservation[]>{
 observationLimit(limit);try{const db=await getDbPool();if(db)return await readCompetitorsSql(db,company,competitor,limit);}catch(error){observationFailure(error);}
 assertNotProductionFallback('getCompetitorObservationHistory');return inMemoryCompetitorObservations.filter(row=>row.company_id===company&&row.competitor_id===competitor).sort((a,b)=>b.timestamp.localeCompare(a.timestamp)||b.id.localeCompare(a.id)).slice(0,limit).map(row=>({...row}));
}
export async function getLatestCompetitorObservations(company:string):Promise<DbCompetitorObservation[]>{
 try{const db=await getDbPool();if(db)return await readCompetitorsSql(db,company);}catch(error){observationFailure(error);}
 assertNotProductionFallback('getLatestCompetitorObservations');const map=new Map<string,DbCompetitorObservation>();for(const row of [...inMemoryCompetitorObservations].sort((a,b)=>b.timestamp.localeCompare(a.timestamp)||b.id.localeCompare(a.id)))if(row.company_id===company&&!map.has(row.competitor_id))map.set(row.competitor_id,row);return [...map.values()].map(row=>({...row}));
}
export async function getCompetitorHistoricalBaseline(company:string,competitor:string):Promise<{latest:DbCompetitorObservation|null;current:DbCompetitorObservation|null;previous:DbCompetitorObservation|null}>{
 const history=await getCompetitorObservationHistory(company,competitor,5);return {latest:history[0]??null,current:history[0]??null,previous:history[1]??null};
}

// ---------------- AUTONOMOUS GOVERNANCE & EXECUTION QUERIES ---------------- //

export async function createAutonomousRecommendation(
  rec: Omit<DbAutonomousRecommendation, 'id' | 'created_at'> & { id?: string }
): Promise<DbAutonomousRecommendation> {
  const id = rec.id || `rec_${crypto.randomUUID().replace(/-/g, '')}`;
  const now = new Date().toISOString();
  const fullRec: DbAutonomousRecommendation = {
    id,
    company_id: rec.company_id,
    observation: rec.observation,
    evidence_ids: rec.evidence_ids || [],
    source: rec.source,
    timestamp: rec.timestamp || now,
    recommended_action: rec.recommended_action,
    action_type: rec.action_type,
    action_payload: rec.action_payload,
    affected_metric: rec.affected_metric,
    confidence: rec.confidence ?? 85,
    risk: rec.risk || 'medium',
    approval_requirement: rec.approval_requirement || 'required',
    status: rec.status || 'pending',
    created_at: now,
  };

  try {
    const db = await getDbPool();
    if (db) {
      await db.query(
        `INSERT INTO autonomous_recommendations 
        (id, company_id, observation, evidence_ids, source, timestamp, recommended_action, action_type, action_payload, affected_metric, confidence, risk, approval_requirement, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?))`,
        [
          fullRec.id,
          fullRec.company_id,
          fullRec.observation,
          JSON.stringify(fullRec.evidence_ids),
          fullRec.source,
          fullRec.timestamp,
          fullRec.recommended_action,
          fullRec.action_type,
          fullRec.action_payload ? JSON.stringify(fullRec.action_payload) : null,
          fullRec.affected_metric,
          fullRec.confidence,
          fullRec.risk,
          fullRec.approval_requirement,
          fullRec.status,
          Date.parse(fullRec.created_at)/1000,
        ]
      );
      return fullRec;
    }
  } catch (err: any) {
    handleDbError('createAutonomousRecommendation', err);
  }

  assertNotProductionFallback('createAutonomousRecommendation');
  inMemoryAutonomousRecommendations.unshift(fullRec);
  return fullRec;
}

export async function getAutonomousRecommendationsByCompany(
  companyId: string,
  limit = 50
): Promise<DbAutonomousRecommendation[]> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query(
        'SELECT autonomous_recommendations.*, UNIX_TIMESTAMP(created_at)*1000 AS created_at_ms FROM autonomous_recommendations WHERE company_id = ? ORDER BY created_at DESC LIMIT ?',
        [companyId, limit]
      );
      if (rows) {
        return rows.map((r: any) => ({
          id: r.id,
          company_id: r.company_id,
          observation: r.observation,
          evidence_ids: typeof r.evidence_ids === 'string' ? JSON.parse(r.evidence_ids) : (r.evidence_ids || []),
          source: r.source,
          timestamp: r.timestamp,
          recommended_action: r.recommended_action,
          action_type: r.action_type,
          action_payload: typeof r.action_payload === 'string' ? JSON.parse(r.action_payload) : r.action_payload,
          affected_metric: r.affected_metric,
          confidence: Number(r.confidence),
          risk: r.risk,
          approval_requirement: r.approval_requirement,
          status: r.status,
          created_at: r.created_at_ms != null ? new Date(Number(r.created_at_ms)).toISOString() : r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
        }));
      }
    }
  } catch (err: any) {
    handleDbError('getAutonomousRecommendationsByCompany', err);
  }

  assertNotProductionFallback('getAutonomousRecommendationsByCompany');
  return inMemoryAutonomousRecommendations
    .filter((r) => r.company_id === companyId)
    .slice(0, limit);
}

export async function updateAutonomousRecommendationStatus(
  id: string,
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'dismissed'
): Promise<boolean> {
  try {
    const db = await getDbPool();
    if (db) {
      const [result]:any=await db.query('UPDATE autonomous_recommendations SET status = ? WHERE id = ?', [status, id]);
      return result.affectedRows > 0;
    }
  } catch (err: any) {
    handleDbError('updateAutonomousRecommendationStatus', err);
  }

  assertNotProductionFallback('updateAutonomousRecommendationStatus');
  const inMem = inMemoryAutonomousRecommendations.find((r) => r.id === id);
  if (inMem) {
    inMem.status = status;
    return true;
  }
  return false;
}

export async function createAutonomousAction(
  action: Omit<DbAutonomousAction, 'id' | 'created_at'> & { id?: string }
): Promise<DbAutonomousAction> {
  const id = action.id || `act_${crypto.randomUUID().replace(/-/g, '')}`;
  const now = new Date().toISOString();
  const fullAction: DbAutonomousAction = {
    id,
    company_id: action.company_id,
    recommendation_id: action.recommendation_id || null,
    action_type: action.action_type,
    payload: action.payload,
    source_evidence: action.source_evidence,
    approval_status: action.approval_status || 'pending_approval',
    execution_state: action.execution_state || 'idle',
    provider_response: action.provider_response,
    verification_state: action.verification_state || 'unverified',
    error: action.error || null,
    executed_at: action.executed_at || null,
    created_at: now,
  };

  try {
    const db = await getDbPool();
    if (db) {
      await db.query(
        `INSERT INTO autonomous_actions 
        (id, company_id, recommendation_id, action_type, payload, source_evidence, approval_status, execution_state, provider_response, verification_state, error, executed_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?))`,
        [
          fullAction.id,
          fullAction.company_id,
          fullAction.recommendation_id,
          fullAction.action_type,
          fullAction.payload ? JSON.stringify(fullAction.payload) : null,
          fullAction.source_evidence ? JSON.stringify(fullAction.source_evidence) : null,
          fullAction.approval_status,
          fullAction.execution_state,
          fullAction.provider_response ? JSON.stringify(fullAction.provider_response) : null,
          fullAction.verification_state,
          fullAction.error,
          fullAction.executed_at,
          Date.parse(fullAction.created_at)/1000,
        ]
      );
      return fullAction;
    }
  } catch (err: any) {
    handleDbError('createAutonomousAction', err);
  }

  assertNotProductionFallback('createAutonomousAction');
  inMemoryAutonomousActions.unshift(fullAction);
  return fullAction;
}

export async function getAutonomousActionsByCompany(
  companyId: string,
  limit = 50
): Promise<DbAutonomousAction[]> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query(
        'SELECT autonomous_actions.*, UNIX_TIMESTAMP(created_at)*1000 AS created_at_ms FROM autonomous_actions WHERE company_id = ? ORDER BY created_at DESC LIMIT ?',
        [companyId, limit]
      );
      if (rows) {
        return rows.map((r: any) => ({
          id: r.id,
          company_id: r.company_id,
          recommendation_id: r.recommendation_id,
          action_type: r.action_type,
          payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
          source_evidence: typeof r.source_evidence === 'string' ? JSON.parse(r.source_evidence) : r.source_evidence,
          approval_status: r.approval_status,
          execution_state: r.execution_state,
          provider_response: typeof r.provider_response === 'string' ? JSON.parse(r.provider_response) : r.provider_response,
          verification_state: r.verification_state,
          error: r.error,
          executed_at: r.executed_at,
          created_at: r.created_at_ms != null ? new Date(Number(r.created_at_ms)).toISOString() : r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
        }));
      }
    }
  } catch (err: any) {
    handleDbError('getAutonomousActionsByCompany', err);
  }

  assertNotProductionFallback('getAutonomousActionsByCompany');
  return inMemoryAutonomousActions
    .filter((a) => a.company_id === companyId)
    .slice(0, limit);
}

export async function getAutonomousActionById(id: string): Promise<DbAutonomousAction | null> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query('SELECT autonomous_actions.*, UNIX_TIMESTAMP(created_at)*1000 AS created_at_ms FROM autonomous_actions WHERE id = ? LIMIT 1', [id]);
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id,
          company_id: r.company_id,
          recommendation_id: r.recommendation_id,
          action_type: r.action_type,
          payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
          source_evidence: typeof r.source_evidence === 'string' ? JSON.parse(r.source_evidence) : r.source_evidence,
          approval_status: r.approval_status,
          execution_state: r.execution_state,
          provider_response: typeof r.provider_response === 'string' ? JSON.parse(r.provider_response) : r.provider_response,
          verification_state: r.verification_state,
          error: r.error,
          executed_at: r.executed_at,
          created_at: r.created_at_ms != null ? new Date(Number(r.created_at_ms)).toISOString() : r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
        };
      }
      return null;
    }
  } catch (err: any) {
    handleDbError('getAutonomousActionById', err);
  }

  assertNotProductionFallback('getAutonomousActionById');
  return inMemoryAutonomousActions.find((a) => a.id === id) || null;
}

export async function updateAutonomousAction(
  id: string,
  updates: Partial<DbAutonomousAction>
): Promise<DbAutonomousAction | null> {
  try {
    const db = await getDbPool();
    if (db) {
      const setClauses: string[] = [];
      const values: any[] = [];

      if (updates.approval_status !== undefined) {
        setClauses.push('approval_status = ?');
        values.push(updates.approval_status);
      }
      if (updates.execution_state !== undefined) {
        setClauses.push('execution_state = ?');
        values.push(updates.execution_state);
      }
      if (updates.provider_response !== undefined) {
        setClauses.push('provider_response = ?');
        values.push(updates.provider_response ? JSON.stringify(updates.provider_response) : null);
      }
      if (updates.verification_state !== undefined) {
        setClauses.push('verification_state = ?');
        values.push(updates.verification_state);
      }
      if (updates.error !== undefined) {
        setClauses.push('error = ?');
        values.push(updates.error);
      }
      if (updates.executed_at !== undefined) {
        setClauses.push('executed_at = ?');
        values.push(updates.executed_at);
      }

      if (setClauses.length > 0) {
        values.push(id);
        await db.query(`UPDATE autonomous_actions SET ${setClauses.join(', ')} WHERE id = ?`, values);
      }
      return await getAutonomousActionById(id);
    }
  } catch (err: any) {
    handleDbError('updateAutonomousAction', err);
  }

  assertNotProductionFallback('updateAutonomousAction');
  const inMem = inMemoryAutonomousActions.find((a) => a.id === id);
  if (inMem) {
    Object.assign(inMem, updates);
    return inMem;
  }
  return null;
}

export async function recordAutonomousAuditLog(
  log: Omit<DbAutonomousAuditLog, 'id' | 'timestamp'> & { id?: string }
): Promise<DbAutonomousAuditLog> {
  const id = log.id || `aal_${crypto.randomUUID().replace(/-/g, '')}`;
  const now = new Date().toISOString();
  const fullLog: DbAutonomousAuditLog = {
    id,
    company_id: log.company_id,
    action_id: log.action_id || null,
    actor: log.actor,
    event_type: log.event_type,
    details: log.details,
    timestamp: now,
  };

  try {
    const db = await getDbPool();
    if (db) {
      await db.query(
        `INSERT INTO autonomous_audit_logs (id, company_id, action_id, actor, event_type, details, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?))`,
        [
          fullLog.id,
          fullLog.company_id,
          fullLog.action_id,
          fullLog.actor,
          fullLog.event_type,
          fullLog.details ? JSON.stringify(fullLog.details) : null,
          Date.parse(fullLog.timestamp)/1000,
        ]
      );
      return fullLog;
    }
  } catch (err: any) {
    handleDbError('recordAutonomousAuditLog', err);
  }

  assertNotProductionFallback('recordAutonomousAuditLog');
  inMemoryAutonomousAuditLogs.unshift(fullLog);
  return fullLog;
}

export async function getAutonomousAuditLogsByCompany(
  companyId: string,
  limit = 50
): Promise<DbAutonomousAuditLog[]> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query(
        'SELECT autonomous_audit_logs.*, UNIX_TIMESTAMP(timestamp)*1000 AS timestamp_ms FROM autonomous_audit_logs WHERE company_id = ? ORDER BY timestamp DESC LIMIT ?',
        [companyId, limit]
      );
      if (rows) {
        return rows.map((r: any) => ({
          id: r.id,
          company_id: r.company_id,
          action_id: r.action_id,
          actor: r.actor,
          event_type: r.event_type,
          details: typeof r.details === 'string' ? JSON.parse(r.details) : r.details,
          timestamp: r.timestamp_ms != null ? new Date(Number(r.timestamp_ms)).toISOString() : r.timestamp instanceof Date ? r.timestamp.toISOString() : String(r.timestamp),
        }));
      }
    }
  } catch (err: any) {
    handleDbError('getAutonomousAuditLogsByCompany', err);
  }

  assertNotProductionFallback('getAutonomousAuditLogsByCompany');
  return inMemoryAutonomousAuditLogs
    .filter((l) => l.company_id === companyId)
    .slice(0, limit);
}

// ---------------- PERSISTENT JOB QUEUE (HOSTINGER SHARED-SAFE WORKER ENGINE) ---------------- //

export async function enqueueJob(options: {
  company_id: string;
  job_type: string;
  payload: Record<string, any>;
  idempotency_key?: string;
  scheduled_for?: string;
  max_attempts?: number;
  requested_by?: string;
}): Promise<DbJobQueue> {
  const scheduledTime = options.scheduled_for || new Date().toISOString();
  const maxAttempts = options.max_attempts || 3;
  const newJob: DbJobQueue = {
    requested_by: options.requested_by,
    id: `jq_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
    company_id: options.company_id,
    job_type: options.job_type,
    payload: options.payload,
    status: 'QUEUED',
    attempts: 0,
    max_attempts: maxAttempts,
    idempotency_key: options.idempotency_key || null,
    scheduled_for: scheduledTime,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const db = await getDbPool();
    if (db) {
      return await enqueueSqlJob(db, newJob);
    }
  } catch (err: any) {
    handleDbError('enqueueJob', err);
  }

  assertNotProductionFallback('enqueueJob');

  if (options.idempotency_key) {
    const existing = inMemoryJobQueue.find(
      (j) => j.company_id === options.company_id && j.idempotency_key === options.idempotency_key
    );
    if (existing) return existing;
  }

  inMemoryJobQueue.push(newJob);
  return newJob;
}

export async function claimNextJob(
  workerId: string,
  supportedTypes?: string[]
): Promise<DbJobQueue | null> {
  const nowIso = new Date().toISOString();
  try {
    const db = await getDbPool();
    if (db) {
      return await claimSqlJob(db, workerId, supportedTypes);
    }
  } catch (err: any) {
    handleDbError('claimNextJob', err);
  }

  assertNotProductionFallback('claimNextJob');

  const nowMs = Date.now();
  for (const queued of inMemoryJobQueue) {
    if (supportedTypes?.length && !supportedTypes.includes(queued.job_type)) continue;
    const due = Date.parse(queued.scheduled_for) <= nowMs;
    const stalled = queued.status === 'RUNNING' && queued.locked_at && Date.parse(queued.locked_at) < nowMs - 5 * 60 * 1000;
    if ((queued.attempts-(queued.deferrals || 0)) >= queued.max_attempts && (((queued.status === 'QUEUED' || queued.status === 'RETRY_WAIT') && due) || stalled)) {
      queued.status = 'FAILED'; queued.error_message = 'ATTEMPTS_EXHAUSTED'; queued.locked_at = null; queued.locked_by = null;
    }
  }
  const candidate = inMemoryJobQueue.find((j) => {
    if (supportedTypes && supportedTypes.length > 0 && !supportedTypes.includes(j.job_type)) {
      return false;
    }
    const schedMs = Date.parse(j.scheduled_for);
    const isDue = isNaN(schedMs) || schedMs <= nowMs;
    const isPending = (j.status === 'QUEUED' || j.status === 'RETRY_WAIT') && isDue;
    const isStalled = j.status === 'RUNNING' && j.locked_at && (nowMs - Date.parse(j.locked_at) > 5 * 60 * 1000);
    return isPending || isStalled;
  });

  if (candidate) {
    candidate.status = 'RUNNING';
    candidate.locked_at = nowIso;
    candidate.locked_by = workerId;
    candidate.attempts += 1;
    candidate.updated_at = nowIso;
    return { ...candidate };
  }

  return null;
}

export async function renewJobLease(jobId: string, lease: QueueLease): Promise<boolean> {
  const db = await getDbPool();
  if (db) return renewSqlJobLease(db, jobId, lease);
  assertNotProductionFallback('renewJobLease');
  const job = inMemoryJobQueue.find(j => j.id === jobId);
  if (!job || !ownsJobLease(job, lease)) return false;
  job.locked_at = new Date().toISOString();
  return true;
}

export async function completeJob(
  jobId: string,
  result?: Record<string, any>,
  lease?: QueueLease
): Promise<DbJobQueue | null> {
  const nowIso = new Date().toISOString();
  try {
    const db = await getDbPool();
    if (db) {
      return await completeSqlJob(db, jobId, result, lease);
    }
  } catch (err: any) {
    handleDbError('completeJob', err);
  }

  assertNotProductionFallback('completeJob');

  const job = inMemoryJobQueue.find((j) => j.id === jobId);
  if (job && ownsJobLease(job, lease)) {
    job.status = 'SUCCEEDED';
    job.result = result || null;
    job.locked_at = null;
    job.locked_by = null;
    job.error_message = null;
    job.updated_at = nowIso;
    return job;
  }
  return null;
}

export async function failJob(
  jobId: string,
  errorMessage: string,
  retryable = true,
  lease?: QueueLease
): Promise<DbJobQueue | null> {
  const nowIso = new Date().toISOString();
  try {
    const db = await getDbPool();
    if (db) {
      return await failSqlJob(db, jobId, errorMessage, retryable, lease);
    }
  } catch (err: any) {
    handleDbError('failJob', err);
  }

  assertNotProductionFallback('failJob');

  const job = inMemoryJobQueue.find((j) => j.id === jobId);
  if (job && ownsJobLease(job, lease)) {
    if (!retryable || (job.attempts-(job.deferrals || 0)) >= job.max_attempts) {
      job.status = 'FAILED';
    } else {
      job.status = 'RETRY_WAIT';
      const backoffSec = Math.max(1,job.attempts-(job.deferrals || 0)) * 30;
      job.scheduled_for = new Date(Date.now() + backoffSec * 1000).toISOString();
    }
    job.error_message = errorMessage;
    job.locked_at = null;
    job.locked_by = null;
    job.updated_at = nowIso;
    return job;
  }
  return null;
}

export async function getJobById(jobId: string): Promise<DbJobQueue | null> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query('SELECT * FROM job_queue WHERE id = ? LIMIT 1', [jobId]);
      if (rows && rows.length > 0) {
        const row = rows[0];
        return {
          ...row,
          payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
          result: typeof row.result === 'string' ? JSON.parse(row.result) : row.result,
        };
      }
      return null;
    }
  } catch (err: any) {
    handleDbError('getJobById', err);
  }

  assertNotProductionFallback('getJobById');
  return inMemoryJobQueue.find((j) => j.id === jobId) || null;
}

export async function getJobsByCompany(companyId: string, limit = 50): Promise<DbJobQueue[]> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query(
        'SELECT * FROM job_queue WHERE company_id = ? ORDER BY created_at DESC LIMIT ?',
        [companyId, limit]
      );
      if (rows && rows.length > 0) {
        return rows.map((row: any) => ({
          ...row,
          payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
          result: typeof row.result === 'string' ? JSON.parse(row.result) : row.result,
        }));
      }
      return [];
    }
  } catch (err: any) {
    handleDbError('getJobsByCompany', err);
  }

  assertNotProductionFallback('getJobsByCompany');
  return inMemoryJobQueue
    .filter((j) => j.company_id === companyId)
    .slice(0, limit);
}

export async function cancelJob(jobId: string, companyId?: string): Promise<DbJobQueue | null> {
  const nowIso = new Date().toISOString();
  try {
    const db = await getDbPool();
    if (db) return await cancelSqlJob(db, jobId, companyId);
  } catch (err: any) {
    handleDbError('cancelJob', err);
  }

  assertNotProductionFallback('cancelJob');

  const job = inMemoryJobQueue.find((j) => j.id === jobId && (!companyId || j.company_id === companyId));
  if (job && (job.status === 'QUEUED' || job.status === 'RETRY_WAIT')) {
    job.status = 'CANCELLED';
    job.locked_at = null;
    job.locked_by = null;
    job.updated_at = nowIso;
    return job;
  }
  return null;
}

export async function getPendingJobsCount(companyId?: string): Promise<{ queued: number; running: number; failed: number }> {
  try {
    const db = await getDbPool();
    if (db) {
      const whereComp = companyId ? 'WHERE company_id = ?' : '';
      const params = companyId ? [companyId] : [];
      const [rows]: any = await db.query(
        `SELECT status, COUNT(*) as cnt FROM job_queue ${whereComp} GROUP BY status`,
        params
      );
      const counts = { queued: 0, running: 0, failed: 0 };
      if (rows && Array.isArray(rows)) {
        for (const r of rows) {
          if (r.status === 'QUEUED' || r.status === 'RETRY_WAIT') counts.queued += Number(r.cnt);
          if (r.status === 'RUNNING') counts.running += Number(r.cnt);
          if (r.status === 'FAILED') counts.failed += Number(r.cnt);
        }
      }
      return counts;
    }
  } catch (err: any) {
    handleDbError('getPendingJobsCount', err);
  }

  assertNotProductionFallback('getPendingJobsCount');

  const list = companyId ? inMemoryJobQueue.filter((j) => j.company_id === companyId) : inMemoryJobQueue;
  return {
    queued: list.filter((j) => j.status === 'QUEUED' || j.status === 'RETRY_WAIT').length,
    running: list.filter((j) => j.status === 'RUNNING').length,
    failed: list.filter((j) => j.status === 'FAILED').length,
  };
}







export async function deferJob(id:string,reason:PauseReason,lease?:QueueLease):Promise<DbJobQueue|null>{
 if(!PAUSE_REASONS.includes(reason))throw new Error('INVALID_PAUSE_REASON');
 const pool=await getDbPool();if(pool)return deferSqlJob(pool,id,reason,lease);
 assertNotProductionFallback('deferJob');
 const job=inMemoryJobQueue.find(row=>row.id===id);
 if(!job || !ownsJobLease(job,lease))return null;
 job.deferrals=(job.deferrals || 0)+(job.status==='RUNNING'?1:0);
 job.status='RETRY_WAIT';job.scheduled_for=new Date(Date.now()+60000).toISOString();job.error_message=reason;
 job.locked_at=null;job.locked_by=null;job.updated_at=new Date().toISOString();return {...job};
}
