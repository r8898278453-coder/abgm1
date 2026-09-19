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
  score: number;
  rank_position?: number;
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
  stage: 'new' | 'contacted' | 'qualified' | 'quotation' | 'won' | 'lost';
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

export interface DbReview {
  id: string;
  company_id: string;
  author: string;
  rating: number;
  date: string;
  relative_time?: string;
  content: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  topic?: string;
  is_operational_issue?: boolean;
  replied: boolean;
  reply_text?: string;
  reply_date?: string;
  source: 'google' | 'facebook' | 'justdial';
  created_at?: string;
}

export interface DbContentPost {
  id: string;
  company_id: string;
  title?: string;
  type?: string;
  platforms?: string[];
  channel?: string;
  headline?: string;
  caption: string;
  cta?: string;
  image_url?: string;
  video_url?: string;
  status: 'draft' | 'pending_approval' | 'scheduled' | 'published';
  scheduled_date?: string;
  scheduled_time?: string;
  time_slot?: string;
  hashtags?: string[];
  reel_script?: any[];
  created_at?: string;
}

export interface DbIntegration {
  id: string;
  company_id: string;
  provider: string;
  status: 'connected' | 'disconnected' | 'error';
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
  status: 'active' | 'past_due' | 'cancelled' | 'trialing';
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
  status: 'active' | 'pending_verification' | 'failed';
  ssl_status: 'active' | 'provisioning' | 'expired';
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

let pool: mysql.Pool | null = null;
let isMySqlAvailable = false;
let tablesInitialized = false;
let poolInitPromise: Promise<mysql.Pool | null> | null = null;
let lastFailureTime = 0;
let hasLoggedFailure = false;
const RETRY_COOLDOWN_MS = 60000;
const inMemoryCompanyAssets: DbCompanyAsset[] = [];
const inMemoryThemeHistory: DbThemeHistory[] = [];

const inMemoryCustomDomains: DbCustomDomain[] = [
  {
    id: 'dom_bga_aaditechs',
    company_id: 'comp_aaditech_main',
    domain: 'bga.aaditechs.in',
    status: 'active',
    ssl_status: 'active',
    cname_target: 'cname.bga.aaditechs.in',
    a_record_target: '77.37.54.108',
    dns_txt_record: 'bga-site-verification=aaditech_main_prod_2026',
    verified_at: '2026-09-01T00:00:00.000Z',
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
  },
];

const inMemoryWebsiteConfigs: DbWebsiteConfig[] = [
  {
    id: 'web_aaditech_main',
    company_id: 'comp_aaditech_main',
    subdomain: 'aaditech',
    primary_color: '#4f46e5',
    secondary_color: '#06b6d4',
    tagline: 'Autonomous AI Growth Engine & Local SEO Authority',
    hero_title: 'Aaditech Solution - Official Services Hub',
    hero_subtitle: 'Trusted Professional Solutions serving clients across Thane, Mumbai MMR & Navi Mumbai with guaranteed satisfaction.',
    meta_description: 'Official storefront and local SEO hub for Aaditech Solution Private Limited.',
    keywords: 'local seo, it services, software development, thane, mumbai',
    enable_whatsapp_cta: true,
    enable_direct_call_cta: true,
    enable_inquiry_form: true,
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
  },
];

const inMemoryInvoices: DbInvoice[] = [
  {
    id: 'INV-2026-0901',
    company_id: 'comp_aaditech_main',
    date: '2026-09-01',
    plan: 'Growth Tier (Monthly)',
    amount: 799.00,
    gst_amount: 143.82,
    total_amount: 942.82,
    payment_method: 'UPI / Razorpay (r8898278453@okaxis)',
    payment_id: 'pay_RzpGrowthSep26',
    order_id: 'order_RzpGwt901',
    customer_name: 'Aaditech Solution Private Limited',
    customer_email: 'info@aaditechs.in',
    customer_phone: '+91 22 4963 8603',
    status: 'Paid',
    hsn_code: '998314',
    created_at: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'INV-2026-0801',
    company_id: 'comp_aaditech_main',
    date: '2026-08-01',
    plan: 'Growth Tier (Monthly)',
    amount: 799.00,
    gst_amount: 143.82,
    total_amount: 942.82,
    payment_method: 'UPI / Razorpay (r8898278453@okaxis)',
    payment_id: 'pay_RzpGrowthAug26',
    order_id: 'order_RzpGwt801',
    customer_name: 'Aaditech Solution Private Limited',
    customer_email: 'info@aaditechs.in',
    customer_phone: '+91 22 4963 8603',
    status: 'Paid',
    hsn_code: '998314',
    created_at: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'INV-2026-0701',
    company_id: 'comp_aaditech_main',
    date: '2026-07-01',
    plan: 'Starter Tier (Intro)',
    amount: 499.00,
    gst_amount: 89.82,
    total_amount: 588.82,
    payment_method: 'Net Banking (HDFC Bank)',
    payment_id: 'pay_RzpStarterJul26',
    order_id: 'order_RzpStr701',
    customer_name: 'Aaditech Solution Private Limited',
    customer_email: 'info@aaditechs.in',
    customer_phone: '+91 22 4963 8603',
    status: 'Paid',
    hsn_code: '998314',
    created_at: '2026-07-01T10:00:00.000Z',
  },
];

const inMemorySubscriptions: DbSubscription[] = [
  {
    id: 'sub_aaditech_growth',
    company_id: 'comp_aaditech_main',
    plan_id: 'growth',
    plan_name: 'Growth Tier',
    status: 'active',
    amount: 799.00,
    billing_cycle: 'monthly',
    current_period_start: '2026-09-01T00:00:00.000Z',
    current_period_end: '2026-10-01T00:00:00.000Z',
    created_at: '2026-07-01T10:00:00.000Z',
    updated_at: '2026-09-01T10:00:00.000Z',
  },
];

export function handleDbError(context: string, err: any) {
  if (
    err?.code === 'ECONNREFUSED' ||
    err?.code === 'ETIMEDOUT' ||
    err?.code === 'ENOTFOUND' ||
    err?.code === 'PROTOCOL_CONNECTION_LOST' ||
    (typeof err?.message === 'string' && err.message.includes('ECONNREFUSED'))
  ) {
    const wasAvailable = isMySqlAvailable;
    isMySqlAvailable = false;
    if (pool) {
      pool.end().catch(() => {});
      pool = null;
    }
    lastFailureTime = Date.now();
    if (wasAvailable && !hasLoggedFailure) {
      console.warn(`[Hostinger MySQL] Connection lost (${err?.message}). Running with resilient in-memory store.`);
      hasLoggedFailure = true;
    }
    return;
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

export async function upgradeUserPassword(userId: string, newPlainPassword: string): Promise<void> {
  try {
    const memUser = inMemoryUsers.find((u) => u.id === userId);
    let currentHash = memUser?.password_hash;
    let currentSalt = memUser?.salt;

    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query('SELECT password_hash, salt FROM users WHERE id = ? LIMIT 1', [userId]);
      if (rows && rows.length > 0) {
        currentHash = rows[0].password_hash;
        currentSalt = rows[0].salt;
      }
    }

    if (currentSalt && currentHash) {
      const expectedPrimary = crypto.pbkdf2Sync(newPlainPassword, currentSalt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
      if (safeTimingCompare(expectedPrimary, currentHash)) {
        // Already hashed with OWASP 210,000 iterations
        return;
      }
    }

    const { hash, salt } = hashPassword(newPlainPassword);
    if (db) {
      await db.query('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?', [hash, salt, userId]);
    }
    if (memUser) {
      memUser.password_hash = hash;
      memUser.salt = salt;
    }
    console.log(`[Security] Upgraded user password hash to OWASP 210,000 iterations for user: ${userId}`);
  } catch (err: any) {
    console.warn('[upgradeUserPassword] error:', err?.message);
  }
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

const defaultSeedCompany: DbCompany = {
  id: 'comp_aaditech_main',
  user_id: 'usr_system_default',
  name: 'Aaditech Solution',
  legal_name: 'Aaditech Solution Private Limited',
  category: 'IT Services, Software Development & Local SEO Growth Engine',
  city: 'Thane - Mumbai MMR',
  phone: '+91 22 4963 8603',
  website: 'https://bga.aaditechs.in',
  google_place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
  autopilot_enabled: true,
  score: 82,
  rank_position: 2,
  created_at: new Date().toISOString(),
};

const inMemoryCompanies: DbCompany[] = [defaultSeedCompany];
const inMemoryCompanyData: Record<string, DbCompanyData> = {};
const inMemoryLeads: DbLead[] = [];
const inMemoryPasswordResetTokens: DbPasswordResetToken[] = [];

export const defaultSeedReviews: DbReview[] = [
  {
    id: 'rev_1',
    company_id: 'comp_aaditech_main',
    author: 'Rajesh Singhania (Singhania Logistics)',
    rating: 5,
    date: '2026-09-03',
    relative_time: 'Yesterday',
    content: 'Aaditech Solution built our complete fleet tracking portal and dispatch software. Their team in Thane delivered within 4 weeks and provided seamless training. Super professional and responsive team!',
    sentiment: 'positive',
    topic: 'Custom Logistics Software & Fast Delivery',
    is_operational_issue: false,
    replied: false,
    source: 'google',
  },
  {
    id: 'rev_2',
    company_id: 'comp_aaditech_main',
    author: 'Dr. Neha Patwardhan (Patwardhan Dental Care)',
    rating: 5,
    date: '2026-09-02',
    relative_time: '2 days ago',
    content: 'They developed our clinic website and set up automated WhatsApp appointment booking. Within 3 weeks of their Local SEO work, our clinic is ranking #1 on Google Maps in our area. Huge boost in patient inquiries!',
    sentiment: 'positive',
    topic: 'Clinic Website, WhatsApp Booking & Local SEO',
    is_operational_issue: false,
    replied: false,
    source: 'google',
  },
  {
    id: 'rev_3',
    company_id: 'comp_aaditech_main',
    author: 'Kunal Gokhale (Apex Retailers)',
    rating: 4,
    date: '2026-09-01',
    relative_time: '3 days ago',
    content: 'Great experience with our e-commerce Android app development. App is fast and smooth. Took slightly longer for Google Play Store verification than expected, but Aaditech handled all compliance smoothly.',
    sentiment: 'positive',
    topic: 'Android App & Play Store Deployment',
    is_operational_issue: false,
    replied: false,
    source: 'google',
  },
  {
    id: 'rev_4',
    company_id: 'comp_aaditech_main',
    author: 'Sunil Nair (Nair Financial Consultancy)',
    rating: 5,
    date: '2026-08-30',
    relative_time: '5 days ago',
    content: 'Top-notch IT AMC and cloud server migration. Aaditech migrated our database to a secure cloud server with zero downtime. Reliable IT support in Mumbai MMR.',
    sentiment: 'positive',
    topic: 'Cloud Migration & IT Support',
    is_operational_issue: false,
    replied: true,
    reply_text: 'Thank you Sunil ji! We are committed to keeping your financial data secure and your business infrastructure running at 99.9% uptime.',
    reply_date: '2026-08-31',
    source: 'google',
  },
  {
    id: 'rev_5',
    company_id: 'comp_aaditech_main',
    author: 'Vikram Joshi (Joshi Engineering Works)',
    rating: 3,
    date: '2026-08-27',
    relative_time: '8 days ago',
    content: 'Website design is modern and clean. Minor delay during the initial revision phase, but final output is good.',
    sentiment: 'neutral',
    topic: 'Design Revisions & Timelines',
    is_operational_issue: false,
    replied: false,
    source: 'google',
  },
];

export const defaultSeedPosts: DbContentPost[] = [
  {
    id: 'post_1',
    company_id: 'comp_aaditech_main',
    title: 'Transform Your Business with Custom Web & Mobile App in 2026',
    type: 'offer',
    platforms: ['google', 'instagram', 'facebook', 'whatsapp'],
    channel: 'google',
    headline: '🚀 Upgrade Your Business with a High-Converting Website & Custom Android App!',
    caption: 'Are outdated tools slowing down your business growth? 💻 At Aaditech Solution (aaditechs.in), we craft high-speed business websites, custom Android/iOS applications, and automated WhatsApp CRM solutions that convert visitors into loyal paying customers. Book your free IT consultation today!',
    cta: 'Book Free Consultation on WhatsApp',
    hashtags: ['#AaditechSolution', '#WebDevelopment', '#AppDeveloperMumbai', '#LocalSEO', '#BusinessGrowth'],
    image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80',
    status: 'scheduled',
    scheduled_date: '2026-09-06',
    scheduled_time: '2026-09-06 10:30:00',
    time_slot: '10:30 AM',
    reel_script: [
      { scene: '0-4s', visual: 'Business owner overwhelmed by messy paper registers and manual customer inquiries', audio: 'Still managing your business customer inquiries manually in 2026?' },
      { scene: '4-9s', visual: 'Smooth modern dashboard on laptop and sleek Android mobile app designed by Aaditech', audio: 'Automate your lead pipeline with a custom website and WhatsApp booking engine by Aaditech Solution.' },
      { scene: '9-15s', visual: 'Happy business owner checking Google 3-Pack #1 ranking on smartphone', audio: 'Get your customized business technology stack today. Visit aaditechs.in or WhatsApp us!' },
    ],
  },
  {
    id: 'post_2',
    company_id: 'comp_aaditech_main',
    title: 'Google 3-Pack Dominance Case Study for Local Businesses',
    type: 'service',
    platforms: ['google', 'instagram', 'facebook'],
    channel: 'google',
    headline: '📈 How We Helped a Local Clinic Rank #1 on Google Maps in 21 Days',
    caption: 'Discover how Aaditech Solution optimized Google Business Profile, fixed citation inconsistencies, and automated client review requests to generate 180+ monthly patient calls.',
    cta: 'Read Full Case Study on aaditechs.in',
    hashtags: ['#GoogleMapsRanking', '#LocalSEOThane', '#DigitalMarketingIndia', '#Aaditech'],
    image_url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80',
    status: 'published',
    scheduled_date: '2026-09-02',
    scheduled_time: '2026-09-02 11:00:00',
    time_slot: '11:00 AM',
  },
  {
    id: 'post_3',
    company_id: 'comp_aaditech_main',
    title: '5 Costly Mistakes Indian Businesses Make with Outdated Websites',
    type: 'educational',
    platforms: ['google', 'instagram', 'facebook', 'whatsapp'],
    channel: 'instagram',
    headline: '⚠️ Is Your Business Website Losing 70% of Mobile Visitors?',
    caption: 'Slow loading speeds, lack of WhatsApp direct-chat buttons, and unoptimized Google Maps locations cost Thane businesses thousands in lost sales every week. Learn how to fix them.',
    cta: 'Get Free Website Audit Report',
    hashtags: ['#WebsiteAudit', '#SmallBusinessIndia', '#AaditechSolution', '#TechTips'],
    image_url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80',
    status: 'scheduled',
    scheduled_date: '2026-09-08',
    scheduled_time: '2026-09-08 17:00:00',
    time_slot: '5:00 PM',
  },
];

const inMemoryReviews: DbReview[] = [...defaultSeedReviews];
const inMemoryContentPosts: DbContentPost[] = [...defaultSeedPosts];

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
  return inMemoryCompanies[0]?.id || null;
}

// Initialize MySQL pool lazily & auto-create tables
export async function getDbPool(): Promise<mysql.Pool | null> {
  if (pool && isMySqlAvailable) return pool;

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  const port = Number(process.env.DB_PORT) || 3306;

  if (!host || !database || !user) {
    return null;
  }

  // If connection recently failed, do not hammer unreachable host on every query
  const now = Date.now();
  if (!isMySqlAvailable && lastFailureTime > 0 && now - lastFailureTime < RETRY_COOLDOWN_MS) {
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
      console.log(`[Hostinger MySQL] Successfully connected to database: ${database} at ${host}`);

      if (!tablesInitialized) {
        await autoInitializeTables(pool);
        tablesInitialized = true;
      }

      return pool;
    } catch (err: any) {
      if (!hasLoggedFailure) {
        console.warn(`[Hostinger MySQL] Could not connect to MySQL at ${host}:${port} (${err?.message}). Seamlessly running with resilient in-memory store.`);
        hasLoggedFailure = true;
      }
      if (candidatePool) {
        candidatePool.end().catch(() => {});
      }
      pool = null;
      isMySqlAvailable = false;
      lastFailureTime = Date.now();
      return null;
    } finally {
      poolInitPromise = null;
    }
  })();

  return poolInitPromise;
}

// Auto-create relational tables for users, companies, profiles & leads
async function autoInitializeTables(dbPool: mysql.Pool) {
  try {
    const connection = await dbPool.getConnection();
    try {
      // 1. Users table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          email VARCHAR(191) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          salt VARCHAR(64) NOT NULL,
          full_name VARCHAR(128) NOT NULL,
          role VARCHAR(32) DEFAULT 'owner',
          is_platform_admin TINYINT(1) NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // Ensure is_platform_admin column exists if table was created in an earlier schema
      try {
        const [adminCol]: any = await connection.query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'users'
            AND COLUMN_NAME = 'is_platform_admin'
        `);
        if (!adminCol || adminCol.length === 0) {
          console.log('[Hostinger MySQL] Self-healing schema: Adding missing is_platform_admin column to users table...');
          await connection.query(`
            ALTER TABLE users
            ADD COLUMN is_platform_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER role
          `);
          console.log('[Hostinger MySQL] Self-healing complete: is_platform_admin column added to users.');
        }
      } catch (colErr: any) {
        console.warn('[Hostinger MySQL] is_platform_admin column check notice:', colErr?.message);
      }

      // Optional: Seed initial admin in MySQL if explicitly configured in environment variables
      const envAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
      const envAdminPass = process.env.INITIAL_ADMIN_PASSWORD?.trim();
      if (envAdminEmail && envAdminPass) {
        const [existing]: any = await connection.query('SELECT id FROM users WHERE email = ? LIMIT 1', [envAdminEmail]);
        if (!existing || existing.length === 0) {
          const { hash: adminHash, salt: adminSalt } = hashPassword(envAdminPass);
          const adminId = `usr_${crypto.randomUUID().replace(/-/g, '')}`;
          const adminName = process.env.INITIAL_ADMIN_NAME?.trim() || 'System Administrator';
          await connection.query(`
            INSERT INTO users (id, email, password_hash, salt, full_name, role, is_platform_admin)
            VALUES (?, ?, ?, ?, ?, 'platform_admin', 1)
          `, [adminId, envAdminEmail, adminHash, adminSalt, adminName]);
          console.log(`[Hostinger MySQL] Initial administrator provisioned for: ${envAdminEmail} (is_platform_admin = 1)`);
        } else {
          // Ensure existing bootstrapped INITIAL_ADMIN has is_platform_admin = 1
          await connection.query('UPDATE users SET is_platform_admin = 1 WHERE email = ?', [envAdminEmail]);
        }
      }

      // 2. Companies table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS companies (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL,
          name VARCHAR(191) NOT NULL,
          legal_name VARCHAR(191),
          category VARCHAR(128) NOT NULL,
          city VARCHAR(128) NOT NULL,
          phone VARCHAR(64),
          website VARCHAR(255),
          google_place_id VARCHAR(128),
          autopilot_enabled TINYINT(1) DEFAULT 1,
          score INT DEFAULT 75,
          rank_position INT DEFAULT 3,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // Seed default flagship company if no companies exist yet
      const [existingCompanies]: any = await connection.query('SELECT id FROM companies LIMIT 1');
      if (!existingCompanies || existingCompanies.length === 0) {
        await connection.query(`
          INSERT INTO companies (id, user_id, name, legal_name, category, city, phone, website, google_place_id, autopilot_enabled, score, rank_position)
          VALUES ('comp_aaditech_main', 'usr_system_default', 'Aaditech Solution', 'Aaditech Solution Private Limited', 'IT Services, Software Development & Local SEO Growth Engine', 'Thane - Mumbai MMR', '+91 22 4963 8603', 'https://bga.aaditechs.in', 'ChIJN1t_tDeuEmsRUsoyG83frY4', 1, 82, 2)
        `);
        console.log('[Hostinger MySQL] Initial flagship company provisioned: comp_aaditech_main');
      }

      // 3. Company Data (Isolated metrics, audits, competitors, etc.)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS company_profiles_data (
          company_id VARCHAR(64) PRIMARY KEY,
          data_payload LONGTEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 4. Leads table with company isolation
      await connection.query(`
        CREATE TABLE IF NOT EXISTS leads (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) DEFAULT NULL,
          name VARCHAR(128) NOT NULL,
          company VARCHAR(128),
          phone VARCHAR(64) NOT NULL,
          email VARCHAR(191),
          service VARCHAR(191),
          budget VARCHAR(64),
          stage VARCHAR(32) DEFAULT 'new',
          intent_score INT DEFAULT 85,
          source VARCHAR(64),
          notes TEXT,
          ai_suggested_reply TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_company_lead (company_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // Proactive Self-Healing Migrations:
      // Verify and add company_id columns & indexes across child tables if imported from legacy schemas
      const tablesToCheck = [
        { table: 'leads', col: 'company_id', idx: 'idx_company_lead' },
        { table: 'reviews', col: 'company_id', idx: 'idx_company_review' },
        { table: 'content_posts', col: 'company_id', idx: 'idx_company_post' },
        { table: 'autonomous_actions', col: 'company_id', idx: 'idx_company_action' },
      ];

      for (const { table, col, idx } of tablesToCheck) {
        try {
          const [cols]: any = await connection.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
              AND COLUMN_NAME = ?
          `, [table, col]);
          if (!cols || cols.length === 0) {
            console.log(`[Hostinger MySQL] Self-healing schema: Adding missing ${col} column to ${table}...`);
            await connection.query(`
              ALTER TABLE \`${table}\`
              ADD COLUMN \`${col}\` VARCHAR(64) DEFAULT NULL AFTER id,
              ADD INDEX \`${idx}\` (\`${col}\`)
            `);
            console.log(`[Hostinger MySQL] Self-healing complete: ${col} column and index added to ${table}.`);
          }
        } catch (colErr: any) {
          console.warn(`[Hostinger MySQL] Column verification notice for ${table}:`, colErr?.message);
        }
      }

      // 5. Reviews table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS reviews (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) DEFAULT NULL,
          author VARCHAR(255) NOT NULL,
          rating INT DEFAULT 5,
          date VARCHAR(64) NOT NULL,
          relative_time VARCHAR(64),
          content TEXT NOT NULL,
          sentiment VARCHAR(32) DEFAULT 'positive',
          topic VARCHAR(128),
          is_operational_issue TINYINT(1) DEFAULT 0,
          replied TINYINT(1) DEFAULT 0,
          reply_text TEXT,
          reply_date VARCHAR(64),
          source VARCHAR(32) DEFAULT 'google',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_company_review (company_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 6. Content Posts table
      await connection.query(`
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
          image_url TEXT,
          status VARCHAR(32) DEFAULT 'scheduled',
          scheduled_date VARCHAR(64) DEFAULT NULL,
          scheduled_time VARCHAR(64) DEFAULT NULL,
          time_slot VARCHAR(64) DEFAULT NULL,
          hashtags TEXT,
          reel_script TEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_company_post (company_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // Self-heal extended columns on content_posts if table already existed with minimal columns
      const postColumnsToCheck = [
        { col: 'title', def: 'VARCHAR(255) DEFAULT NULL AFTER company_id' },
        { col: 'type', def: "VARCHAR(64) DEFAULT 'offer' AFTER title" },
        { col: 'platforms', def: 'TEXT DEFAULT NULL AFTER type' },
        { col: 'headline', def: 'VARCHAR(255) DEFAULT NULL AFTER channel' },
        { col: 'cta', def: 'VARCHAR(255) DEFAULT NULL AFTER caption' },
        { col: 'scheduled_date', def: 'VARCHAR(64) DEFAULT NULL AFTER status' },
        { col: 'time_slot', def: 'VARCHAR(64) DEFAULT NULL AFTER scheduled_time' },
        { col: 'video_url', def: 'TEXT DEFAULT NULL AFTER image_url' },
        { col: 'reel_script', def: 'TEXT DEFAULT NULL AFTER hashtags' },
      ];

      for (const { col, def } of postColumnsToCheck) {
        try {
          const [cols]: any = await connection.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'content_posts'
              AND COLUMN_NAME = ?
          `, [col]);
          if (!cols || cols.length === 0) {
            console.log(`[Hostinger MySQL] Self-healing schema: Adding missing column ${col} to content_posts...`);
            await connection.query(`ALTER TABLE content_posts ADD COLUMN \`${col}\` ${def}`);
          }
        } catch (colErr: any) {
          console.warn(`[Hostinger MySQL] Column check warning for content_posts.${col}:`, colErr?.message);
        }
      }

      // 7. Autonomous Actions table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS autonomous_actions (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) DEFAULT NULL,
          type VARCHAR(64) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          impact VARCHAR(128),
          action_type VARCHAR(64) DEFAULT 'automatic',
          status VARCHAR(32) DEFAULT 'pending_approval',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_company_action (company_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 8. Business Profile table
      await connection.query(`
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
          services_json JSON,
          settings_json JSON,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 9. Company Integrations table (Real API credentials & live verification)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS company_integrations (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          provider VARCHAR(64) NOT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'disconnected',
          credentials TEXT,
          config TEXT,
          last_tested_at VARCHAR(64),
          last_error TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY idx_company_provider (company_id, provider),
          INDEX idx_comp_integ (company_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 10. Google Business Profile & Places API Cache table (Short TTL to prevent redundant Places API costs)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS google_profile_cache (
          company_id VARCHAR(64) PRIMARY KEY,
          place_id VARCHAR(128) NOT NULL,
          data_payload LONGTEXT NOT NULL,
          cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_gpc_comp (company_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 11. Password Reset Tokens (Self-Service Recovery)
      await connection.query(`
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

      // 12. Company Assets (Logo, Photos, Brand Media Library)
      await connection.query(`
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

      // 13. Content Theme History (Combinatorial Theme & Palette Rotation Engine)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS content_theme_history (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          template_id VARCHAR(64) NOT NULL,
          palette_id VARCHAR(64) NOT NULL,
          used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_cth_company_used (company_id, used_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 14. Invoices Table (GST Compliant Invoices via Razorpay / Direct)
      await connection.query(`
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

      // 15. Subscriptions Table
      await connection.query(`
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

      // 16. Custom Domains Table (Static Hosting & Domain Routing)
      await connection.query(`
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

      // 17. Website Configs Table (Storefront metadata, SEO, custom HTML)
      await connection.query(`
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

      // Seed initial custom domains if empty
      const [existingDomains]: any = await connection.query('SELECT id FROM custom_domains LIMIT 1');
      if (!existingDomains || existingDomains.length === 0) {
        await connection.query(`
          INSERT INTO custom_domains (id, company_id, domain, status, ssl_status, cname_target, a_record_target, dns_txt_record, verified_at)
          VALUES ('dom_bga_aaditechs', 'comp_aaditech_main', 'bga.aaditechs.in', 'active', 'active', 'cname.bga.aaditechs.in', '77.37.54.108', 'bga-site-verification=aaditech_main_prod_2026', NOW())
        `);
      }

      // Seed initial invoices for flagship company if empty
      const [existingInvoices]: any = await connection.query('SELECT id FROM invoices LIMIT 1');
      if (!existingInvoices || existingInvoices.length === 0) {
        await connection.query(`
          INSERT INTO invoices (id, company_id, date, plan, amount, gst_amount, total_amount, payment_method, payment_id, order_id, customer_name, customer_email, customer_phone, status, hsn_code)
          VALUES 
          ('INV-2026-0901', 'comp_aaditech_main', '2026-09-01', 'Growth Tier (Monthly)', 799.00, 143.82, 942.82, 'UPI / Razorpay (r8898278453@okaxis)', 'pay_RzpGrowthSep26', 'order_RzpGwt901', 'Aaditech Solution Private Limited', 'info@aaditechs.in', '+91 22 4963 8603', 'Paid', '998314'),
          ('INV-2026-0801', 'comp_aaditech_main', '2026-08-01', 'Growth Tier (Monthly)', 799.00, 143.82, 942.82, 'UPI / Razorpay (r8898278453@okaxis)', 'pay_RzpGrowthAug26', 'order_RzpGwt801', 'Aaditech Solution Private Limited', 'info@aaditechs.in', '+91 22 4963 8603', 'Paid', '998314'),
          ('INV-2026-0701', 'comp_aaditech_main', '2026-07-01', 'Starter Tier (Intro)', 499.00, 89.82, 588.82, 'Net Banking (HDFC Bank)', 'pay_RzpStarterJul26', 'order_RzpStr701', 'Aaditech Solution Private Limited', 'info@aaditechs.in', '+91 22 4963 8603', 'Paid', '998314')
        `);
      }

      console.log('[Hostinger MySQL] Relational Multi-Tenant Tables verified & ready!');
    } finally {
      connection.release();
    }
  } catch (err: any) {
    console.warn('[Hostinger MySQL] Table auto-initialization error (proceeding safely):', err?.message);
  }
}

// ---------------- USER AUTHENTICATION ---------------- //

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const cleanEmail = email.toLowerCase().trim();
  try {
    const db = await getDbPool();
    if (db) {
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
    handleDbError('findUserByEmail', err);
  }

  const memUser = inMemoryUsers.find((u) => u.email.toLowerCase() === cleanEmail);
  return memUser ? { ...memUser, is_platform_admin: Boolean(memUser.is_platform_admin) } : null;
}

export async function findUserById(id: string): Promise<DbUser | null> {
  try {
    const db = await getDbPool();
    if (db) {
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
    handleDbError('findUserById', err);
  }

  const memUser = inMemoryUsers.find((u) => u.id === id);
  return memUser ? { ...memUser, is_platform_admin: Boolean(memUser.is_platform_admin) } : null;
}

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

  try {
    const db = await getDbPool();
    if (db) {
      await db.query(
        'INSERT INTO users (id, email, password_hash, salt, full_name, role, is_platform_admin) VALUES (?, ?, ?, ?, ?, ?, 0)',
        [newUser.id, newUser.email, newUser.password_hash, newUser.salt, newUser.full_name, newUser.role]
      );
      return newUser;
    }
  } catch (err: any) {
    console.warn('[createUser] MySQL error:', err?.message);
  }

  inMemoryUsers.push(newUser);
  return newUser;
}

export async function updateUserPassword(userId: string, newPlainPassword: string): Promise<boolean> {
  const { hash, salt } = hashPassword(newPlainPassword);
  try {
    const db = await getDbPool();
    if (db) {
      await db.query('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?', [hash, salt, userId]);
    }
  } catch (err: any) {
    console.warn('[updateUserPassword] MySQL error:', err?.message);
  }

  const memUser = inMemoryUsers.find((u) => u.id === userId);
  if (memUser) {
    memUser.password_hash = hash;
    memUser.salt = salt;
  }
  return true;
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

  try {
    const db = await getDbPool();
    if (db) {
      await db.query(
        'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
        [id, userId, tokenHash, mysqlExpiresAt]
      );
    }
  } catch (err: any) {
    console.warn('[createPasswordResetToken] MySQL error:', err?.message);
  }

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
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query(
        'SELECT * FROM password_reset_tokens WHERE token_hash = ? LIMIT 1',
        [tokenHash]
      );
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id,
          user_id: r.user_id,
          token_hash: r.token_hash,
          expires_at: r.expires_at instanceof Date ? r.expires_at.toISOString() : String(r.expires_at),
          used_at: r.used_at ? (r.used_at instanceof Date ? r.used_at.toISOString() : String(r.used_at)) : null,
          created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
        };
      }
      return null;
    }
  } catch (err: any) {
    console.warn('[findPasswordResetToken] MySQL error:', err?.message);
  }

  const mem = inMemoryPasswordResetTokens.find((t) => t.token_hash === tokenHash);
  return mem ? { ...mem } : null;
}

export async function markPasswordResetTokenUsed(tokenId: string, userId: string): Promise<void> {
  const now = new Date();
  const mysqlNow = now.toISOString().slice(0, 19).replace('T', ' ');
  const nowIso = now.toISOString();

  try {
    const db = await getDbPool();
    if (db) {
      await db.query(
        'UPDATE password_reset_tokens SET used_at = ? WHERE id = ? OR (user_id = ? AND used_at IS NULL)',
        [mysqlNow, tokenId, userId]
      );
    }
  } catch (err: any) {
    console.warn('[markPasswordResetTokenUsed] MySQL error:', err?.message);
  }

  for (const t of inMemoryPasswordResetTokens) {
    if (t.id === tokenId || (t.user_id === userId && !t.used_at)) {
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

  return inMemoryCompanies.find((c) => c.id === companyId) || null;
}

export async function createCompany(data: {
  user_id: string;
  name: string;
  legal_name?: string;
  category: string;
  city: string;
  phone?: string;
  website?: string;
  google_place_id?: string;
}): Promise<DbCompany> {
  const newCompany: DbCompany = {
    id: `comp_${crypto.randomUUID().replace(/-/g, '')}`,
    user_id: data.user_id,
    name: data.name.trim(),
    legal_name: data.legal_name?.trim() || data.name.trim(),
    category: data.category.trim(),
    city: data.city.trim(),
    phone: data.phone || '+91 98200 12345',
    website: data.website || '',
    google_place_id: data.google_place_id || '',
    autopilot_enabled: true,
    score: 82,
    rank_position: 2,
    created_at: new Date().toISOString(),
  };

  try {
    const db = await getDbPool();
    if (db) {
      await db.query(
        `INSERT INTO companies (id, user_id, name, legal_name, category, city, phone, website, google_place_id, autopilot_enabled, score, rank_position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          newCompany.rank_position,
        ]
      );
      return newCompany;
    }
  } catch (err: any) {
    console.warn('[createCompany] MySQL error:', err?.message);
  }

  inMemoryCompanies.push(newCompany);
  return newCompany;
}

export async function getCompanyDataPayload(companyId: string): Promise<DbCompanyData | null> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query('SELECT data_payload FROM company_profiles_data WHERE company_id = ? LIMIT 1', [companyId]);
      if (rows && rows.length > 0) {
        return JSON.parse(rows[0].data_payload);
      }
      return null;
    }
  } catch (err: any) {
    console.warn('[getCompanyDataPayload] MySQL error:', err?.message);
  }

  return inMemoryCompanyData[companyId] || null;
}

export async function saveCompanyDataPayload(companyId: string, payload: any): Promise<boolean> {
  const jsonString = JSON.stringify(payload);
  try {
    const db = await getDbPool();
    if (db) {
      await db.query(
        `INSERT INTO company_profiles_data (company_id, data_payload)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE data_payload = ?`,
        [companyId, jsonString, jsonString]
      );
      return true;
    }
  } catch (err: any) {
    console.warn('[saveCompanyDataPayload] MySQL error:', err?.message);
  }

  inMemoryCompanyData[companyId] = payload;
  return true;
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
    console.warn('[getAllLeads] MySQL error, fallback to memory:', err?.message);
  }

