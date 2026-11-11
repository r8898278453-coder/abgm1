import type {OPERATION_STATES} from '../shared/operationStates';
import {publishingExecutionBlock,type PublicationExecutionMode} from './publishingExecutionControls';
import {publishingSourceVersion} from './publishingSource';
import { metaPublishingText } from './metaPublishingText';
import type { PublishingClaim } from './publishingClaims';
import crypto from 'crypto';
import {
  DbContentPost,
  claimPublishingDispatch,
  ownsPublishingDispatch,
  settlePublishingDispatch,
  DbPublishingRecord,
  createPublishingRecord,
  updatePublishingRecord,
  getLatestPublishingRecord,
  getUnconfirmedPublishingEvidence,
  isPostAlreadyPublished,
  getPostById,
  updateContentPostStatus,
  getCompanyById,
  getCompanyIntegration,
} from './db';
import {
  resolveMetaSocialCredentials,
  resolveWhatsAppCredentials,
  publishToFacebookPage,
  publishToInstagram,
  sendWhatsAppCloudMessage,
} from './metaWhatsAppService';

export { isPostAlreadyPublished };

// In-flight publishing locks to prevent concurrent executions for the same post (Idempotency Mutex)
const activePublishingLocks = new Set<string>();

export type ProviderStatus = keyof typeof OPERATION_STATES.publication;
export type ErrorCategory = 'PERMANENT' | 'RETRYABLE' | 'TIMEOUT_UNKNOWN';

export interface ProviderDispatchResult {
  platform: string;
  success: boolean;
  status: ProviderStatus;
  providerPostId?: string | null;
  errorType?: ErrorCategory;
  errorMessage?: string | null;
  attemptsMade: number;
}

export interface PublishingJobResult {
  deferredReason?:import('./queueSql').PauseReason;
  postId: string;
  companyId: string;
  status: 'PUBLISHED' | 'FAILED' | 'UNKNOWN' | 'SKIPPED_ALREADY_PUBLISHED' | 'IN_PROGRESS';
  overallStatus: 'PUBLISHED' | 'FAILED' | 'UNKNOWN' | 'SKIPPED_ALREADY_PUBLISHED' | 'IN_PROGRESS';
  finalPostStatus: DbContentPost['status'];
  platformResults: ProviderDispatchResult[];
  message: string;
  executedAt: string;
}

const MAX_DEFAULT_RETRIES = 2; // 1 initial attempt + up to 2 retries for retryable errors = 3 total

/**
 * Classifies an error into PERMANENT, RETRYABLE, or TIMEOUT_UNKNOWN.
 * Permanent errors (4xx, missing credentials, invalid format) MUST NEVER be retried indefinitely.
 * Only definite retryable rejections such as429 may be retried; ambiguous writes require reconciliation.
 */
export function classifyProviderError(
  errOrMsg: any,
  httpStatus?: number
): { errorType: ErrorCategory; isRetryable: boolean; message: string } {
  const message = typeof errOrMsg === 'string'
    ? errOrMsg
    : errOrMsg?.message || 'Unknown provider error';
  const lower = message.toLowerCase();
  if (httpStatus === 408 || (httpStatus && httpStatus >= 500 && httpStatus <= 599)) {
    return { errorType: 'TIMEOUT_UNKNOWN', isRetryable: false, message: 'Provider write outcome unconfirmed; reconciliation required' };
  }

  // 1. Missing credentials / configuration -> PERMANENT
  if (
    lower.includes('not_configured') ||
    lower.includes('missing') ||
    lower.includes('unconfigured') ||
    lower.includes('not configured') ||
    lower.includes('no credentials')
  ) {
    return { errorType: 'PERMANENT', isRetryable: false, message };
  }

  // 2. HTTP Status Code Checks
  if (httpStatus) {
    if (httpStatus === 429) {
      return { errorType: 'RETRYABLE', isRetryable: true, message: `Rate limited (HTTP 429): ${message}` };
    }
    if (httpStatus >= 400 && httpStatus < 500) {
      return { errorType: 'PERMANENT', isRetryable: false, message: `Client/Auth error (HTTP ${httpStatus}): ${message}` };
    }
  }

  // 3. Timeout / Abort errors -> Provider state unknown
  if (
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('time out') ||
    lower.includes('etimedout') ||
    lower.includes('esockettimedout') ||
    lower.includes('aborted') ||
    lower.includes('aborterror') ||
    lower.includes('econnreset') ||
    lower.includes('socket hang up') || lower.includes('fetch failed') || lower.includes('network') || lower.includes('unconfirmed')
  ) {
    return { errorType: 'TIMEOUT_UNKNOWN', isRetryable: false, message: 'Provider write outcome unconfirmed; reconciliation required' };
  }

  // 4. Authentication / OAuth / Permission errors -> PERMANENT
  if (
    lower.includes('token') ||
    lower.includes('permission') ||
    lower.includes('oauth') ||
    lower.includes('unauthorized') ||
    lower.includes('forbidden') ||
    lower.includes('invalid parameter') ||
    lower.includes('cannot parse')
  ) {
    return { errorType: 'PERMANENT', isRetryable: false, message };
  }

  // 5. Default fallback to permanent to prevent infinite retry loops
  return { errorType: 'PERMANENT', isRetryable: false, message };
}

