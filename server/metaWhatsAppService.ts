import crypto from 'crypto';
import {
  getCompanyIntegration,
  getDefaultCompanyId,
  getCompanyById,
  getUserCompanies,
  DbCompany,
} from './db';

export interface WhatsAppCredentials {
  phoneNumberId: string;
  accessToken: string;
  wabaId: string;
  appSecret: string;
  webhookSecret: string;
  configured: boolean;
}

export interface MetaSocialCredentials {
  accessToken: string;
  pageId: string;
  instagramId: string;
  appSecret: string;
  configured: boolean;
}

export interface WhatsAppSendOptions {
  to: string;
  message?: string;
  templateName?: string;
  languageCode?: string;
  components?: any[];
  templateParams?: string[];
  mediaType?: 'image' | 'video' | 'document' | 'audio';
  mediaUrl?: string;
  caption?: string;
  companyId?: string;
}

export interface WhatsAppSendResult {
  success: boolean;
  status: 'DELIVERED' | 'FAILED' | 'NOT_CONFIGURED';
  method: 'meta_cloud_api' | 'not_configured';
  messageId?: string;
  recipient?: string;
  message?: string;
  waLink?: string;
  error?: string;
  fallbackNotice?: string;
}

export interface FacebookPublishOptions {
  pageId: string;
  accessToken: string;
  message: string;
  imageUrl?: string;
}

export interface InstagramPublishOptions {
  instagramId: string;
  accessToken: string;
  caption: string;
  imageUrl?: string;
  videoUrl?: string;
}

/**
 * Resolves WhatsApp Cloud API credentials for a specific company or falls back to system env.
 */
export async function resolveWhatsAppCredentials(companyId?: string): Promise<WhatsAppCredentials> {
  let phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  let accessToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '';
  let wabaId = process.env.WHATSAPP_WABA_ID || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
  let appSecret = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET || '';
  let webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET || process.env.WHATSAPP_VERIFY_TOKEN || '';

  if (companyId) {
    try {
      const integration = await getCompanyIntegration(companyId, 'whatsapp_cloud');
      if (integration && integration.credentials) {
        if (integration.credentials.phoneNumberId) phoneNumberId = String(integration.credentials.phoneNumberId);
        if (integration.credentials.accessToken) accessToken = String(integration.credentials.accessToken);
        if (integration.credentials.wabaId) wabaId = String(integration.credentials.wabaId);
        if (integration.credentials.appSecret) appSecret = String(integration.credentials.appSecret);
        if (integration.credentials.webhookSecret) webhookSecret = String(integration.credentials.webhookSecret);
      }
    } catch {}
  }

  return {
    phoneNumberId: phoneNumberId.trim(),
    accessToken: accessToken.trim(),
    wabaId: wabaId.trim(),
    appSecret: appSecret.trim(),
    webhookSecret: webhookSecret.trim(),
    configured: Boolean(phoneNumberId.trim() && accessToken.trim()),
  };
}

/**
 * Resolves Meta Social (Facebook Page & Instagram Business) credentials for a company or falls back to system env.
 */
export async function resolveMetaSocialCredentials(companyId?: string): Promise<MetaSocialCredentials> {
  let accessToken = process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN || '';
  let pageId = process.env.META_PAGE_ID || process.env.FACEBOOK_PAGE_ID || '';
  let instagramId = process.env.META_INSTAGRAM_ID || process.env.INSTAGRAM_ACCOUNT_ID || '';
  let appSecret = process.env.META_APP_SECRET || '';

  if (companyId) {
    try {
      const integration = await getCompanyIntegration(companyId, 'meta_social');
      if (integration && integration.credentials) {
        if (integration.credentials.accessToken) accessToken = String(integration.credentials.accessToken);
        if (integration.credentials.pageId) pageId = String(integration.credentials.pageId);
        if (integration.credentials.instagramId) instagramId = String(integration.credentials.instagramId);
        if (integration.credentials.appSecret) appSecret = String(integration.credentials.appSecret);
      }
    } catch {}
  }

  return {
    accessToken: accessToken.trim(),
    pageId: pageId.trim(),
    instagramId: instagramId.trim(),
    appSecret: appSecret.trim(),
    configured: Boolean(accessToken.trim() && (pageId.trim() || instagramId.trim())),
  };
}

/**
 * Maps inbound WhatsApp webhook identifiers (phone_number_id, waba_id, display_phone_number)
 * strictly to the owning company tenant.
 *
 * CRITICAL MULTI-TENANT RULE:
 * Never routes to a generic/default company if the provider identifiers do not belong to it.
 * Returns null if no registered tenant owns the provider identifier.
 */