  if (companyId) {
    // Strict isolation: only return leads explicitly linked to this company
    return inMemoryLeads.filter((l) => l.company_id === companyId);
  }
  return inMemoryLeads;
}

export async function createLead(lead: Omit<DbLead, 'id'> & { id?: string }): Promise<DbLead> {
  // Ensure every lead is strictly bound to a company (never unlinked or orphaned)
  let resolvedCompanyId = lead.company_id;
  if (!resolvedCompanyId) {
    resolvedCompanyId = (await getDefaultCompanyId()) || undefined;
  }

  const newLead: DbLead = {
    id: lead.id || `lead_${crypto.randomUUID().replace(/-/g, '')}`,
    company_id: resolvedCompanyId,
    name: lead.name,
    company: lead.company || 'Direct Client',
    phone: lead.phone,
    email: lead.email || '',
    service: lead.service || 'Website / Software Inquiry',
    budget: lead.budget || 'Custom Quote',
    stage: lead.stage || 'new',
    intent_score: lead.intent_score || 85,
    source: lead.source || 'bga.aaditechs.in',
    notes: lead.notes || '',
    ai_suggested_reply:
      lead.ai_suggested_reply ||
      `Namaste ${lead.name}! Aaditech Solution (bga.aaditechs.in) se message hai. Humne aapki requirement receive kar li hai. Team will contact you shortly!`,
  };

  try {
    const db = await getDbPool();
    if (db) {
      await db.query(
        `INSERT INTO leads (id, company_id, name, company, phone, email, service, budget, stage, intent_score, source, notes, ai_suggested_reply)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newLead.id,
          newLead.company_id || null,
          newLead.name,
          newLead.company,
          newLead.phone,
          newLead.email,
          newLead.service,
          newLead.budget,
          newLead.stage,
          newLead.intent_score,
          newLead.source,
          newLead.notes,
          newLead.ai_suggested_reply,
        ]
      );
      return newLead;
    }
  } catch (err: any) {
    console.error('[createLead] MySQL query error:', err?.message);

    // Self-healing schema repair: if imported from a legacy schema without company_id column
    if (err?.code === 'ER_BAD_FIELD_ERROR' || String(err?.message || '').includes('company_id')) {
      try {
        const db = await getDbPool();
        if (db) {
          console.log('[createLead] Attempting automatic schema repair for missing company_id column...');
          await db.query('ALTER TABLE leads ADD COLUMN company_id VARCHAR(64) DEFAULT NULL AFTER id, ADD INDEX idx_company_lead (company_id)');
          await db.query(
            `INSERT INTO leads (id, company_id, name, company, phone, email, service, budget, stage, intent_score, source, notes, ai_suggested_reply)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newLead.id,
              newLead.company_id || null,
              newLead.name,
              newLead.company,
              newLead.phone,
              newLead.email,
              newLead.service,
              newLead.budget,
              newLead.stage,
              newLead.intent_score,
              newLead.source,
              newLead.notes,
              newLead.ai_suggested_reply,
            ]
          );
          console.log('[createLead] Successfully self-repaired schema and persisted lead to MySQL!');
          return newLead;
        }
      } catch (repairErr: any) {
        console.error('[createLead] Schema repair and retry failed:', repairErr?.message);
      }
    }
  }

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
    console.warn('[getLeadById] MySQL error:', err?.message);
  }

  return inMemoryLeads.find((l) => l.id === id) || null;
}