/**
 * Sends a Telegram notification push if configured.
 */
async function sendTelegramAlert(companyId: string, message: string, canDispatch: () => Promise<boolean>): Promise<{ success: boolean; messageId?: string; error?: string; httpStatus?: number }> {
  const integration = await getCompanyIntegration(companyId, 'telegram_bot');
  const botToken = integration?.credentials?.botToken;
  const chatId = integration?.credentials?.chatId;
  if (!integration || integration.company_id !== companyId || integration.status !== 'connected' ||
      typeof botToken !== 'string' || !/^\d+:[A-Za-z0-9_-]+$/.test(botToken) ||
      typeof chatId !== 'string' || !/^-?\d+$/.test(chatId)) return { success: false, error: 'NOT_CONFIGURED: Workspace Telegram integration and recipient required' };
  if (!await canDispatch()) return {success:false,error:'Unconfirmed publishing ownership; reconciliation required'};
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message }), signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (res.ok && data.ok === true && Number.isInteger(data.result?.message_id) && String(data.result?.chat?.id) === chatId) {
      return { success: true, messageId: String(data.result.message_id) };
    }
    return { success: false, error: res.ok ? 'Unconfirmed Telegram provider acknowledgment' : (data.description || 'Telegram provider rejection'), httpStatus: res.status };
  } catch { return { success: false, error: 'Network or unconfirmed Telegram provider response' }; }
}

/**
 * Executes a single platform dispatch with strict idempotency and retry handling.
 */
