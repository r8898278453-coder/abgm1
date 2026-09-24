import {
  ReviewItem,
  ContentPost,
  LeadItem,
  BusinessProfile,
  RankObservation,
  CompetitorData,
  GrowthScore,
} from '../src/types';

export type EvidenceStatus =
  | 'LIVE'
  | 'VERIFIED'
  | 'CALCULATED'
  | 'USER_ENTERED'
  | 'DEMO'
  | 'SEEDED'
  | 'UNAVAILABLE';

export interface StructuredEvidenceItem {
  metric: string;
  value: string | number | boolean | null;
  source: string;
  timestamp: string;
  status: EvidenceStatus;
  notes?: string;
}

export interface ExecutiveSummaryInputs {
  businessProfile?: BusinessProfile | null;
  reviews?: ReviewItem[] | null;
  posts?: ContentPost[] | null;
  leads?: LeadItem[] | null;
  rankObservations?: (RankObservation | any)[] | null;
  competitors?: CompetitorData[] | null;
  customDomainVerified?: boolean;
  growthScore?: GrowthScore | null;
  isDemoMode?: boolean;
  overrideTimestamp?: string;
}

export interface ExecutiveSummaryResult {
  headline: string;
  summary: string;
  keyTakeaways: string[];
  evidence: StructuredEvidenceItem[];
  overallStatus: EvidenceStatus;
  timestamp: string;
}

/**
 * Builds a strict, structured evidence object before any AI LLM invocation.
 * Enforces zero-fabrication and verifies data status.
 * Demo data is NEVER classified as VERIFIED.
 */
