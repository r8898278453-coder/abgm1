import {validWorkspaceRevision} from '../../shared/workspaceRevision';
import {isConfirmedMessageAcceptance} from '../../shared/whatsAppOutcomes';
import {messageRequestKey} from './messageRequestKeys';
import {validateScopedCollection,boundedRecordedNumber} from '../../shared/scopedCollection';
import { AuthUser, CompanyRecord, LeadItem, ReviewItem, ContentPost, CompanyAsset, SocialTemplate, InternalCampaign, ExternalAdCampaign } from '../types';
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

export class ApiRequestError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
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

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiRequestError(data?.error || `Request failed with status ${response.status}`, response.status);
  }
  if (data === null) throw new Error('Invalid server response');
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
  if(res.success!==true||typeof res.company?.id!=='string'||!res.company.id||res.company.id.length>64)throw new Error('Company creation acknowledgement unconfirmed');
  return res.company;
}

export async function fetchCompanyData(companyId:string):Promise<{data:any;version:string}>{
  const response=await apiRequest<any>(`/api/companies/${encodeURIComponent(companyId)}/data`);
  if(response.success!==true||response.companyId!==companyId||response.company?.id!==companyId||!validWorkspaceRevision(response.version))throw new Error('Workspace load/revision unconfirmed');
  const settings=response.data?.engine_settings;if(settings!==undefined&&(settings===null||typeof settings!=='object'||Array.isArray(settings)||settings.isHolidayPaused!==undefined&&typeof settings.isHolidayPaused!=='boolean'))throw new Error('Workspace execution settings invalid');
  return {data:response.data||null,version:response.version};
}
export async function saveCompanyData(companyId:string,payload:any,expectedVersion:string):Promise<{version:string}>{
  if(!validWorkspaceRevision(expectedVersion))throw new Error('Workspace revision unavailable');
  const response=await apiRequest<any>(`/api/companies/${encodeURIComponent(companyId)}/data`,{method:'PUT',body:JSON.stringify({data:payload,expectedVersion})});
  if(response.success!==true||response.companyId!==companyId||!validWorkspaceRevision(response.version)||BigInt(response.version)!==BigInt(expectedVersion)+1n)throw new Error('Workspace save acknowledgement unconfirmed');
  return {version:response.version};
}

