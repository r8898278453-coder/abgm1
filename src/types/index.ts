export type UserRole = 
  | 'platform_admin'
  | 'owner' 
  | 'manager' 
  | 'staff' 
  | 'agency' 
  | 'super_admin' 
  | 'support_admin' 
  | 'finance_admin' 
  | 'ai_admin';

export type InterfaceView = 'web' | 'mobile' | 'telegram';
export type ViewMode = InterfaceView;

export type NavigationTab = 
  | 'dashboard'
  | 'audit'
  | 'google_profile'
  | 'local_seo'
  | 'competitors'
  | 'reviews'
  | 'content'
  | 'calendar'
  | 'campaigns'
  | 'leads'
  | 'website'
  | 'telegram'
  | 'autonomous'
  | 'safety'
  | 'google'
  | 'seo'
  | 'ai_control'
  | 'agency'
  | 'integrations'
  | 'billing'
  | 'knowledge';

export type NavTab = NavigationTab;

export interface BusinessProfile {
  id: string;
  name: string;
  category: string;
  subCategory: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  whatsapp: string;
  description: string;
  services: string[];
  products: string[];
  priceRange: string;
  openingHours: string;
  serviceAreas: string[];
  brandKit: {
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    tagline: string;
    brandTone: string;
    preferredLanguage: string;
    targetAudience?: string;
  };
  connectedAccounts: {
    googleBusiness: boolean;
    metaFacebook: boolean;
    metaInstagram: boolean;
    whatsappBusiness: boolean;
    telegramBot: boolean;
    website: boolean;
  };
}

export interface AuditItem {
  id: string;
  title: string;
  category: 'google' | 'seo' | 'reviews' | 'social' | 'content' | 'website';
  severity: 'critical' | 'important' | 'recommended' | 'good';
  description: string;
  impact: string;
  actionText: string;
  resolved: boolean;
}

export interface PillarScoreTelemetry {
  pillarKey: string;
  metricName: string;
  metric?: string;
  weight?: number;
  score: number | null;
  status: 'LIVE' | 'VERIFIED' | 'CALCULATED' | 'INCOMPLETE_DATA' | 'UNAVAILABLE' | 'USER_ENTERED';
  inputValues: Record<string, any>;
  formula: string;
  timestamp: string;
  notes?: string;
}

export interface GrowthScore {
  overall: number | null;
  status?: 'LIVE' | 'VERIFIED' | 'CALCULATED' | 'INCOMPLETE_DATA' | 'UNAVAILABLE';
  statusLabel?: string;
  insufficientDataReason?: string | null;
  breakdown: {
    googleProfile: number | null;
    localSeo: number | null;
    reviews: number | null;
    socialMedia: number | null;
    content: number | null;
    website: number | null;
    customerEngagement: number | null;
    leadConversion?: number | null;
    campaignPerformance?: number | null;
  };
  telemetry?: PillarScoreTelemetry[];
  timestamp?: string;
}

export interface ReviewItem {
  id: string;
  author: string;
  rating: number;
  date: string;
  relativeTime: string;
  content: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  topic: string;
  isOperationalIssue?: boolean;
  replied: boolean;
  replyText?: string;
  replyDate?: string;
  source: 'google' | 'facebook' | 'justdial';
}

export interface RankObservation {
  id: string;
  companyId: string;
  keyword: string;
  latitude: number;
  longitude: number;
  gridIndex: number;
  gridLabel?: string;
  timestamp: string;
  provider: string;
  position: number | null;
  status: 'LIVE' | 'VERIFIED' | 'UNAVAILABLE';
  sourceEvidence?: string;
}

export interface KeywordRank {
  id: string;
  keyword: string;
  rank: number | null;
  previousRank?: number | null;
  diff?: number | null;
  searchVolume: string | null;
  dataClassification?: 'LIVE' | 'VERIFIED' | 'ESTIMATED' | 'CALCULATED' | 'DEMO' | 'SEEDED' | 'UNAVAILABLE';
  provider?: string;
  lastScannedAt?: string;
  observations?: RankObservation[];
  evidenceNotes?: string;
  topCompetitors?: {
    name: string;
    rating: number;
    reviewsCount: number;
    position: number;
  }[];
  gridRankings?: {
    vashi?: number;
    nerul?: number;
    sanpada?: number;
    belapur?: number;
    [key: string]: number | undefined;
  };
}