async function dispatchPlatformWithRetry(
  platform: string,
  post: DbContentPost,
  companyId: string,
  idempotencyKey: string,
  canDispatch: () => Promise<boolean>,
  canStart:()=>Promise<boolean>
): Promise<ProviderDispatchResult> {
  const previous = await getUnconfirmedPublishingEvidence(post.id, platform);
  if (previous && previous.company_id !== companyId) throw new Error('PUBLISHING_RECORD_SCOPE_MISMATCH');
  if (previous && ['UNKNOWN','RETRYING'].includes(previous.status)) {
    return { platform, success: false, status: 'UNKNOWN', errorType: 'TIMEOUT_UNKNOWN',
      errorMessage: 'Previous provider attempt is unconfirmed; reconciliation required before resend', attemptsMade: previous.attempt_count };
  }

  // Check if platform is already confirmed published
  const alreadyPublished = await isPostAlreadyPublished(post.id, platform);
  if (alreadyPublished) {
    const existingRec = await getLatestPublishingRecord(post.id, platform);
    if (!existingRec || existingRec.company_id !== companyId || existingRec.status !== 'PUBLISHED' || typeof existingRec.provider_post_id !== 'string' || !existingRec.provider_post_id.trim()) {
      return { platform, success: false, status: 'UNKNOWN', errorType: 'TIMEOUT_UNKNOWN',
        errorMessage: 'Published record requires confirmation reconciliation', attemptsMade: existingRec?.attempt_count || 0 };
    }
    return {
      platform,
      success: true,
      status: 'PUBLISHED',
      providerPostId: existingRec.provider_post_id,
      attemptsMade: existingRec?.attempt_count || 1,
    };
  }

  if(!await canStart())return {platform,success:false,status:'FAILED',errorType:'PERMANENT',errorMessage:'Publishing paused before provider attempt',attemptsMade:0};

  // Create attempt record only after unresolved-evidence guards.
  const record = await createPublishingRecord({
    post_id: post.id,
    company_id: companyId,
    platform,
    status: 'RETRYING',
    attempt_count: 1,
    max_attempts: MAX_DEFAULT_RETRIES + 1,
    idempotency_key: idempotencyKey,
  });

  let currentAttempt = 0;
  let lastErrorType: ErrorCategory = 'PERMANENT';
  let lastErrorMessage = '';
  let providerPostId: string | null = null;
  let providerSuccess = false;

  while (currentAttempt <= MAX_DEFAULT_RETRIES) {
    if (!await canDispatch()) { lastErrorType = 'TIMEOUT_UNKNOWN'; lastErrorMessage = 'Publishing claim lost; reconciliation required'; break; }
    if(!await canStart()){lastErrorType='PERMANENT';lastErrorMessage='Publishing paused before provider attempt';break;}
    currentAttempt++;
    await updatePublishingRecord(record.id, { attempt_count: currentAttempt });

    try {
      if (platform === 'facebook') {
        const metaCreds = await resolveMetaSocialCredentials(companyId);
        if (!metaCreds.configured || !metaCreds.pageId) {
          lastErrorType = 'PERMANENT';
          lastErrorMessage = 'Facebook Page ID or Meta Access Token is not configured.';
          break; // Do not retry permanent missing configuration
        }

        if (!await canDispatch()) { lastErrorType = 'TIMEOUT_UNKNOWN'; lastErrorMessage = 'Publishing claim lost; reconciliation required'; break; }
        if(!await canStart()){lastErrorType='PERMANENT';lastErrorMessage='Publishing paused before provider attempt';break;}
        const fbRes = await publishToFacebookPage({
          pageId: metaCreds.pageId,
          accessToken: metaCreds.accessToken,
          message: metaPublishingText(post),
          imageUrl: post.image_url,
        });

        if (fbRes.success && fbRes.id) {
          providerSuccess = true;
          providerPostId = fbRes.id;
          break;
        } else {
          const classified = classifyProviderError(fbRes.error || 'Facebook publishing failed', fbRes.httpStatus);
          lastErrorType = classified.errorType;
          lastErrorMessage = classified.message;
          if (!classified.isRetryable) break;
        }
      } else if (platform === 'instagram') {
        const metaCreds = await resolveMetaSocialCredentials(companyId);
        if (!metaCreds.configured || !metaCreds.instagramId) {
          lastErrorType = 'PERMANENT';
          lastErrorMessage = 'Instagram Business Account ID or Meta Access Token is not configured.';
          break;
        }

        if (!await canDispatch()) { lastErrorType = 'TIMEOUT_UNKNOWN'; lastErrorMessage = 'Publishing claim lost; reconciliation required'; break; }
        if(!await canStart()){lastErrorType='PERMANENT';lastErrorMessage='Publishing paused before provider attempt';break;}
        const igRes = await publishToInstagram({
          instagramId: metaCreds.instagramId,
          canPublish:async()=>await canDispatch() && await canStart(),
          accessToken: metaCreds.accessToken,
          caption: metaPublishingText(post),
          imageUrl: post.image_url,
          videoUrl: post.video_url,
        });

        if (igRes.success && igRes.id) {
          providerSuccess = true;
          providerPostId = igRes.id;
          break;
        } else {
          const classified = classifyProviderError(igRes.error || 'Instagram publishing failed', igRes.httpStatus);
          lastErrorType = classified.errorType;
          lastErrorMessage = classified.message;
          if (!classified.isRetryable) break;
        }
      } else if (platform === 'whatsapp') {
        const waCreds = await resolveWhatsAppCredentials(companyId);
        if (!waCreds.configured) {
          lastErrorType = 'PERMANENT';
          lastErrorMessage = 'WhatsApp Cloud API Phone Number ID or Access Token is not configured.';
          break;
        }

        // Broadcast to admin or verified company phone
        const company = await getCompanyById(companyId);
        const recipientPhone = company?.phone || '';
        if (!recipientPhone) {
          lastErrorType = 'PERMANENT';
          lastErrorMessage = 'No valid recipient phone number configured for WhatsApp broadcast.';
          break;
        }

        if (!await canDispatch()) { lastErrorType = 'TIMEOUT_UNKNOWN'; lastErrorMessage = 'Publishing claim lost; reconciliation required'; break; }
        if(!await canStart()){lastErrorType='PERMANENT';lastErrorMessage='Publishing paused before provider attempt';break;}
        const waRes = await sendWhatsAppCloudMessage(waCreds, {
          to: recipientPhone,
          message: `📢 *${post.title}*\n\n${post.headline ? '*' + post.headline + '*\n\n' : ''}${post.caption}\n\n${post.cta ? '👉 ' + post.cta : ''}`,
          mediaUrl: post.image_url,
          mediaType: post.image_url ? 'image' : undefined,
        });

        if (waRes.success && waRes.messageId) {
          providerSuccess = true;
          providerPostId = waRes.messageId;
          break;
        } else {
          const classified = classifyProviderError(waRes.error || 'WhatsApp delivery failed', waRes.httpStatus);
          lastErrorType = classified.errorType;
          lastErrorMessage = classified.message;
          if (!classified.isRetryable) break;
        }
      } else if (platform === 'telegram') {
        const text = `Publishing update\nTitle: ${post.title || ''}\n${post.headline || ''}\n${post.caption}`;
        const tgRes = await sendTelegramAlert(companyId, text,async()=>await canDispatch() && await canStart());
        if (tgRes.success && tgRes.messageId) {
          providerSuccess = true;
          providerPostId = tgRes.messageId;
          break;
        } else {
          const classified = classifyProviderError(tgRes.error || 'Telegram alert failed', tgRes.httpStatus);
          lastErrorType = classified.errorType;
          lastErrorMessage = classified.message;
          if (!classified.isRetryable) break;
        }
      } else if (platform === 'google') {
        // Google Business Profile Updates / Local Post
        // Check if real Google Business integration is connected
        let googleIntegration = null;
        try {
          googleIntegration = await getCompanyIntegration(companyId, 'google_business');
        } catch {}

        if (googleIntegration && googleIntegration.status === 'connected' && googleIntegration.credentials?.accessToken) {
          // If token exists, we could post to Google My Business API
          // For now, if mock or absent, return NOT_CONFIGURED (never fake success)
          lastErrorType = 'PERMANENT';
          lastErrorMessage = 'Google Business Profile publishing endpoint requires OAuth token refresh in Integrations.';
          break;
        } else {
          lastErrorType = 'PERMANENT';
          lastErrorMessage = 'Google Business Profile integration is not connected. Configure in Integrations tab.';
          break;
        }
      } else {
        lastErrorType = 'PERMANENT';
        lastErrorMessage = `Unsupported social platform: ${platform}`;
        break;
      }
    } catch (dispatchErr: any) {
      const classified = classifyProviderError(dispatchErr);
      lastErrorType = classified.errorType;
      lastErrorMessage = classified.message;
      if (!classified.isRetryable) break;
    }

    // Delay before retry if retryable
    if (currentAttempt <= MAX_DEFAULT_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * currentAttempt));
    }
  }

  // Update publishing record with final provider outcome
  if (providerSuccess && providerPostId) {
    await updatePublishingRecord(record.id, {
      status: 'PUBLISHED',
      provider_post_id: providerPostId,
      published_at: new Date().toISOString(),
      error_message: null,
      error_type: null,
    });

    return {
      platform,
      success: true,
      status: 'PUBLISHED',
      providerPostId,
      attemptsMade: currentAttempt,
    };
  }

  const finalStatus: ProviderStatus = lastErrorType === 'TIMEOUT_UNKNOWN' ? 'UNKNOWN' : 'FAILED';
  await updatePublishingRecord(record.id, {
    status: finalStatus,
    error_type: lastErrorType,
    error_message: lastErrorMessage,
  });

  return {
    platform,
    success: false,
    status: finalStatus,
    errorType: lastErrorType,
    errorMessage: lastErrorMessage,
    attemptsMade: currentAttempt,
  };
}

