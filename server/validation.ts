import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ====================================================================
// Input Sanitization Helpers (XSS Prevention & Whitespace Cleaning)
// ====================================================================

/**
 * Strips script tags and dangerous HTML characters to prevent Stored XSS
 */
export function sanitizeString(val: string): string {
  if (!val || typeof val !== 'string') return '';
  return val
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/onerror\s*=/gi, '')
    .replace(/onload\s*=/gi, '');
}

/**
 * Deep sanitizes an object or string recursively
 */
export function deepSanitize<T>(input: T): T {
  if (typeof input === 'string') {
    return sanitizeString(input) as unknown as T;
  }
  if (Array.isArray(input)) {
    return input.map((item) => deepSanitize(item)) as unknown as T;
  }
  if (input !== null && typeof input === 'object') {
    const sanitizedObj: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitizedObj[key] = deepSanitize(value);
    }
    return sanitizedObj;
  }
  return input;
}

// ====================================================================
// Zod v4 Compatible Schemas for Enterprise API Endpoints
// ====================================================================

// 1. User Registration Schema
export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .email('Invalid email address format')
    .max(191, 'Email must be under 191 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password must be under 100 characters'),
  full_name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(128, 'Full name must be under 128 characters')
    .optional(),
  name: z.string().trim().min(2).max(128).optional(),
  fullName: z.string().trim().min(2).max(128).optional(),
  role: z
    .enum(['owner', 'manager', 'agency'])
    .default('owner'),
}).transform((data) => {
  const resolvedName = data.full_name || data.fullName || data.name || 'User';
  return {
    email: data.email,
    password: data.password,
    full_name: resolvedName,
    role: data.role || 'owner',
  };
});

// 2. User Login Schema
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .email('Invalid email address format')
    .max(191),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(100),
});

// 2b. Forgot Password Schema
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .email('Invalid email address format')
    .max(191, 'Email must be under 191 characters'),
});

// 2c. Reset Password Schema
export const resetPasswordSchema = z.object({
  token: z
    .string()
    .trim()
    .min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password must be under 100 characters'),
});

// 3. Lead Ingestion Schema
export const createLeadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Contact name must be at least 2 characters')
    .max(128, 'Contact name must be under 128 characters'),
  phone: z
    .string()
    .trim()
    .min(6, 'Valid phone number is required')
    .max(32, 'Phone number must be under 32 characters')
    .regex(/^[+0-9\s()-]+$/, 'Phone number must contain only numbers and valid formatting symbols (+, -, parentheses)'),
  company: z
    .string()
    .trim()
    .max(128)
    .optional()
    .default('Direct Client'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email format')
    .max(191)
    .optional()
    .or(z.literal(''))
    .default(''),
  service: z
    .string()
    .trim()
    .max(191)
    .optional()
    .default('IT & Digital Growth Services'),
  budget: z
    .string()
    .trim()
    .max(64)
    .optional()
    .default('Custom Proposal'),
  stage: z
    .enum(['new', 'contacted', 'qualified', 'quotation', 'won', 'lost'])
    .optional()
    .default('new'),
  source: z
    .string()
    .trim()
    .max(64)
    .optional()
    .default('bga.aaditechs.in Form'),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .default(''),
  company_id: z.string().trim().max(64).optional(),
  companyId: z.string().trim().max(64).optional(),
}).transform((data) => ({
  ...data,
  company_id: data.company_id || data.companyId,
}));

// 4. Update Lead Stage Schema
export const updateLeadStageSchema = z.object({
  stage: z.enum(['new', 'contacted', 'qualified', 'quotation', 'won', 'lost']),
});

// 5. Review Reply Schema
export const replyReviewSchema = z.object({
  replyText: z
    .string()
    .trim()
    .min(2, 'Reply text must be at least 2 characters')
    .max(2000, 'Reply text must be under 2000 characters'),
  replyDate: z.string().trim().max(64).optional(),
});

// 6. Create Review Schema
export const createReviewSchema = z.object({
  author: z
    .string()
    .trim()
    .min(2, 'Author name must be at least 2 characters')
    .max(128),
  rating: z
    .number()
    .int('Rating must be an integer')
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5'),
  content: z
    .string()
    .trim()
    .min(5, 'Review content must be at least 5 characters')
    .max(3000),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional().default('positive'),
  topic: z.string().trim().max(128).optional(),
  source: z.enum(['google', 'facebook', 'justdial']).optional().default('google'),
  company_id: z.string().trim().max(64).optional(),
});

