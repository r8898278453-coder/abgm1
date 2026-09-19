import { AuthUser, CompanyRecord, LeadItem, ReviewItem, ContentPost, CompanyAsset, SocialTemplate } from '../types';
import { API_BASE_URL } from '../config/apiConfig';

const TOKEN_KEY = 'abga_auth_token';
const USER_KEY = 'abga_user_profile';
const ACTIVE_COMPANY_KEY = 'abga_active_company_id';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredSession(token: string, user: AuthUser) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.warn('Failed to save session to localStorage:', err);
  }
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearStoredSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACTIVE_COMPANY_KEY);
  } catch (err) {
    console.warn('Failed to clear session:', err);
  }
}

export function getStoredActiveCompanyId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_COMPANY_KEY);
  } catch {
    return null;
  }
}

export function setStoredActiveCompanyId(companyId: string) {
  try {
    localStorage.setItem(ACTIVE_COMPANY_KEY, companyId);
  } catch (err) {
    console.warn('Failed to save active company ID:', err);
  }
}

// Fetch helper with Authorization Bearer header
export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const resolvedUrl = url.startsWith('/') ? `${API_BASE_URL}${url}` : url;

  const response = await fetch(resolvedUrl, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

// ---------------- AUTH APIS ---------------- //

export async function loginUser(credentials: { email: string; password: string }): Promise<{ user: AuthUser; token: string }> {
  const res = await apiRequest<{ success: boolean; user: AuthUser; token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  setStoredSession(res.token, res.user);
  return { user: res.user, token: res.token };
}

export async function registerUser(data: {
  email: string;
  password: string;
  full_name: string;
  role?: 'owner' | 'manager' | 'agency';
}): Promise<{ user: AuthUser; token: string }> {
  const res = await apiRequest<{ success: boolean; user: AuthUser; token: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  setStoredSession(res.token, res.user);
  return { user: res.user, token: res.token };
}

export async function checkAuthSession(): Promise<AuthUser | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await apiRequest<{ success: boolean; user: AuthUser }>('/api/auth/me');
    if (res.success && res.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      return res.user;
    }
  } catch {
    clearStoredSession();
  }
  return null;
}

export async function requestPasswordResetApi(email: string): Promise<{ success: boolean; message: string }> {
  return await apiRequest<{ success: boolean; message: string }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPasswordApi(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  return await apiRequest<{ success: boolean; message: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}

// ---------------- COMPANY MANAGEMENT APIS ---------------- //

export async function fetchUserCompanies(): Promise<CompanyRecord[]> {
  try {
    const res = await apiRequest<{ success: boolean; companies: CompanyRecord[] }>('/api/companies');
    return res.companies || [];
  } catch (err) {
    console.warn('Failed to fetch user companies:', err);
    return [];
  }
}

export async function createCompanyApi(data: {
  name: string;
  legal_name?: string;
  category: string;
  city: string;
  phone?: string;
  website?: string;
  google_place_id?: string;
}): Promise<CompanyRecord> {
  const res = await apiRequest<{ success: boolean; company: CompanyRecord }>('/api/companies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.company;
}

export async function fetchCompanyData(companyId: string): Promise<any | null> {
  try {
    const res = await apiRequest<{ success: boolean; company: CompanyRecord; data: any }>(`/api/companies/${companyId}/data`);
    return res.data || null;
  } catch (err) {
    console.warn('Failed to fetch company data:', err);
    return null;
  }
}

export async function saveCompanyData(companyId: string, payload: any): Promise<boolean> {
  try {
    await apiRequest<{ success: boolean }>(`/api/companies/${companyId}/data`, {
      method: 'PUT',
      body: JSON.stringify({ data: payload }),
    });
    return true;
  } catch (err) {
    console.warn('Failed to save company data:', err);
    return false;
  }
}

export async function fetchCompanyLeads(companyId?: string): Promise<LeadItem[]> {
  try {
    const url = companyId ? `/api/leads?companyId=${encodeURIComponent(companyId)}` : '/api/leads';
    const res = await apiRequest<{ success: boolean; leads: any[] }>(url);
    if (res.success && Array.isArray(res.leads)) {
      return res.leads.map((l) => ({
        id: l.id,
        name: l.name,
        phone: l.phone,
        serviceRequested: l.service || 'Service Inquiry',
        date: l.created_at ? new Date(l.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Recently',
        source: (l.source?.includes('Google') ? 'Google Maps' : l.source?.includes('WhatsApp') ? 'WhatsApp Direct' : 'Website') as any,
        intentScore: l.intent_score || 85,
        stage: l.stage || 'new',
        notes: [l.company, l.budget, l.notes].filter(Boolean).join(' • '),
        aiSuggestedReply: l.ai_suggested_reply || '',
      }));
    }
    return [];
  } catch (err) {
    console.warn('Failed to fetch company leads:', err);
    return [];
  }
}

// ---------------- REVIEWS API CLIENT (MYSQL-BACKED) ---------------- //

export async function fetchCompanyReviews(companyId?: string): Promise<ReviewItem[]> {
  try {
    const url = companyId ? `/api/reviews?companyId=${encodeURIComponent(companyId)}` : '/api/reviews';
    const res = await apiRequest<{ success: boolean; reviews: any[] }>(url);
    if (res.success && Array.isArray(res.reviews)) {
      return res.reviews.map((r) => ({
        id: r.id,
        author: r.author,
        rating: Number(r.rating) || 5,
        date: r.date || 'Recent',
        relativeTime: r.relative_time || 'Recently',
        content: r.content,
        sentiment: r.sentiment || (r.rating >= 4 ? 'positive' : r.rating === 3 ? 'neutral' : 'negative'),
        topic: r.topic || 'General',
        isOperationalIssue: Boolean(r.is_operational_issue),
        replied: Boolean(r.replied),
        replyText: r.reply_text || undefined,
        replyDate: r.reply_date || undefined,
        source: r.source || 'google',
      }));
    }
    return [];
  } catch (err) {
    console.warn('Failed to fetch company reviews from MySQL:', err);
    return [];
  }
}

export async function createReviewApi(review: Partial<ReviewItem> & { companyId?: string }): Promise<ReviewItem | null> {
  try {
    const res = await apiRequest<{ success: boolean; review: any }>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        companyId: review.companyId,
        author: review.author,
        rating: review.rating,
        content: review.content,
        date: review.date,
        relative_time: review.relativeTime,
        sentiment: review.sentiment,
        topic: review.topic,
        is_operational_issue: review.isOperationalIssue,
        source: review.source || 'google',
      }),
    });
    if (res.success && res.review) {
      const r = res.review;
      return {
        id: r.id,
        author: r.author,
        rating: Number(r.rating) || 5,
        date: r.date,
        relativeTime: r.relative_time || 'Just now',
        content: r.content,
        sentiment: r.sentiment,
        topic: r.topic,
        isOperationalIssue: Boolean(r.is_operational_issue),
        replied: Boolean(r.replied),
        replyText: r.reply_text,
        replyDate: r.reply_date,
        source: r.source,
      };
    }
    return null;
  } catch (err) {
    console.warn('Failed to create review in MySQL:', err);
    return null;
  }
}

export async function replyToReviewApi(reviewId: string, replyText: string, companyId?: string): Promise<boolean> {
  try {
    const res = await apiRequest<{ success: boolean }>(`/api/reviews/${encodeURIComponent(reviewId)}/reply`, {
      method: 'POST',
      body: JSON.stringify({ replyText, companyId }),
    });
    return Boolean(res.success);
  } catch (err) {
    console.warn('Failed to save review reply to MySQL:', err);
    return false;
  }
}

export async function deleteReviewApi(reviewId: string, companyId?: string): Promise<boolean> {
  try {
    const url = companyId
      ? `/api/reviews/${encodeURIComponent(reviewId)}?companyId=${encodeURIComponent(companyId)}`
      : `/api/reviews/${encodeURIComponent(reviewId)}`;
    const res = await apiRequest<{ success: boolean }>(url, { method: 'DELETE' });
    return Boolean(res.success);
  } catch (err) {
    console.warn('Failed to delete review from MySQL:', err);
    return false;
  }
}

// ---------------- CONTENT POSTS API CLIENT (MYSQL-BACKED) ---------------- //

export async function fetchCompanyPosts(companyId?: string): Promise<ContentPost[]> {
  try {
    const url = companyId ? `/api/content-posts?companyId=${encodeURIComponent(companyId)}` : '/api/content-posts';
    const res = await apiRequest<{ success: boolean; posts: any[] }>(url);
    if (res.success && Array.isArray(res.posts)) {
      return res.posts.map((p) => ({
        id: p.id,
        title: p.title || 'Campaign Post',
        type: p.type || 'offer',
        platforms: Array.isArray(p.platforms) ? p.platforms : [p.channel || 'google'],
        headline: p.headline || '',
        caption: p.caption,
        cta: p.cta || '',
        hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
        imageUrl: p.image_url || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80',
        videoUrl: p.video_url || undefined,
        status: p.status || 'scheduled',
        scheduledDate: p.scheduled_date || (p.scheduled_time ? p.scheduled_time.split(' ')[0] : 'Scheduled'),
        timeSlot: p.time_slot || '10:00 AM',
        reelScript: p.reel_script || undefined,
      }));
    }
    return [];
  } catch (err) {
    console.warn('Failed to fetch company content posts from MySQL:', err);
    return [];
  }
}

export async function createContentPostApi(post: Partial<ContentPost> & { companyId?: string }): Promise<ContentPost | null> {
  try {
    const res = await apiRequest<{ success: boolean; post: any }>('/api/content-posts', {
      method: 'POST',
      body: JSON.stringify({
        companyId: post.companyId,
        title: post.title,
        type: post.type,
        platforms: post.platforms,
        headline: post.headline,
        caption: post.caption,
        cta: post.cta,
        image_url: post.imageUrl,
        video_url: post.videoUrl,
        status: post.status,
        scheduled_date: post.scheduledDate,
        time_slot: post.timeSlot,
        hashtags: post.hashtags,
        reel_script: post.reelScript,
      }),
    });
    if (res.success && res.post) {
      const p = res.post;
      return {
        id: p.id,
        title: p.title || 'Campaign Post',
        type: p.type || 'offer',
        platforms: Array.isArray(p.platforms) ? p.platforms : [p.channel || 'google'],
        headline: p.headline || '',
        caption: p.caption,
        cta: p.cta || '',
        hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
        imageUrl: p.image_url,
        videoUrl: p.video_url || post.videoUrl || undefined,
        status: p.status,
        scheduledDate: p.scheduled_date,
        timeSlot: p.time_slot,
        reelScript: p.reel_script,
      };
    }
    return null;
  } catch (err) {
    console.warn('Failed to create content post in MySQL:', err);
    return null;
  }
}

export async function updatePostStatusApi(postId: string, status: string, companyId?: string): Promise<boolean> {
  try {
    const res = await apiRequest<{ success: boolean }>(`/api/content-posts/${encodeURIComponent(postId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, companyId }),
    });
    return Boolean(res.success);
  } catch (err) {
    console.warn('Failed to update post status in MySQL:', err);
    return false;
  }
}

export async function deleteContentPostApi(postId: string, companyId?: string): Promise<boolean> {
  try {
    const url = companyId
      ? `/api/content-posts/${encodeURIComponent(postId)}?companyId=${encodeURIComponent(companyId)}`
      : `/api/content-posts/${encodeURIComponent(postId)}`;
    const res = await apiRequest<{ success: boolean }>(url, { method: 'DELETE' });
    return Boolean(res.success);
  } catch (err) {
    console.warn('Failed to delete content post from MySQL:', err);
    return false;
  }
}

// ---------------- WHATSAPP CLOUD & RAZORPAY INTEGRATION SERVICES ---------------- //

export interface WhatsAppSendResult {
  success: boolean;
  method?: 'meta_cloud_api' | 'wa_link';
  messageId?: string;
  recipient?: string;
  message?: string;
  waLink?: string;
  error?: string;
  fallbackNotice?: string;
}

export async function sendWhatsAppMessageApi(payload: {
  to: string;
  message?: string;
  templateName?: string;
  languageCode?: string;
  templateParams?: string[];
  components?: any[];
  mediaType?: 'image' | 'video' | 'document' | 'audio';
  mediaUrl?: string;
  caption?: string;
  companyId?: string;
}): Promise<WhatsAppSendResult> {
  try {
    const res = await apiRequest<WhatsAppSendResult>('/api/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to dispatch WhatsApp message',
    };
  }
}

export interface WhatsAppBroadcastResult {
  success: boolean;
  campaignName?: string;
  totalRecipients?: number;
  successCount?: number;
  failCount?: number;
  configured?: boolean;
  results?: Array<{
    recipient: string;
    success: boolean;
    messageId?: string;
    waLink?: string;
    error?: string;
  }>;
  error?: string;
}

export async function broadcastWhatsAppApi(payload: {
  recipients: Array<string | { phone: string; name?: string }>;
  message?: string;
  templateName?: string;
  languageCode?: string;
  templateParams?: string[];
  mediaType?: 'image' | 'video' | 'document' | 'audio';
  mediaUrl?: string;
  campaignName?: string;
  companyId?: string;
}): Promise<WhatsAppBroadcastResult> {
  try {
    const res = await apiRequest<WhatsAppBroadcastResult>('/api/whatsapp/broadcast', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to broadcast WhatsApp campaign',
    };
  }
}

export async function getWhatsAppStatusApi(companyId?: string): Promise<{
  configured: boolean;
  phoneNumberId?: string | null;
  wabaId?: string | null;
}> {
  try {
    const url = companyId ? `/api/whatsapp/status?companyId=${encodeURIComponent(companyId)}` : '/api/whatsapp/status';
    const res = await apiRequest<{ success: boolean; configured: boolean; phoneNumberId?: string; wabaId?: string }>(url);
    return {
      configured: Boolean(res.configured),
      phoneNumberId: res.phoneNumberId || null,
      wabaId: res.wabaId || null,
    };
  } catch {
    return { configured: false };
  }
}

// ---------------- META SOCIAL INTEGRATION SERVICES (FACEBOOK & INSTAGRAM) ---------------- //

export interface MetaSocialPublishResult {
  success: boolean;
  configured?: boolean;
  message?: string;
  results?: {
    facebook?: { success: boolean; id?: string; error?: string };
    instagram?: { success: boolean; id?: string; error?: string };
  };
  error?: string;
}

export async function publishToMetaSocialApi(payload: {
  content: string;
  caption?: string;
  imageUrl?: string;
  videoUrl?: string;
  platforms?: Array<'facebook' | 'instagram' | 'whatsapp' | 'google'>;
  companyId?: string;
  postId?: string;
}): Promise<MetaSocialPublishResult> {
  try {
    const res = await apiRequest<MetaSocialPublishResult>('/api/meta/publish-post', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to publish to Meta Social channels',
    };
  }
}

export async function getMetaSocialStatusApi(companyId?: string): Promise<{
  configured: boolean;
  pageId?: string | null;
  instagramId?: string | null;
}> {
  try {
    const url = companyId ? `/api/meta/status?companyId=${encodeURIComponent(companyId)}` : '/api/meta/status';
    const res = await apiRequest<{ success: boolean; configured: boolean; pageId?: string; instagramId?: string }>(url);
    return {
      configured: Boolean(res.configured),
      pageId: res.pageId || null,
      instagramId: res.instagramId || null,
    };
  } catch {
    return { configured: false };
  }
}

export interface RazorpayOrderResult {
  success: boolean;
  order?: any;
  keyId?: string;
  mode?: string;
  error?: string;
}

export async function createRazorpayOrderApi(payload: {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, any>;
  companyId?: string;
}): Promise<RazorpayOrderResult> {
  try {
    const res = await apiRequest<RazorpayOrderResult>('/api/razorpay/create-order', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create Razorpay order' };
  }
}

export async function verifyRazorpayPaymentApi(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature?: string;
  companyId?: string;
  leadId?: string;
  planName?: string;
  amount?: number;
}): Promise<{ success: boolean; verified: boolean; paymentId?: string; message?: string; error?: string }> {
  try {
    const res = await apiRequest<any>('/api/razorpay/verify-payment', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res;
  } catch (err: any) {
    return { success: false, verified: false, error: err?.message || 'Verification failed' };
  }
}

export async function createPaymentLinkApi(payload: {
  amount: number;
  description: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  companyId?: string;
  leadId?: string;
}): Promise<{
  success: boolean;
  shortUrl?: string;
  upiUri?: string;
  method?: string;
  amount?: number;
  error?: string;
}> {
  try {
    const res = await apiRequest<any>('/api/razorpay/create-payment-link', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create payment link' };
  }
}

export async function getRazorpayStatusApi(companyId?: string): Promise<{
  configured: boolean;
  isLive: boolean;
  keyId?: string | null;
  mode: string;
}> {
  try {
    const url = companyId ? `/api/razorpay/status?companyId=${encodeURIComponent(companyId)}` : '/api/razorpay/status';
    const res = await apiRequest<{ success: boolean; configured: boolean; isLive: boolean; keyId?: string; mode: string }>(url);
    return {
      configured: Boolean(res.configured),
      isLive: Boolean(res.isLive),
      keyId: res.keyId || null,
      mode: res.mode || 'UNCONFIGURED',
    };
  } catch {
    return { configured: false, isLive: false, mode: 'UNCONFIGURED' };
  }
}

export interface TelegramNotifyResult {
  success: boolean;
  error?: string;
}

export async function sendTelegramNotifyApi(message: string): Promise<TelegramNotifyResult> {
  try {
    const res = await apiRequest<TelegramNotifyResult>('/api/telegram/notify', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    return res;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to dispatch Telegram alert',
    };
  }
}

export interface GoogleProfileData {
  place_id: string;
  name?: string;
  rating?: number | null;
  user_ratings_total?: number;
  formatted_phone_number?: string | null;
  formatted_address?: string | null;
  website?: string | null;
  url?: string | null;
  opening_hours?: {
    open_now?: boolean;
    weekday_text: string[];
    periods?: any[];
  } | null;
  business_status?: string;
  photos_count?: number;
  photos?: Array<{ photo_reference: string; width: number; height: number }>;
  reviews?: Array<{
    author_name: string;
    author_url?: string;
    profile_photo_url?: string;
    rating: number;
    text: string;
    relative_time_description?: string;
    time?: number;
  }>;
}

export interface GoogleProfileResponse {
  success: boolean;
  configured: boolean;
  cached?: boolean;
  cachedAt?: string;
  warning?: string;
  error?: string;
  message?: string;
  newReviewsSynced?: number;
  syncedReviewsCount?: number;
  data?: GoogleProfileData;
}

export async function getGoogleProfileApi(companyId: string, refresh = false): Promise<GoogleProfileResponse> {
  const query = refresh ? '?refresh=true' : '';
  return apiRequest<GoogleProfileResponse>(`/api/companies/${encodeURIComponent(companyId)}/google-profile${query}`);
}

export async function syncGoogleProfileApi(companyId: string): Promise<GoogleProfileResponse> {
  return apiRequest<GoogleProfileResponse>(`/api/companies/${encodeURIComponent(companyId)}/google-profile/sync`, {
    method: 'POST',
  });
}

// ---------------- LOCAL SEO & GOOGLE MAPS RANK RADAR APIS ---------------- //

export interface RankRadarScanResponse {
  success: boolean;
  keyword?: any;
  keywords?: any[];
  competitors?: any[];
  recommendation?: string;
  message?: string;
  error?: string;
}

export async function scanKeywordRankApi(
  companyId: string,
  keyword: string,
  city?: string
): Promise<RankRadarScanResponse> {
  return apiRequest<RankRadarScanResponse>(`/api/companies/${encodeURIComponent(companyId)}/rank-radar/scan`, {
    method: 'POST',
    body: JSON.stringify({ keyword, city }),
  });
}

export async function refreshAllKeywordRanksApi(companyId: string): Promise<RankRadarScanResponse> {
  return apiRequest<RankRadarScanResponse>(`/api/companies/${encodeURIComponent(companyId)}/rank-radar/refresh-all`, {
    method: 'POST',
  });
}

// ---------------- BRAND MEDIA ASSETS APIS ---------------- //

export async function uploadCompanyAssetApi(
  companyId: string,
  file: File,
  assetType: 'logo' | 'photo',
  label?: string
): Promise<{ success: boolean; asset: CompanyAsset; message?: string }> {
  const token = getStoredToken();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('asset_type', assetType);
  if (label) {
    formData.append('label', label);
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const resolvedUrl = `${API_BASE_URL}/api/companies/${encodeURIComponent(companyId)}/assets`;
  const response = await fetch(resolvedUrl, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Asset upload failed with status ${response.status}`);
  }
  return data;
}

export async function fetchCompanyAssetsApi(companyId: string): Promise<CompanyAsset[]> {
  const res = await apiRequest<{ success: boolean; assets: CompanyAsset[] }>(
    `/api/companies/${encodeURIComponent(companyId)}/assets`
  );
  return res.assets || [];
}

export async function deleteCompanyAssetApi(companyId: string, assetId: string): Promise<boolean> {
  const res = await apiRequest<{ success: boolean; message: string }>(
    `/api/companies/${encodeURIComponent(companyId)}/assets/${encodeURIComponent(assetId)}`,
    {
      method: 'DELETE',
    }
  );
  return res.success;
}

// ---------------- SOCIAL TEMPLATE & CREATIVE RENDERING ENGINE APIS ---------------- //

export interface RenderCreativePayload {
  templateId?: string;
  paletteId?: string;
  contentType?: string;
  headline: string;
  caption?: string;
  ctaText?: string;
  companyId?: string;
  companyName?: string;
  photoUrl?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  tag?: string;
}

export interface RenderCreativeResponse {
  success: boolean;
  imageUrl: string;
  templateId: string;
  templateName: string;
  paletteId?: string;
  paletteName?: string;
  paletteCategory?: string;
  paletteColors?: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
  };
  companyId: string;
  filename: string;
  sizeBytes?: number;
  error?: string;
}

