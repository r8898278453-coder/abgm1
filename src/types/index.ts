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

export interface GrowthScore {
  overall: number;
  breakdown: {
    googleProfile: number;
    localSeo: number;
    reviews: number;
    socialMedia: number;
    content: number;
    website: number;
    customerEngagement: number;
  };
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

export interface KeywordRank {
  id: string;
  keyword: string;
  rank: number;
  previousRank: number;
  searchVolume: string;
  dataClassification?: 'LIVE' | 'VERIFIED' | 'ESTIMATED' | 'CALCULATED' | 'DEMO' | 'SEEDED';
  lastScannedAt?: string;
  topCompetitors?: {
    name: string;
    rating: number;
    reviewsCount: number;
    position: number;
  }[];
  gridRankings: {
    vashi: number;
    nerul: number;
    sanpada: number;
    belapur: number;
    [key: string]: number;
  };
}

export interface CompetitorData {
  id: string;
  name: string;
  rating: number;
  reviewsCount: number;
  reviewGrowthThisMonth: number;
  photosCount: number;
  postsPerWeek: number;
  localVisibilityRank: number;
  isSelf?: boolean;
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
  status: 'draft' | 'pending_approval' | 'scheduled' | 'published';
  scheduledDate: string;
  timeSlot: string;
  reelScript?: {
    scene: string;
    visual: string;
    audio: string;
  }[];
}

export interface Campaign {
  id: string;
  name: string;
  objective: string;
  status: 'active' | 'scheduled' | 'completed';
  startDate: string;
  endDate: string;
  budget: number;
  reach: number;
  clicks: number;
  leads: number;
  conversions: number;
  revenue: number;
  channels: string[];
}

export interface LeadItem {
  id: string;
  name: string;
  phone: string;
  source: 'Google Maps' | 'Instagram Ad' | 'WhatsApp Direct' | 'Website' | 'Walk-in';
  stage: 'new' | 'contacted' | 'qualified' | 'quotation' | 'won' | 'lost';
  serviceRequested: string;
  intentScore: number;
  date: string;
  notes: string;
  aiSuggestedReply: string;
}

export interface AutonomousAction {
  id: string;
  timestamp: string;
  agent: 'Growth Agent' | 'Review Agent' | 'Content Agent' | 'SEO Agent' | 'Sales Agent';
  action: string;
  status: 'auto_executed' | 'pending_approval' | 'approved' | 'rejected';
  details: string;
  requiresApproval: boolean;
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

