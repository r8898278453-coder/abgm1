import {currentRank,rankPosition,providerRating,googleProfileCompleteness} from '../shared/localMarketingEvidence';
import {
  BusinessProfile,
  GrowthScore,
  ReviewItem,
  RankObservation,
  KeywordRank,
  ContentPost,
  LeadItem,
  Campaign,
  AuditItem,
} from '../src/types';

export interface PillarScoreTelemetry {
  pillarKey: string;
  metricName: string;
  score: number | null;
  status: 'LIVE' | 'VERIFIED' | 'CALCULATED' | 'INCOMPLETE_DATA' | 'UNAVAILABLE' | 'USER_ENTERED';
  inputValues: Record<string, any>;
  formula: string;
  source: string;
  timestamp: string;
  notes?: string;
}

export interface GrowthScoreCalculationResult {
  overall: number | null;
  status: 'LIVE' | 'VERIFIED' | 'CALCULATED' | 'INCOMPLETE_DATA' | 'UNAVAILABLE';
  statusLabel: string;
  insufficientDataReason: string | null;
  availablePillarsCount: number;
  totalPillarsCount: number;
  timestamp: string;
  breakdown: {
    googleProfile: number | null;
    localSeo: number | null;
    reviews: number | null;
    socialMedia: number | null;
    content: number | null;
    website: number | null;
    customerEngagement: number | null;
    leadConversion?: number | null;
    campaignPerformance?: number | null;
  };
  telemetry: PillarScoreTelemetry[];
}

export interface GrowthScoreInputs {
  businessProfile?: BusinessProfile | any | null;
  reviews?: (ReviewItem | any)[] | null;
  rankObservations?: (RankObservation | any)[] | null;
  keywordRanks?: (KeywordRank | any)[] | null;
  contentPosts?: (ContentPost | any)[] | null;
  leads?: (LeadItem | any)[] | null;
  campaigns?: (Campaign | any)[] | null;
  auditItems?: (AuditItem | any)[] | null;
  customDomainVerified?: boolean;
  rankPosition?: number | null;
  overrideTimestamp?: string;
}

/**
 * Centralized Growth Intelligence Score Engine
 * Pure deterministic calculation based strictly on verified and calculated signals.
 * Never invents missing inputs.
 */