export async function findCompanyByWhatsAppIdentifier(identifiers: {
  phoneNumberId?: string;
  wabaId?: string;
  displayPhoneNumber?: string;
}): Promise<string | null> {
  const { phoneNumberId, wabaId, displayPhoneNumber } = identifiers;
  if (!phoneNumberId && !wabaId && !displayPhoneNumber) {
    return null;
  }

  try {
    // 1. Search all company integrations for 'whatsapp_cloud' provider
    // Check registered company integrations in database or in-memory store
    const { getCompanyIntegrationsByProvider } = await import('./db');
    if (typeof getCompanyIntegrationsByProvider === 'function') {
      const integrations = await getCompanyIntegrationsByProvider('whatsapp_cloud');
      for (const integ of integrations) {
        const creds = integ.credentials || {};
        if (
          (phoneNumberId && creds.phoneNumberId && String(creds.phoneNumberId).trim() === phoneNumberId.trim()) ||
          (wabaId && creds.wabaId && String(creds.wabaId).trim() === wabaId.trim()) ||
          (displayPhoneNumber && creds.displayPhoneNumber && String(creds.displayPhoneNumber).replace(/[^0-9]/g, '') === displayPhoneNumber.replace(/[^0-9]/g, ''))
        ) {
          return integ.company_id;
        }
      }
    }
  } catch (err) {
    console.warn('[findCompanyByWhatsAppIdentifier] Error querying company integrations:', err);
  }

  // 2. Check if the identifiers match server environment variables (single-tenant fallback)
  const envPhoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const envWabaId = (process.env.WHATSAPP_WABA_ID || '').trim();

  if (
    (phoneNumberId && envPhoneId && phoneNumberId.trim() === envPhoneId) ||
    (wabaId && envWabaId && wabaId.trim() === envWabaId)
  ) {
    const defaultCompId = await getDefaultCompanyId();
    return defaultCompId || null;
  }

  // 3. Strict rule: If not matched, do NOT dump into default company
  return null;
}

/**
 * Validates Meta WhatsApp Webhook HMAC-SHA256 signature from 'x-hub-signature-256' header.
 */
export function verifyWhatsAppWebhookSignature(options: {
  rawBody: string | Buffer;
  signature?: string;
  appSecret?: string;
}): { isValid: boolean; error?: string } {
  const { rawBody, signature, appSecret } = options;

  if (!appSecret) {
    // If no app secret configured on server or tenant, cannot cryptographically verify
    return { isValid: true };
  }

  if (!signature) {
    return { isValid: false, error: 'Missing x-hub-signature-256 header' };
  }

  if (!signature.startsWith('sha256=')) {
    return { isValid: false, error: 'Invalid signature algorithm prefix (expected sha256=)' };
  }

  try {
    const rawBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf-8');
    const expectedHash = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBuffer).digest('hex');

    const sigBuffer = Buffer.from(signature, 'utf-8');
    const expBuffer = Buffer.from(expectedHash, 'utf-8');

    if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
      return { isValid: false, error: 'Signature mismatch' };
    }

    return { isValid: true };
  } catch (err: any) {
    return { isValid: false, error: err?.message || 'Signature calculation failed' };
  }
}

/**
 * Validates Meta Webhook handshake (GET challenge request).
 */
export function verifyMetaWebhookHandshake(options: {
  mode?: string;
  token?: string;
  challenge?: string;
  expectedToken?: string;
}): { verified: boolean; challenge?: string; error?: string } {
  const { mode, token, challenge, expectedToken } = options;
  const effectiveExpected =
    expectedToken ||
    process.env.WHATSAPP_VERIFY_TOKEN ||
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
    'aaditech_bga_whatsapp_verify_token';

  if (mode === 'subscribe' && token && token === effectiveExpected) {
    return { verified: true, challenge };
  }

  return { verified: false, error: 'Verification token mismatch or mode not subscribe' };
}

/**
 * Publishes a post to a Facebook Page via Graph API v21.0.
 * Confirms provider response and returns provider post ID.
 */
