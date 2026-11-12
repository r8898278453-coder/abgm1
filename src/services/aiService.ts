import {sessionTransport} from './sessionTransport';
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
  Object.assign(headers,sessionTransport().headers);
  return headers;
}

const knowledgeDraftErrors:Record<string,string>={CLIENT_DAILY_LIMIT:'Client daily action limit reached. Review the client goal controls.',CLIENT_ARCHIVED:'This client is archived. Reactivate it before creating drafts.',KNOWLEDGE_REVIEW_REQUIRED:'Review conflicting or unapproved business facts before generating this draft.',KNOWLEDGE_CHANGED:'Business facts changed during generation. Review current facts and generate a new draft.',KNOWLEDGE_CONTEXT_TOO_LARGE:'Approved business facts exceed the draft context limit. Reduce the active facts and try again.'};
async function requestAi(path:string,params:unknown,signal?:AbortSignal):Promise<unknown>{
 const identity=getStoredToken();try{
  const response=await fetch(`${API_BASE_URL}${path}`,{method:'POST',credentials:sessionTransport().credentials,headers:getAiHeaders(),body:JSON.stringify(params),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(10000)]):AbortSignal.timeout(10000)});
  if(!response.ok){let message=response.status===429?'AI rate limit reached. Please retry later.':response.status===401?'Sign in to use AI generation.':'AI generation unavailable. Please retry later.';if(response.status===409||response.status===429){try{const error=await response.json();message=knowledgeDraftErrors[error?.error]||message;}catch{}}throw new Error(message);}
  const data=await response.json();if(identity!==getStoredToken())throw new Error('Session changed');return data;
 }catch(error){if(signal?.aborted)throw error;throw new Error(error instanceof Error&&['AI rate limit reached. Please retry later.','Sign in to use AI generation.',...Object.values(knowledgeDraftErrors)].includes(error.message)?error.message:'AI generation unavailable. Please retry later.');}
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
export interface KnowledgeQueryResult {success:boolean;companyId:string;answer:string;isGrounded:boolean;status:'MATCHES'|'NO_MATCH'|'CONFLICT_REVIEW_REQUIRED'|'FACT_APPROVAL_REQUIRED';mode:string;citations:Array<{label:string;title:string;excerpt:string;sourceId:string;sourceVersion:string;page:number|null;contentSha:string|null}>;sourceWindowTruncated:boolean;faqWindowTruncated?:boolean;}
export async function queryKnowledgeBaseApi(params:KnowledgeQueryPayload,signal?:AbortSignal):Promise<KnowledgeQueryResult>{
 const result:any=await requestAi('/api/ai/knowledge/query',params,signal);
 if(result?.success!==true||result.companyId!==params.companyId||typeof result.answer!=='string'||!['MATCHES','NO_MATCH','CONFLICT_REVIEW_REQUIRED','FACT_APPROVAL_REQUIRED'].includes(result.status)||typeof result.isGrounded!=='boolean'||!Array.isArray(result.citations)||result.status!=='MATCHES'&&(result.isGrounded||result.citations.length>0))throw new Error('Saved knowledge response unconfirmed.');return result;
}
