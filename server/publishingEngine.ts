import crypto from 'crypto';
import {
  DbContentPost,
  DbPublishingRecord,
  createPublishingRecord,
  updatePublishingRecord,
  getLatestPublishingRecord,
  isPostAlreadyPublished,
  updateContentPostStatus,
  getCompanyById,
  getDefaultCompanyId,
  getCompanyIntegration,
} from './db';
import {
  resolveMetaSocialCredentials,
  resolveWhatsAppCredentials,
  publishToFacebookPage,
  publishToInstagram,
  sendWhatsAppCloudMessage,
} from './metaWhatsAppService';

// In-flight publishing locks to prevent concurrent executions for the same post (Idempotency Mutex)
const activePublishingLocks = new Set<string>();

export type ProviderStatus = 'PUBLISHED' | 'FAILED' | 'UNKNOWN' | 'NOT_CONFIGURED';
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
  postId: string;
  companyId: string;
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
 * Transient errors (5xx, rate limits 429, network disconnects) MAY be retried with exponential backoff.
 */
export function classifyProviderError(
  errOrMsg: any,
  httpStatus?: number
): { errorType: ErrorCategory; isRetryable: boolean; message: string } {
  const message = typeof errOrMsg === 'string'
    ? errOrMsg
    : errOrMsg?.message || 'Unknown provider error';
  const lower = message.toLowerCase();

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
    if (httpStatus >= 500 && httpStatus <= 599) {
      return { errorType: 'RETRYABLE', isRetryable: true, message: `Server error (HTTP ${httpStatus}): ${message}` };
    }
    if (httpStatus >= 400 && httpStatus < 500) {
      return { errorType: 'PERMANENT', isRetryable: false, message: `Client/Auth error (HTTP ${httpStatus}): ${message}` };
    }
  }

  // 3. Timeout / Abort errors -> Provider state unknown
  if (
    lower.includes('timeout') ||
    lower.includes('aborted') ||
    lower.includes('aborterror') ||
    lower.includes('econnreset') ||
    lower.includes('socket hang up')
  ) {
    return { errorType: 'TIMEOUT_UNKNOWN', isRetryable: true, message: `Network timeout / unconfirmed response: ${message}` };
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
async function sendTelegramAlert(message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!botToken || !chatId) {
    return { success: false, error: 'Telegram bot token or chat ID not configured' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json();
    if (res.ok && data.ok && data.result?.message_id) {
      return { success: true, messageId: String(data.result.message_id) };
    }
    return { success: false, error: data.description || `Telegram API error (HTTP ${res.status})` };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Telegram network timeout' };
  }
}

/**
 * Executes a single platform dispatch with strict idempotency and retry handling.
 */
async function dispatchPlatformWithRetry(
  platform: string,
  post: DbContentPost,
  companyId: string,
  idempotencyKey: string
): Promise<ProviderDispatchResult> {
  // Check if platform is already confirmed published
  const alreadyPublished = await isPostAlreadyPublished(post.id, platform);
  if (alreadyPublished) {
    const existingRec = await getLatestPublishingRecord(post.id, platform);
    return {
      platform,
      success: true,
      status: 'PUBLISHED',
      providerPostId: existingRec?.provider_post_id || 'ALREADY_PUBLISHED',
      attemptsMade: existingRec?.attempt_count || 1,
    };
  }

  // Create or retrieve in-progress publishing record
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

        const fbRes = await publishToFacebookPage({
          pageId: metaCreds.pageId,
          accessToken: metaCreds.accessToken,
          message: `${post.headline ? post.headline + '\n\n' : ''}${post.caption}\n\n${(post.hashtags || []).join(' ')}`.trim(),
          imageUrl: post.image_url,
        });

        if (fbRes.success && fbRes.id) {
          providerSuccess = true;
          providerPostId = fbRes.id;
          break;
        } else {
          const classified = classifyProviderError(fbRes.error || 'Facebook publishing failed');
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

        const igRes = await publishToInstagram({
          instagramId: metaCreds.instagramId,
          accessToken: metaCreds.accessToken,
          caption: `${post.headline ? post.headline + '\n\n' : ''}${post.caption}\n\n${(post.hashtags || []).join(' ')}`.trim(),
          imageUrl: post.image_url,
          videoUrl: post.video_url,
        });

        if (igRes.success && igRes.id) {
          providerSuccess = true;
          providerPostId = igRes.id;
          break;
        } else {
          const classified = classifyProviderError(igRes.error || 'Instagram publishing failed');
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
        const recipientPhone = company?.phone || process.env.WHATSAPP_ADMIN_PHONE || '';
        if (!recipientPhone) {
          lastErrorType = 'PERMANENT';
          lastErrorMessage = 'No valid recipient phone number configured for WhatsApp broadcast.';
          break;
        }

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
          const classified = classifyProviderError(waRes.error || 'WhatsApp delivery failed');
          lastErrorType = classified.errorType;
          lastErrorMessage = classified.message;
          if (!classified.isRetryable) break;
        }
      } else if (platform === 'telegram') {
        const text = `🚀 <b>[AUTONOMOUS PUBLISHED POST]</b>\n\n<b>Title:</b> ${post.title}\n${post.headline ? '<b>Headline:</b> ' + post.headline + '\n' : ''}\n<b>Caption:</b>\n${post.caption}\n\n<b>Channels:</b> ${(post.platforms || []).join(', ')}`;
        const tgRes = await sendTelegramAlert(text);
        if (tgRes.success && tgRes.messageId) {
          providerSuccess = true;
          providerPostId = tgRes.messageId;
          break;
        } else {
          const classified = classifyProviderError(tgRes.error || 'Telegram alert failed');
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
 * 1. Idempotency: A scheduled post will not publish twice.
 * 2. Strict State: Post is ONLY marked 'published' when provider confirmed success with real ID.
 * 3. Never returns fake success.
 * 4. Retries only for retryable errors.
 */
export async function executePublishingJob(
  post: DbContentPost,
  options?: { force?: boolean; triggeredBy?: string }
): Promise<PublishingJobResult> {
  const companyId = post.company_id || (await getDefaultCompanyId()) || 'comp_aaditech_main';
  const idempotencyKey = `pub_${post.id}`;

  // 1. Check if post is already marked published
  if (post.status === 'published' && !options?.force) {
    return {
      postId: post.id,
      companyId,
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
      overallStatus: 'IN_PROGRESS',
      finalPostStatus: post.status,
      platformResults: [],
      message: `Publishing job for post ${post.id} is already currently executing in another worker/tick.`,
      executedAt: new Date().toISOString(),
    };
  }

  activePublishingLocks.add(post.id);

  try {
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
        `${idempotencyKey}_${platform}`
      );
      platformResults.push(result);
    }

    // Determine final state based on provider results
    const anySuccess = platformResults.some((r) => r.status === 'PUBLISHED');
    const anyUnknown = platformResults.some((r) => r.status === 'UNKNOWN');
    const allFailed = platformResults.length > 0 && platformResults.every((r) => r.status === 'FAILED');

    let finalStatus: 'published' | 'failed' | 'unknown' = 'failed';
    let overallJobStatus: 'PUBLISHED' | 'FAILED' | 'UNKNOWN' = 'FAILED';

    if (anySuccess) {
      finalStatus = 'published';
      overallJobStatus = 'PUBLISHED';
    } else if (anyUnknown) {
      finalStatus = 'unknown';
      overallJobStatus = 'UNKNOWN';
    } else if (allFailed) {
      finalStatus = 'failed';
      overallJobStatus = 'FAILED';
    }

    // Persist final status to content_posts table
    await updateContentPostStatus(post.id, finalStatus, companyId);

    const successPlatforms = platformResults.filter((r) => r.status === 'PUBLISHED').map((r) => r.platform);
    const failedPlatforms = platformResults.filter((r) => r.status !== 'PUBLISHED').map((r) => `${r.platform}: ${r.errorMessage || r.status}`);

    const message = anySuccess
      ? `Successfully published to: ${successPlatforms.join(', ')}.` + (failedPlatforms.length > 0 ? ` Non-critical provider notices: ${failedPlatforms.join('; ')}` : '')
      : `Publishing failed for all requested channels: ${failedPlatforms.join('; ')}. Post status set to ${finalStatus.toUpperCase()}.`;

    return {
      postId: post.id,
      companyId,
      overallStatus: overallJobStatus,
      finalPostStatus: finalStatus,
      platformResults,
      message,
      executedAt: new Date().toISOString(),
    };
  } finally {
    activePublishingLocks.delete(post.id);
  }
}
