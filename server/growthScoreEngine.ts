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
  businessProfile?: BusinessProfile | null;
  reviews?: ReviewItem[] | null;
  rankObservations?: RankObservation[] | null;
  keywordRanks?: KeywordRank[] | null;
  contentPosts?: ContentPost[] | null;
  leads?: LeadItem[] | null;
  campaigns?: Campaign[] | null;
  auditItems?: AuditItem[] | null;
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
  const hasPlaceId = Boolean(profile?.connectedAccounts?.googleBusiness || profile?.address);
  const isGoogleConnected = Boolean(profile?.connectedAccounts?.googleBusiness);
  const hasAddress = Boolean(profile?.address && profile.address.trim().length > 3);
  const hasPhone = Boolean(profile?.phone && profile.phone.trim().length > 5);
  const hasHours = Boolean(profile?.openingHours && profile.openingHours.trim().length > 3);
  const hasDescription = Boolean(profile?.description && profile.description.trim().length > 10);

  const googleProfileInputs = {
    hasPlaceId,
    isGoogleConnected,
    hasAddress,
    hasPhone,
    hasHours,
    hasDescription,
  };

  let googleProfileScore: number | null = null;
  let googleProfileStatus: PillarScoreTelemetry['status'] = 'UNAVAILABLE';
  const googleProfileFormula =
    '(hasPlaceId ? 35 : 0) + (isGoogleConnected ? 25 : 0) + (hasAddress ? 10 : 0) + (hasPhone ? 10 : 0) + (hasHours ? 10 : 0) + (hasDescription ? 10 : 0)';

  if (profile && (hasPlaceId || isGoogleConnected || hasAddress || hasPhone)) {
    let score = 0;
    if (hasPlaceId) score += 35;
    if (isGoogleConnected) score += 25;
    if (hasAddress) score += 10;
    if (hasPhone) score += 10;
    if (hasHours) score += 10;
    if (hasDescription) score += 10;

    googleProfileScore = Math.min(100, Math.max(0, score));
    googleProfileStatus = isGoogleConnected ? 'VERIFIED' : 'USER_ENTERED';
  }

  telemetry.push({
    pillarKey: 'googleProfile',
    metricName: 'Google Business Profile Health',
    score: googleProfileScore,
    status: googleProfileStatus,
    inputValues: googleProfileInputs,
    formula: googleProfileFormula,
    timestamp: nowIso,
    notes:
      googleProfileScore === null
        ? 'No Google Business Profile connected or location data provided'
        : undefined,
  });

  // 2. Local SEO & Map Pack
  const rankObs = inputs.rankObservations || [];
  const keywordRanks = inputs.keywordRanks || [];
  const primaryRank = typeof inputs.rankPosition === 'number' ? inputs.rankPosition : null;

  const validObsPositions = rankObs
    .map((o) => o.position)
    .filter((p): p is number => typeof p === 'number' && p > 0);

  const validKwPositions = keywordRanks
    .map((k) => k.rank)
    .filter((p): p is number => typeof p === 'number' && p > 0);

  let localSeoScore: number | null = null;
  let localSeoStatus: PillarScoreTelemetry['status'] = 'UNAVAILABLE';
  const localSeoFormula =
    'avgRank <= 1.5 ? 100 : avgRank <= 3.0 ? 90 + (3.0 - avgRank)*6.67 : avgRank <= 10.0 ? 60 + (10.0 - avgRank)*4.28 : max(10, 20 + (20.0 - avgRank)*4.0)';

  let avgRank: number | null = null;
  if (validObsPositions.length > 0) {
    avgRank =
      validObsPositions.reduce((sum, val) => sum + val, 0) / validObsPositions.length;
    localSeoStatus = 'LIVE';
  } else if (validKwPositions.length > 0) {
    avgRank =
      validKwPositions.reduce((sum, val) => sum + val, 0) / validKwPositions.length;
    localSeoStatus = 'VERIFIED';
  } else if (primaryRank !== null && primaryRank > 0) {
    avgRank = primaryRank;
    localSeoStatus = 'VERIFIED';
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
    timestamp: nowIso,
    notes:
      localSeoScore === null
        ? 'No 3x3 rank observations or keyword positions recorded in database'
        : undefined,
  });

  // 3. Reviews & Reputation
  const reviews = inputs.reviews || [];
  const totalReviews = reviews.length;
  const ratingSum = reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
  const avgRating = totalReviews > 0 ? ratingSum / totalReviews : null;

  let reviewsScore: number | null = null;
  let reviewsStatus: PillarScoreTelemetry['status'] = 'UNAVAILABLE';
  const reviewsFormula =
    'round(((min(5, max(1, avgRating)) / 5.0) * 60) + ((min(50, totalReviews) / 50.0) * 40))';

  if (totalReviews > 0 && avgRating !== null) {
    const ratingComponent = (Math.min(5, Math.max(1, avgRating)) / 5.0) * 60;
    const volumeComponent = (Math.min(50, totalReviews) / 50.0) * 40;
    reviewsScore = Math.min(100, Math.max(0, Math.round(ratingComponent + volumeComponent)));
    reviewsStatus = 'VERIFIED';
  }

  telemetry.push({
    pillarKey: 'reviews',
    metricName: 'Reviews & Reputation',
    score: reviewsScore,
    status: reviewsStatus,
    inputValues: {
      totalReviews,
      averageRating: avgRating !== null ? Number(avgRating.toFixed(2)) : null,
      fiveStarCount: reviews.filter((r) => r.rating >= 5).length,
    },
    formula: reviewsFormula,
    timestamp: nowIso,
    notes:
      reviewsScore === null ? 'No customer reviews recorded in database' : undefined,
  });

  // 4. Customer Engagement & Review Response Rate
  const repliedReviews = reviews.filter((r) => r.replied || (r.replyText && r.replyText.trim().length > 0));
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
    metricName: 'Review Response & Customer Engagement',
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
    timestamp: nowIso,
    notes:
      customerEngagementScore === null
        ? 'No reviews logged to assess engagement'
        : undefined,
  });

  // 5. Website Presence & Experience
  const hasWebsiteUrl = Boolean(profile?.website && profile.website.trim().length > 4);
  const isWebsiteConnected = Boolean(profile?.connectedAccounts?.website);
  const isDomainVerified = Boolean(inputs.customDomainVerified);
  const unresolvedAuditIssues = (inputs.auditItems || []).filter(
    (a) => a.category === 'website' && !a.resolved
  ).length;

  let websiteScore: number | null = null;
  let websiteStatus: PillarScoreTelemetry['status'] = 'UNAVAILABLE';
  const websiteFormula =
    'clamp(0, 100, 50 + (isDomainVerified ? 30 : 0) + max(0, 20 - (unresolvedAuditIssues * 5)))';

  if (hasWebsiteUrl || isWebsiteConnected) {
    let score = 50;
    if (isDomainVerified) score += 30;
    score += Math.max(0, 20 - unresolvedAuditIssues * 5);
    websiteScore = Math.min(100, Math.max(0, score));
    websiteStatus = 'VERIFIED';
  }

  telemetry.push({
    pillarKey: 'website',
    metricName: 'Website Experience & Performance',
    score: websiteScore,
    status: websiteStatus,
    inputValues: {
      hasWebsiteUrl,
      isWebsiteConnected,
      isDomainVerified,
      unresolvedAuditIssues,
    },
    formula: websiteFormula,
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
    insufficientDataReason = `Computed from ${availableCount} of ${totalCorePillars} pillars. Minimum 3 verified pillars required for full composite score.`;
  } else {
    overall = Math.round(
      availableScores.reduce((sum, s) => sum + s, 0) / availableCount
    );
    overallStatus = 'CALCULATED';
    statusLabel = 'CALCULATED (EVIDENCE-BASED)';
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
    overall: result.overall ?? 0,
    status: result.status,
    statusLabel: result.statusLabel,
    insufficientDataReason: result.insufficientDataReason,
    breakdown: {
      googleProfile: result.breakdown.googleProfile ?? 0,
      localSeo: result.breakdown.localSeo ?? 0,
      reviews: result.breakdown.reviews ?? 0,
      socialMedia: result.breakdown.socialMedia ?? 0,
      content: result.breakdown.content ?? 0,
      website: result.breakdown.website ?? 0,
      customerEngagement: result.breakdown.customerEngagement ?? 0,
    },
    telemetry: result.telemetry,
    timestamp: result.timestamp,
  };
}
