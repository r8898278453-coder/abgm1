import { Request, Response, NextFunction } from 'express';
import cors from 'cors';

// ====================================================================
// 1. CORS Configuration (Tenant & Production Safe)
// ====================================================================

// Allowed origins whitelist for production and development
const ALLOWED_ORIGIN_PATTERNS: (string | RegExp)[] = [
  'https://bga.aaditechs.in',
  'https://aaditechs.in',
  'http://localhost:3000',
  'http://localhost:5173',
  /^https:\/\/[a-z0-9-]+\.run\.app$/, // Cloud Run preview instances
  /^https:\/\/[a-z0-9-]+\.google\.com$/, // AI Studio web app preview frames
];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow server-to-server or non-browser requests (e.g. mobile apps, curl, cron)
    if (!origin) {
      callback(null, true);
      return;
    }

    const isAllowed = ALLOWED_ORIGIN_PATTERNS.some((pattern) => {
      if (typeof pattern === 'string') {
        return pattern === origin;
      }
      return pattern.test(origin);
    });

    if (isAllowed || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy violation: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
  ],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours preflight cache
});

// ====================================================================
// 2. Enterprise Security Headers Middleware
// ====================================================================

export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS filter in legacy browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy: Send full URL for same-origin, domain-only for cross-origin HTTPS
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Prevent browser from caching sensitive API responses
  if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/integrations')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  // Restrict sensitive hardware APIs
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Prevent clickjacking while allowing Google AI Studio preview & authorized production domain
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://*.google.com https://*.run.app https://ai.studio https://bga.aaditechs.in;"
  );

  next();
}

// ====================================================================
// 3. Request Logging & Audit Monitoring
// ====================================================================

interface AuditLogEntry {
  timestamp: string;
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
  clientIp: string;
  userAgent?: string;
  authHeaderPresent: boolean;
}

export function requestAuditLogger(req: Request, res: Response, next: NextFunction): void {
  // Skip high-frequency static asset logging
  if (
    req.path.startsWith('/@fs') ||
    req.path.startsWith('/@vite') ||
    req.path.startsWith('/node_modules') ||
    req.path.endsWith('.js') ||
    req.path.endsWith('.css') ||
    req.path.endsWith('.svg') ||
    req.path.endsWith('.png')
  ) {
    next();
    return;
  }

  const startTime = Date.now();
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const statusCode = res.statusCode;
    const isApi = req.path.startsWith('/api/');

    if (isApi) {
      const logEntry: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode,
        durationMs,
        clientIp,
        userAgent: req.headers['user-agent'],
        authHeaderPresent: Boolean(req.headers.authorization),
      };

      // Colorized console output for dev & structured JSON for production monitoring
      if (statusCode >= 500) {
        console.error(`[AUDIT-ERROR] ${logEntry.method} ${logEntry.url} ${statusCode} - ${durationMs}ms - IP: ${clientIp}`);
      } else if (statusCode >= 400) {
        console.warn(`[AUDIT-WARN] ${logEntry.method} ${logEntry.url} ${statusCode} - ${durationMs}ms - IP: ${clientIp}`);
      } else {
        console.log(`[AUDIT-OK] ${logEntry.method} ${logEntry.url} ${statusCode} - ${durationMs}ms`);
      }
    }
  });

  next();
}