export async function fetchCompanyLeads(companyId?: string): Promise<LeadItem[]> {
  try {
    const url = companyId ? `/api/leads?companyId=${encodeURIComponent(companyId)}` : '/api/leads';
    const res = await apiRequest<{ success: boolean; leads: any[];companyId?:string }>(url);
    const rows=validateScopedCollection(res,'leads',companyId);
    if (rows) {
      return rows.map((l) => ({
        id: l.id,
        name: l.name,
        phone: l.phone,
        serviceRequested: l.service || 'Service Inquiry',
        date: l.created_at ? new Date(l.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric',timeZone:'Asia/Kolkata' }) : 'Recently',
        source: (l.source?.includes('Google') ? 'Google Maps' : l.source?.includes('WhatsApp') ? 'WhatsApp Direct' : 'Website') as any,
        intentScore: boundedRecordedNumber(l.intent_score,0,100),
        stage: l.stage || 'new',
        notes: [l.company, l.budget, l.notes].filter(Boolean).join(' • '),
        aiSuggestedReply: l.ai_suggested_reply || '',
      }));
    }
    throw new Error('Workspace collection unavailable');
  } catch (err) {
    console.warn('Failed to fetch company leads:', err);
    throw new Error('Workspace collection unavailable');
  }
}

export async function updateLeadStageApi(
  leadId: string,
  stage: LeadItem['stage'],companyId?:string,expectedStage?:LeadItem['stage']
): Promise<{ success: boolean; lead: any }> {
  return apiRequest<{ success: boolean; lead: any }>(`/api/leads/${encodeURIComponent(leadId)}/stage`, {
    method: 'PATCH',
    body: JSON.stringify({ stage,companyId,expectedStage }),
  });
}

// ---------------- REVIEWS API CLIENT (MYSQL-BACKED) ---------------- //

export async function fetchCompanyReviews(companyId?: string): Promise<ReviewItem[]> {
  try {
    const url = companyId ? `/api/reviews?companyId=${encodeURIComponent(companyId)}` : '/api/reviews';
    const res = await apiRequest<{ success: boolean; reviews: any[];companyId?:string }>(url);
    const rows=validateScopedCollection(res,'reviews',companyId);
    if (rows) {
      return rows.map((r) => ({
        id: r.id,
        author: r.author || 'Anonymous Customer',
        rating: boundedRecordedNumber(r.rating,1,5),
        date: r.date || null,
        relativeTime: r.relative_time || (r.date ? undefined : 'Recently'),
        content: r.content || '',
        sentiment: r.sentiment || (typeof r.rating === 'number' ? (r.rating >= 4 ? 'positive' : r.rating === 3 ? 'neutral' : 'negative') : 'neutral'),
        topic: r.topic || 'General',
        isOperationalIssue: Boolean(r.is_operational_issue),
        replied: Boolean(r.replied),
        replyText: r.reply_text || undefined,
        replyDate: r.reply_date || undefined,
        source: r.source || 'manual',
      }));
    }
    throw new Error('Workspace collection unavailable');
  } catch (err) {
    console.warn('Failed to fetch company reviews from MySQL:', err);
    throw new Error('Workspace collection unavailable');
  }
}

export async function createReviewApi(review: Partial<ReviewItem> & { companyId?: string }): Promise<ReviewItem | null> {
  try {
    const res = await apiRequest<{ success: boolean; review: any }>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        companyId: review.companyId,
        author: review.author,
        rating: typeof review.rating === 'number' ? review.rating : (review.rating ? Number(review.rating) : null),
        content: review.content,
        date: review.date || null,
        relative_time: review.relativeTime,
        sentiment: review.sentiment,
        topic: review.topic,
        is_operational_issue: review.isOperationalIssue,
        source: review.source || 'manual',
      }),
    });
    if (res.success === true && typeof res.review?.id==='string' && res.review.id && (!review.companyId || res.review.company_id === review.companyId)) {
      const r = res.review;
      return {
        id: r.id,
        author: r.author || 'Anonymous Customer',
        rating: typeof r.rating === 'number' ? r.rating : (r.rating !== null && r.rating !== undefined ? Number(r.rating) : (null as any)),
        date: r.date || null,
        relativeTime: r.relative_time || 'Just now',
        content: r.content || '',
        sentiment: r.sentiment || 'neutral',
        topic: r.topic || 'General',
        isOperationalIssue: Boolean(r.is_operational_issue),
        replied: Boolean(r.replied),
        replyText: r.reply_text,
        replyDate: r.reply_date,
        source: r.source || 'manual',
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
    return res.success === true;
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
    return res.success === true;
  } catch (err) {
    console.warn('Failed to delete review from MySQL:', err);
    return false;
  }
}

// ---------------- CONTENT POSTS API CLIENT (MYSQL-BACKED) ---------------- //

