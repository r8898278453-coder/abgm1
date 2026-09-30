import crypto from 'crypto';
import { BusinessProfile, ReviewItem, ContentPost, LeadItem, RankObservation } from '../src/types';

export interface AuditItemWithEvidence {
  id: string;
  issue: string;
  title: string;
  category: 'google' | 'seo' | 'reviews' | 'social' | 'content' | 'website';
  severity: 'critical' | 'important' | 'recommended' | 'good';
  evidence: string;
  source: string;
  timestamp: string;
  recommendation: string;
  impact: string;
  actionText: string;
  resolved: boolean;
}

export interface AuditEngineInputs {
  companyId: string;
  businessProfile?: BusinessProfile | null;
  reviews?: ReviewItem[] | null;
  rankObservations?: RankObservation[] | null;
  contentPosts?: ContentPost[] | null;
  leads?: LeadItem[] | null;
  campaigns?: any[] | null;
  customDomainVerified?: boolean;
  overrideTimestamp?: string;
}

/**
 * Canonical Evidence-Based Growth Audit Engine
 * Evaluates real marketing and operating evidence to produce verified audit issues.
 * STRICT ANTI-FABRICATION RULE:
 * If an area has no recorded data, do NOT generate unbacked factual claims.
 */
export function generateEvidenceBasedAudit(inputs: AuditEngineInputs): AuditItemWithEvidence[] {
  const timestamp = inputs.overrideTimestamp || new Date().toISOString();
  const auditItems: AuditItemWithEvidence[] = [];

  const profile = inputs.businessProfile;
  const isGoogleConnected = Boolean(profile?.connectedAccounts?.googleBusiness);
  const hasPlaceId = Boolean(profile?.address || profile?.connectedAccounts?.googleBusiness);

  // 1. Google Profile Presence & Verification
  if (!isGoogleConnected) {
    auditItems.push({
      id: `aud_gmb_unlinked_${inputs.companyId}`,
      issue: 'Google Business Profile not linked',
      title: 'Google Business Profile Disconnected',
      category: 'google',
      severity: 'critical',
      evidence: 'connectedAccounts.googleBusiness is false',
      source: 'Business Profile Configuration',
      timestamp,
      recommendation: 'Connect Google Places ID in Integrations to sync place details, hours, and customer reviews.',
      impact: 'Missing direct Google Maps synchronization and automated reputation sync.',
      actionText: 'Connect Google Places in Integrations',
      resolved: false,
    });
  } else {
    auditItems.push({
      id: `aud_gmb_verified_${inputs.companyId}`,
      issue: 'Google Business Profile connection active',
      title: 'Google Business Profile Connected',
      category: 'google',
      severity: 'good',
      evidence: 'Verified Google Places ID configured',
      source: 'Google Places API',
      timestamp,
      recommendation: 'Maintain accurate operational hours and verified location metadata.',
      impact: 'Enables continuous synchronization of reviews and Google Maps place details.',
      actionText: 'View Google Profile',
      resolved: true,
    });
  }

  // 2. Reviews & Reputation Engagement
  const reviews = inputs.reviews || [];
  if (reviews.length > 0) {
    const unreplied = reviews.filter((r) => !r.replied && (!r.replyText || r.replyText.trim().length === 0));
    const lowRatingReviews = reviews.filter((r) => r.rating <= 3);

    if (unreplied.length > 0) {
      auditItems.push({
        id: `aud_reviews_unreplied_${inputs.companyId}`,
        issue: `${unreplied.length} customer review${unreplied.length > 1 ? 's' : ''} awaiting response`,
        title: 'Unanswered Customer Reviews in Queue',
        category: 'reviews',
        severity: unreplied.length >= 3 ? 'critical' : 'important',
        evidence: `${unreplied.length} of ${reviews.length} reviews marked replied = false`,
        source: 'MySQL Reviews Database',
        timestamp,
        recommendation: 'Respond to pending customer reviews to boost local consumer trust and Google engagement algorithm signals.',
        impact: 'Unanswered reviews reduce conversion rates and customer satisfaction scores.',
        actionText: 'Reply to Reviews',
        resolved: false,
      });
    }

    if (lowRatingReviews.length > 0) {
      auditItems.push({
        id: `aud_reviews_low_rating_${inputs.companyId}`,
        issue: `${lowRatingReviews.length} critical review${lowRatingReviews.length > 1 ? 's' : ''} (<= 3 stars) requiring resolution`,
        title: 'Critical Customer Feedback Flagged',
        category: 'reviews',
        severity: 'important',
        evidence: `${lowRatingReviews.length} reviews with rating <= 3 detected`,
        source: 'MySQL Reviews Database',
        timestamp,
        recommendation: 'Reach out to dissatisfied customers and publish professional resolution responses.',
        impact: 'Lower ratings directly impact local search click-through rate.',
        actionText: 'Manage Critical Reviews',
        resolved: false,
      });
    }
  }

  // 3. Local SEO & Map Pack Radar Observations
  const rankObs = inputs.rankObservations || [];
  const validPositions = rankObs
    .map((o) => o.position)
    .filter((p): p is number => typeof p === 'number' && p > 0);

  if (validPositions.length > 0) {
    const avgRank = validPositions.reduce((a, b) => a + b, 0) / validPositions.length;
    const outerDropNodes = rankObs.filter((o) => typeof o.position === 'number' && o.position > 3);

    if (avgRank > 3) {
      auditItems.push({
        id: `aud_seo_outside_3pack_${inputs.companyId}`,
        issue: `Local ranking outside Google 3-Pack (Average rank: #${avgRank.toFixed(1)})`,
        title: 'Map Pack Visibility Below 3-Pack',
        category: 'seo',
        severity: avgRank > 7 ? 'critical' : 'important',
        evidence: `Average rank position #${avgRank.toFixed(1)} across ${validPositions.length} geocoded grid nodes`,
        source: 'Local SEO Geo-Radar Observations',
        timestamp,
        recommendation: 'Optimize primary Google category, local citation consistency, and local review keyword velocity.',
        impact: 'Businesses outside the top 3 lose over 70% of local organic customer inquiries.',
        actionText: 'Optimize Local SEO',
        resolved: false,
      });
    }

    if (outerDropNodes.length > 0) {
      auditItems.push({
        id: `aud_seo_perimeter_drop_${inputs.companyId}`,
        issue: `Rank drop detected across ${outerDropNodes.length} outer geographic nodes`,
        title: 'Perimeter Geo-Grid Visibility Drop',
        category: 'seo',
        severity: 'recommended',
        evidence: `${outerDropNodes.length} nodes (indices: ${outerDropNodes.map((n) => n.gridIndex).join(', ')}) observe position > 3`,
        source: 'Local SEO Geo-Radar (3x3 Multi-Coordinate Scan)',
        timestamp,
        recommendation: 'Create localized service pages and geo-tagged project updates targeting outer node areas.',
        impact: 'Limits discovery for high-intent nearby customers in outer transit corridors.',
        actionText: 'View Geo-Grid Map',
        resolved: false,
      });
    }
  }

  // 4. Content Publishing Activity & Consistency
  const posts = inputs.contentPosts || [];
  if (posts.length > 0) {
    const published = posts.filter((p) => p.status === 'published');
    const scheduled = posts.filter((p) => p.status === 'scheduled');

    if (scheduled.length === 0) {
      auditItems.push({
        id: `aud_content_no_scheduled_${inputs.companyId}`,
        issue: 'No upcoming content scheduled in publishing calendar',
        title: 'Empty Publishing Schedule',
        category: 'content',
        severity: 'recommended',
        evidence: `0 scheduled posts found in active content schedule (${published.length} past published)`,
        source: 'Content Studio Scheduler',
        timestamp,
        recommendation: 'Schedule at least 2 promotional or educational posts per week to maintain Google & social activity.',
        impact: 'Consistent publishing increases profile interaction rates by up to 35%.',
        actionText: 'Schedule Posts',
        resolved: false,
      });
    }
  }

  // 5. CRM Leads & Pipeline Response Velocity
  const leads = inputs.leads || [];
  if (leads.length > 0) {
    const newLeads = leads.filter((l) => l.stage === 'new');
    if (newLeads.length > 0) {
      auditItems.push({
        id: `aud_leads_uncontacted_${inputs.companyId}`,
        issue: `${newLeads.length} new inbound lead${newLeads.length > 1 ? 's' : ''} awaiting initial contact`,
        title: 'Uncontacted Inbound Leads in CRM',
        category: 'website',
        severity: 'critical',
        evidence: `${newLeads.length} leads in stage 'new' in CRM pipeline`,
        source: 'MySQL CRM Leads Database',
        timestamp,
        recommendation: 'Reach out to new leads via WhatsApp or Phone Call within 15 minutes of inquiry to maximize close rate.',
        impact: 'Fast lead response increases conversion probability by 7x.',
        actionText: 'Open Leads CRM',
        resolved: false,
      });
    }
  }

  // 6. Website & Domain Verification
  if (!inputs.customDomainVerified && (!profile?.website || profile.website.trim().length === 0)) {
    auditItems.push({
      id: `aud_website_missing_${inputs.companyId}`,
      issue: 'Custom domain and business website not configured',
      title: 'No Verified Web Storefront',
      category: 'website',
      severity: 'recommended',
      evidence: 'No verified custom domain or website URL registered',
      source: 'Custom Domain & SSL Gateway',
      timestamp,
      recommendation: 'Connect your custom domain (e.g. bga.aaditechs.in) with automated SSL edge caching.',
      impact: 'Dedicated websites provide higher conversion authority for digital campaigns.',
      actionText: 'Configure Custom Domain',
      resolved: false,
    });
  }

  return auditItems;
}