export function buildStructuredEvidence(
  inputs: ExecutiveSummaryInputs
): StructuredEvidenceItem[] {
  const timestamp = inputs.overrideTimestamp || new Date().toISOString();
  const isDemo = Boolean(inputs.isDemoMode);
  const evidence: StructuredEvidenceItem[] = [];

  const profile = inputs.businessProfile;
  const isGoogleConnected = Boolean(profile?.connectedAccounts?.googleBusiness);

  // 1. Google Business Profile & Connection
  evidence.push({
    metric: 'Google Business Connection',
    value: isGoogleConnected ? 'Connected' : 'Disconnected',
    source: isGoogleConnected ? 'Google Business API' : 'Business Profile Configuration',
    timestamp,
    status: isDemo ? 'DEMO' : isGoogleConnected ? 'VERIFIED' : 'USER_ENTERED',
    notes: isGoogleConnected
      ? 'Google Business Profile account is linked'
      : 'No verified Google Business Profile linked yet',
  });

  // 2. Google / Customer Reviews
  const reviews = inputs.reviews || [];
  if (reviews.length > 0) {
    const totalReviews = reviews.length;
    const avgRating = Number(
      (reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / totalReviews).toFixed(1)
    );
    const unrepliedCount = reviews.filter((r) => !r.replied).length;
    const positiveCount = reviews.filter((r) => r.rating >= 4).length;
    const positiveSentimentPct = Math.round((positiveCount / totalReviews) * 100);

    const reviewStatus: EvidenceStatus = isDemo
      ? 'DEMO'
      : isGoogleConnected
      ? 'VERIFIED'
      : 'USER_ENTERED';

    evidence.push({
      metric: 'Google reviews count',
      value: totalReviews,
      source: isGoogleConnected ? 'Google Places Provider' : 'Reputation Database',
      timestamp,
      status: reviewStatus,
    });

    evidence.push({
      metric: 'Average customer rating',
      value: avgRating,
      source: isGoogleConnected ? 'Google Places Provider' : 'Reputation Database',
      timestamp,
      status: reviewStatus,
    });

    evidence.push({
      metric: 'Unanswered reviews awaiting reply',
      value: unrepliedCount,
      source: 'Reputation Management Queue',
      timestamp,
      status: reviewStatus,
    });

    evidence.push({
      metric: 'Positive sentiment ratio',
      value: `${positiveSentimentPct}%`,
      source: 'Reputation Sentiment Analyzer',
      timestamp,
      status: 'CALCULATED',
    });
  } else {
    evidence.push({
      metric: 'Google reviews count',
      value: null,
      source: 'Google Places Provider',
      timestamp,
      status: 'UNAVAILABLE',
      notes: 'No customer reviews synced or logged yet',
    });
    evidence.push({
      metric: 'Average customer rating',
      value: null,
      source: 'Google Places Provider',
      timestamp,
      status: 'UNAVAILABLE',
      notes: 'No rating data available',
    });
  }

  // 3. CRM Leads & Conversion
  if (inputs.leads !== null && inputs.leads !== undefined) {
    const leads = inputs.leads;
    const totalLeads = leads.length;
    const newLeads = leads.filter((l) => l.stage === 'new').length;
    const wonLeads = leads.filter((l) => l.stage === 'won').length;

    const leadStatus: EvidenceStatus = isDemo ? 'DEMO' : 'VERIFIED';

    evidence.push({
      metric: 'Total CRM leads',
      value: totalLeads,
      source: 'MySQL CRM Leads Database',
      timestamp,
      status: leadStatus,
    });

    evidence.push({
      metric: 'New uncontacted inquiries',
      value: newLeads,
      source: 'MySQL CRM Leads Database',
      timestamp,
      status: leadStatus,
    });

    evidence.push({
      metric: 'Closed / Won clients',
      value: wonLeads,
      source: 'MySQL CRM Leads Database',
      timestamp,
      status: leadStatus,
    });
  } else {
    evidence.push({
      metric: 'Total CRM leads',
      value: null,
      source: 'MySQL CRM Leads Database',
      timestamp,
      status: 'UNAVAILABLE',
      notes: 'CRM lead capture pipeline inactive or not initialized',
    });
  }

  // 4. Local SEO Rank & Geo-Observations
  const rankObs = inputs.rankObservations || [];
  const validRankPositions = rankObs
    .map((o) => (typeof o.position === 'number' ? o.position : typeof o.rankPosition === 'number' ? o.rankPosition : null))
    .filter((p): p is number => p !== null && p > 0);

  if (validRankPositions.length > 0) {
    const topRank = Math.min(...validRankPositions);
    evidence.push({
      metric: 'Local Map Pack rank',
      value: `#${topRank}`,
      source: 'Local SEO Geo-Radar Observations (MySQL)',
      timestamp,
      status: isDemo ? 'DEMO' : 'VERIFIED',
    });
    evidence.push({
      metric: 'Geo-grid observation points',
      value: validRankPositions.length,
      source: 'Local SEO Geo-Radar Provider',
      timestamp,
      status: isDemo ? 'DEMO' : 'VERIFIED',
    });
  } else {
    evidence.push({
      metric: 'Local Map Pack rank',
      value: null,
      source: 'Local SEO Geo-Radar Provider',
      timestamp,
      status: 'UNAVAILABLE',
      notes: 'No verified search grid observations recorded yet',
    });
  }

  // 5. Content Publishing Velocity
  if (inputs.posts !== null && inputs.posts !== undefined) {
    const posts = inputs.posts;
    const publishedPosts = posts.filter((p) => p.status === 'published');
    const scheduledPosts = posts.filter((p) => p.status === 'scheduled');

    evidence.push({
      metric: 'Published social & Google posts',
      value: publishedPosts.length,
      source: 'Content Studio Database',
      timestamp,
      status: isDemo ? 'DEMO' : 'VERIFIED',
    });

    if (scheduledPosts.length > 0) {
      evidence.push({
        metric: 'Scheduled posts awaiting dispatch',
        value: scheduledPosts.length,
        source: 'Content Studio Scheduler',
        timestamp,
        status: isDemo ? 'DEMO' : 'VERIFIED',
      });
    }
  } else {
    evidence.push({
      metric: 'Published social & Google posts',
      value: null,
      source: 'Content Studio Database',
      timestamp,
      status: 'UNAVAILABLE',
      notes: 'No content posts initialized or recorded',
    });
  }

  // 6. Growth Intelligence Score
  const growthScore = inputs.growthScore;
  if (growthScore && growthScore.overall !== null && growthScore.status !== 'UNAVAILABLE') {
    evidence.push({
      metric: 'Composite Growth Intelligence Score',
      value: `${growthScore.overall}/100`,
      source: 'Centralized Growth Intelligence Engine',
      timestamp,
      status: isDemo ? 'DEMO' : (growthScore.status as EvidenceStatus) || 'CALCULATED',
    });
  } else {
    evidence.push({
      metric: 'Composite Growth Intelligence Score',
      value: null,
      source: 'Centralized Growth Intelligence Engine',
      timestamp,
      status: 'UNAVAILABLE',
      notes: 'Insufficient verified marketing signals to compute score',
    });
  }

  // 7. Website & Custom Domain
  if (inputs.customDomainVerified) {
    evidence.push({
      metric: 'Custom domain DNS verification',
      value: 'Verified',
      source: 'Node.js DNS Verification Resolver',
      timestamp,
      status: isDemo ? 'DEMO' : 'VERIFIED',
    });
  } else if (profile?.website) {
    evidence.push({
      metric: 'Business website URL',
      value: profile.website,
      source: 'Business Profile Configuration',
      timestamp,
      status: isDemo ? 'DEMO' : 'USER_ENTERED',
    });
  } else {
    evidence.push({
      metric: 'Custom domain DNS verification',
      value: null,
      source: 'Node.js DNS Verification Resolver',
      timestamp,
      status: 'UNAVAILABLE',
      notes: 'No custom domain configured or verified',
    });
  }

  return evidence;
}

