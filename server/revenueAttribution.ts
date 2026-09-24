import { DbLead, DbInvoice } from './db';

/**
 * Strict canonical list of supported lead and revenue acquisition sources.
 * Never infer or guess a source. If not identifiable, strictly 'Unknown'.
 */
export const SUPPORTED_SOURCES = [
  'Google',
  'Organic',
  'Website',
  'WhatsApp',
  'Telegram',
  'Social',
  'Referral',
  'Campaign',
  'Manual',
  'Unknown',
] as const;

export type SupportedSource = (typeof SUPPORTED_SOURCES)[number];

/**
 * CRM Lifecycle Stages
 * SOURCE -> LEAD -> QUALIFIED -> OPPORTUNITY -> QUOTE/DEAL -> WON/LOST -> PAYMENT -> REVENUE
 */
export type CrmLifecycleStage =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'opportunity'
  | 'quotation'
  | 'won'
  | 'lost';

export interface SourceRevenueMetrics {
  source: SupportedSource;
  leads: number;
  qualifiedLeads: number;
  opportunities: number;
  quotesDeals: number;
  won: number;
  lost: number;
  customers: number;
  conversionRate: number; // percentage (0.00 - 100.00)
  revenue: number; // verified paid revenue in currency
  spend: number | null; // actual verified marketing cost/spend, or null if missing
  roi: string | number; // 'UNAVAILABLE' if cost data is missing, or percentage number
  status: 'VERIFIED' | 'CALCULATED' | 'UNAVAILABLE';
}

export interface RevenueAttributionSummary {
  companyId: string;
  totalLeads: number;
  qualifiedLeads: number;
  opportunities: number;
  quotesDeals: number;
  wonLeads: number;
  lostLeads: number;
  customers: number;
  conversionRate: number; // percentage (0.00 - 100.00)
  totalRevenue: number; // verified paid revenue only
  unverifiedRevenueIgnored: number; // simulated/unverified revenue safely excluded
  totalSpend: number | null;
  overallRoi: string | number; // 'UNAVAILABLE' if cost is missing
  revenueBySource: Record<SupportedSource, SourceRevenueMetrics>;
  sourcesList: SourceRevenueMetrics[];
  verifiedInvoicesCount: number;
  unverifiedInvoicesCount: number;
  attributionStatus: 'VERIFIED' | 'CALCULATED' | 'UNAVAILABLE';
  timestamp: string;
}

export interface RevenueAttributionOptions {
  companyId: string;
  leads: DbLead[];
  invoices: DbInvoice[];
  costBySource?: Partial<Record<SupportedSource, number | null>>;
  totalCost?: number | null;
}

/**
 * Normalizes any raw source string strictly into one of the supported sources.
 * CRITICAL RULE: Never infer or guess a source. If ambiguous or missing, return 'Unknown'.
 */