export async function updateLeadStatus(id: string, stage: DbLead['stage']): Promise<boolean> {
  try {
    const db = await getDbPool();
    if (db) {
      await db.query('UPDATE leads SET stage = ? WHERE id = ?', [stage, id]);
      return true;
    }
  } catch (err: any) {
    console.warn('[updateLeadStatus] MySQL error:', err?.message);
  }

  const existing = inMemoryLeads.find((l) => l.id === id);
  if (existing) {
    existing.stage = stage;
    return true;
  }
  return false;
}

// ---------------- TELEGRAM DISPATCH ---------------- //

export async function sendTelegramPushAlert(message: string): Promise<boolean> {
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
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query(
        'SELECT id, company_id, provider, status, credentials, config, last_tested_at, last_error, created_at, updated_at FROM company_integrations WHERE company_id = ?',
        [companyId]
      );
      return rows.map((r: any) => ({
        ...r,
        credentials: r.credentials ? (typeof r.credentials === 'string' ? JSON.parse(r.credentials) : r.credentials) : {},
        config: r.config ? (typeof r.config === 'string' ? JSON.parse(r.config) : r.config) : {},
      }));
    }
  } catch (err: any) {
    console.warn('[getCompanyIntegrations] MySQL error:', err?.message);
  }

  return inMemoryIntegrations.filter((i) => i.company_id === companyId);
}