// 7. Create Company Schema
export const createCompanySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Business name must be at least 2 characters')
    .max(191),
  legal_name: z.string().trim().max(191).optional(),
  category: z
    .string()
    .trim()
    .min(2)
    .max(128),
  city: z
    .string()
    .trim()
    .min(2)
    .max(128),
  phone: z.string().trim().max(64).optional(),
  website: z.string().trim().max(255).optional(),
  google_place_id: z.string().trim().max(128).optional(),
});

// 8. Create Content Post Schema
export const createPostSchema = z.object({
  channel: z
    .string()
    .trim()
    .max(64)
    .default('google'),
  caption: z
    .string()
    .trim()
    .min(3, 'Caption must be at least 3 characters')
    .max(5000),
  headline: z.string().trim().max(255).optional(),
  title: z.string().trim().max(255).optional(),
  type: z.string().trim().max(64).optional().default('offer'),
  image_url: z.string().trim().max(1000).optional(),
  status: z
    .enum(['draft', 'pending_approval', 'scheduled', 'published'])
    .optional()
    .default('scheduled'),
  scheduled_time: z.string().trim().max(64).optional().default('Immediate'),
  scheduled_date: z.string().trim().max(64).optional(),
  hashtags: z.union([z.string(), z.array(z.string())]).optional(),
  company_id: z.string().trim().max(64).optional(),
});

// 8. Razorpay Payment Verification Schema (Signature strictly required)
export const verifyRazorpayPaymentSchema = z.object({
  razorpay_order_id: z
    .string()
    .trim()
    .min(1, 'Razorpay Order ID is required')
    .max(100),
  razorpay_payment_id: z
    .string()
    .trim()
    .min(1, 'Razorpay Payment ID is required')
    .max(100),
  razorpay_signature: z
    .string()
    .trim()
    .min(10, 'Razorpay cryptographic signature is required for payment verification')
    .max(200),
  companyId: z.string().trim().max(64).optional(),
  leadId: z.string().trim().max(64).optional(),
  planName: z.string().trim().max(128).optional(),
  amount: z.union([z.number(), z.string()]).optional(),
});

// 9. AI Content Studio Generation Schema (requires businessName and category)
export const generateAiContentSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(1, 'Business name is required')
    .max(128, 'Business name must be under 128 characters'),
  category: z
    .string()
    .trim()
    .min(1, 'Category is required')
    .max(128, 'Category must be under 128 characters'),
  contentType: z.string().trim().max(64).optional().default('offer'),
  platform: z.string().trim().max(64).optional().default('google'),
  offer: z.string().trim().max(500).optional(),
  language: z.string().trim().max(64).optional(),
  website: z.string().trim().max(255).optional(),
  city: z.string().trim().max(128).optional(),
  targetAudience: z.string().trim().max(255).optional(),
  brandTone: z.string().trim().max(128).optional(),
  tagline: z.string().trim().max(255).optional(),
  preferredLanguage: z.string().trim().max(64).optional(),
}).passthrough();

// ====================================================================
// Express Middleware Generator for Zod Schemas
// ====================================================================

/**
 * Validates request body against a Zod schema.
 * Replaces req.body with the sanitized and parsed object upon success.
 * Returns formatted 400 Bad Request with details if validation fails.
 */
export function validateBody(schema: any) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // First pass: deep sanitize input strings against XSS
      const sanitizedBody = deepSanitize(req.body);
      
      // Second pass: validate types, constraints & schema transforms
      const validatedData = schema.parse(sanitizedBody);
      
      req.body = validatedData;
      next();
    } catch (err: any) {
      if (err && err.issues) {
        const issues = err.issues.map((issue: any) => ({
          field: Array.isArray(issue.path) ? issue.path.join('.') : '',
          message: issue.message,
        }));
        
        res.status(400).json({
          success: false,
          error: issues[0]?.message || 'Invalid request payload',
          details: issues,
        });
        return;
      }
      
      res.status(400).json({
        success: false,
        error: err?.message || 'Invalid request payload',
      });
    }
  };
}