export function normalizeSource(rawSource?: string | null): SupportedSource {
  if (!rawSource || typeof rawSource !== 'string') {
    return 'Unknown';
  }

  const clean = rawSource.trim();
  if (!clean || clean.toLowerCase() === 'unknown' || clean.toLowerCase() === 'null' || clean.toLowerCase() === 'undefined') {
    return 'Unknown';
  }

  const lower = clean.toLowerCase();

  // 1. Google (Maps, Local 3-Pack, Google Ads, GMB, Search)
  if (
    lower.includes('google') ||
    lower.includes('gmb') ||
    lower.includes('3-pack') ||
    lower.includes('places') ||
    lower.includes('google maps')
  ) {
    return 'Google';
  }

  // 2. Organic (SEO, unpaid search ranking, direct organic discovery)
  if (
    lower.includes('organic') ||
    lower === 'seo' ||
    lower.includes('organic search') ||
    lower.includes('organic ranking')
  ) {
    return 'Organic';
  }

  // 3. Website (Direct storefront contact form, landing page inquiry, custom domain form)
  if (
    lower.includes('website') ||
    lower.includes('site') ||
    lower.includes('form') ||
    lower.includes('bga.aaditechs.in') ||
    lower.includes('storefront') ||
    lower.includes('landing page') ||
    lower === 'web'
  ) {
    return 'Website';
  }

  // 4. WhatsApp (WhatsApp Direct, WhatsApp Cloud API, Click-to-WhatsApp)
  if (
    lower.includes('whatsapp') ||
    lower.includes('wa direct') ||
    lower.includes('wa bot') ||
    lower.includes('wa_')
  ) {
    return 'WhatsApp';
  }

  // 5. Telegram (Telegram Bot, Telegram Channel, Support Bot)
  if (
    lower.includes('telegram') ||
    lower.includes('tg bot') ||
    lower.includes('tg_')
  ) {
    return 'Telegram';
  }

  // 6. Social (Instagram, Facebook, Meta, LinkedIn, YouTube, Twitter/X)
  if (
    lower.includes('instagram') ||
    lower.includes('facebook') ||
    lower.includes('meta') ||
    lower.includes('social') ||
    lower.includes('linkedin') ||
    lower.includes('twitter') ||
    lower.includes('youtube')
  ) {
    return 'Social';
  }

  // 7. Referral (Word of mouth, client recommendation, partner intro)
  if (
    lower.includes('referral') ||
    lower.includes('ref_') ||
    lower.includes('word of mouth') ||
    lower.includes('partner') ||
    lower.includes('recommendation')
  ) {
    return 'Referral';
  }

  // 8. Campaign (Email blast, SMS campaign, promotional broadcast, newsletter)
  if (
    lower.includes('campaign') ||
    lower.includes('broadcast') ||
    lower.includes('newsletter') ||
    lower.includes('email blast') ||
    lower.includes('sms blast') ||
    lower.includes('promo')
  ) {
    return 'Campaign';
  }

  // 9. Manual (Walk-in client, direct phone call, manual CRM entry, direct consultation)
  if (
    lower.includes('manual') ||
    lower.includes('walk-in') ||
    lower.includes('walkin') ||
    lower.includes('direct call') ||
    lower.includes('phone call') ||
    lower.includes('front desk')
  ) {
    return 'Manual';
  }

  // If no explicit deterministic match exists, NEVER infer:
  return 'Unknown';
}

/**
 * Validates whether a payment/invoice record is genuinely provider-verified.
 * CRITICAL RULE:
 * Do not trust: frontend payment success, client paymentId, simulated payment.
 * Revenue must be linked to verified payment records.
 */
export function isProviderVerifiedPayment(invoice: DbInvoice): boolean {
  if (!invoice) return false;

  // 1. Must be marked 'Paid'
  if (invoice.status !== 'Paid') {
    return false;
  }

  // 2. Must have a valid, non-empty payment_id
  const paymentId = invoice.payment_id?.trim();
  if (!paymentId) {
    return false;
  }

  // 3. Reject simulated, test, or mock payment identifiers
  const lowerPaymentId = paymentId.toLowerCase();
  if (
    lowerPaymentId.startsWith('sim_') ||
    lowerPaymentId.startsWith('mock_') ||
    lowerPaymentId.startsWith('fake_') ||
    lowerPaymentId.startsWith('test_unverified_') ||
    lowerPaymentId.startsWith('client_mock_') ||
    lowerPaymentId.includes('simulated')
  ) {
    return false;
  }

  // 4. Validate payment method indicates genuine provider processing
  const method = (invoice.payment_method || '').toLowerCase();
  if (
    method.includes('unverified') ||
    method.includes('simulated') ||
    method.includes('client claim') ||
    method.includes('mock')
  ) {
    return false;
  }

  // 5. Must have positive numeric amount
  const amount = Number(invoice.amount || invoice.total_amount || 0);
  if (isNaN(amount) || amount <= 0) {
    return false;
  }

  return true;
}

/**
 * Evaluates whether a lead has reached or passed the QUALIFIED lifecycle stage.
 */
