import { Request, Response, NextFunction } from 'express';
import { verifyAuthToken } from './auth';

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

// Login Brute-Force & Lockout Policy
const MAX_FAILED_LOGINS = 5;               // Max consecutive failed logins before account lock
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15-minute account lockout duration
const MAX_LOGIN_ATTEMPTS_PER_IP = 25;      // Max login attempts per IP per 15-minute window
const IP_WINDOW_MS = 15 * 60 * 1000;

// Store types
interface EmailLockoutRecord {
  failedAttempts: number;
  lockedUntil: number;
  lastAttempt: number;
}

interface IpRateLimitRecord {
  attempts: number[];
  resetAt: number;
}

// In-Memory tracking stores
const emailLockouts = new Map<string, EmailLockoutRecord>();
const ipLoginTracker = new Map<string, IpRateLimitRecord>();

// Periodic memory purge (runs every 5 minutes, non-blocking)
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [email, record] of emailLockouts.entries()) {
    if (record.lockedUntil < now && now - record.lastAttempt > LOCKOUT_DURATION_MS * 2) {
      emailLockouts.delete(email);
    }
  }
  for (const [ip, record] of ipLoginTracker.entries()) {
    if (record.resetAt < now) {
      ipLoginTracker.delete(ip);
    }
  }
}, 5 * 60 * 1000);

if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

/**
 * Extracts and normalizes the client IP address.
 *
 * This function assumes Express's `trust proxy` setting in server.ts accurately reflects
 * the number of trusted reverse proxy hops in front of this server. If the deployment
 * topology changes (e.g. adding/removing a CDN or load balancer), that setting must be
 * updated or this function becomes spoofable again.
 */
export function getClientIp(req: Request): string {
  // Rely on Express's safely derived req.ip based on configured `trust proxy` hops,
  // falling back only to the raw socket remoteAddress if unavailable.
  let ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';

  // Normalize IPv4-mapped IPv6 address (::ffff:127.0.0.1 -> 127.0.0.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  return ip;
}

// ============================================================================
// LOGIN BRUTE-FORCE & ACCOUNT LOCKOUT
// ============================================================================

/**
 * Checks whether an account or IP is currently locked or rate-limited.
 */
