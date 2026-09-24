import crypto from 'crypto';
import {
  DbInvoice,
  DbSubscription,
  createInvoice,
  getInvoicesByCompany,
  upsertSubscription,
  getSubscriptionByCompany,
  getDbPool,
  handleDbError,
  getDefaultCompanyId,
} from './db';

export type SupportedSubscriptionStatus =
  | 'trial'
  | 'active'
  | 'past_due'
  | 'payment_failed'
  | 'cancelled'
  | 'expired';

export interface WebhookVerificationResult {
  isValid: boolean;
  error?: string;
  code: 'SUCCESS' | 'MISSING_SECRET' | 'MISSING_SIGNATURE' | 'INVALID_SIGNATURE' | 'SIMULATION_FORBIDDEN_PROD';
}

export interface PaymentVerificationResult {
  verified: boolean;
  error?: string;
  isSimulated?: boolean;
  code: 'SUCCESS' | 'MISSING_CREDENTIALS' | 'INVALID_SIGNATURE' | 'SIMULATION_FORBIDDEN_PROD' | 'UNVERIFIED_CLAIM';
}

// In-memory set for rapid deduplication of webhook event IDs (with automatic TTL / size limiting)
const processedWebhookEventIds = new Map<string, number>();

/**
 * Determine if the runtime is currently executing in production mode.
 */
export function isProductionEnvironment(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production' ||
    process.env.APP_ENV === 'production'
  );
}

/**
 * Validates Razorpay Webhook HMAC-SHA256 signature.
 * 
 * Rules:
 * 1. Webhook signature verification MUST be mandatory in production.
 * 2. Reject webhook when production secret is missing.
 * 3. Never trust unsigned payloads in production.
 */
export function verifyRazorpayWebhookSignature(params: {
  rawBody: string | Buffer;
  signature?: string;
  secret?: string;
  isProduction?: boolean;
}): WebhookVerificationResult {
  const isProd = params.isProduction !== undefined ? params.isProduction : isProductionEnvironment();
  const secret = params.secret || process.env.RAZORPAY_WEBHOOK_SECRET || '';
  const signature = (params.signature || '').trim();

  // Rule 2: Reject webhook when production secret is missing
  if (isProd && !secret) {
    return {
      isValid: false,
      code: 'MISSING_SECRET',
      error: 'CRITICAL: RAZORPAY_WEBHOOK_SECRET is not configured on the production server. Inbound webhook rejected.',
    };
  }

  // Rule 1: Signature verification MUST be mandatory in production
  if (isProd && !signature) {
    return {
      isValid: false,
      code: 'MISSING_SIGNATURE',
      error: 'CRITICAL: Missing x-razorpay-signature header. Webhook signature is mandatory in production.',
    };
  }

  // If secret and signature exist, perform constant-time cryptographic HMAC verification
  if (secret && signature) {
    try {
      const rawPayload = Buffer.isBuffer(params.rawBody)
        ? params.rawBody.toString('utf8')
        : typeof params.rawBody === 'string'
        ? params.rawBody
        : JSON.stringify(params.rawBody);

      const expectedDigest = crypto
        .createHmac('sha256', secret)
        .update(rawPayload)
        .digest('hex');

      const sigBuf = Buffer.from(signature, 'utf8');
      const expectedBuf = Buffer.from(expectedDigest, 'utf8');

      if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return {
          isValid: false,
          code: 'INVALID_SIGNATURE',
          error: 'Invalid webhook signature. Cryptographic HMAC-SHA256 verification failed.',
        };
      }

      return {
        isValid: true,
        code: 'SUCCESS',
      };
    } catch (err: any) {
      return {
        isValid: false,
        code: 'INVALID_SIGNATURE',
        error: `Signature verification exception: ${err?.message}`,
      };
    }
  }

  // If in non-production and neither secret nor signature is set, flag as unverified non-prod
  if (!isProd) {
    return {
      isValid: true,
      code: 'SUCCESS',
    };
  }

  return {
    isValid: false,
    code: 'MISSING_SIGNATURE',
    error: 'Webhook verification failed in production.',
  };
}

/**
 * Validates Razorpay Payment Signature (Order ID + Payment ID + Secret).
 * 
 * Rules:
 * - Never trust client-supplied payment status.
 * - Never mark invoice Paid from paymentId alone.
 * - Verify payment through trusted cryptographic mechanism.
 * - Never return success=true for simulated payment in production.
 */