export function isLeadQualified(stage: string): boolean {
  const s = (stage || '').toLowerCase();
  return ['qualified', 'opportunity', 'quotation', 'won'].includes(s);
}

/**
 * Evaluates whether a lead has reached or passed the OPPORTUNITY lifecycle stage.
 */
export function isLeadOpportunity(stage: string): boolean {
  const s = (stage || '').toLowerCase();
  return ['opportunity', 'contacted', 'quotation', 'won'].includes(s);
}

/**
 * Evaluates whether a lead has reached or passed the QUOTE/DEAL lifecycle stage.
 */
export function isLeadQuoteOrDeal(stage: string): boolean {
  const s = (stage || '').toLowerCase();
  return ['quotation', 'quote', 'deal', 'won'].includes(s);
}

/**
 * Calculates real revenue attribution across all supported sources for a tenant.
 * Strictly isolates by companyId and enforces zero-fabrication of ROI.
 */
export function calculateRevenueAttribution(
  options: RevenueAttributionOptions
): RevenueAttributionSummary {
  const { companyId, leads = [], invoices = [], costBySource = {}, totalCost = null } = options;

  // 1. Strict Tenant Isolation: Filter only records matching this companyId
  const isolatedLeads = leads.filter((l) => !l.company_id || l.company_id === companyId);
  const isolatedInvoices = invoices.filter((i) => !i.company_id || i.company_id === companyId);

  // Initialize per-source buckets
  const sourceBuckets: Record<SupportedSource, {
    leads: number;
    qualifiedLeads: number;
    opportunities: number;
    quotesDeals: number;
    won: number;
    lost: number;
    customers: number;
    revenue: number;
    spend: number | null;
  }> = {
    Google: { leads: 0, qualifiedLeads: 0, opportunities: 0, quotesDeals: 0, won: 0, lost: 0, customers: 0, revenue: 0, spend: null },
    Organic: { leads: 0, qualifiedLeads: 0, opportunities: 0, quotesDeals: 0, won: 0, lost: 0, customers: 0, revenue: 0, spend: null },
    Website: { leads: 0, qualifiedLeads: 0, opportunities: 0, quotesDeals: 0, won: 0, lost: 0, customers: 0, revenue: 0, spend: null },
    WhatsApp: { leads: 0, qualifiedLeads: 0, opportunities: 0, quotesDeals: 0, won: 0, lost: 0, customers: 0, revenue: 0, spend: null },
    Telegram: { leads: 0, qualifiedLeads: 0, opportunities: 0, quotesDeals: 0, won: 0, lost: 0, customers: 0, revenue: 0, spend: null },
    Social: { leads: 0, qualifiedLeads: 0, opportunities: 0, quotesDeals: 0, won: 0, lost: 0, customers: 0, revenue: 0, spend: null },
    Referral: { leads: 0, qualifiedLeads: 0, opportunities: 0, quotesDeals: 0, won: 0, lost: 0, customers: 0, revenue: 0, spend: null },
    Campaign: { leads: 0, qualifiedLeads: 0, opportunities: 0, quotesDeals: 0, won: 0, lost: 0, customers: 0, revenue: 0, spend: null },
    Manual: { leads: 0, qualifiedLeads: 0, opportunities: 0, quotesDeals: 0, won: 0, lost: 0, customers: 0, revenue: 0, spend: null },
    Unknown: { leads: 0, qualifiedLeads: 0, opportunities: 0, quotesDeals: 0, won: 0, lost: 0, customers: 0, revenue: 0, spend: null },
  };

  // Helper map to associate lead phone/email/id with their normalized source
  const leadSourceMap = new Map<string, SupportedSource>();

  // 2. Process Leads through Lifecycle: SOURCE -> LEAD -> QUALIFIED -> OPPORTUNITY -> QUOTE/DEAL -> WON/LOST
  let totalLeadsCount = 0;
  let qualifiedLeadsCount = 0;
  let opportunitiesCount = 0;
  let quotesDealsCount = 0;
  let wonLeadsCount = 0;
  let lostLeadsCount = 0;

  for (const lead of isolatedLeads) {
    const src = normalizeSource(lead.source);
    const bucket = sourceBuckets[src];

    totalLeadsCount++;
    bucket.leads++;

    // Index lead for subsequent payment attribution
    if (lead.id) leadSourceMap.set(lead.id, src);
    if (lead.phone) leadSourceMap.set(lead.phone.replace(/[^0-9]/g, ''), src);
    if (lead.email) leadSourceMap.set(lead.email.toLowerCase().trim(), src);

    const stage = (lead.stage || 'new').toLowerCase();

    if (isLeadQualified(stage)) {
      qualifiedLeadsCount++;
      bucket.qualifiedLeads++;
    }

    if (isLeadOpportunity(stage)) {
      opportunitiesCount++;
      bucket.opportunities++;
    }

    if (isLeadQuoteOrDeal(stage)) {
      quotesDealsCount++;
      bucket.quotesDeals++;
    }

    if (stage === 'won') {
      wonLeadsCount++;
      bucket.won++;
    } else if (stage === 'lost') {
      lostLeadsCount++;
      bucket.lost++;
    }
  }

  // 3. Process Invoices & Provider-Verified Payments: PAYMENT -> REVENUE
  let verifiedRevenueTotal = 0;
  let unverifiedRevenueTotal = 0;
  let verifiedInvoicesCount = 0;
  let unverifiedInvoicesCount = 0;

  const payingCustomerIdentifiers = new Set<string>();
  const sourcePayingCustomers: Record<SupportedSource, Set<string>> = {
    Google: new Set(),
    Organic: new Set(),
    Website: new Set(),
    WhatsApp: new Set(),
    Telegram: new Set(),
    Social: new Set(),
    Referral: new Set(),
    Campaign: new Set(),
    Manual: new Set(),
    Unknown: new Set(),
  };

  for (const invoice of isolatedInvoices) {
    const isVerified = isProviderVerifiedPayment(invoice);
    const amount = Number(invoice.amount || invoice.total_amount || 0);

    if (!isVerified) {
      unverifiedInvoicesCount++;
      unverifiedRevenueTotal += amount;
      continue;
    }

    verifiedInvoicesCount++;
    verifiedRevenueTotal += amount;

    // Track unique paying customer identifier
    const customerKey =
      invoice.customer_phone?.replace(/[^0-9]/g, '') ||
      invoice.customer_email?.toLowerCase().trim() ||
      invoice.customer_name ||
      invoice.id;

    payingCustomerIdentifiers.add(customerKey);

    // Attribute payment to source
    let matchedSource: SupportedSource = 'Unknown';

    // Check phone match against lead index
    const cleanPhone = invoice.customer_phone?.replace(/[^0-9]/g, '');
    const cleanEmail = invoice.customer_email?.toLowerCase().trim();

    if (cleanPhone && leadSourceMap.has(cleanPhone)) {
      matchedSource = leadSourceMap.get(cleanPhone)!;
    } else if (cleanEmail && leadSourceMap.has(cleanEmail)) {
      matchedSource = leadSourceMap.get(cleanEmail)!;
    } else if (invoice.plan && invoice.plan.toLowerCase().includes('google')) {
      matchedSource = 'Google';
    } else if (invoice.payment_method && invoice.payment_method.toLowerCase().includes('whatsapp')) {
      matchedSource = 'WhatsApp';
    } else {
      // If payment cannot be deterministically matched to a source: strictly 'Unknown'
      matchedSource = 'Unknown';
    }

    sourceBuckets[matchedSource].revenue += amount;
    sourcePayingCustomers[matchedSource].add(customerKey);
  }

  // Count distinct paying customers per source
  for (const src of SUPPORTED_SOURCES) {
    sourceBuckets[src].customers = sourcePayingCustomers[src].size;
    if (costBySource[src] !== undefined && costBySource[src] !== null) {
      sourceBuckets[src].spend = Number(costBySource[src]);
    }
  }

  const totalCustomersCount = payingCustomerIdentifiers.size;
  const overallConversionRate =
    totalLeadsCount > 0 ? Number(((totalCustomersCount / totalLeadsCount) * 100).toFixed(2)) : 0;

  // 4. Calculate ROI per source & Overall (Strict Anti-Fabrication: If cost data is missing -> 'UNAVAILABLE')
  let computedTotalSpend: number | null = null;
  if (totalCost !== undefined && totalCost !== null) {
    computedTotalSpend = Number(totalCost);
  } else {
    const spends = Object.values(costBySource).filter((s): s is number => typeof s === 'number' && s !== null);
    if (spends.length > 0) {
      computedTotalSpend = spends.reduce((a, b) => a + b, 0);
    }
  }

  let overallRoi: string | number = 'UNAVAILABLE';
  if (computedTotalSpend !== null && computedTotalSpend > 0) {
    overallRoi = Number((((verifiedRevenueTotal - computedTotalSpend) / computedTotalSpend) * 100).toFixed(2));
  } else if (computedTotalSpend === 0) {
    overallRoi = verifiedRevenueTotal > 0 ? 'N/A (Zero Cost)' : 0;
  }

  // 5. Build Final Breakdown Objects
  const revenueBySource: Record<SupportedSource, SourceRevenueMetrics> = {} as any;
  const sourcesList: SourceRevenueMetrics[] = [];

  for (const src of SUPPORTED_SOURCES) {
    const bucket = sourceBuckets[src];
    const srcConversionRate =
      bucket.leads > 0 ? Number(((bucket.customers / bucket.leads) * 100).toFixed(2)) : 0;

    let srcRoi: string | number = 'UNAVAILABLE';
    if (bucket.spend !== null && bucket.spend > 0) {
      srcRoi = Number((((bucket.revenue - bucket.spend) / bucket.spend) * 100).toFixed(2));
    } else if (bucket.spend === 0) {
      srcRoi = bucket.revenue > 0 ? 'N/A (Zero Cost)' : 0;
    }

    const metricItem: SourceRevenueMetrics = {
      source: src,
      leads: bucket.leads,
      qualifiedLeads: bucket.qualifiedLeads,
      opportunities: bucket.opportunities,
      quotesDeals: bucket.quotesDeals,
      won: bucket.won,
      lost: bucket.lost,
      customers: bucket.customers,
      conversionRate: srcConversionRate,
      revenue: Number(bucket.revenue.toFixed(2)),
      spend: bucket.spend,
      roi: srcRoi,
      status: bucket.revenue > 0 ? 'VERIFIED' : bucket.leads > 0 ? 'CALCULATED' : 'UNAVAILABLE',
    };

    revenueBySource[src] = metricItem;
    sourcesList.push(metricItem);
  }

  const attributionStatus =
    verifiedRevenueTotal > 0
      ? 'VERIFIED'
      : totalLeadsCount > 0
      ? 'CALCULATED'
      : 'UNAVAILABLE';

  return {
    companyId,
    totalLeads: totalLeadsCount,
    qualifiedLeads: qualifiedLeadsCount,
    opportunities: opportunitiesCount,
    quotesDeals: quotesDealsCount,
    wonLeads: wonLeadsCount,
    lostLeads: lostLeadsCount,
    customers: totalCustomersCount,
    conversionRate: overallConversionRate,
    totalRevenue: Number(verifiedRevenueTotal.toFixed(2)),
    unverifiedRevenueIgnored: Number(unverifiedRevenueTotal.toFixed(2)),
    totalSpend: computedTotalSpend,
    overallRoi,
    revenueBySource,
    sourcesList,
    verifiedInvoicesCount,
    unverifiedInvoicesCount,
    attributionStatus,
    timestamp: new Date().toISOString(),
  };
}