export interface CompetitorSnapshot {
  id: string;
  competitorId: string;
  timestamp: string;
  rating: number | null;
  reviewsCount: number | null;
  photosCount: number | null;
  postsPerWeek: number | null;
  rankPosition: number | null;
  provider: string;
  dataClassification: 'LIVE' | 'VERIFIED' | 'CALCULATED' | 'ESTIMATED' | 'USER_ENTERED' | 'SEEDED' | 'DEMO' | 'UNAVAILABLE';
  rawPayload?: any;
}

export interface CompetitorData {
  id: string;
  name: string;
  rating: number | null;
  reviewsCount: number | null;
  reviewGrowthThisMonth: number | null;
  photosCount: number | null;
  postsPerWeek: number | null;
  localVisibilityRank: number | null;
  placeId?: string | null;
  address?: string | null;
  provider?: string;
  lastObservedAt?: string;
  dataClassification?: 'LIVE' | 'VERIFIED' | 'CALCULATED' | 'ESTIMATED' | 'USER_ENTERED' | 'SEEDED' | 'DEMO' | 'UNAVAILABLE';
  isSelf?: boolean;
  historicalSnapshots?: CompetitorSnapshot[];
}

export interface ContentPost {
  id: string;
  title: string;
  type: 'offer' | 'festival' | 'product' | 'service' | 'educational' | 'announcement';
  platforms: ('google' | 'instagram' | 'facebook' | 'whatsapp')[];
  caption: string;
  headline: string;
  cta: string;
  hashtags: string[];
  imageUrl: string;
  videoUrl?: string;
  status: 'draft' | 'pending_approval' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'unknown';
  scheduledDate: string;
  timeSlot: string;
  reelScript?: {
    scene: string;
    visual: string;
    audio: string;
  }[];
}