/**
 * Builds the strict LLM prompt containing only the verified structured evidence table.
 */
export function buildEvidenceGroundedPrompt(
  businessName: string,
  city: string,
  category: string,
  evidence: StructuredEvidenceItem[]
): string {
  const evidenceJson = JSON.stringify(evidence, null, 2);

  return `You are an AI Executive Summary generator for local business operating dashboards.
You are strictly evidence-grounded and anti-hallucination.

BUSINESS CONTEXT:
- Name: "${businessName || 'Business'}"
- City: "${city || 'Local Area'}"
- Category: "${category || 'Local Services'}"

STRUCTURED EVIDENCE OBJECTS:
${evidenceJson}

STRICT PROHIBITION RULES & GUARDRAILS:
1. Ground your entire summary EXCLUSIVELY in the supplied evidence objects above.
2. Summarize ONLY metrics present in the evidence.
3. You must NOT invent, guess, estimate, or hallucinate:
   - rankings (do NOT claim #1, #2, top 3 unless explicitly in evidence with status VERIFIED/CALCULATED)
   - review growth (do NOT claim "+23 reviews this month" or any growth rate unless verified in evidence)
   - phone calls, website clicks, impressions, or conversions not in evidence
   - percentage changes or performance trends not in evidence
   - competitor changes or rival statistics
   - leads, revenue, or ROI
4. If a metric has value null or status "UNAVAILABLE":
   - Explicitly state that the data is unavailable or not yet observed.
   - Do NOT guess a number.
5. If the evidence contains DEMO or SEEDED status:
   - Clearly state that these represent demo figures and not verified live production numbers.
6. Provide output in JSON format with keys:
   - "headline": Concise 1-sentence executive headline (under 20 words).
   - "summary": 2-3 sentence high-level overview strictly citing the verified numbers or noting unavailable areas.
   - "keyTakeaways": Array of 2-4 factual bullet points referencing the supplied evidence only.`;
}

/**
 * Deterministic fallback generator for when LLM is offline or in cooldown.
 * Produces 100% evidence-grounded text with zero hallucinated figures.
 */