export async function fetchTemplatesApi(): Promise<SocialTemplate[]> {
  const res = await apiRequest<{ success: boolean; templates: SocialTemplate[] }>('/api/ai/templates');
  return res.templates || [];
}

export async function renderCreativeApi(payload: RenderCreativePayload): Promise<RenderCreativeResponse> {
  return apiRequest<RenderCreativeResponse>('/api/ai/render-creative', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface ReelRenderJobInfo {
  id: string;
  companyId: string;
  userId: string;
  status: 'pending' | 'rendering' | 'completed' | 'failed';
  progress: number;
  createdAt: number;
  updatedAt: number;
  videoUrl?: string;
  filename?: string;
  sizeBytes?: number;
  durationSeconds?: number;
  error?: string;
  scenesCount?: number;
}

export interface StartReelRenderResponse {
  success: boolean;
  jobId: string;
  status: 'pending' | 'rendering';
  message: string;
  checkStatusUrl: string;
  error?: string;
}

export interface GetReelStatusResponse {
  success: boolean;
  job: ReelRenderJobInfo;
  error?: string;
}

export async function startReelRenderApi(
  reelScript: any[],
  companyId?: string
): Promise<StartReelRenderResponse> {
  return apiRequest<StartReelRenderResponse>('/api/ai/render-reel', {
    method: 'POST',
    body: JSON.stringify({ reelScript, companyId }),
  });
}

export async function getReelRenderStatusApi(jobId: string): Promise<GetReelStatusResponse> {
  return apiRequest<GetReelStatusResponse>(`/api/ai/render-reel/${encodeURIComponent(jobId)}/status`);
}

// ---------------- BILLING, INVOICE LEDGER & SUBSCRIPTIONS API CLIENTS ---------------- //

export interface CompanyInvoiceRecord {
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
  hsn_code: string;
  pdf_url?: string;
  created_at?: string;
}

export interface CompanySubscriptionRecord {
  id: string;
  company_id: string;
  plan_id: string;
  plan_name: string;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  amount: number;
  billing_cycle: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  razorpay_subscription_id?: string;
  created_at: string;
  updated_at: string;
}

export async function fetchCompanyInvoicesApi(companyId: string): Promise<CompanyInvoiceRecord[]> {
  try {
    const res = await apiRequest<{ success: boolean; count: number; invoices: CompanyInvoiceRecord[] }>(
      `/api/companies/${encodeURIComponent(companyId)}/invoices`
    );
    return res.invoices || [];
  } catch (err) {
    console.warn('Failed to fetch invoices:', err);
    return [];
  }
}

export async function fetchCompanySubscriptionApi(companyId: string): Promise<CompanySubscriptionRecord | null> {
  try {
    const res = await apiRequest<{ success: boolean; subscription: CompanySubscriptionRecord }>(
      `/api/companies/${encodeURIComponent(companyId)}/subscription`
    );
    return res.subscription || null;
  } catch (err) {
    console.warn('Failed to fetch subscription:', err);
    return null;
  }
}

export async function upgradeSubscriptionApi(
  companyId: string,
  planId: 'starter' | 'growth' | 'pro' | 'agency',
  billingCycle = 'monthly',
  paymentId?: string,
  orderId?: string
): Promise<{ success: boolean; subscription: CompanySubscriptionRecord; invoice?: CompanyInvoiceRecord }> {
  return apiRequest<{ success: boolean; subscription: CompanySubscriptionRecord; invoice?: CompanyInvoiceRecord }>(
    `/api/companies/${encodeURIComponent(companyId)}/subscription/upgrade`,
    {
      method: 'POST',
      body: JSON.stringify({ planId, billingCycle, paymentId, orderId }),
    }
  );
}

export async function fetchInvoiceDetailsApi(invoiceId: string): Promise<any | null> {
  try {
    const res = await apiRequest<{ success: boolean; invoice: any }>(
      `/api/invoices/${encodeURIComponent(invoiceId)}/download`
    );
    return res.invoice || null;
  } catch (err) {
    console.warn('Failed to fetch invoice details:', err);
    return null;
  }
}

// ---------------- CUSTOM DOMAINS & WEBSITE BUILDER API CLIENTS ---------------- //

export interface CompanyDomainRecord {
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

export interface WebsiteConfigRecord {
  id?: string;
  company_id: string;
  subdomain?: string;
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
}

export async function fetchCompanyDomainsApi(companyId: string): Promise<CompanyDomainRecord[]> {
  try {
    const res = await apiRequest<{ success: boolean; count: number; domains: CompanyDomainRecord[] }>(
      `/api/companies/${encodeURIComponent(companyId)}/domains`
    );
    return res.domains || [];
  } catch (err) {
    console.warn('Failed to fetch domains:', err);
    return [];
  }
}

export async function addCompanyDomainApi(companyId: string, domain: string): Promise<CompanyDomainRecord> {
  const res = await apiRequest<{ success: boolean; domain: CompanyDomainRecord }>(
    `/api/companies/${encodeURIComponent(companyId)}/domains`,
    {
      method: 'POST',
      body: JSON.stringify({ domain }),
    }
  );
  return res.domain;
}

export async function verifyCompanyDomainApi(
  companyId: string,
  domainId: string
): Promise<{ success: boolean; domain: CompanyDomainRecord; verification: any }> {
  return apiRequest<{ success: boolean; domain: CompanyDomainRecord; verification: any }>(
    `/api/companies/${encodeURIComponent(companyId)}/domains/${encodeURIComponent(domainId)}/verify`,
    {
      method: 'POST',
    }
  );
}

export async function deleteCompanyDomainApi(companyId: string, domainId: string): Promise<boolean> {
  const res = await apiRequest<{ success: boolean; message: string }>(
    `/api/companies/${encodeURIComponent(companyId)}/domains/${encodeURIComponent(domainId)}`,
    {
      method: 'DELETE',
    }
  );
  return res.success;
}

export async function fetchWebsiteConfigApi(companyId: string): Promise<WebsiteConfigRecord | null> {
  try {
    const res = await apiRequest<{ success: boolean; config: WebsiteConfigRecord }>(
      `/api/companies/${encodeURIComponent(companyId)}/website/config`
    );
    return res.config || null;
  } catch (err) {
    console.warn('Failed to fetch website config:', err);
    return null;
  }
}

export async function saveWebsiteConfigApi(
  companyId: string,
  config: Partial<WebsiteConfigRecord>
): Promise<WebsiteConfigRecord> {
  const res = await apiRequest<{ success: boolean; config: WebsiteConfigRecord }>(
    `/api/companies/${encodeURIComponent(companyId)}/website/config`,
    {
      method: 'PUT',
      body: JSON.stringify(config),
    }
  );
  return res.config;
}

export async function downloadStaticWebsiteZip(companyId: string, domain = 'bga.aaditechs.in'): Promise<void> {
  const token = getStoredToken();
  const url = `/api/companies/${encodeURIComponent(companyId)}/website/export`;
  const response = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to download static website zip package');
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `storefront-${domain.replace(/[^a-z0-9]/gi, '_')}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}