export async function publishToFacebookPage(options: FacebookPublishOptions): Promise<{
  success: boolean;
  status?: string;
  id?: string;
  error?: string;
}> {
  const { pageId, accessToken, message, imageUrl } = options;

  if (!pageId || !accessToken) {
    return { success: false, status: 'NOT_CONFIGURED', error: 'Facebook Page ID or Access Token is missing' };
  }

  try {
    let endpoint = `https://graph.facebook.com/v21.0/${pageId}/feed`;
    let payload: any = {
      message,
      access_token: accessToken,
    };

    if (imageUrl) {
      endpoint = `https://graph.facebook.com/v21.0/${pageId}/photos`;
      payload = {
        url: imageUrl,
        caption: message,
        access_token: accessToken,
      };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json();
    if (res.ok && (data.id || data.post_id)) {
      const fbId = data.id || data.post_id;
      return { success: true, id: fbId };
    }

    return {
      success: false,
      error: data.error?.message || `Facebook Graph API error (status ${res.status})`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network timeout connecting to Facebook Graph API',
    };
  }
}

/**
 * Publishes an image or video to an Instagram Business Account via Graph API v21.0.
 * Executes the required 2-step Container Creation -> Container Publish flow.
 * Confirms provider response and returns provider media ID.
 */
export async function publishToInstagram(options: InstagramPublishOptions): Promise<{
  success: boolean;
  status?: string;
  id?: string;
  error?: string;
}> {
  const { instagramId, accessToken, caption, imageUrl, videoUrl } = options;

  if (!instagramId || !accessToken) {
    return { success: false, status: 'NOT_CONFIGURED', error: 'Instagram Business Account ID or Access Token is missing' };
  }

  if (!imageUrl && !videoUrl) {
    return { success: false, error: 'Instagram Business API requires an image or video asset URL to publish.' };
  }

  try {
    // Step 1: Create Media Container
    const containerPayload: any = {
      caption,
      access_token: accessToken,
    };

    if (videoUrl) {
      containerPayload.media_type = 'REELS';
      containerPayload.video_url = videoUrl;
    } else {
      containerPayload.image_url = imageUrl;
    }

    const containerRes = await fetch(`https://graph.facebook.com/v21.0/${instagramId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(containerPayload),
      signal: AbortSignal.timeout(15000),
    });

    const containerData = await containerRes.json();
    if (!containerRes.ok || !containerData.id) {
      return {
        success: false,
        error: containerData.error?.message || 'Failed to initialize Instagram media container',
      };
    }

    const creationId = containerData.id;

    // Step 2: Publish Media Container
    const publishRes = await fetch(`https://graph.facebook.com/v21.0/${instagramId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: accessToken,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const publishData = await publishRes.json();
    if (publishRes.ok && publishData.id) {
      return { success: true, id: publishData.id };
    }

    return {
      success: false,
      error: publishData.error?.message || 'Failed to finalize Instagram media container publish',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network timeout connecting to Instagram Graph API',
    };
  }
}

/**
 * Sends a WhatsApp Cloud Message via Meta Graph API v21.0.
 * Enforces verified provider delivery and returns confirmed message ID.
 */
export async function sendWhatsAppCloudMessage(
  creds: WhatsAppCredentials,
  options: WhatsAppSendOptions
): Promise<{
  success: boolean;
  status?: string;
  messageId?: string;
  error?: string;
  rawResponse?: any;
}> {
  if (!creds || !creds.configured || !creds.phoneNumberId || !creds.accessToken) {
    return {
      success: false,
      status: 'NOT_CONFIGURED',
      error: 'WhatsApp Cloud API is not configured. Valid phone_number_id and access_token required.',
    };
  }

  const { to, message, templateName, languageCode, components, templateParams, mediaType, mediaUrl, caption } = options;

  let cleanTo = String(to).replace(/[^0-9]/g, '');
  if (cleanTo.length === 10) cleanTo = '91' + cleanTo;
  if (cleanTo.startsWith('0') && cleanTo.length === 11) cleanTo = '91' + cleanTo.substring(1);

  if (!cleanTo || cleanTo.length < 10) {
    return { success: false, error: 'Invalid recipient phone number format' };
  }

  const payload: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanTo,
  };

  if (mediaType && mediaUrl) {
    payload.type = mediaType;
    payload[mediaType] = {
      link: mediaUrl,
      caption: caption || message || '',
    };
  } else if (templateName) {
    payload.type = 'template';
    const templateObj: any = {
      name: templateName,
      language: { code: languageCode || 'en_US' },
    };

    if (components && Array.isArray(components) && components.length > 0) {
      templateObj.components = components;
    } else if (templateParams && Array.isArray(templateParams) && templateParams.length > 0) {
      templateObj.components = [
        {
          type: 'body',
          parameters: templateParams.map((param) => ({
            type: 'text',
            text: String(param),
          })),
        },
      ];
    }
    payload.template = templateObj;
  } else {
    payload.type = 'text';
    payload.text = {
      preview_url: true,
      body: message || '',
    };
  }

  try {
    const waRes = await fetch(`https://graph.facebook.com/v21.0/${creds.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });

    const waData = await waRes.json();
    if (waRes.ok && waData.messages && waData.messages.length > 0) {
      const messageId = waData.messages[0].id;
      return {
        success: true,
        messageId,
        rawResponse: waData,
      };
    }

    return {
      success: false,
      error: waData.error?.message || `Meta Cloud API rejected message (status ${waRes.status})`,
      rawResponse: waData,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network timeout connecting to Meta Graph API',
    };
  }
}
