import {generatedText,contentSchema} from '../../shared/aiGeneration';
import {z} from 'zod';
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

async function requestAi(path:string,params:unknown,signal?:AbortSignal):Promise<unknown>{
 try{
  const response=await fetch(`${API_BASE_URL}${path}`,{method:'POST',headers:getAiHeaders(),body:JSON.stringify(params),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(10000)]):AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error(response.status===429?'AI rate limit reached. Please retry later.':response.status===401?'Sign in to use AI generation.':'AI generation unavailable. Please retry later.');
  return await response.json();
 }catch(error){if(signal?.aborted)throw error;throw new Error(error instanceof Error&&['AI rate limit reached. Please retry later.','Sign in to use AI generation.'].includes(error.message)?error.message:'AI generation unavailable. Please retry later.');}
}

export async function askAiChat(params: {
  message: string;
  companyId?:string;
  context?: any;
  businessName?: string;
  category?: string;
  language?: string;
}): Promise<string> {
  const parsed=z.object({reply:generatedText}).safeParse(await requestAi('/api/ai/chat',params));
  if(!parsed.success)throw new Error('AI assistant returned an invalid response.');
  return parsed.data.reply;
}

export async function chatWithMarketingAgent(
  message: string,
  context?: { companyId?:string;businessName?: string; category?: string; location?: string }
): Promise<string> {
  return askAiChat({
    message,
    companyId:context?.companyId,
    businessName: context?.businessName,
    category: context?.category,
  });
}

export async function generateReviewReply(params: {
  companyId?:string;
  reviewText: string;
  rating: number;
  reviewerName: string;
  tone?: string;
  language?: string;
  businessName?: string;
},signal?:AbortSignal): Promise<string> {
  const parsed=z.object({replyText:generatedText}).safeParse(await requestAi('/api/ai/reply-review',params,signal));
  if(!parsed.success)throw new Error('AI reply returned an invalid response.');
  return parsed.data.replyText;
}

export interface MarketingContentParams {
  companyId?:string;
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
  params: MarketingContentParams,signal?:AbortSignal
): Promise<ContentGenerationResponse> {
  const parsed=contentSchema.safeParse(await requestAi('/api/ai/generate-content',params,signal));
  if(!parsed.success)throw new Error('AI content returned an invalid response.');
  return parsed.data;
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

