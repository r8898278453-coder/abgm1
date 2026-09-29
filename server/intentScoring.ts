/**
 * Deterministic Intent Scoring & Classification Engine
 * Analyzes inbound messages, client inquiries, and CRM submissions.
 * 
 * Rules:
 * 1. Zero-Fabrication: If text/context is empty or missing, returns UNAVAILABLE (score = null).
 * 2. Deterministic Signal Analysis:
 *    - High Intent (80-100): Direct quote/pricing requests, service requirements, booking/meeting, budget stated, urgency.
 *    - Medium Intent (50-79): General inquiries, inquiries with partial context, service exploration.
 *    - Low Intent (20-49): Casual greetings, single emojis, vague statements.
 * 3. Never hardcodes static numbers (like 95 or 92).
 */

export interface IntentAnalysisResult {
  score: number | null;
  status: 'CALCULATED' | 'UNAVAILABLE';
  classification: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNAVAILABLE';
  reasons: string[];
}

export function calculateMessageIntent(
  text?: string | null,
  context?: {
    service?: string | null;
    budget?: string | null;
    phone?: string | null;
    email?: string | null;
  }
): IntentAnalysisResult {
  const cleanText = (text || '').trim().toLowerCase();
  const cleanService = (context?.service || '').trim().toLowerCase();
  const cleanBudget = (context?.budget || '').trim().toLowerCase();

  // 1. Zero context / empty text check
  if (!cleanText && !cleanService && !cleanBudget) {
    return {
      score: null,
      status: 'UNAVAILABLE',
      classification: 'UNAVAILABLE',
      reasons: ['No message body or inquiry parameters provided.'],
    };
  }

  let calculatedScore = 30; // Base score for receiving an inquiry
  const reasons: string[] = [];

  // High Intent Signal 1: Pricing / Quotation / Cost keywords (+25)
  const pricingKeywords = ['price', 'pricing', 'cost', 'quote', 'quotation', 'rate', 'budget', 'charges', 'fees', 'how much', 'kitna', 'bhav', 'daam'];
  if (pricingKeywords.some((kw) => cleanText.includes(kw) || cleanBudget.includes(kw))) {
    calculatedScore += 25;
    reasons.push('Explicit pricing / quotation inquiry detected');
  }

  // High Intent Signal 2: Service / Requirement keywords (+25)
  const serviceKeywords = ['develop', 'build', 'create', 'website', 'app', 'software', 'seo', 'marketing', 'design', 'service', 'hire', 'buy', 'order', 'require', 'need', 'chahiye', 'banwana'];
  if (serviceKeywords.some((kw) => cleanText.includes(kw) || cleanService.includes(kw))) {
    calculatedScore += 25;
    reasons.push('Specific service requirement mentioned');
  }

  // High Intent Signal 3: Meeting / Appointment / Contact signals (+15)
  const contactKeywords = ['call me', 'meet', 'appointment', 'demo', 'discuss', 'contact', 'schedule', 'phone', 'whatsapp me', 'bat karni hai'];
  if (contactKeywords.some((kw) => cleanText.includes(kw))) {
    calculatedScore += 15;
    reasons.push('Direct appointment / callback request');
  }

  // High Intent Signal 4: Urgency / Timeline (+10)
  const urgencyKeywords = ['urgent', 'immediately', 'today', 'asap', 'this week', 'emergency', 'fast', 'jaldi'];
  if (urgencyKeywords.some((kw) => cleanText.includes(kw))) {
    calculatedScore += 10;
    reasons.push('High-urgency timeline stated');
  }

  // High Intent Signal 5: Stated Budget with figures (+15)
  if (cleanBudget && cleanBudget !== 'pending discussion' && cleanBudget !== 'custom proposal') {
    calculatedScore += 15;
    reasons.push('Specific budget allocation provided');
  }

  // Low Intent Signal: Pure generic greeting without context (-20)
  const pureGreetings = ['hi', 'hello', 'hey', 'namaste', 'good morning', 'good evening', 'test', 'ok', 'hii', 'helo'];
  if (pureGreetings.includes(cleanText) && !cleanService && (!cleanBudget || cleanBudget === 'pending discussion')) {
    calculatedScore = 35;
    reasons.push('Generic greeting without specific business context');
  }

  // Clamp score to 1-100
  const finalScore = Math.max(10, Math.min(100, calculatedScore));

  let classification: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  if (finalScore >= 80) classification = 'HIGH';
  else if (finalScore < 50) classification = 'LOW';

  return {
    score: finalScore,
    status: 'CALCULATED',
    classification,
    reasons,
  };
}