export function verifyRazorpayPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature?: string;
  keySecret?: string;
  isProduction?: boolean;
}): PaymentVerificationResult {
  const isProd = params.isProduction !== undefined ? params.isProduction : isProductionEnvironment();
  const paymentId = (params.paymentId || '').trim();
  const orderId = (params.orderId || '').trim();
  const signature = (params.signature || '').trim();
  const keySecret = (params.keySecret || '').trim();

  const isSimulated =
    paymentId.startsWith('sim_') ||
    paymentId.startsWith('mock_') ||
    paymentId.startsWith('test_unverified_') ||
    paymentId.startsWith('client_mock_');

  // Rule 9 & 10: Never return success=true for simulated payment in production
  if (isProd && isSimulated) {
    return {
      verified: false,
      isSimulated: true,
      code: 'SIMULATION_FORBIDDEN_PROD',
      error: 'Simulated and mock payments are strictly forbidden in production mode.',
    };
  }

  // Rule 6 & 7: Never trust client claims without valid credentials and signature
  if (!keySecret) {
    return {
      verified: false,
      isSimulated,
      code: 'MISSING_CREDENTIALS',
      error: 'Razorpay Key Secret is not configured. Cannot cryptographically verify payment.',
    };
  }

  if (!orderId || !paymentId || !signature) {
    return {
      verified: false,
      isSimulated,
      code: 'UNVERIFIED_CLAIM',
      error: 'Order ID, Payment ID, and Signature are all required for verification.',
    };
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expectedBuf = Buffer.from(expectedSignature, 'utf8');

    const isValid =
      sigBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(sigBuf, expectedBuf);

    if (!isValid) {
      return {
        verified: false,
        isSimulated,
        code: 'INVALID_SIGNATURE',
        error: 'Payment signature mismatch. HMAC-SHA256 signature is invalid.',
      };
    }

    return {
      verified: true,
      isSimulated: false,
      code: 'SUCCESS',
    };
  } catch (err: any) {
    return {
      verified: false,
      isSimulated,
      code: 'INVALID_SIGNATURE',
      error: `Payment signature verification error: ${err?.message}`,
    };
  }
}

/**
 * Checks if a webhook event has already been processed (Idempotency).
 */
export async function isWebhookEventProcessed(eventId: string): Promise<boolean> {
  if (!eventId) return false;

  // 1. Check in-memory fast cache
  if (processedWebhookEventIds.has(eventId)) {
    return true;
  }

  // 2. Check database table if available
  try {
    const db = await getDbPool();
    if (db) {
      const [rows]: any = await db.query(
        'SELECT id FROM processed_webhook_events WHERE id = ? LIMIT 1',
        [eventId]
      );
      if (rows && rows.length > 0) {
        processedWebhookEventIds.set(eventId, Date.now());
        return true;
      }
    }
  } catch (err) {
    // Graceful fallback to memory cache if DB is not ready
  }

  return false;
}

/**
 * Records a webhook event as processed (Idempotency).
 */
export async function markWebhookEventProcessed(
  eventId: string,
  eventType: string,
  companyId?: string
): Promise<void> {
  if (!eventId) return;

  // Prune memory map if too large (> 10000 entries)
  if (processedWebhookEventIds.size > 10000) {
    const now = Date.now();
    for (const [key, timestamp] of processedWebhookEventIds.entries()) {
      if (now - timestamp > 86400000) { // older than 24 hours
        processedWebhookEventIds.delete(key);
      }
    }
  }

  processedWebhookEventIds.set(eventId, Date.now());

  try {
    const db = await getDbPool();
    if (db) {
      await db.query(
        `INSERT IGNORE INTO processed_webhook_events (id, event_type, company_id, created_at)
         VALUES (?, ?, ?, NOW())`,
        [eventId, eventType, companyId || null]
      );
    }
  } catch (err: any) {
    handleDbError('markWebhookEventProcessed', err);
  }
}

/**
 * Checks if an invoice for this company already exists for the given payment_id or order_id.
 * Prevents duplicate invoice creation (Requirement 4).
 */
