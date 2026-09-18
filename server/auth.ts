import crypto from 'crypto';
import express from 'express';
import { findUserById, DbUser } from './db';

// Enterprise JWT / HMAC-SHA256 Security Configuration
// Prioritizes environment secret, with strong fallback for development
const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  process.env.JWT_SECRET ||
  'aaditech_bga_enterprise_jwt_sec_2026_x89f_secure_auth';

// Token expiration: 7 days in seconds
const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

export interface TokenPayload {
  sub: string;       // User Unique ID
  email: string;     // User Email
  role: string;      // User Role ('owner' | 'manager' | 'agency')
  iat: number;       // Issued At timestamp (epoch seconds)
  exp: number;       // Expiry timestamp (epoch seconds)
  jti: string;       // Unique Token ID (nonce to prevent replay)
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf-8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  let str = input.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4 !== 0) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf-8');
}

function computeHmacSignature(data: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Generates a cryptographically signed HMAC-SHA256 JWT.
 * It contains standard claims (sub, email, role, iat, exp, jti) and cannot be forged
 * without knowing the server's private AUTH_SECRET.
 */
export function generateAuthToken(user: { id: string; email: string; role?: string }): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email.toLowerCase().trim(),
    role: user.role || 'owner',
    iat: nowSeconds,
    exp: nowSeconds + TOKEN_EXPIRY_SECONDS,
    jti: crypto.randomBytes(16).toString('hex'),
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = computeHmacSignature(`${encodedHeader}.${encodedPayload}`, AUTH_SECRET);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Validates a JWT token cryptographically:
 * 1. Verifies the token structure (header.payload.signature)
 * 2. Recalculates the HMAC-SHA256 signature using AUTH_SECRET
 * 3. Compares signatures using timingSafeEqual to prevent side-channel timing attacks
 * 4. Verifies expiration (exp) and required claims
 * 
 * Returns the decoded TokenPayload if valid, or null if forged/expired/tampered.
 */
export function verifyAuthToken(token: string): TokenPayload | null {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [headerB64, payloadB64, signature] = parts;

  // 1. Validate signature using constant-time comparison
  const expectedSignature = computeHmacSignature(`${headerB64}.${payloadB64}`, AUTH_SECRET);
  const sigBuffer = Buffer.from(signature, 'utf-8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');

  if (sigBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  // 2. Decode and validate claims
  try {
    const payloadJson = base64UrlDecode(payloadB64);
    const payload = JSON.parse(payloadJson) as TokenPayload;

    if (!payload.sub || !payload.email || !payload.exp) {
      return null;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (nowSeconds > payload.exp) {
      // Token has expired
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies the authenticated user from the Express request.
 * Checks for `Authorization: Bearer <token>`, validates HMAC signature,
 * and confirms the user exists in the database.
 */
export async function getAuthUserFromRequest(req: express.Request): Promise<DbUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return null;
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return null;
  }

  try {
    const user = await findUserById(payload.sub);
    if (!user) {
      return null;
    }

    // Ensure email matches to prevent state inconsistency
    if (user.email.toLowerCase() !== payload.email.toLowerCase()) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}