export function calculateGrowthIntelligenceScore(
  inputs: GrowthScoreInputs
): GrowthScoreCalculationResult {
  const nowIso = inputs.overrideTimestamp || new Date().toISOString();
  const telemetry: PillarScoreTelemetry[] = [];

  // 1. Google Business Profile Health
  const profile = inputs.businessProfile;
  const completeness=googleProfileCompleteness(profile);
  const isGoogleConnected=false; // Saved connection flags cannot establish provider authority.
  const googleProfileScore=completeness.score;
  telemetry.push({pillarKey:'googleProfile',metricName:'Saved Business Profile Completeness',score:googleProfileScore,status:googleProfileScore===null?'UNAVAILABLE':'CALCULATED',inputValues:completeness.fields,formula:completeness.formula,source:completeness.source,timestamp:nowIso,notes:'Calculated saved-field coverage only. No Google account/location verification or measured health is inferred.'});

  // 2. Local SEO & Map Pack
  const rankObs = inputs.rankObservations || [];
  const keywordRanks = inputs.keywordRanks || [];
  const primaryRank = null; // Unscoped legacy rank_position has no provider/time provenance.
  const evidenceNow=Date.parse(nowIso);
  const validObsPositions = rankObs.filter(o=>currentRank(o,evidenceNow)).map(o=>rankPosition(o.position)).filter((p):p is number=>p!==null);
  const validKwPositions:number[]=[]; // Editable keyword snapshots are not canonical provider evidence.

  let localSeoScore: number | null = null;
  let localSeoStatus: PillarScoreTelemetry['status'] = 'UNAVAILABLE';
  const localSeoFormula =
    'avgRank <= 1.5 ? 100 : avgRank <= 3.0 ? 90 + (3.0 - avgRank)*6.67 : avgRank <= 10.0 ? 60 + (10.0 - avgRank)*4.28 : max(10, 20 + (20.0 - avgRank)*4.0)';

  let avgRank: number | null = null;
  if (validObsPositions.length > 0) {
    avgRank =
      validObsPositions.reduce((sum, val) => sum + val, 0) / validObsPositions.length;
    localSeoStatus = 'CALCULATED';
  } else if (validKwPositions.length > 0) {
    avgRank =
      validKwPositions.reduce((sum, val) => sum + val, 0) / validKwPositions.length;
    localSeoStatus = 'CALCULATED';
  }

  if (avgRank !== null) {
    if (avgRank <= 1.5) {
      localSeoScore = 100;
    } else if (avgRank <= 3.0) {
      localSeoScore = Math.round(90 + (3.0 - avgRank) * 6.67);
    } else if (avgRank <= 10.0) {
      localSeoScore = Math.round(60 + (10.0 - avgRank) * 4.28);
    } else if (avgRank <= 20.0) {
      localSeoScore = Math.round(Math.max(10, 20 + (20.0 - avgRank) * 4.0));
    } else {
      localSeoScore = 10;
    }
  }

  telemetry.push({
    pillarKey: 'localSeo',
    metricName: 'Local SEO & Map Pack Visibility',
    score: localSeoScore,
    status: localSeoStatus,
    inputValues: {
      primaryRank,
      gridObservationCount: validObsPositions.length,
      keywordCount: validKwPositions.length,
      calculatedAverageRank: avgRank !== null ? Number(avgRank.toFixed(2)) : null,
    },
    formula: localSeoFormula,
    source: validObsPositions.length > 0 ? 'Local SEO Geo-Radar (3x3 Scan)' : 'Keyword Rank Tracker',
    timestamp: nowIso,
    notes:
      localSeoScore === null
        ? 'No 3x3 rank observations or keyword positions recorded in database'
        : undefined,
  });

  // 3. Reviews & Reputation
  const reviews = inputs.reviews || [];
  const totalReviews = reviews.length;
  const ratedReviews=reviews.filter(r=>providerRating(r.rating)!==null);
  const ratingSum=ratedReviews.reduce((sum,r)=>sum+r.rating,0);
  const avgRating=ratedReviews.length?ratingSum/ratedReviews.length:null;

  let reviewsScore: number | null = null;
  let reviewsStatus: PillarScoreTelemetry['status'] = 'UNAVAILABLE';
  const reviewsFormula =
    'round(((min(5, max(1, avgRating)) / 5.0) * 60) + ((min(50, totalReviews) / 50.0) * 40))';

  if (totalReviews > 0 && avgRating !== null) {
    const ratingComponent = (Math.min(5, Math.max(1, avgRating)) / 5.0) * 60;
    const volumeComponent = (Math.min(50, totalReviews) / 50.0) * 40;
    reviewsScore = Math.min(100, Math.max(0, Math.round(ratingComponent + volumeComponent)));
    reviewsStatus = 'CALCULATED';
  }

  telemetry.push({
    pillarKey: 'reviews',
    metricName: 'Reviews & Reputation',
    score: reviewsScore,
    status: reviewsStatus,
    inputValues: {
      totalReviews,
      ratedReviews:ratedReviews.length,
      excludedRatings:totalReviews-ratedReviews.length,
      averageRating: avgRating !== null ? Number(avgRating.toFixed(2)) : null,
      fiveStarCount: reviews.filter((r) => r.rating >= 5).length,
    },
    formula: reviewsFormula,
    source: isGoogleConnected ? 'Google Places API' : 'MySQL Reviews Database',
    timestamp: nowIso,
    notes:
      reviewsScore === null ? 'No customer reviews recorded in database' : undefined,
  });

  // 4. Customer Engagement & Review Response Rate
  const repliedReviews = reviews.filter((r) => r.replyVerified===true || (r.replyStatus==='VERIFIED'&&typeof r.providerReplyId==='string'&&r.providerReplyId.length>0));
  const unrepliedReviews = totalReviews - repliedReviews.length;

  let customerEngagementScore: number | null = null;
  let customerEngagementStatus: PillarScoreTelemetry['status'] = 'UNAVAILABLE';
  const engagementFormula = 'round((repliedReviews / totalReviews) * 100)';

  if (totalReviews > 0) {
    const responseRate = repliedReviews.length / totalReviews;
    customerEngagementScore = Math.min(100, Math.max(0, Math.round(responseRate * 100)));
    customerEngagementStatus = 'CALCULATED';
  }

  telemetry.push({
    pillarKey: 'customerEngagement',
    metricName: 'Provider-verified Review Response Coverage',
    score: customerEngagementScore,
    status: customerEngagementStatus,
    inputValues: {
      totalReviews,
      repliedReviewsCount: repliedReviews.length,
      unrepliedReviewsCount: unrepliedReviews,
      responseRatePercent:
        totalReviews > 0
          ? Math.round((repliedReviews.length / totalReviews) * 100)
          : null,
    },
    formula: engagementFormula,
    source: 'Reputation Management Queue',
    timestamp: nowIso,
    notes:
      customerEngagementScore === null
        ? 'No reviews logged to assess engagement'
        : undefined,
  });

  // 5. Website Presence & Experience
  const hasWebsiteUrl=(()=>{try{const u=new URL(profile?.website);return ['https:','http:'].includes(u.protocol)&&!!u.hostname&&!u.username&&!u.password;}catch{return false;}})();
  const isWebsiteConnected = Boolean(profile?.connectedAccounts?.website);
  const isDomainVerified = Boolean(inputs.customDomainVerified);
  const unresolvedAuditIssues = (inputs.auditItems || []).filter(
    (a) => a.category === 'website' && !a.resolved
  ).length;

  let websiteScore: number | null = null;
  let websiteStatus: PillarScoreTelemetry['status'] = 'UNAVAILABLE';
  const websiteFormula =
    '(hasValidSavedWebsiteUrl ? 50 : 0) + (isDomainVerified ? 50 : 0); no performance or absence-of-audit bonus';

  if (hasWebsiteUrl) {
    let score = 50;
    if (isDomainVerified) score += 50;
    websiteScore = Math.min(100, Math.max(0, score));
    websiteStatus = 'CALCULATED';
  }

  telemetry.push({
    pillarKey: 'website',
    metricName: 'Saved Website Configuration Coverage',
    score: websiteScore,
    status: websiteStatus,
    inputValues: {
      hasWebsiteUrl,
      isWebsiteConnected,
      isDomainVerified,
      unresolvedAuditIssues,
    },
    formula: websiteFormula,
    source: isDomainVerified ? 'DNS Verification Gateway' : 'Business Profile Configuration',
    timestamp: nowIso,
    notes:
      websiteScore === null
        ? 'No business website URL or connection configured'
        : undefined,
  });

  // 6. Content Consistency & Activity
  const posts = inputs.contentPosts || [];
  const totalPosts = posts.length;
  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const scheduledCount = posts.filter((p) => p.status === 'scheduled').length;

  let contentScore: number | null = null;
  let contentStatus: PillarScoreTelemetry['status'] = 'UNAVAILABLE';
  const contentFormula =
    'round(((min(10, publishedCount) / 10.0) * 60) + ((min(5, scheduledCount) / 5.0) * 40))';

  if (totalPosts > 0) {
    const pubScore = (Math.min(10, publishedCount) / 10.0) * 60;
    const schedScore = (Math.min(5, scheduledCount) / 5.0) * 40;
    contentScore = Math.min(100, Math.max(0, Math.round(pubScore + schedScore)));
    contentStatus = 'CALCULATED';
  }

  telemetry.push({
    pillarKey: 'content',
    metricName: 'Content Consistency & Activity',
    score: contentScore,
    status: contentStatus,
    inputValues: {
      totalPosts,
      publishedCount,
      scheduledCount,
      draftCount: posts.filter((p) => p.status === 'draft').length,
    },
    formula: contentFormula,
    source: 'Content Studio Database & Scheduler',
    timestamp: nowIso,
    notes:
      contentScore === null
        ? 'No content posts created or scheduled in content calendar'
        : undefined,
  });

  // 7. Lead Conversion & Pipeline Activity
  const leads = inputs.leads || [];
  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter(
    (l) => l.stage === 'qualified' || l.stage === 'quotation' || l.stage === 'won'
  ).length;
  const wonLeads = leads.filter((l) => l.stage === 'won').length;

  let leadConversionScore: number | null = null;
  let leadConversionStatus: PillarScoreTelemetry['status'] = 'UNAVAILABLE';
  const leadFormula =
    'clamp(0, 100, round(((qualifiedLeads / totalLeads) * 40) + ((wonLeads / max(1, qualifiedLeads)) * 40) + min(20, totalLeads * 2)))';

  if (totalLeads > 0) {
    const qualRatio = qualifiedLeads / totalLeads;
    const winRatio = wonLeads / Math.max(1, qualifiedLeads);
    const volumeBonus = Math.min(20, totalLeads * 2);
    leadConversionScore = Math.min(
      100,
      Math.max(0, Math.round(qualRatio * 40 + winRatio * 40 + volumeBonus))
    );
    leadConversionStatus = 'CALCULATED';
  }

  telemetry.push({
    pillarKey: 'leadConversion',
    metricName: 'Lead Pipeline & Conversion',
    score: leadConversionScore,
    status: leadConversionStatus,
    inputValues: {
      totalLeads,
      qualifiedLeads,
      wonLeads,
      qualificationRatePercent:
        totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : null,
      winRatePercent:
        qualifiedLeads > 0 ? Math.round((wonLeads / qualifiedLeads) * 100) : null,
    },
    formula: leadFormula,
    source: 'CRM Leads Database',
    timestamp: nowIso,
    notes:
      leadConversionScore === null ? 'No leads recorded in CRM pipeline' : undefined,
  });

  // 8. Campaign Performance
  const campaigns = inputs.campaigns || [];
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
  const campaignLeads = campaigns.reduce((sum, c) => sum + (c.leads || 0), 0);

  let campaignScore: number | null = null;
  let campaignStatus: PillarScoreTelemetry['status'] = 'UNAVAILABLE';
  const campaignFormula =
    'clamp(0, 100, (activeCampaigns > 0 ? 40 : 20) + min(60, round((campaignLeads / max(1, totalClicks)) * 600)))';

  if (totalCampaigns > 0) {
    const base = activeCampaigns > 0 ? 40 : 20;
    const efficiency = Math.min(60, Math.round((campaignLeads / Math.max(1, totalClicks)) * 600));
    campaignScore = Math.min(100, Math.max(0, base + efficiency));
    campaignStatus = 'CALCULATED';
  }

  telemetry.push({
    pillarKey: 'campaignPerformance',
    metricName: 'Campaign Marketing Performance',
    score: campaignScore,
    status: campaignStatus,
    inputValues: {
      totalCampaigns,
      activeCampaigns,
      totalClicks,
      campaignLeads,
    },
    formula: campaignFormula,
    source: 'Campaigns Service & Meta Ads Adapter',
    timestamp: nowIso,
    notes:
      campaignScore === null
        ? 'No marketing campaigns configured in workspace'
        : undefined,
  });

  // Composite Calculation across the 7 Core Pillars
  // (googleProfile, localSeo, reviews, customerEngagement, website, content, socialMedia mapped to content)
  const coreScores = [
    googleProfileScore,
    localSeoScore,
    reviewsScore,
    customerEngagementScore,
    websiteScore,
    contentScore,
  ];

  const availableScores = coreScores.filter((s): s is number => s !== null);
  const totalCorePillars = 6;
  const availableCount = availableScores.length;

  let overall: number | null = null;
  let overallStatus: GrowthScoreCalculationResult['status'] = 'UNAVAILABLE';
  let statusLabel = 'GROWTH SCORE UNAVAILABLE';
  let insufficientDataReason: string | null = null;

  if (availableCount === 0) {
    overall = null;
    overallStatus = 'UNAVAILABLE';
    statusLabel = 'UNAVAILABLE';
    insufficientDataReason =
      'No verified or calculated marketing signals available. Connect Google Profile, run local SEO rank scans, or log customer reviews.';
  } else if (availableCount < 3) {
    overall = Math.round(
      availableScores.reduce((sum, s) => sum + s, 0) / availableCount
    );
    overallStatus = 'INCOMPLETE_DATA';
    statusLabel = 'INCOMPLETE DATA';
    insufficientDataReason = `Computed from ${availableCount} of ${totalCorePillars} pillars. Minimum 3 available calculated pillars required; this is not provider verification.`;
  } else {
    overall = Math.round(
      availableScores.reduce((sum, s) => sum + s, 0) / availableCount
    );
    overallStatus = 'CALCULATED';
    statusLabel = 'CALCULATED (AVAILABLE SAVED EVIDENCE)';
    insufficientDataReason = null;
  }

  // Social media mapped to content consistency
  const socialMediaScore = contentScore;

  return {
    overall,
    status: overallStatus,
    statusLabel,
    insufficientDataReason,
    availablePillarsCount: availableCount,
    totalPillarsCount: totalCorePillars,
    timestamp: nowIso,
    breakdown: {
      googleProfile: googleProfileScore,
      localSeo: localSeoScore,
      reviews: reviewsScore,
      socialMedia: socialMediaScore,
      content: contentScore,
      website: websiteScore,
      customerEngagement: customerEngagementScore,
      leadConversion: leadConversionScore,
      campaignPerformance: campaignScore,
    },
    telemetry,
  };
}

/**
 * Format Growth Score into the client GrowthScore object structure while retaining full diagnostic telemetry.
 */
export function toGrowthScorePayload(
  result: GrowthScoreCalculationResult
): GrowthScore {
  return {
    overall: result.overall,
    status: result.status,
    statusLabel: result.statusLabel,
    insufficientDataReason: result.insufficientDataReason,
    breakdown: {
      googleProfile: result.breakdown.googleProfile,
      localSeo: result.breakdown.localSeo,
      reviews: result.breakdown.reviews,
      socialMedia: result.breakdown.socialMedia,
      content: result.breakdown.content,
      website: result.breakdown.website,
      customerEngagement: result.breakdown.customerEngagement,
      leadConversion: result.breakdown.leadConversion,
      campaignPerformance: result.breakdown.campaignPerformance,
    },
    telemetry: result.telemetry,
    timestamp: result.timestamp,
  };
}