export function generateDeterministicSummary(
  businessName: string,
  city: string,
  evidence: StructuredEvidenceItem[]
): ExecutiveSummaryResult {
  const bName = businessName || 'Business';
  const loc = city ? ` in ${city}` : '';

  const reviewsEv = evidence.find((e) => e.metric === 'Google reviews count');
  const ratingEv = evidence.find((e) => e.metric === 'Average customer rating');
  const unrepliedEv = evidence.find((e) => e.metric === 'Unanswered reviews awaiting reply');
  const leadsEv = evidence.find((e) => e.metric === 'Total CRM leads');
  const rankEv = evidence.find((e) => e.metric === 'Local Map Pack rank');
  const scoreEv = evidence.find((e) => e.metric === 'Composite Growth Intelligence Score');
  const domainEv = evidence.find((e) => e.metric === 'Custom domain DNS verification');

  const hasDemo = evidence.some((e) => e.status === 'DEMO' || e.status === 'SEEDED');
  const allUnavailable = evidence.every(
    (e) => e.status === 'UNAVAILABLE' || e.value === null || e.value === 'Disconnected'
  );

  const takeaways: string[] = [];

  // Determine overall status
  let overallStatus: EvidenceStatus = 'VERIFIED';
  if (hasDemo) {
    overallStatus = 'DEMO';
  } else if (allUnavailable) {
    overallStatus = 'UNAVAILABLE';
  } else if (evidence.some((e) => e.status === 'CALCULATED')) {
    overallStatus = 'CALCULATED';
  }

  if (allUnavailable) {
    return {
      headline: `${bName} marketing telemetry is currently uninitialized.`,
      summary: `No verified marketing telemetry or Google profile observations are currently available for ${bName}${loc}. Connect Google Business Profile, configure keyword tracking, or log customer reviews to activate live analytics.`,
      keyTakeaways: [
        'Google Business Profile: Disconnected (No verified data)',
        'Local SEO Map Pack Rank: Data unavailable (Zero search observations)',
        'CRM Leads & Reviews: Awaiting initial records',
      ],
      evidence,
      overallStatus: 'UNAVAILABLE',
      timestamp: new Date().toISOString(),
    };
  }

  // Build headline
  let headline = '';
  const totalLeads = typeof leadsEv?.value === 'number' ? leadsEv.value : 0;
  const unrepliedCount = typeof unrepliedEv?.value === 'number' ? unrepliedEv.value : 0;

  if (totalLeads > 0 && unrepliedCount > 0) {
    headline = `${bName} has ${totalLeads} active leads and ${unrepliedCount} reviews awaiting response${loc}.`;
  } else if (totalLeads > 0) {
    headline = `${bName} pipeline active with ${totalLeads} CRM leads${loc}.`;
  } else if (reviewsEv && reviewsEv.value !== null) {
    headline = `${bName} reputation health active with ${reviewsEv.value} verified reviews${loc}.`;
  } else {
    headline = `${bName} executive overview active with recorded marketing signals${loc}.`;
  }

  // Build summary sentences
  const summaryParts: string[] = [];

  if (reviewsEv && reviewsEv.value !== null && ratingEv && ratingEv.value !== null) {
    summaryParts.push(
      `Reputation shows ${reviewsEv.value} verified reviews with an average rating of ${ratingEv.value}/5.`
    );
  } else {
    summaryParts.push('Public review data is currently unavailable.');
  }

  if (unrepliedCount > 0) {
    summaryParts.push(
      `${unrepliedCount} customer review${unrepliedCount > 1 ? 's are' : ' is'} awaiting response in the inbox.`
    );
  } else if (reviewsEv && reviewsEv.value !== null) {
    summaryParts.push('All recorded reviews are currently answered.');
  }

  if (rankEv && rankEv.value !== null) {
    summaryParts.push(`Local search radar observes top positioning at ${rankEv.value}.`);
  } else {
    summaryParts.push('Local Map Pack rank telemetry is currently unavailable.');
  }

  if (scoreEv && scoreEv.value !== null) {
    summaryParts.push(`Composite Growth Score is calculated at ${scoreEv.value}.`);
  }

  // Build takeaways
  if (leadsEv && leadsEv.value !== null) {
    takeaways.push(`CRM Pipeline: ${leadsEv.value} total leads [Source: ${leadsEv.source}, Status: ${leadsEv.status}]`);
  }
  if (reviewsEv && reviewsEv.value !== null) {
    takeaways.push(
      `Reputation: ${reviewsEv.value} reviews, ${ratingEv?.value ?? 'N/A'} avg rating [Status: ${reviewsEv.status}]`
    );
  } else {
    takeaways.push('Reputation: Data unavailable [Status: UNAVAILABLE]');
  }

  if (rankEv && rankEv.value !== null) {
    takeaways.push(`Local SEO: Observed rank ${rankEv.value} [Status: ${rankEv.status}]`);
  } else {
    takeaways.push('Local SEO: Map Pack rank data unavailable [Status: UNAVAILABLE]');
  }

  if (domainEv && domainEv.value === 'Verified') {
    takeaways.push('Digital Presence: Custom domain DNS verified [Status: VERIFIED]');
  }

  return {
    headline,
    summary: summaryParts.join(' '),
    keyTakeaways: takeaways,
    evidence,
    overallStatus,
    timestamp: new Date().toISOString(),
  };
}