export async function getCompanyIntegration(companyId: string, provider: string): Promise<DbIntegration | null> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query(
        'SELECT id, company_id, provider, status, credentials, config, last_tested_at, last_error, created_at, updated_at FROM company_integrations WHERE company_id = ? AND provider = ? LIMIT 1',
        [companyId, provider]
      );
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          ...r,
          credentials: r.credentials ? (typeof r.credentials === 'string' ? JSON.parse(r.credentials) : r.credentials) : {},
          config: r.config ? (typeof r.config === 'string' ? JSON.parse(r.config) : r.config) : {},
        };
      }
      return null;
    }
  } catch (err: any) {
    console.warn('[getCompanyIntegration] MySQL error:', err?.message);
  }

  return inMemoryIntegrations.find((i) => i.company_id === companyId && i.provider === provider) || null;
}

export async function saveCompanyIntegration(
  companyId: string,
  provider: string,
  data: {
    status: 'connected' | 'disconnected' | 'error';
    credentials?: Record<string, any>;
    config?: Record<string, any>;
    last_tested_at?: string;
    last_error?: string | null;
  }
): Promise<DbIntegration> {
  const id = `int_${crypto.randomUUID().replace(/-/g, '')}`;
  const credsJson = JSON.stringify(data.credentials || {});
  const configJson = JSON.stringify(data.config || {});
  const now = new Date().toISOString();

  try {
    const db = await getDbPool();
    if (db) {
      await db.query(
        `INSERT INTO company_integrations (id, company_id, provider, status, credentials, config, last_tested_at, last_error)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status = VALUES(status),
           credentials = VALUES(credentials),
           config = VALUES(config),
           last_tested_at = VALUES(last_tested_at),
           last_error = VALUES(last_error)`,
        [id, companyId, provider, data.status, credsJson, configJson, data.last_tested_at || now, data.last_error || null]
      );
    }
  } catch (err: any) {
    console.warn('[saveCompanyIntegration] MySQL error:', err?.message);
  }

  const existingIdx = inMemoryIntegrations.findIndex((i) => i.company_id === companyId && i.provider === provider);
  const record: DbIntegration = {
    id: existingIdx >= 0 ? inMemoryIntegrations[existingIdx].id : id,
    company_id: companyId,
    provider,
    status: data.status,
    credentials: data.credentials || {},
    config: data.config || {},
    last_tested_at: data.last_tested_at || now,
    last_error: data.last_error || null,
    updated_at: now,
  };

  if (existingIdx >= 0) {
    inMemoryIntegrations[existingIdx] = record;
  } else {
    inMemoryIntegrations.push(record);
  }

  return record;
}