/**
 * Main Autonomous Publishing State Machine:
 * Content -> Publishing Job -> Provider Adapter -> Provider API -> Provider Success -> Publishing Record -> PUBLISHED.
 * 
 * Guarantees:
 * 1. Known published channels are skipped; unconfirmed attempts block blind replay.
 * 2. Post is marked published only when all requested channels confirm success.
 * 3. Never returns fake success.
 * 4. Retries only for retryable errors.
 */
export async function executePublishingJob(
  postOrOptions: DbContentPost | { postId: string; companyId?: string; platform?: string; payload?: any; platforms?: string[] },
  options?: { force?: boolean; triggeredBy?: string; expectedVersion?:string; executionMode?:PublicationExecutionMode }
): Promise<PublishingJobResult> {
  let post: DbContentPost;
  if ('postId' in postOrOptions && !('title' in postOrOptions)) {
    const existing = await getPostById(postOrOptions.postId);
    if (existing) {
      post = existing;
      if((postOrOptions.companyId && postOrOptions.companyId!==post.company_id) ||
        (postOrOptions.platform && JSON.stringify(post.platforms || [post.channel || 'google'])!==JSON.stringify([postOrOptions.platform])) ||
        (postOrOptions.platforms && JSON.stringify(postOrOptions.platforms)!==JSON.stringify(post.platforms || [post.channel || 'google'])) ||
        (postOrOptions.payload && Object.keys(postOrOptions.payload).some(key=>!['caption','headline'].includes(key) || postOrOptions.payload[key]!==post[key as keyof DbContentPost]))) {
        return {postId:post.id,companyId:post.company_id,status:'FAILED',overallStatus:'FAILED',finalPostStatus:post.status,platformResults:[],message:'Publishing payload must match stored content and targets',executedAt:new Date().toISOString()};
      }
    } else {
      return {postId:postOrOptions.postId,companyId:postOrOptions.companyId || '',status:'FAILED',overallStatus:'FAILED',finalPostStatus:'failed',platformResults:[],message:'Publishing requires a stored post',executedAt:new Date().toISOString()};
    }
  } else {
    post = postOrOptions as DbContentPost;
  }

  const companyId = post.company_id;
  if (!companyId) {
    return {
      postId: post.id,
      companyId: '',
      status: 'FAILED',
      overallStatus: 'FAILED',
      finalPostStatus: 'failed',
      platformResults: [],
      message: 'Publishing job rejected: missing mandatory company_id tenant binding.',
      executedAt: new Date().toISOString(),
    };
  }

  const storedPost=await getPostById(post.id);
  if(!storedPost || storedPost.company_id!==companyId) {
    return {postId:post.id,companyId,status:'FAILED',overallStatus:'FAILED',finalPostStatus:'failed',platformResults:[],
      message:'Publishing requires a stored post in this workspace',executedAt:new Date().toISOString()};
  }

  if((options?.expectedVersion && options.expectedVersion!==publishingSourceVersion(storedPost)) || publishingSourceVersion(post)!==publishingSourceVersion(storedPost)){
    return {postId:post.id,companyId,status:'FAILED',overallStatus:'FAILED',finalPostStatus:storedPost.status,platformResults:[],message:'Stored publishing content changed; reload before dispatch',executedAt:new Date().toISOString()};
  }
  post=storedPost;
  if(post.status==='pending_approval')return {postId:post.id,companyId,status:'FAILED',overallStatus:'FAILED',finalPostStatus:post.status,platformResults:[],message:'Approve the stored post before publishing',executedAt:new Date().toISOString()};

  const canStart=async()=>!(await publishingExecutionBlock(companyId,options?.executionMode || 'manual',post.platforms?.length?post.platforms:[post.channel || 'google']));
  const executionBlock=await publishingExecutionBlock(companyId,options?.executionMode || 'manual',post.platforms?.length?post.platforms:[post.channel || 'google']);
  if(executionBlock)return {deferredReason:executionBlock,postId:post.id,companyId,status:'FAILED',overallStatus:'FAILED',finalPostStatus:post.status,platformResults:[],message:`Publishing blocked: ${executionBlock}`,executedAt:new Date().toISOString()};
  const idempotencyKey = `pub_${post.id}`;

  // 1. Check if post is already marked published
  if (post.status === 'published' && !options?.force) {
    return {
      postId: post.id,
      companyId,
      status: 'SKIPPED_ALREADY_PUBLISHED',
      overallStatus: 'SKIPPED_ALREADY_PUBLISHED',
      finalPostStatus: 'published',
      platformResults: [],
      message: `Post ${post.id} is already published. Idempotency check prevented duplicate publication.`,
      executedAt: new Date().toISOString(),
    };
  }

  // 2. In-flight mutex lock to prevent race conditions during cron intervals
  if (activePublishingLocks.has(post.id)) {
    return {
      postId: post.id,
      companyId,
      status: 'IN_PROGRESS',
      overallStatus: 'IN_PROGRESS',
      finalPostStatus: post.status,
      platformResults: [],
      message: `Publishing job for post ${post.id} is already currently executing in another worker/tick.`,
      executedAt: new Date().toISOString(),
    };
  }

  activePublishingLocks.add(post.id);
  let dispatchClaim: PublishingClaim | null = null;
  let settled = false;
  try {
    const admission = await claimPublishingDispatch(post.id, companyId,publishingSourceVersion(post));
    if (!admission.acquired) {
      const deferredReason=admission.status==='QUOTA_EXHAUSTED'?'PUBLICATION_QUOTA_EXHAUSTED' as const:['PUBLICATION_PAUSED','PUBLICATION_CHANNEL_PAUSED'].includes(admission.status)?admission.status as 'PUBLICATION_PAUSED'|'PUBLICATION_CHANNEL_PAUSED':undefined;
      const state = (deferredReason || ['SOURCE_CHANGED','APPROVAL_REQUIRED'].includes(admission.status)) ? 'FAILED' : admission.status === 'PUBLISHED' ? 'SKIPPED_ALREADY_PUBLISHED' : admission.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'UNKNOWN';
      return { deferredReason,postId:post.id,companyId,status:state,overallStatus:state,finalPostStatus:post.status,platformResults:[],
        message:admission.status==='QUOTA_EXHAUSTED'?'Daily publishing admission limit reached. Retry on the next IST day or review the configured limit.':deferredReason?'Publishing paused by workspace/channel controls.':admission.status==='APPROVAL_REQUIRED'?'Approval required for the current content, schedule and publishing policy. Request approval, then approve for scheduled publishing.':'Durable publishing claim blocks duplicate dispatch; inspect current outcome before retrying',executedAt:new Date().toISOString() };
    }
    dispatchClaim = admission.claim;
    // Set post status to 'publishing' while in flight
    await updateContentPostStatus(post.id, 'publishing', companyId);

    // Determine target platforms
    const rawPlatforms = Array.isArray(post.platforms) && post.platforms.length > 0
      ? post.platforms
      : [post.channel || 'google'];

    // Map platforms to recognized provider adapters
    const targetPlatforms = Array.from(
      new Set(
        rawPlatforms.map((p) => String(p).toLowerCase().trim()).filter(Boolean)
      )
    );

    const platformResults: ProviderDispatchResult[] = [];

    // Execute provider adapter dispatches
    for (const platform of targetPlatforms) {
      const result = await dispatchPlatformWithRetry(
        platform,
        post,
        companyId,
        `${idempotencyKey}_${platform}`,
        () => ownsPublishingDispatch(dispatchClaim!),
        canStart
      );
      platformResults.push(result);
    }

    // Determine final state based on provider results
    const anySuccess = platformResults.some((r) => r.status === 'PUBLISHED');
    const anyUnknown = platformResults.some((r) => r.status === 'UNKNOWN');
    const allFailed = platformResults.length > 0 && platformResults.every((r) => r.status === 'FAILED');

    let finalStatus: 'published' | 'failed' | 'unknown' = 'failed';
    let overallJobStatus: 'PUBLISHED' | 'FAILED' | 'UNKNOWN' = 'FAILED';

    const allSuccess = platformResults.length > 0 && platformResults.every(r => r.status === 'PUBLISHED');
    if (anyUnknown) {
      finalStatus = 'unknown';
      overallJobStatus = 'UNKNOWN';
    } else if (allSuccess) {
      finalStatus = 'published';
      overallJobStatus = 'PUBLISHED';
    } else if (allFailed || anySuccess) {
      finalStatus = 'failed';
      overallJobStatus = 'FAILED';
    }

    settled = await settlePublishingDispatch(dispatchClaim, overallJobStatus);
    if (!settled) {
      return {postId:post.id,companyId,status:'UNKNOWN',overallStatus:'UNKNOWN',finalPostStatus:post.status,platformResults,
        message:'Publishing claim settlement unconfirmed; provider outcomes require reconciliation',executedAt:new Date().toISOString()};
    }

    // Claim and content post status were settled atomically by the owner.

    const successPlatforms = platformResults.filter((r) => r.status === 'PUBLISHED').map((r) => r.platform);
    const failedPlatforms = platformResults.filter((r) => r.status !== 'PUBLISHED').map((r) => `${r.platform}: ${r.errorMessage || r.status}`);

    const message = allSuccess ? `Successfully published to: ${successPlatforms.join(', ')}.`
      : `${anySuccess ? `Partially published to: ${successPlatforms.join(', ')}. ` : ''}Uncompleted channels: ${failedPlatforms.join('; ')}. Post status ${finalStatus.toUpperCase()}; unconfirmed outcomes require reconciliation.`;

    return {
      postId: post.id,
      companyId,
      status: overallJobStatus,
      overallStatus: overallJobStatus,
      finalPostStatus: finalStatus,
      platformResults,
      message,
      executedAt: new Date().toISOString(),
    };
  } catch(error) {
    if(dispatchClaim && !settled) {try {await settlePublishingDispatch(dispatchClaim,'UNKNOWN');} catch { /* durable claim stays blocking */ }}
    throw error;
  } finally {
    activePublishingLocks.delete(post.id);
  }
}