export function checkLoginLockout(req: Request, email?: string): {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const ip = getClientIp(req);

  // 1. Check IP-level rate limiting
  const ipRecord = ipLoginTracker.get(ip);
  if (ipRecord && ipRecord.attempts.length >= MAX_LOGIN_ATTEMPTS_PER_IP) {
    const validAttempts = ipRecord.attempts.filter((ts) => now - ts < IP_WINDOW_MS);
    if (validAttempts.length >= MAX_LOGIN_ATTEMPTS_PER_IP) {
      const oldest = validAttempts[0];
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + IP_WINDOW_MS - now) / 1000));
      return {
        allowed: false,
        reason: `Too many login attempts from this network. Please wait ${retryAfterSeconds} seconds before trying again.`,
        retryAfterSeconds,
      };
    }
  }

  // 2. Check Account-level lockout (by email)
  if (email) {
    const cleanEmail = email.trim().toLowerCase();
    const emailRecord = emailLockouts.get(cleanEmail);
    if (emailRecord && emailRecord.lockedUntil > now) {
      const retryAfterSeconds = Math.max(1, Math.ceil((emailRecord.lockedUntil - now) / 1000));
      return {
        allowed: false,
        reason: `Account temporarily locked due to multiple failed login attempts. For security, please try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
        retryAfterSeconds,
      };
    }
  }

  return { allowed: true };
}

/**
 * Records a failed login attempt. If failed attempts reach the threshold,
 * triggers an automatic account lockout.
 */
export function recordFailedLogin(req: Request, email?: string): {
  isLocked: boolean;
  remainingAttempts: number;
  lockedForSeconds?: number;
} {
  const now = Date.now();
  const ip = getClientIp(req);

  // Track on IP
  let ipRecord = ipLoginTracker.get(ip);
  if (!ipRecord || ipRecord.resetAt < now) {
    ipRecord = { attempts: [now], resetAt: now + IP_WINDOW_MS };
    ipLoginTracker.set(ip, ipRecord);
  } else {
    ipRecord.attempts.push(now);
  }

  // Track on Email
  if (email) {
    const cleanEmail = email.trim().toLowerCase();
    let record = emailLockouts.get(cleanEmail);

    if (!record || record.lockedUntil < now && now - record.lastAttempt > LOCKOUT_DURATION_MS) {
      record = { failedAttempts: 1, lockedUntil: 0, lastAttempt: now };
    } else {
      record.failedAttempts += 1;
      record.lastAttempt = now;
    }

    if (record.failedAttempts >= MAX_FAILED_LOGINS) {
      record.lockedUntil = now + LOCKOUT_DURATION_MS;
      emailLockouts.set(cleanEmail, record);
      console.warn(`[Security Alert] Account locked due to brute-force attempts: ${cleanEmail} (IP: ${ip})`);
      return {
        isLocked: true,
        remainingAttempts: 0,
        lockedForSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
      };
    }

    emailLockouts.set(cleanEmail, record);
    return {
      isLocked: false,
      remainingAttempts: MAX_FAILED_LOGINS - record.failedAttempts,
    };
  }

  return { isLocked: false, remainingAttempts: MAX_FAILED_LOGINS };
}

/**
 * Resets failed attempt counters for an email upon successful authentication.
 */
export function recordSuccessfulLogin(req: Request, email?: string): void {
  if (email) {
    const cleanEmail = email.trim().toLowerCase();
    emailLockouts.delete(cleanEmail);
  }
}

// Middleware: Enforce login rate limiting and lockout check before processing
export function loginProtectionMiddleware(req: Request, res: Response, next: NextFunction): void {
  const email = req.body?.email;
  const status = checkLoginLockout(req, email);

  if (!status.allowed) {
    if (status.retryAfterSeconds) {
      res.setHeader('Retry-After', status.retryAfterSeconds.toString());
    }
    res.status(429).json({
      success: false,
      error: status.reason || 'Too many login attempts. Please try again later.',
      retryAfter: status.retryAfterSeconds,
    });
    return;
  }

  next();
}

// ============================================================================
// GENERIC SLIDING-WINDOW RATE LIMITER
// ============================================================================

export interface RateLimiterOptions {
  name: string;
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: Request) => string;
}

interface WindowBucket {
  timestamps: number[];
}

export function createSlidingRateLimiter(options: {
  name: string;
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: Request) => string;
}) {
  const buckets = new Map<string, WindowBucket>();

  // Background cleanup
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < options.windowMs);
      if (bucket.timestamps.length === 0) {
        buckets.delete(key);
      }
    }
  }, Math.max(30000, options.windowMs / 2));

  if (cleanup.unref) {
    cleanup.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = options.keyGenerator ? options.keyGenerator(req) : getClientIp(req);

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { timestamps: [] };
      buckets.set(key, bucket);
    }

    // Filter timestamps within the current sliding window
    bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < options.windowMs);

    const remaining = Math.max(0, options.max - bucket.timestamps.length);
    const resetTimeSeconds = Math.ceil(options.windowMs / 1000);

    // Standard rate limit headers
    res.setHeader('X-RateLimit-Limit', options.max.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', (Math.floor(now / 1000) + resetTimeSeconds).toString());

    if (bucket.timestamps.length >= options.max) {
      const oldestTs = bucket.timestamps[0];
      const retryAfterSeconds = Math.max(1, Math.ceil((oldestTs + options.windowMs - now) / 1000));
      res.setHeader('Retry-After', retryAfterSeconds.toString());

      res.status(429).json({
        success: false,
        error: options.message,
        retryAfter: retryAfterSeconds,
      });
      return;
    }

    bucket.timestamps.push(now);
    next();
  };
}

// ============================================================================
// PRE-CONFIGURED SECURITY RATE LIMITERS
// ============================================================================

/**
 * Registration Rate Limiter:
 * Allows max 10 account registrations per IP per 15 minutes.
 * Prevents account spamming and database exhaustion.
 */
export const registerRateLimiter = createSlidingRateLimiter({
  name: 'auth_register',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many account registration requests from this network. Please try again in 15 minutes.',
  keyGenerator: (req) => `reg_${getClientIp(req)}`,
});

/**
 * AI Endpoint Rate Limiter:
 * Keyed on User ID (if authenticated) or Client IP.
 * Enforces max 20 requests per minute and protects Gemini API quota.
 */
export const aiRateLimiter = createSlidingRateLimiter({
  name: 'ai_service',
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: 'AI request limit reached (max 20 queries/minute). Please wait a moment before sending more requests.',
  keyGenerator: (req) => {
    // Check if user has Bearer token to key per user rather than whole IP
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const payload = verifyAuthToken(authHeader.substring(7));
      if (payload?.sub) {
        return `ai_usr_${payload.sub}`;
      }
    }
    return `ai_ip_${getClientIp(req)}`;
  },
});

/**
 * Public Leads Form Limiter:
 * Allows max 15 lead submissions per 10 minutes per IP.
 * Stops bot scrapers from filling CRM with fake leads.
 */
export const leadsRateLimiter = createSlidingRateLimiter({
  name: 'leads_submit',
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 15,
  message: 'Too many lead submissions from this network. Please try again shortly.',
  keyGenerator: (req) => `lead_${getClientIp(req)}`,
});

/**
 * Telegram Push Alert Limiter:
 * Allows max 10 manual alert dispatches per minute.
 */
export const telegramAlertLimiter = createSlidingRateLimiter({
  name: 'telegram_alert',
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Telegram alert rate limit reached. Please wait a minute before sending more alerts.',
  keyGenerator: (req) => `tg_${getClientIp(req)}`,
});

/**
 * Forgot Password Rate Limiter:
 * Allows max 5 forgot-password requests per hour per IP.
 * Prevents reset token generation abuse or email spamming.
 */
export const forgotPasswordRateLimiter = createSlidingRateLimiter({
  name: 'forgot_password',
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many password reset requests from this network. Please try again in an hour.',
  keyGenerator: (req) => `fp_${getClientIp(req)}`,
});