export async function deleteCompanyIntegration(companyId: string, provider: string): Promise<boolean> {
  try {
    const db = await getDbPool();
    if (db) {
      await db.query('DELETE FROM company_integrations WHERE company_id = ? AND provider = ?', [companyId, provider]);
      return true;
    }
  } catch (err: any) {
    console.warn('[deleteCompanyIntegration] MySQL error:', err?.message);
  }

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
    console.warn('[getGoogleProfileCache] MySQL error:', err?.message);
  }
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
    }
  } catch (err: any) {
    console.warn('[saveGoogleProfileCache] MySQL error:', err?.message);
  }
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
  try {
    const db = await getDbPool();
    if (db) {
      const targetCompanyId = companyId || (await getDefaultCompanyId()) || 'comp_aaditech_main';
      
      // Auto-seed into MySQL if empty for the primary default company
      const [countRows]: any = await db.query('SELECT COUNT(*) as count FROM reviews WHERE company_id = ?', [targetCompanyId]);
      if ((!countRows || countRows[0]?.count === 0) && (targetCompanyId === 'comp_aaditech_main' || targetCompanyId.includes('aaditech'))) {
        for (const seedRev of defaultSeedReviews) {
          await db.query(
            `INSERT IGNORE INTO reviews (id, company_id, author, rating, date, relative_time, content, sentiment, topic, is_operational_issue, replied, reply_text, reply_date, source)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              seedRev.id,
              targetCompanyId,
              seedRev.author,
              seedRev.rating,
              seedRev.date,
              seedRev.relative_time || null,
              seedRev.content,
              seedRev.sentiment,
              seedRev.topic || null,
              seedRev.is_operational_issue ? 1 : 0,
              seedRev.replied ? 1 : 0,
              seedRev.reply_text || null,
              seedRev.reply_date || null,
              seedRev.source,
            ]
          );
        }
      }

      const [rows]: any = await db.query('SELECT * FROM reviews WHERE company_id = ? ORDER BY date DESC, created_at DESC', [targetCompanyId]);
      return rows.map((r: any) => ({
        ...r,
        rating: Number(r.rating) || 5,
        is_operational_issue: Boolean(r.is_operational_issue),
        replied: Boolean(r.replied),
      }));
    }
  } catch (err: any) {
    console.warn('[getCompanyReviews] MySQL error, using fallback:', err?.message);
  }

  const targetId = companyId || 'comp_aaditech_main';
  return inMemoryReviews.filter((r) => r.company_id === targetId);
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
          rating: Number(r.rating) || 5,
          is_operational_issue: Boolean(r.is_operational_issue),
          replied: Boolean(r.replied),
        };
      }
      return null;
    }
  } catch (err: any) {
    console.warn('[getReviewById] MySQL error:', err?.message);
  }

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
    console.warn('[getReviewCompanyId] MySQL error:', err?.message);
  }

  const inMem = inMemoryReviews.find((r) => r.id === reviewId);
  return inMem ? inMem.company_id : null;
}

export async function createReview(review: Omit<DbReview, 'id'> & { id?: string }): Promise<DbReview> {
  const newReview: DbReview = {
    id: review.id || `rev_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
    company_id: review.company_id || (await getDefaultCompanyId()) || 'comp_aaditech_main',
    author: review.author,
    rating: Number(review.rating) || 5,
    date: review.date || new Date().toISOString().split('T')[0],
    relative_time: review.relative_time || 'Recently',
    content: review.content,
    sentiment: review.sentiment || (Number(review.rating) >= 4 ? 'positive' : Number(review.rating) === 3 ? 'neutral' : 'negative'),
    topic: review.topic || 'General Feedback',
    is_operational_issue: Boolean(review.is_operational_issue),
    replied: Boolean(review.replied),
    reply_text: review.reply_text || undefined,
    reply_date: review.reply_date || undefined,
    source: review.source || 'google',
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
          newReview.company_id,
          newReview.author,
          newReview.rating,
          newReview.date,
          newReview.relative_time || null,
          newReview.content,
          newReview.sentiment,
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
    console.warn('[createReview] MySQL error:', err?.message);
  }

  inMemoryReviews.unshift(newReview);
  return newReview;
}

export async function updateReviewReply(reviewId: string, replyText: string, companyId?: string): Promise<boolean> {
  const replyDate = new Date().toISOString().split('T')[0];
  try {
    const db = await getDbPool();
    if (db) {
      if (companyId) {
        await db.query(
          'UPDATE reviews SET replied = 1, reply_text = ?, reply_date = ? WHERE id = ? AND company_id = ?',
          [replyText, replyDate, reviewId, companyId]
        );
      } else {
        await db.query(
          'UPDATE reviews SET replied = 1, reply_text = ?, reply_date = ? WHERE id = ?',
          [replyText, replyDate, reviewId]
        );
      }
      return true;
    }
  } catch (err: any) {
    console.warn('[updateReviewReply] MySQL error:', err?.message);
  }

  const existing = inMemoryReviews.find((r) => r.id === reviewId && (!companyId || r.company_id === companyId));
  if (existing) {
    existing.replied = true;
    existing.reply_text = replyText;
    existing.reply_date = replyDate;
    return true;
  }
  return false;
}

export async function deleteReview(reviewId: string, companyId?: string): Promise<boolean> {
  try {
    const db = await getDbPool();
    if (db) {
      if (companyId) {
        await db.query('DELETE FROM reviews WHERE id = ? AND company_id = ?', [reviewId, companyId]);
      } else {
        await db.query('DELETE FROM reviews WHERE id = ?', [reviewId]);
      }
      return true;
    }
  } catch (err: any) {
    console.warn('[deleteReview] MySQL error:', err?.message);
  }

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

  for (const gr of googleReviews) {
    const author = gr.author_name || gr.author || 'Google User';
    const content = (gr.text || gr.content || '').trim();
    if (!content && !gr.rating) continue;

    const rating = typeof gr.rating === 'number' ? gr.rating : 5;
    const sentiment = rating >= 4 ? 'positive' : rating === 3 ? 'neutral' : 'negative';
    const date = gr.time ? new Date(gr.time * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const relativeTime = gr.relative_time_description || 'Recently';

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
              rating <= 2 ? 1 : 0,
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
  }
  return insertedCount;
}

// ---------------- CONTENT POSTS MANAGEMENT (PER-TENANT MYSQL PERSISTENCE) ---------------- //

export async function getCompanyPosts(companyId?: string): Promise<DbContentPost[]> {
  try {
    const db = await getDbPool();
    if (db) {
      const targetCompanyId = companyId || (await getDefaultCompanyId()) || 'comp_aaditech_main';

      // Auto-seed into MySQL if empty for the primary default company
      const [countRows]: any = await db.query('SELECT COUNT(*) as count FROM content_posts WHERE company_id = ?', [targetCompanyId]);
      if ((!countRows || countRows[0]?.count === 0) && (targetCompanyId === 'comp_aaditech_main' || targetCompanyId.includes('aaditech'))) {
        for (const seedPost of defaultSeedPosts) {
          await db.query(
            `INSERT IGNORE INTO content_posts (id, company_id, title, type, platforms, channel, headline, caption, cta, image_url, status, scheduled_date, scheduled_time, time_slot, hashtags, reel_script)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              seedPost.id,
              targetCompanyId,
              seedPost.title || null,
              seedPost.type || 'offer',
              JSON.stringify(seedPost.platforms || ['google']),
              seedPost.channel || 'google',
              seedPost.headline || null,
              seedPost.caption,
              seedPost.cta || null,
              seedPost.image_url || null,
              seedPost.status || 'scheduled',
              seedPost.scheduled_date || null,
              seedPost.scheduled_time || null,
              seedPost.time_slot || null,
              JSON.stringify(seedPost.hashtags || []),
              seedPost.reel_script ? JSON.stringify(seedPost.reel_script) : null,
            ]
          );
        }
      }

      const [rows]: any = await db.query('SELECT * FROM content_posts WHERE company_id = ? ORDER BY created_at DESC', [targetCompanyId]);
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
    console.warn('[getCompanyPosts] MySQL error, using fallback:', err?.message);
  }

  const targetId = companyId || 'comp_aaditech_main';
  return inMemoryContentPosts.filter((p) => p.company_id === targetId);
}

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
    console.warn('[getPostById] MySQL error:', err?.message);
  }

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
    console.warn('[getContentPostCompanyId] MySQL error:', err?.message);
  }

  const inMem = inMemoryContentPosts.find((p) => p.id === postId);
  return inMem ? inMem.company_id : null;
}

export async function createContentPost(post: Omit<DbContentPost, 'id'> & { id?: string }): Promise<DbContentPost> {
  const newPost: DbContentPost = {
    id: post.id || `post_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
    company_id: post.company_id || (await getDefaultCompanyId()) || 'comp_aaditech_main',
    title: post.title || 'Untitled Post',
    type: post.type || 'offer',
    platforms: post.platforms && post.platforms.length > 0 ? post.platforms : ['google'],
    channel: post.channel || post.platforms?.[0] || 'google',
    headline: post.headline || '',
    caption: post.caption,
    cta: post.cta || '',
    image_url: post.image_url || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80',
    video_url: post.video_url || undefined,
    status: post.status || 'scheduled',
    scheduled_date: post.scheduled_date || new Date().toISOString().split('T')[0],
    scheduled_time: post.scheduled_time || `${new Date().toISOString().split('T')[0]} 10:00:00`,
    time_slot: post.time_slot || '10:00 AM',
    hashtags: post.hashtags || [],
    reel_script: post.reel_script || undefined,
    created_at: new Date().toISOString(),
  };

  try {
    const db = await getDbPool();
    if (db) {
      await db.query(
        `INSERT INTO content_posts (id, company_id, title, type, platforms, channel, headline, caption, cta, image_url, video_url, status, scheduled_date, scheduled_time, time_slot, hashtags, reel_script)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newPost.id,
          newPost.company_id,
          newPost.title || null,
          newPost.type || 'offer',
          JSON.stringify(newPost.platforms || []),
          newPost.channel,
          newPost.headline || null,
          newPost.caption,
          newPost.cta || null,
          newPost.image_url || null,
          newPost.video_url || null,
          newPost.status,
          newPost.scheduled_date || null,
          newPost.scheduled_time || null,
          newPost.time_slot || null,
          JSON.stringify(newPost.hashtags || []),
          newPost.reel_script ? JSON.stringify(newPost.reel_script) : null,
        ]
      );
      return newPost;
    }
  } catch (err: any) {
    console.warn('[createContentPost] MySQL error:', err?.message);
  }

  inMemoryContentPosts.unshift(newPost);
  return newPost;
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
      dbSuccess = true;
    }
  } catch (err: any) {
    console.warn('[updateContentPostStatus] MySQL error:', err?.message);
  }

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
      if (companyId) {
        await db.query('DELETE FROM content_posts WHERE id = ? AND company_id = ?', [postId, companyId]);
      } else {
        await db.query('DELETE FROM content_posts WHERE id = ?', [postId]);
      }
      return true;
    }
  } catch (err: any) {
    console.warn('[deleteContentPost] MySQL error:', err?.message);
  }

  const idx = inMemoryContentPosts.findIndex((p) => p.id === postId && (!companyId || p.company_id === companyId));
  if (idx >= 0) {
    inMemoryContentPosts.splice(idx, 1);
    return true;
  }
  return false;
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
    console.warn('[createCompanyAsset] MySQL error:', err?.message);
  }

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
    console.warn('[getCompanyAssets] MySQL error:', err?.message);
  }

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
    console.warn('[getCompanyAssetById] MySQL error:', err?.message);
  }

  const found = inMemoryCompanyAssets.find((a) => a.id === assetId);
  return found || null;
}

export async function deleteCompanyAsset(assetId: string): Promise<boolean> {
  let deleted = false;
  try {
    const db = await getDbPool();
    if (db) {
      const [res]: any = await db.query('DELETE FROM company_assets WHERE id = ?', [assetId]);
      deleted = res?.affectedRows > 0;
    }
  } catch (err: any) {
    console.warn('[deleteCompanyAsset] MySQL error:', err?.message);
  }

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
  const id = `cth_${crypto.randomUUID().replace(/-/g, '')}`;
  const nowIso = new Date().toISOString();

  try {
    const db = await getDbPool();
    if (db) {
      await db.query(
        'INSERT INTO content_theme_history (id, company_id, template_id, palette_id) VALUES (?, ?, ?, ?)',
        [id, companyId, templateId, paletteId]
      );
    }
  } catch (err: any) {
    handleDbError('recordThemeUsage', err);
  }

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
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query(
        'SELECT template_id, palette_id, used_at FROM content_theme_history WHERE company_id = ? ORDER BY used_at DESC LIMIT ?',
        [companyId, limit]
      );
      if (rows && Array.isArray(rows)) {
        return rows.map((r: any) => ({
          templateId: r.template_id,
          paletteId: r.palette_id,
          usedAt: r.used_at instanceof Date ? r.used_at.toISOString() : String(r.used_at),
        }));
      }
    }
  } catch (err: any) {
    handleDbError('getRecentThemeHistory', err);
  }

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
          created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
        }));
      }
    }
  } catch (err: any) {
    handleDbError('getInvoicesByCompany', err);
  }

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
          created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
        };
      }
    }
  } catch (err: any) {
    handleDbError('getInvoiceById', err);
  }

  const found = inMemoryInvoices.find((inv) => inv.id === invoiceId);
  return found || null;
}

export async function createInvoice(invoice: Partial<DbInvoice> & { company_id: string }): Promise<DbInvoice> {
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
          created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
          updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
        };
      }
    }
  } catch (err: any) {
    handleDbError('getSubscriptionByCompany', err);
  }

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

  const existingIdx = inMemorySubscriptions.findIndex((s) => s.company_id === updatedSub.company_id);
  if (existingIdx >= 0) {
    inMemorySubscriptions[existingIdx] = updatedSub;
  } else {
    inMemorySubscriptions.push(updatedSub);
  }

  return updatedSub;
}

// ---------------- CUSTOM DOMAINS & WEBSITE CONFIGURATION ---------------- //

export async function getCustomDomainsByCompany(companyId: string): Promise<DbCustomDomain[]> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query(
        'SELECT * FROM custom_domains WHERE company_id = ? ORDER BY created_at DESC',
        [companyId]
      );
      if (rows && Array.isArray(rows)) {
        return rows.map((r: any) => ({
          ...r,
          verified_at: r.verified_at instanceof Date ? r.verified_at.toISOString() : r.verified_at ? String(r.verified_at) : null,
          created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
          updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
        }));
      }
    }
  } catch (err: any) {
    handleDbError('getCustomDomainsByCompany', err);
  }

  return inMemoryCustomDomains.filter((d) => d.company_id === companyId);
}

export async function getCustomDomainById(domainId: string): Promise<DbCustomDomain | null> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query(
        'SELECT * FROM custom_domains WHERE id = ? LIMIT 1',
        [domainId]
      );
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          ...r,
          verified_at: r.verified_at instanceof Date ? r.verified_at.toISOString() : r.verified_at ? String(r.verified_at) : null,
          created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
          updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
        };
      }
    }
  } catch (err: any) {
    handleDbError('getCustomDomainById', err);
  }

  return inMemoryCustomDomains.find((d) => d.id === domainId) || null;
}

export async function createCustomDomain(
  data: Partial<DbCustomDomain> & { company_id: string; domain: string }
): Promise<DbCustomDomain> {
  const cleanDomain = data.domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const id = data.id || `dom_${cleanDomain.replace(/[^a-z0-9]/g, '_')}_${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();
  const txtRecord = `bga-site-verification=${cleanDomain.replace(/[^a-z0-9]/g, '')}_${Date.now().toString(36)}`;

  const newDomain: DbCustomDomain = {
    id,
    company_id: data.company_id,
    domain: cleanDomain,
    status: data.status || 'pending_verification',
    ssl_status: data.ssl_status || 'provisioning',
    cname_target: data.cname_target || 'cname.bga.aaditechs.in',
    a_record_target: data.a_record_target || '77.37.54.108',
    dns_txt_record: data.dns_txt_record || txtRecord,
    verified_at: data.verified_at || null,
    created_at: now,
    updated_at: now,
  };

  try {
    const db = await getDbPool();
    if (db) {
      await db.query(
        `INSERT INTO custom_domains (
          id, company_id, domain, status, ssl_status, cname_target,
          a_record_target, dns_txt_record, verified_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          status = VALUES(status),
          ssl_status = VALUES(ssl_status),
          cname_target = VALUES(cname_target),
          a_record_target = VALUES(a_record_target),
          dns_txt_record = VALUES(dns_txt_record),
          verified_at = VALUES(verified_at)`,
        [
          newDomain.id,
          newDomain.company_id,
          newDomain.domain,
          newDomain.status,
          newDomain.ssl_status,
          newDomain.cname_target,
          newDomain.a_record_target,
          newDomain.dns_txt_record,
          newDomain.verified_at ? new Date(newDomain.verified_at) : null,
        ]
      );
    }
  } catch (err: any) {
    handleDbError('createCustomDomain', err);
  }

  const existingIdx = inMemoryCustomDomains.findIndex((d) => d.id === newDomain.id || (d.company_id === newDomain.company_id && d.domain === newDomain.domain));
  if (existingIdx >= 0) {
    inMemoryCustomDomains[existingIdx] = newDomain;
  } else {
    inMemoryCustomDomains.push(newDomain);
  }

  return newDomain;
}

export async function updateCustomDomainStatus(
  domainId: string,
  status: 'active' | 'pending_verification' | 'failed',
  sslStatus: 'active' | 'provisioning' | 'expired' = 'active'
): Promise<DbCustomDomain | null> {
  const verifiedAt = status === 'active' ? new Date().toISOString() : null;
  try {
    const db = await getDbPool();
    if (db) {
      await db.query(
        'UPDATE custom_domains SET status = ?, ssl_status = ?, verified_at = ? WHERE id = ?',
        [status, sslStatus, verifiedAt ? new Date(verifiedAt) : null, domainId]
      );
    }
  } catch (err: any) {
    handleDbError('updateCustomDomainStatus', err);
  }

  const found = inMemoryCustomDomains.find((d) => d.id === domainId);
  if (found) {
    found.status = status;
    found.ssl_status = sslStatus;
    found.verified_at = verifiedAt;
    found.updated_at = new Date().toISOString();
    return found;
  }
  return null;
}

export async function deleteCustomDomain(domainId: string): Promise<boolean> {
  try {
    const db = await getDbPool();
    if (db) {
      await db.query('DELETE FROM custom_domains WHERE id = ?', [domainId]);
    }
  } catch (err: any) {
    handleDbError('deleteCustomDomain', err);
  }

  const idx = inMemoryCustomDomains.findIndex((d) => d.id === domainId);
  if (idx >= 0) {
    inMemoryCustomDomains.splice(idx, 1);
    return true;
  }
  return true;
}

export async function getWebsiteConfigByCompany(companyId: string): Promise<DbWebsiteConfig | null> {
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query(
        'SELECT * FROM website_configs WHERE company_id = ? LIMIT 1',
        [companyId]
      );
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          ...r,
          enable_whatsapp_cta: Boolean(r.enable_whatsapp_cta),
          enable_direct_call_cta: Boolean(r.enable_direct_call_cta),
          enable_inquiry_form: Boolean(r.enable_inquiry_form),
          created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
          updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
        };
      }
    }
  } catch (err: any) {
    handleDbError('getWebsiteConfigByCompany', err);
  }

  return inMemoryWebsiteConfigs.find((c) => c.company_id === companyId) || null;
}

export async function upsertWebsiteConfig(
  data: Partial<DbWebsiteConfig> & { company_id: string }
): Promise<DbWebsiteConfig> {
  const id = data.id || `web_${data.company_id}`;
  const now = new Date().toISOString();

  const updatedConfig: DbWebsiteConfig = {
    id,
    company_id: data.company_id,
    subdomain: data.subdomain || data.company_id.replace(/^comp_/, ''),
    primary_color: data.primary_color || '#4f46e5',
    secondary_color: data.secondary_color || '#06b6d4',
    tagline: data.tagline || 'Autonomous AI Growth Engine & Local SEO Authority',
    hero_title: data.hero_title || 'Official Services Hub',
    hero_subtitle: data.hero_subtitle || 'Trusted professional solutions serving clients with guaranteed satisfaction.',
    meta_description: data.meta_description || 'Official storefront and local SEO hub.',
    keywords: data.keywords || 'local seo, marketing, services',
    google_analytics_id: data.google_analytics_id,
    custom_header_html: data.custom_header_html,
    enable_whatsapp_cta: data.enable_whatsapp_cta !== undefined ? data.enable_whatsapp_cta : true,
    enable_direct_call_cta: data.enable_direct_call_cta !== undefined ? data.enable_direct_call_cta : true,
    enable_inquiry_form: data.enable_inquiry_form !== undefined ? data.enable_inquiry_form : true,
    pages_json: data.pages_json,
    created_at: now,
    updated_at: now,
  };

  try {
    const db = await getDbPool();
    if (db) {
      await db.query(
        `INSERT INTO website_configs (
          id, company_id, subdomain, primary_color, secondary_color,
          tagline, hero_title, hero_subtitle, meta_description, keywords,
          google_analytics_id, custom_header_html, enable_whatsapp_cta,
          enable_direct_call_cta, enable_inquiry_form, pages_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          subdomain = VALUES(subdomain),
          primary_color = VALUES(primary_color),
          secondary_color = VALUES(secondary_color),
          tagline = VALUES(tagline),
          hero_title = VALUES(hero_title),
          hero_subtitle = VALUES(hero_subtitle),
          meta_description = VALUES(meta_description),
          keywords = VALUES(keywords),
          google_analytics_id = VALUES(google_analytics_id),
          custom_header_html = VALUES(custom_header_html),
          enable_whatsapp_cta = VALUES(enable_whatsapp_cta),
          enable_direct_call_cta = VALUES(enable_direct_call_cta),
          enable_inquiry_form = VALUES(enable_inquiry_form),
          pages_json = VALUES(pages_json)`,
        [
          updatedConfig.id,
          updatedConfig.company_id,
          updatedConfig.subdomain,
          updatedConfig.primary_color,
          updatedConfig.secondary_color,
          updatedConfig.tagline || null,
          updatedConfig.hero_title || null,
          updatedConfig.hero_subtitle || null,
          updatedConfig.meta_description || null,
          updatedConfig.keywords || null,
          updatedConfig.google_analytics_id || null,
          updatedConfig.custom_header_html || null,
          updatedConfig.enable_whatsapp_cta ? 1 : 0,
          updatedConfig.enable_direct_call_cta ? 1 : 0,
          updatedConfig.enable_inquiry_form ? 1 : 0,
          updatedConfig.pages_json || null,
        ]
      );
    }
  } catch (err: any) {
    handleDbError('upsertWebsiteConfig', err);
  }

  const existingIdx = inMemoryWebsiteConfigs.findIndex((c) => c.company_id === updatedConfig.company_id);
  if (existingIdx >= 0) {
    inMemoryWebsiteConfigs[existingIdx] = updatedConfig;
  } else {
    inMemoryWebsiteConfigs.push(updatedConfig);
  }

  return updatedConfig;
}