export async function findExistingInvoice(
  companyId: string,
  paymentId?: string,
  orderId?: string
): Promise<DbInvoice | null> {
  if (!companyId || (!paymentId && !orderId)) return null;

  try {
    const db = await getDbPool();
    if (db) {
      if (paymentId) {
        const [rows]: any = await db.query(
          'SELECT * FROM invoices WHERE company_id = ? AND payment_id = ? LIMIT 1',
          [companyId, paymentId]
        );
        if (rows && rows.length > 0) {
          const r = rows[0];
          return {
            ...r,
            amount: Number(r.amount),
            gst_amount: Number(r.gst_amount),
            total_amount: Number(r.total_amount),
            created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
          };
        }
      }

      if (orderId) {
        const [rows]: any = await db.query(
          'SELECT * FROM invoices WHERE company_id = ? AND order_id = ? LIMIT 1',
          [companyId, orderId]
        );
        if (rows && rows.length > 0) {
          const r = rows[0];
          return {
            ...r,
            amount: Number(r.amount),
            gst_amount: Number(r.gst_amount),
            total_amount: Number(r.total_amount),
            created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
          };
        }
      }
    }
  } catch (err: any) {
    handleDbError('findExistingInvoice', err);
  }

  const allInvoices = await getInvoicesByCompany(companyId);
  const found = allInvoices.find(
    (inv) =>
      (paymentId && inv.payment_id === paymentId) ||
      (orderId && inv.order_id === orderId)
  );

  return found || null;
}

/**
 * Maps Razorpay webhook events to provider-supported subscription states.
 * 
 * Supported states:
 * - trial
 * - active
 * - past_due
 * - payment_failed
 * - cancelled
 * - expired
 * 
 * Only where supported by actual provider events (Requirement 11).
 */
export function mapRazorpayEventToSubscriptionState(
  event: string,
  entityStatus?: string
): SupportedSubscriptionStatus | null {
  const normEvent = (event || '').toLowerCase().trim();
  const normStatus = (entityStatus || '').toLowerCase().trim();

  switch (normEvent) {
    case 'payment.captured':
    case 'order.paid':
    case 'payment_link.paid':
    case 'subscription.charged':
    case 'subscription.activated':
    case 'subscription.resumed':
      return 'active';

    case 'subscription.authenticated':
      if (normStatus === 'trial' || normStatus === 'trialing' || normStatus === 'authenticated') {
        return 'trial';
      }
      return 'active';

    case 'subscription.pending':
    case 'subscription.halted':
      return 'past_due';

    case 'payment.failed':
    case 'invoice.payment_failed':
      return 'payment_failed';

    case 'subscription.cancelled':
      return 'cancelled';

    case 'subscription.completed':
    case 'subscription.expired':
      return 'expired';

    default:
      if (normStatus === 'active') return 'active';
      if (normStatus === 'trial' || normStatus === 'trialing') return 'trial';
      if (normStatus === 'past_due' || normStatus === 'halted') return 'past_due';
      if (normStatus === 'cancelled') return 'cancelled';
      if (normStatus === 'expired' || normStatus === 'completed') return 'expired';
      return null;
  }
}

/**
 * Idempotently updates or activates a company subscription.
 * Prevents duplicate subscription activations (Requirement 5).
 */
export async function activateSubscriptionIdempotent(params: {
  companyId: string;
  planId: string;
  planName: string;
  status: SupportedSubscriptionStatus;
  amount: number;
  razorpaySubscriptionId?: string;
  billingCycle?: 'monthly' | 'yearly';
}): Promise<DbSubscription> {
  const existingSub = await getSubscriptionByCompany(params.companyId);

  // If subscription is already active on the same plan and subscription ID, perform safe refresh
  if (
    existingSub &&
    existingSub.status === params.status &&
    existingSub.plan_id === params.planId &&
    (!params.razorpaySubscriptionId || existingSub.razorpay_subscription_id === params.razorpaySubscriptionId)
  ) {
    // Sub is already in desired state - update timestamps without creating duplicate billing periods
    return await upsertSubscription({
      id: existingSub.id,
      company_id: params.companyId,
      plan_id: params.planId,
      plan_name: params.planName,
      status: params.status,
      amount: params.amount,
      billing_cycle: params.billingCycle || existingSub.billing_cycle || 'monthly',
      razorpay_subscription_id: params.razorpaySubscriptionId || existingSub.razorpay_subscription_id,
      current_period_start: existingSub.current_period_start,
      current_period_end: existingSub.current_period_end,
    });
  }

  // Otherwise upsert new or updated cycle
  return await upsertSubscription({
    company_id: params.companyId,
    plan_id: params.planId,
    plan_name: params.planName,
    status: params.status,
    amount: params.amount,
    billing_cycle: params.billingCycle || 'monthly',
    razorpay_subscription_id: params.razorpaySubscriptionId,
  });
}