export async function fetchCompanyPosts(companyId?: string): Promise<ContentPost[]> {
  try {
    const url = companyId ? `/api/content-posts?companyId=${encodeURIComponent(companyId)}` : '/api/content-posts';
    const res = await apiRequest<{ success: boolean; posts: any[];companyId?:string }>(url);
    const rows=validateScopedCollection(res,'posts',companyId);
    if (rows) {
      return rows.map((p) => ({
        id: p.id,
        sourceVersion:p.sourceVersion,
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
    throw new Error('Workspace collection unavailable');
  } catch (err) {
    console.warn('Failed to fetch company content posts from MySQL:', err);
    throw new Error('Workspace collection unavailable');
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
    if (res.success === true && typeof res.post?.id==='string' && res.post.id && (!post.companyId||res.post.company_id===post.companyId)) {
      const p = res.post;
      return {
        id: p.id,
        sourceVersion:p.sourceVersion,
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

export async function updatePostStatusApi(postId: string, status: string, companyId?: string, expectedVersion?:string): Promise<boolean> {
  try {
    const res = await apiRequest<{ success: boolean }>(`/api/content-posts/${encodeURIComponent(postId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, companyId,expectedVersion }),
    });
    return res.success === true;
  } catch (err) {
    console.warn('Failed to update post status in MySQL:', err);
    return false;
  }
}

export async function publishContentPostApi(postId: string, companyId?: string, force?: boolean,expectedVersion?:string): Promise<{ success: boolean; result?: any; error?: string }> {
  if(!companyId || !expectedVersion)return {success:false,error:'Reload the stored post before publishing; a current source version is required.'};
  try {
    const res = await apiRequest<{ success: boolean; result?: any; error?: string }>(`/api/content-posts/${encodeURIComponent(postId)}/publish`, {
      method: 'POST',
      body: JSON.stringify({ companyId, force,expectedVersion }),
    });
    return res;
  } catch (err: any) {
    if(err instanceof ApiRequestError && err.status<500)return {success:false,error:err.message};
    return {success:false,result:{overallStatus:'UNKNOWN',message:'Publishing acknowledgment unconfirmed. Inspect the stored post before retrying.'}};
  }
}

export async function getPublishingHistoryApi(postId: string): Promise<{ success: boolean; records: any[] }> {
  try {
    const res = await apiRequest<{ success: boolean; records: any[] }>(`/api/content-posts/${encodeURIComponent(postId)}/publishing-history`);
    return { success: Boolean(res.success), records: res.records || [] };
  } catch {
    return { success: false, records: [] };
  }
}

export async function deleteContentPostApi(postId: string, companyId?: string): Promise<boolean> {
  try {
    const url = companyId
      ? `/api/content-posts/${encodeURIComponent(postId)}?companyId=${encodeURIComponent(companyId)}`
      : `/api/content-posts/${encodeURIComponent(postId)}`;
    const res = await apiRequest<{ success: boolean }>(url, { method: 'DELETE' });
    return res.success === true;
  } catch (err) {
    console.warn('Failed to delete content post from MySQL:', err);
    return false;
  }
}

// ---------------- INTERNAL & EXTERNAL CAMPAIGN SERVICES ---------------- //

export async function getInternalCampaignsApi(companyId?: string): Promise<InternalCampaign[]> {
  try {
    const url = companyId ? `/api/campaigns/internal?company_id=${encodeURIComponent(companyId)}` : '/api/campaigns/internal';
    const res = await apiRequest<{ success: boolean; campaigns: any[] }>(url);
    if (res.success && Array.isArray(res.campaigns)) {
      return res.campaigns.map((c) => ({
        id: c.id,
        companyId: c.company_id,
        name: c.name,
        objective: c.objective,
        status: c.status,
        startDate: c.start_date,
        endDate: c.end_date,
        plannedBudget: Number(c.planned_budget) || 0,
        channels: Array.isArray(c.channels) ? c.channels : [],
        externalCampaignId: c.external_campaign_id || null,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));
    }
    return [];
  } catch (err) {
    console.warn('Failed to fetch internal campaigns:', err);
    return [];
  }
}

export async function createInternalCampaignApi(campaign: Partial<InternalCampaign> & { company_id?: string }): Promise<InternalCampaign | null> {
  try {
    const res = await apiRequest<{ success: boolean; campaign: any }>('/api/campaigns/internal', {
      method: 'POST',
      body: JSON.stringify({
        company_id: campaign.companyId || campaign.company_id,
        name: campaign.name,
        objective: campaign.objective,
        status: campaign.status || 'active',
        start_date: campaign.startDate,
        end_date: campaign.endDate,
        planned_budget: campaign.plannedBudget,
        channels: campaign.channels,
        external_campaign_id: campaign.externalCampaignId,
      }),
    });
    if (res.success && res.campaign) {
      const c = res.campaign;
      return {
        id: c.id,
        companyId: c.company_id,
        name: c.name,
        objective: c.objective,
        status: c.status,
        startDate: c.start_date,
        endDate: c.end_date,
        plannedBudget: Number(c.planned_budget) || 0,
        channels: Array.isArray(c.channels) ? c.channels : [],
        externalCampaignId: c.external_campaign_id || null,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      };
    }
    return null;
  } catch (err) {
    console.warn('Failed to create internal campaign:', err);
    return null;
  }
}

export async function updateInternalCampaignApi(
  id: string,
  updates: Partial<InternalCampaign>,
  companyId?: string
): Promise<boolean> {
  try {
    const payload: any = { company_id: companyId };
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.objective !== undefined) payload.objective = updates.objective;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.startDate !== undefined) payload.start_date = updates.startDate;
    if (updates.endDate !== undefined) payload.end_date = updates.endDate;
    if (updates.plannedBudget !== undefined) payload.planned_budget = updates.plannedBudget;
    if (updates.channels !== undefined) payload.channels = updates.channels;
    if (updates.externalCampaignId !== undefined) payload.external_campaign_id = updates.externalCampaignId;

    const res = await apiRequest<{ success: boolean }>(`/api/campaigns/internal/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return Boolean(res.success);
  } catch (err) {
    console.warn('Failed to update internal campaign:', err);
    return false;
  }
}

export async function deleteInternalCampaignApi(id: string, companyId?: string): Promise<boolean> {
  try {
    const url = companyId
      ? `/api/campaigns/internal/${encodeURIComponent(id)}?company_id=${encodeURIComponent(companyId)}`
      : `/api/campaigns/internal/${encodeURIComponent(id)}`;
    const res = await apiRequest<{ success: boolean }>(url, { method: 'DELETE' });
    return Boolean(res.success);
  } catch (err) {
    console.warn('Failed to delete internal campaign:', err);
    return false;
  }
}

export async function getExternalAdCampaignsApi(companyId?: string): Promise<ExternalAdCampaign[]> {
  try {
    const url = companyId ? `/api/campaigns/external?company_id=${encodeURIComponent(companyId)}` : '/api/campaigns/external';
    const res = await apiRequest<{ success: boolean; companyId:string; campaigns: any[] }>(url);
    if (res.success===true && (!companyId||res.companyId===companyId) && Array.isArray(res.campaigns) && res.campaigns.every(c=>c.company_id===res.companyId)) {
      return validateScopedCollection(res,'campaigns',companyId||res.companyId).map((c) => ({
        id: c.id,
        companyId: c.company_id,
        internalCampaignId: c.internal_campaign_id || null,
        provider: c.provider,
        externalCampaignId: c.external_campaign_id,
        name: c.name,
        status: c.status,
        fetchedAt: c.fetched_at,
        spend: boundedRecordedNumber(c.spend,0,Number.MAX_SAFE_INTEGER) ?? 'UNAVAILABLE',
        impressions: boundedRecordedNumber(c.impressions,0,Number.MAX_SAFE_INTEGER) ?? 'UNAVAILABLE',
        clicks: boundedRecordedNumber(c.clicks,0,Number.MAX_SAFE_INTEGER) ?? 'UNAVAILABLE',
        conversions: boundedRecordedNumber(c.conversions,0,Number.MAX_SAFE_INTEGER) ?? 'UNAVAILABLE',
        conversionTrackingStatus: c.conversion_tracking_status || 'UNAVAILABLE',
        revenue: boundedRecordedNumber(c.revenue,0,Number.MAX_SAFE_INTEGER) ?? 'UNAVAILABLE',
        revenueAttributionStatus: c.revenue_attribution_status || 'UNAVAILABLE',
        roas: boundedRecordedNumber(c.roas,0,Number.MAX_SAFE_INTEGER) ?? 'UNAVAILABLE',
        rawMetricsJson: c.raw_metrics_json,
      }));
    }
    throw new Error('External campaign collection unavailable');
  } catch (err) {
    throw new Error('External campaign collection unavailable');
  }
}

export async function syncExternalAdCampaignsApi(
  companyId?: string,
  provider = 'meta_ads'
): Promise<{ success: boolean; companyId?:string; syncResult?: any; error?: string }> {
  try {
    const res = await apiRequest<{ success: boolean; companyId?:string; syncResult?: any; error?: string }>('/api/campaigns/external/sync', {
      method: 'POST',
      body: JSON.stringify({ company_id: companyId, provider }),
    });
    return res;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Sync request failed' };
  }
}

export async function linkInternalToExternalCampaignApi(
  internalId: string,
  externalCampaignId: string | null,
  companyId?: string
): Promise<boolean> {
  try {
    const res = await apiRequest<{ success: boolean }>(`/api/campaigns/internal/${encodeURIComponent(internalId)}/link-external`, {
      method: 'POST',
      body: JSON.stringify({ external_campaign_id: externalCampaignId, company_id: companyId }),
    });
    return Boolean(res.success);
  } catch (err) {
    console.warn('Failed to link internal to external campaign:', err);
    return false;
  }
}

// ---------------- WHATSAPP CLOUD & RAZORPAY INTEGRATION SERVICES ---------------- //

export interface WhatsAppSendResult {
  requestKey?:string;status?:string;
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
  let intent:Awaited<ReturnType<typeof messageRequestKey>>|undefined;
  try {
    intent=await messageRequestKey(`${getStoredUser()?.id||'session'}:${payload.companyId||'default'}:sendWhatsAppMessageApi`,payload);
    const res = await apiRequest<WhatsAppSendResult>('/api/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify({...payload,requestKey:intent.key}),
    });
    if(res.success===true&&!isConfirmedMessageAcceptance(res,intent.key))return {success:false,status:'UNKNOWN',requestKey:intent.key,error:'Message acknowledgement unconfirmed. Inspect stored request before retrying.'};
    if(isConfirmedMessageAcceptance(res,intent.key))intent.clear();
    return {...res,requestKey:intent.key};
  } catch (err: any) {
    return {
      success: false,requestKey:intent?.key,
      error: err?.message || 'Failed to dispatch WhatsApp message',
    };
  }
}

export interface WhatsAppBroadcastResult {
  status?:string;
  requestKey?:string;
  acceptedCount?:number;rejectedCount?:number;unknownCount?:number;pausedCount?:number;notAttemptedCount?:number;
  success: boolean;
  campaignName?: string;
  totalRecipients?: number;
  successCount?: number;
  failCount?: number;
  configured?: boolean;
  results?: Array<{
    recipient: string;status?:string;requestKey?:string;
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
  let intent:Awaited<ReturnType<typeof messageRequestKey>>|undefined;
  try {
    intent=await messageRequestKey(`${getStoredUser()?.id||'session'}:${payload.companyId||'default'}:broadcastWhatsAppApi`,payload);
    const res = await apiRequest<WhatsAppBroadcastResult>('/api/whatsapp/broadcast', {
      method: 'POST',
      body: JSON.stringify({...payload,requestKey:intent.key}),
    });
    if(res.success===true&&res.requestKey!==intent.key)return {success:false,status:'UNKNOWN',requestKey:intent.key,error:'Broadcast acknowledgement unconfirmed. Inspect request results before retrying.'};
    if(res.status==='API_ACCEPTED'&&res.requestKey===intent.key)intent.clear();
    return {...res,requestKey:intent.key};
  } catch (err: any) {
    return {
      success: false,requestKey:intent?.key,
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
  status?: string;
  postId?: string;
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
  platforms: Array<'facebook' | 'instagram'>;
  companyId: string;
  postId: string;
  expectedVersion:string;
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
      postId: payload.postId,
      status: err instanceof ApiRequestError && err.status < 500 ? 'FAILED' : 'UNKNOWN',
      error: err instanceof ApiRequestError && err.status < 500 ? err.message : 'Publishing result unconfirmed. Inspect the stored post before retrying.',
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

export async function sendTelegramNotifyApi(companyId: string, message: string): Promise<TelegramNotifyResult> {
  try {
    const res = await apiRequest<TelegramNotifyResult>('/api/telegram/notify', {
      method: 'POST',
      body: JSON.stringify({ companyId, message }),
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
  companyId?:string;previousVersion?:string;version?:string;
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
  status: 'trial' | 'active' | 'past_due' | 'payment_failed' | 'cancelled' | 'expired' | 'trialing';
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
  status: 'active' | 'dns_verified' | 'pending_verification' | 'failed';
  ssl_status: 'active' | 'unverified' | 'provisioning' | 'expired';
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

export interface RevenueAttributionResult {
  companyId: string;
  totalLeads: number;
  qualifiedLeads: number;
  opportunityLeads: number;
  dealLeads: number;
  customerCount: number;
  conversionRate: number;
  totalRevenue: number;
  currency: string;
  roi: number | 'UNAVAILABLE';
  sources: Array<{
    source: string;
    leads: number;
    qualified: number;
    opportunities: number;
    deals: number;
    customers: number;
    revenue: number;
    conversionRate: number;
    cost: number | null;
    roi: number | 'UNAVAILABLE';
    status: string;
  }>;
  calculatedAt: string;
}

export async function fetchRevenueAttributionApi(companyId?: string): Promise<RevenueAttributionResult | null> {
  try {
    const url = companyId
      ? `/api/companies/${encodeURIComponent(companyId)}/revenue-attribution`
      : '/api/revenue-attribution';
    const res = await apiRequest<{ success: boolean; attribution: RevenueAttributionResult }>(url);
    return res.attribution || null;
  } catch (err) {
    console.warn('Failed to fetch revenue attribution:', err);
    return null;
  }
}

function websiteAck<T extends {company_id:string}>(company:string,response:any,key:string):T{
 if(response.success!==true||response.companyId!==company||!response[key]||response[key].company_id!==company)throw new Error('Website acknowledgement unavailable; reload to confirm state');return response[key];
}
export async function fetchCompanyDomainsApi(companyId:string,signal?:AbortSignal):Promise<CompanyDomainRecord[]>{
 const response=await apiRequest<any>(`/api/companies/${encodeURIComponent(companyId)}/domains`,{signal});
 if(response.success!==true||response.companyId!==companyId||!Array.isArray(response.domains)||response.domains.some((row:any)=>row.company_id!==companyId))throw new Error('Domain data unavailable');return response.domains;
}
export async function addCompanyDomainApi(companyId:string,domain:string,signal?:AbortSignal):Promise<CompanyDomainRecord>{
 return websiteAck<CompanyDomainRecord>(companyId,await apiRequest<any>(`/api/companies/${encodeURIComponent(companyId)}/domains`,{method:'POST',body:JSON.stringify({domain}),signal}),'domain');
}
export async function verifyCompanyDomainApi(companyId:string,domainId:string,signal?:AbortSignal):Promise<{success:boolean;domain:CompanyDomainRecord;verification:any}>{
 const response=await apiRequest<any>(`/api/companies/${encodeURIComponent(companyId)}/domains/${encodeURIComponent(domainId)}/verify`,{method:'POST',signal});websiteAck(companyId,response,'domain');return response;
}
export async function deleteCompanyDomainApi(companyId:string,domainId:string,signal?:AbortSignal):Promise<boolean>{
 const response=await apiRequest<any>(`/api/companies/${encodeURIComponent(companyId)}/domains/${encodeURIComponent(domainId)}`,{method:'DELETE',signal});if(response.success!==true||response.companyId!==companyId)throw new Error('Domain removal not confirmed');return true;
}
export async function fetchWebsiteConfigApi(companyId:string,signal?:AbortSignal):Promise<WebsiteConfigRecord|null>{
 const response=await apiRequest<any>(`/api/companies/${encodeURIComponent(companyId)}/website/config`,{signal});
 if(response.success!==true||response.companyId!==companyId)throw new Error('Website settings unavailable');return response.config===null?null:websiteAck<WebsiteConfigRecord>(companyId,response,'config');
}
export async function saveWebsiteConfigApi(companyId:string,config:Partial<WebsiteConfigRecord>,signal?:AbortSignal):Promise<WebsiteConfigRecord>{
 return websiteAck<WebsiteConfigRecord>(companyId,await apiRequest<any>(`/api/companies/${encodeURIComponent(companyId)}/website/config`,{method:'PUT',body:JSON.stringify(config),signal}),'config');
}
export async function downloadStaticWebsiteZip(companyId:string,domain='bga.aaditechs.in',options:{signal?:AbortSignal;isCurrent?:()=>boolean}={}):Promise<void>{
 const token=getStoredToken();const current=()=>!options.signal?.aborted&&(!options.isCurrent||options.isCurrent())&&token===getStoredToken();
 const response=await fetch(`${API_BASE_URL}/api/companies/${encodeURIComponent(companyId)}/website/export`,{headers:{...(token?{Authorization:`Bearer ${token}`}:{})},signal:options.signal});
 if(!response.ok||!response.headers.get('content-type')?.includes('application/zip'))throw new Error('Website download was not confirmed');
 const blob=await response.blob();if(!current())throw new Error('Website download cancelled after workspace change');
 const url=window.URL.createObjectURL(blob);const link=document.createElement('a');try{link.href=url;link.download=`storefront-${domain.replace(/[^a-z0-9]/gi,'_')}.zip`;document.body.appendChild(link);if(current())link.click();else throw new Error('Website download cancelled');}finally{link.remove();window.URL.revokeObjectURL(url);}
}

// ---------------- AUTONOMOUS GOVERNANCE & KILL SWITCH APIS ---------------- //

export async function toggleAutonomousKillSwitchApi(params: {
  companyId?: string;
  emergencyStop?: boolean;
  autopilotEnabled?: boolean;
}): Promise<{
  success: boolean;
  globalEmergencyStop?: boolean;
  autopilotEnabled?: boolean;
  message?: string;
  error?: string;
}> {
  return apiRequest<{
    success: boolean;
    globalEmergencyStop?: boolean;
    autopilotEnabled?: boolean;
    message?: string;
    error?: string;
  }>('/api/autonomous/kill-switch', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function fetchAutonomousStatusApi(companyId?: string): Promise<{
  success: boolean;
  globalEmergencyStop: boolean;
  autopilotEnabled: boolean;
}> {
  const compParam = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
  return apiRequest<{
    success: boolean;
    globalEmergencyStop: boolean;
    autopilotEnabled: boolean;
  }>(`/api/autonomous/status${compParam}`);
}








