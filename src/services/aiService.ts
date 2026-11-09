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

export interface KnowledgeQueryPayload {companyId:string;query:string;}
export interface KnowledgeQueryResult {success:boolean;companyId:string;answer:string;isGrounded:boolean;status:'MATCHES'|'NO_MATCH';mode:string;citations:Array<{label:string;title:string;excerpt:string;sourceId:string;sourceVersion:string;page:number|null;contentSha:string}>;sourceWindowTruncated:boolean;faqWindowTruncated?:boolean;}
export async function queryKnowledgeBaseApi(params:KnowledgeQueryPayload,signal?:AbortSignal):Promise<KnowledgeQueryResult>{
 const result:any=await requestAi('/api/ai/knowledge/query',params,signal);
 if(result?.success!==true||result.companyId!==params.companyId||typeof result.answer!=='string'||!['MATCHES','NO_MATCH'].includes(result.status)||!Array.isArray(result.citations))throw new Error('Saved knowledge response unconfirmed.');return result;
}
