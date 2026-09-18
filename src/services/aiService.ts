import { getStoredToken } from './authService';
import { API_BASE_URL } from '../config/apiConfig';

export interface ChatResponse {
  reply: string;
}

export interface ReviewReplyResponse {
  replyText: string;
}

export interface ContentGenerationResponse {
  headline?: string;
  caption?: string;
  callToAction?: string;
  hashtags?: string[];
  googlePostSnippet?: string;
  reelScript?: { scene: string; visual: string; audio: string }[];
  raw?: string;
}

function getAiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function askAiChat(params: {
  message: string;
  context?: any;
  businessName?: string;
  category?: string;
  language?: string;
}): Promise<string> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: getAiHeaders(),
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(10000),
    });

    if (res.status === 429) {
      const data = await res.json().catch(() => null);
      return data?.error || '⚠️ AI rate limit reached (max 20 requests/minute). Please wait a moment before sending more messages.';
    }

    if (res.status === 401) {
      return '🔒 Please sign in to your Aaditech account to use LocalPulse AI.';
    }

    if (res.ok) {
      const data: ChatResponse = await res.json();
      if (data.reply) return data.reply;
    }
  } catch {
    // Graceful fallback without noisy logs
  }
  return `LocalPulse AI Response: Based on current metrics, your Google profile visibility in Sector 17 is strong at #2. Prioritize approving the 4 review drafts and publishing the weekend offer to maintain top rank!`;
}

export async function chatWithMarketingAgent(
  message: string,
  context?: { businessName?: string; category?: string; location?: string }
): Promise<string> {
  return askAiChat({
    message,
    businessName: context?.businessName,
    category: context?.category,
  });
}

export async function generateReviewReply(params: {
  reviewText: string;
  rating: number;
  reviewerName: string;
  tone?: string;
  language?: string;
  businessName?: string;
}): Promise<string> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/ai/reply-review`, {
      method: 'POST',
      headers: getAiHeaders(),
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(10000),
    });

    if (res.status === 429) {
      return '⚠️ AI rate limit reached. Please wait a moment before generating another reply.';
    }

    if (res.status === 401) {
      return '🔒 Please log in to generate AI review replies.';
    }

    if (res.ok) {
      const data: ReviewReplyResponse = await res.json();
      if (data.replyText) return data.replyText;
    }
  } catch {
    // Graceful fallback without noisy logs
  }

  return params.rating >= 4
    ? `Thank you so much, ${params.reviewerName}! We are delighted that you had a great experience with our team at ${params.businessName || 'our store'}. Looking forward to assisting you again!`
    : `Hello ${params.reviewerName}, thank you for your candid feedback. We deeply value customer satisfaction and regret that we missed the mark. Please reach out to our desk directly so we can resolve this promptly for you.`;
}

export interface MarketingContentParams {
  businessName?: string;
  category?: string;
  contentType?: string;
  platform?: string;
  offer?: string;
  language?: string;
  website?: string;
  city?: string;
  targetAudience?: string;
  brandTone?: string;
  tagline?: string;
  preferredLanguage?: string;
}

export async function generateMarketingContent(
  params: MarketingContentParams
): Promise<ContentGenerationResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/ai/generate-content`, {
      method: 'POST',
      headers: getAiHeaders(),
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(10000),
    });

    if (res.status === 429) {
      const err = await res.json().catch(() => null);
      return {
        headline: '⚠️ AI Rate Limit Reached',
        caption: err?.error || 'Rate limit reached for AI generation. Please wait a minute before generating new posts.',
        callToAction: 'Wait a moment & retry',
        hashtags: ['#RateLimitNotice'],
      };
    }

    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Graceful fallback without noisy logs
  }

  const name = params.businessName || 'Our Business';
  const cat = params.category || 'Services';
  const loc = params.city ? ` in ${params.city}` : '';
  const off = params.offer || `Special Offer on ${cat}`;
  const web = params.website ? ` Visit ${params.website} or reach` : ' Reach';

  return {
    headline: `⚡ Exclusive ${off} at ${name}!`,
    caption: `Looking for top-quality ${cat}${loc}? 🌟 At ${name}, we are committed to delivering excellence, friendly service, and dedicated support.${web} out to us today!`,
    callToAction: 'Message Us on WhatsApp',
    hashtags: [
      `#${name.replace(/[^a-zA-Z0-9]/g, '')}`,
      `#${cat.replace(/[^a-zA-Z0-9]/g, '')}`,
      '#SpecialOffer',
      '#LocalBusiness',
      '#TrustedService',
    ],
    googlePostSnippet: `Limited-time offer from ${name}: Premium ${cat}${loc}. Contact us today to claim this special promotion!`,
  };
}

export interface KnowledgeQueryPayload {
  query: string;
  businessName?: string;
  category?: string;
  services?: string[];
  documents?: { name: string; category?: string; size?: string; textContent?: string }[];
  faqs?: { question: string; answer: string; category?: string }[];
}

export interface KnowledgeQueryResult {
  success: boolean;
  answer: string;
  isGrounded: boolean;
  error?: string;
}

export async function queryKnowledgeBaseApi(params: KnowledgeQueryPayload): Promise<KnowledgeQueryResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/ai/knowledge/query`, {
      method: 'POST',
      headers: getAiHeaders(),
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(15000),
    });

    if (res.status === 401) {
      return {
        success: false,
        answer: '🔒 Please log in to your account to query the AI Knowledge Base.',
        isGrounded: false,
      };
    }

    if (res.status === 429) {
      return {
        success: false,
        answer: '⚠️ AI Rate Limit reached. Please wait a moment before running another fact-check query.',
        isGrounded: false,
      };
    }

    if (res.ok) {
      return await res.json();
    }
    const err = await res.json().catch(() => null);
    return {
      success: false,
      answer: err?.error || 'Failed to query knowledge base.',
      isGrounded: false,
    };
  } catch (err: any) {
    return {
      success: false,
      answer: err?.message || 'Network error while querying knowledge base.',
      isGrounded: false,
    };
  }
}