export interface PublishingRecord {
  id: string;
  postId: string;
  companyId: string;
  platform: string;
  status: 'PUBLISHED' | 'FAILED' | 'UNKNOWN' | 'RETRYING';
  providerPostId?: string | null;
  attemptCount: number;
  maxAttempts: number;
  errorType?: 'PERMANENT' | 'RETRYABLE' | 'TIMEOUT_UNKNOWN' | null;
  errorMessage?: string | null;
  idempotencyKey: string;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MetricAvailability<T = number> = T | 'UNAVAILABLE';

/**
 * INTERNAL CAMPAIGN:
 * Represents internal business marketing initiatives, timelines, channels, and planned budget.
 * A campaign database record does NOT prove that an external ad campaign exists.
 * Does NOT store or fabricate ad-platform telemetry (reach, clicks, conversions, revenue).
 */
export interface InternalCampaign {
  id: string;
  companyId: string;
  name: string;
  objective: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate: string;
  endDate: string;
  plannedBudget: number;
  channels: string[];
  externalCampaignId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * EXTERNAL AD CAMPAIGN:
 * Represents verified ad campaigns fetched directly from ad platform APIs (e.g. Meta Ads, Google Ads).
 * Stores ONLY metrics explicitly returned by the provider.
 * If conversion tracking unavailable -> 'UNAVAILABLE'.
 * If revenue attribution unavailable -> 'UNAVAILABLE'.
 * If cost/revenue unavailable -> ROAS = 'UNAVAILABLE'.
 */
export interface ExternalAdCampaign {
  id: string;
  companyId: string;
  internalCampaignId?: string | null;
  provider: 'meta_ads' | 'google_ads' | string;
  externalCampaignId: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'UNKNOWN' | 'NOT_CONFIGURED';
  fetchedAt: string | null;
  spend: MetricAvailability<number>;
  impressions: MetricAvailability<number>;
  clicks: MetricAvailability<number>;
  conversions: MetricAvailability<number>;
  conversionTrackingStatus: 'ACTIVE' | 'UNAVAILABLE';
  revenue: MetricAvailability<number>;
  revenueAttributionStatus: 'VERIFIED' | 'UNAVAILABLE';
  roas: MetricAvailability<number>;
  rawMetricsJson?: string | null;
}

// Backward-compatible interface for legacy views
export interface Campaign {
  id: string;
  name: string;
  objective: string;
  status: 'active' | 'scheduled' | 'completed' | 'paused' | 'draft';
  startDate: string;
  endDate: string;
  budget: number;
  reach?: number;
  clicks?: number;
  leads?: number;
  conversions?: number;
  revenue?: number;
  channels: string[];
  externalCampaignId?: string | null;
  type?: 'INTERNAL' | 'EXTERNAL_AD';
}

export interface LeadItem {
  id: string;
  name: string;
  phone: string;
  source: string;
  stage: 'new' | 'contacted' | 'qualified' | 'opportunity' | 'quotation' | 'won' | 'lost';
  serviceRequested: string;
  intentScore: number;
  date: string;
  notes: string;
  aiSuggestedReply: string;
}

export type SupportedAttributionSource =
  | 'Google'
  | 'Organic'
  | 'Website'
  | 'WhatsApp'
  | 'Telegram'
  | 'Social'
  | 'Referral'
  | 'Campaign'
  | 'Manual'
  | 'Unknown';

export interface SourceRevenueMetrics {
  source: SupportedAttributionSource;
  leads: number;
  qualifiedLeads: number;
  opportunities: number;
  quotesDeals: number;
  won: number;
  lost: number;
  customers: number;
  conversionRate: number;
  revenue: number;
  spend: number | null;
  roi: string | number;
  status: 'VERIFIED' | 'CALCULATED' | 'UNAVAILABLE';
}

export interface RevenueAttributionSummary {
  companyId: string;
  totalLeads: number;
  qualifiedLeads: number;
  opportunities: number;
  quotesDeals: number;
  wonLeads: number;
  lostLeads: number;
  customers: number;
  conversionRate: number;
  totalRevenue: number;
  unverifiedRevenueIgnored: number;
  totalSpend: number | null;
  overallRoi: string | number;
  revenueBySource: Record<SupportedAttributionSource, SourceRevenueMetrics>;
  sourcesList: SourceRevenueMetrics[];
  verifiedInvoicesCount: number;
  unverifiedInvoicesCount: number;
  attributionStatus: 'VERIFIED' | 'CALCULATED' | 'UNAVAILABLE';
  timestamp: string;
}

export interface AutonomousRecommendation {
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

export interface AutonomousAction {
  id: string;
  company_id?: string;
  recommendation_id?: string | null;
  timestamp: string;
  agent?: 'Growth Agent' | 'Review Agent' | 'Content Agent' | 'SEO Agent' | 'Sales Agent';
  action: string;
  action_type?: string;
  payload?: any;
  source_evidence?: {
    evidence_ids?: string[];
    source?: string;
    observation?: string;
    timestamp?: string;
  };
  approval_status?: 'pending_approval' | 'approved' | 'rejected' | 'auto_approved';
  execution_state?: 'idle' | 'queued' | 'executing' | 'executed' | 'failed' | 'blocked';
  provider_response?: any;
  verification_state?: 'unverified' | 'verified' | 'failed' | 'unavailable';
  error?: string | null;
  executed_at?: string | null;
  status: 'auto_executed' | 'pending_approval' | 'approved' | 'rejected' | 'executed' | 'failed' | 'blocked';
  details: string;
  requiresApproval: boolean;
}

export interface AutonomousAuditLog {
  id: string;
  company_id: string;
  action_id?: string | null;
  actor: string;
  event_type: string;
  details?: any;
  timestamp: string;
}

export interface TelegramMessage {
  id: string;
  sender: 'user' | 'bot';
  timestamp: string;
  text: string;
  card?: {
    type: 'approval' | 'report' | 'lead_alert' | 'review_alert';
    title: string;
    subtitle?: string;
    imageUrl?: string;
    actions: {
      label: string;
      actionId: string;
      style?: 'primary' | 'secondary' | 'danger';
    }[];
  };
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: 'platform_admin' | 'owner' | 'manager' | 'agency';
  is_platform_admin?: boolean;
}

export interface CompanyRecord {
  id: string;
  user_id?: string;
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

export interface CompanyAsset {
  id: string;
  company_id: string;
  asset_type: 'logo' | 'photo';
  url: string;
  label?: string | null;
  created_at?: string;
}

export interface SocialTemplate {
  id: string;
  name: string;
  description: string;
  contentType: 'offer' | 'festival' | 'service' | 'educational';
  styleMood: 'bold' | 'minimal' | 'festive' | 'professional' | 'playful' | 'premium';
  canvas: { width: number; height: number };
}

export type DataTruthStatus =
  | 'LIVE'
  | 'VERIFIED'
  | 'CALCULATED'
  | 'ESTIMATED'
  | 'AI_ESTIMATED'
  | 'USER_ENTERED'
  | 'SEEDED'
  | 'DEMO'
  | 'UNAVAILABLE'
  | 'ERROR';


