import assert from 'assert';
import {
  calculateGrowthIntelligenceScore,
  toGrowthScorePayload,
  GrowthScoreInputs,
} from '../server/growthScoreEngine';
import {
  buildStructuredEvidence,
  generateDeterministicSummary,
  ExecutiveSummaryInputs,
} from '../server/aiExecutiveSummary';
import {
  calculateRevenueAttribution,
  normalizeSource,
  isProviderVerifiedPayment,
} from '../server/revenueAttribution';
import { generateEvidenceBasedAudit } from '../server/auditEngine';
import {
  createCompany,
  createUser,
  createLead,
  createInvoice,
  saveRankObservations,
  saveGoogleProfileCache,
  syncGoogleReviewsToDatabase,
} from '../server/db';
import { BusinessProfile, ReviewItem, ContentPost, LeadItem, RankObservation } from '../src/types';

async function runPhase5AcceptanceTests() {
  console.log('🧪 Starting Phase 5 — Business Intelligence Closure Acceptance Tests...\n');

  const nowIso = new Date().toISOString();

  // =========================================================================
  // SCENARIO 1: NEW COMPANY WITH NO DATA (ZERO INVENTIONS)
  // =========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST SCENARIO 1: New Company Workspace With Zero Initial Telemetry');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const emptyInputs: GrowthScoreInputs = {
    businessProfile: null,
    reviews: [],
    rankObservations: [],
    keywordRanks: [],
    contentPosts: [],
    leads: [],
    campaigns: [],
    auditItems: [],
    customDomainVerified: false,
    rankPosition: null,
  };

  // 1.1 Growth Score Verification
  const emptyGrowthResult = calculateGrowthIntelligenceScore(emptyInputs);
  assert.strictEqual(emptyGrowthResult.overall, null, 'Score must be strictly null when no signals exist');
  assert.strictEqual(emptyGrowthResult.status, 'UNAVAILABLE', 'Status must be UNAVAILABLE');
  assert.strictEqual(emptyGrowthResult.statusLabel, 'UNAVAILABLE', 'Status label must be UNAVAILABLE');
  assert.strictEqual(emptyGrowthResult.availablePillarsCount, 0, 'Available pillars count must be 0');
  assert.strictEqual(emptyGrowthResult.breakdown.googleProfile, null, 'Pillar score must be null (no fake 0)');
  assert.strictEqual(emptyGrowthResult.breakdown.localSeo, null, 'Local SEO score must be null');
  assert.strictEqual(emptyGrowthResult.breakdown.reviews, null, 'Reviews score must be null');
  assert.strictEqual(emptyGrowthResult.breakdown.website, null, 'Website score must be null');
  assert.strictEqual(emptyGrowthResult.breakdown.content, null, 'Content score must be null');
  assert.strictEqual(emptyGrowthResult.breakdown.customerEngagement, null, 'Engagement score must be null');
  assert.ok(emptyGrowthResult.telemetry.every((t) => t.status === 'UNAVAILABLE'), 'All telemetry must be UNAVAILABLE');
  assert.ok(emptyGrowthResult.telemetry.every((t) => typeof t.source === 'string' && t.source.length > 0), 'Every telemetry item must cite its source');
  console.log('  ✅ 1.1 Growth Score: Honest UNAVAILABLE status with zero fake metric scoring.');

  // 1.2 AI Executive Summary Evidence & Deterministic Text
  const emptySummaryInputs: ExecutiveSummaryInputs = {
    businessProfile: null,
    reviews: [],
    posts: [],
    leads: [],
    rankObservations: [],
    competitors: [],
    customDomainVerified: false,
    growthScore: toGrowthScorePayload(emptyGrowthResult),
    isDemoMode: false,
  };

  const emptyEvidence = buildStructuredEvidence(emptySummaryInputs);
  assert.ok(emptyEvidence.length >= 7, 'Evidence table must contain canonical evaluation metrics');
  assert.ok(emptyEvidence.every((e) => typeof e.evidenceId === 'string' && e.evidenceId.length > 0), 'Every evidence item must have a valid evidenceId');
  assert.ok(
    emptyEvidence.every((e) => e.status === 'UNAVAILABLE' || e.value === null || e.value === 'Disconnected'),
    'All evidence values must reflect unavailable state'
  );

  const emptySummary = generateDeterministicSummary('Apex Blank Enterprise', 'Thane', emptyEvidence);
  assert.strictEqual(emptySummary.overallStatus, 'UNAVAILABLE');
  assert.ok(emptySummary.headline.includes('uninitialized') || emptySummary.headline.includes('unavailable'));
  assert.ok(!emptySummary.summary.includes('#1'), 'Must not hallucinate #1 rank');
  assert.ok(!emptySummary.summary.includes('verified reviews'), 'Must not claim verified reviews exist');
  assert.ok(!emptySummary.summary.includes('rating of'), 'Must not claim customer ratings exist');
  console.log('  ✅ 1.2 AI Summary: Grounded evidence table strictly reports uninitialized state without hallucinations.');

  // 1.3 Audit Engine Derivation
  const emptyAuditItems = generateEvidenceBasedAudit({
    companyId: 'comp_empty_01',
    businessProfile: null,
    reviews: [],
    rankObservations: [],
    contentPosts: [],
    leads: [],
  });

  assert.ok(emptyAuditItems.length > 0, 'Audit must generate baseline setup recommendations');
  assert.ok(
    emptyAuditItems.every((item) => typeof item.evidence === 'string' && typeof item.source === 'string' && typeof item.recommendation === 'string'),
    'Every audit issue must have evidence, source, and recommendation'
  );
  // Must NOT generate claims of bad reviews or dropped ranks
  assert.ok(
    !emptyAuditItems.some((item) => item.category === 'reviews'),
    'Must not generate review audit issues when 0 reviews exist'
  );
  console.log('  ✅ 1.3 Audit Engine: Baseline setup items derived without unbacked factual claims.');

  // 1.4 Revenue Attribution & ROI
  const emptyAttribution = calculateRevenueAttribution({
    companyId: 'comp_empty_01',
    leads: [],
    invoices: [],
  });
  assert.strictEqual(emptyAttribution.totalLeads, 0);
  assert.strictEqual(emptyAttribution.totalRevenue, 0);
  assert.strictEqual(emptyAttribution.totalSpend, null);
  assert.strictEqual(emptyAttribution.overallRoi, 'UNAVAILABLE', 'ROI must be UNAVAILABLE when cost/revenue missing');
  assert.strictEqual(emptyAttribution.attributionStatus, 'UNAVAILABLE');
  console.log('  ✅ 1.4 Revenue Attribution: Verified 0 revenue and UNAVAILABLE ROI on empty ledger.\n');

  // =========================================================================
  // SCENARIO 2: COMPANY WITH PARTIAL DATA (< 3 PILLARS -> INCOMPLETE DATA)
  // =========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST SCENARIO 2: Company Workspace With Partial Evidence (< 3 Pillars)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const partialReviews: ReviewItem[] = [
    {
      id: 'rev_part_01',
      author: 'Sameer K.',
      rating: 5,
      date: '2026-09-20',
      relativeTime: '2 days ago',
      content: 'Excellent cloud architecture consultation.',
      sentiment: 'positive',
      topic: 'Consulting',
      replied: true,
      replyText: 'Thank you Sameer!',
      source: 'google',
    },
  ];

  const partialLeads: LeadItem[] = [
    {
      id: 'lead_part_01',
      name: 'Rohan Sharma',
      phone: '+919876500001',
      source: 'WhatsApp',
      stage: 'new',
      serviceRequested: 'Web Portal',
      intentScore: 85,
      date: nowIso,
      notes: 'Requested quotation via WhatsApp',
      aiSuggestedReply: '',
    },
  ];

  const partialInputs: GrowthScoreInputs = {
    businessProfile: null,
    reviews: partialReviews,
    rankObservations: [],
    keywordRanks: [],
    contentPosts: [],
    leads: partialLeads,
    campaigns: [],
    auditItems: [],
  };

  // 2.1 Growth Score Classification
  const partialGrowthResult = calculateGrowthIntelligenceScore(partialInputs);
  assert.strictEqual(partialGrowthResult.status, 'INCOMPLETE_DATA', 'Must classify as INCOMPLETE_DATA');
  assert.strictEqual(partialGrowthResult.statusLabel, 'INCOMPLETE DATA');
  assert.strictEqual(partialGrowthResult.availablePillarsCount, 2, 'Available pillars = 2 (reviews + customerEngagement)');
  assert.ok(typeof partialGrowthResult.overall === 'number' && partialGrowthResult.overall > 0, 'Score is calculated from available pillars');
  assert.strictEqual(partialGrowthResult.breakdown.localSeo, null, 'Missing localSeo must be null');
  assert.strictEqual(partialGrowthResult.breakdown.website, null, 'Missing website must be null');
  console.log('  ✅ 2.1 Growth Score: Correctly classified as INCOMPLETE DATA with transparent reason.');

  // 2.2 AI Executive Summary with Partial Signals
  const partialEvidence = buildStructuredEvidence({
    businessProfile: null,
    reviews: partialReviews,
    posts: [],
    leads: partialLeads,
    rankObservations: [],
    growthScore: toGrowthScorePayload(partialGrowthResult),
  });

  const reviewsEv = partialEvidence.find((e) => e.evidenceId === 'ev_reviews_count');
  const leadsEv = partialEvidence.find((e) => e.evidenceId === 'ev_leads_total');
  const seoEv = partialEvidence.find((e) => e.evidenceId === 'ev_seo_local_rank');

  assert.strictEqual(reviewsEv?.value, 1, 'Verified 1 review');
  assert.strictEqual(leadsEv?.value, 1, 'Verified 1 lead');
  assert.strictEqual(seoEv?.value, null, 'SEO rank remains null / UNAVAILABLE');

  const partialSummary = generateDeterministicSummary('Aaditech Partial Lab', 'Thane', partialEvidence);
  assert.ok(partialSummary.summary.includes('1 verified review'), 'Cites verified review');
  assert.ok(partialSummary.summary.includes('Local Map Pack rank telemetry is currently unavailable'), 'Notes unavailable SEO');
  console.log('  ✅ 2.2 AI Summary: Real verified numbers cited while explicitly stating unavailable signals.');

  // 2.3 Audit Engine with New Inbound Lead
  const partialAuditItems = generateEvidenceBasedAudit({
    companyId: 'comp_partial_02',
    businessProfile: null,
    reviews: partialReviews,
    leads: partialLeads,
  });

  const uncontactedLeadIssue = partialAuditItems.find((a) => a.id.includes('aud_leads_uncontacted'));
  assert.ok(uncontactedLeadIssue, 'Must flag uncontacted lead in stage new');
  assert.strictEqual(uncontactedLeadIssue?.severity, 'critical');
  assert.ok(uncontactedLeadIssue?.evidence.includes("1 leads in stage 'new'"));
  console.log('  ✅ 2.3 Audit Engine: Derived uncontacted lead issue with exact database evidence.\n');

  // =========================================================================
  // SCENARIO 3: COMPANY WITH REAL VERIFIED TELEMETRY (END-TO-END FLOW)
  // =========================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST SCENARIO 3: Comprehensive Real Production Telemetry');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const fullBusinessProfile: BusinessProfile = {
    id: 'comp_full_03',
    name: 'Aaditech Digital Enterprise',
    category: 'IT Solutions',
    subCategory: 'Cloud & AI Services',
    address: 'Naupada, Thane West',
    city: 'Thane',
    state: 'Maharashtra',
    country: 'India',
    phone: '+919876543210',
    email: 'ops@aaditechs.in',
    website: 'https://bga.aaditechs.in',
    whatsapp: '+919876543210',
    description: 'Premier digital growth and software development firm.',
    services: ['Web Apps', 'Local SEO', 'AI Automations'],
    products: [],
    priceRange: '₹₹₹',
    openingHours: 'Mon-Sat 9AM-8PM',
    serviceAreas: ['Thane', 'Mumbai', 'Navi Mumbai'],
    brandKit: {
      logoUrl: '',
      primaryColor: '#4f46e5',
      secondaryColor: '#06b6d4',
      fontFamily: 'Plus Jakarta Sans',
      tagline: 'Scale Beyond Limits',
      brandTone: 'Executive',
      preferredLanguage: 'English',
    },
    connectedAccounts: {
      googleBusiness: true,
      metaFacebook: true,
      metaInstagram: true,
      whatsappBusiness: true,
      telegramBot: true,
      website: true,
    },
  };

  const fullReviews: ReviewItem[] = [
    { id: 'rev_1', author: 'Vikram', rating: 5, date: '2026-09-10', relativeTime: '10d', content: 'Top tier!', sentiment: 'positive', topic: 'IT', replied: true, replyText: 'Thanks Vikram!', source: 'google' },
    { id: 'rev_2', author: 'Anita', rating: 5, date: '2026-09-12', relativeTime: '8d', content: 'Great app', sentiment: 'positive', topic: 'App', replied: true, replyText: 'Appreciated!', source: 'google' },
    { id: 'rev_3', author: 'Rajesh', rating: 4, date: '2026-09-14', relativeTime: '6d', content: 'Solid execution', sentiment: 'positive', topic: 'Web', replied: true, replyText: 'Thank you!', source: 'google' },
    { id: 'rev_4', author: 'Pooja', rating: 5, date: '2026-09-16', relativeTime: '4d', content: 'Very reliable', sentiment: 'positive', topic: 'Support', replied: true, replyText: 'Glad to help!', source: 'google' },
    { id: 'rev_5', author: 'Amit', rating: 4, date: '2026-09-18', relativeTime: '2d', content: 'Good service', sentiment: 'positive', topic: 'SEO', replied: false, source: 'google' },
  ];

  const fullRankObs: RankObservation[] = [
    { id: 'obs_0', companyId: 'comp_full_03', keyword: 'it company thane', latitude: 19.22, longitude: 72.97, gridIndex: 0, timestamp: nowIso, provider: 'dataforseo', position: 1, status: 'LIVE' },
    { id: 'obs_1', companyId: 'comp_full_03', keyword: 'it company thane', latitude: 19.22, longitude: 72.98, gridIndex: 1, timestamp: nowIso, provider: 'dataforseo', position: 2, status: 'LIVE' },
    { id: 'obs_2', companyId: 'comp_full_03', keyword: 'it company thane', latitude: 19.22, longitude: 72.99, gridIndex: 2, timestamp: nowIso, provider: 'dataforseo', position: 1, status: 'LIVE' },
    { id: 'obs_3', companyId: 'comp_full_03', keyword: 'it company thane', latitude: 19.21, longitude: 72.97, gridIndex: 3, timestamp: nowIso, provider: 'dataforseo', position: 2, status: 'LIVE' },
    { id: 'obs_4', companyId: 'comp_full_03', keyword: 'it company thane', latitude: 19.21, longitude: 72.98, gridIndex: 4, timestamp: nowIso, provider: 'dataforseo', position: 1, status: 'LIVE' },
    { id: 'obs_5', companyId: 'comp_full_03', keyword: 'it company thane', latitude: 19.21, longitude: 72.99, gridIndex: 5, timestamp: nowIso, provider: 'dataforseo', position: 2, status: 'LIVE' },
    { id: 'obs_6', companyId: 'comp_full_03', keyword: 'it company thane', latitude: 19.20, longitude: 72.97, gridIndex: 6, timestamp: nowIso, provider: 'dataforseo', position: 3, status: 'LIVE' },
    { id: 'obs_7', companyId: 'comp_full_03', keyword: 'it company thane', latitude: 19.20, longitude: 72.98, gridIndex: 7, timestamp: nowIso, provider: 'dataforseo', position: 2, status: 'LIVE' },
    { id: 'obs_8', companyId: 'comp_full_03', keyword: 'it company thane', latitude: 19.20, longitude: 72.99, gridIndex: 8, timestamp: nowIso, provider: 'dataforseo', position: 2, status: 'LIVE' },
  ];

  const fullPosts: ContentPost[] = [
    { id: 'p1', title: 'Case Study', type: 'service', platforms: ['google', 'instagram'], caption: 'AI Architecture', headline: 'AI Case Study', cta: 'Read', hashtags: [], imageUrl: '', status: 'published', scheduledDate: '2026-09-10', timeSlot: '10:00' },
    { id: 'p2', title: 'Security Brief', type: 'educational', platforms: ['google'], caption: 'Zero Trust', headline: 'Security', cta: 'Learn', hashtags: [], imageUrl: '', status: 'published', scheduledDate: '2026-09-15', timeSlot: '11:00' },
    { id: 'p3', title: 'Weekly Tip', type: 'educational', platforms: ['google'], caption: 'Tips', headline: 'Weekly', cta: 'Visit', hashtags: [], imageUrl: '', status: 'scheduled', scheduledDate: '2026-10-02', timeSlot: '10:00' },
  ];

  const fullLeads: any[] = [
    {
      id: 'lead_won_01',
      company_id: 'comp_full_03',
      name: 'Dr. Suresh Mehta',
      phone: '+919876540001',
      email: 'suresh@mehtahospital.com',
      source: 'Google',
      stage: 'won',
      service: 'Healthcare SaaS Portal',
      budget: '₹1,50,000',
    },
    {
      id: 'lead_won_02',
      company_id: 'comp_full_03',
      name: 'Kavita Iyer',
      phone: '+919876540002',
      email: 'kavita@iyerconsulting.com',
      source: 'WhatsApp',
      stage: 'won',
      service: 'CRM Automation',
      budget: '₹80,000',
    },
  ];

  // Invoices with EXPLICIT lead_id attribution (lead -> opportunity -> deal -> payment)
  const fullInvoices: any[] = [
    {
      id: 'inv_001',
      company_id: 'comp_full_03',
      lead_id: 'lead_won_01',
      date: '2026-09-22',
      plan: 'Healthcare Portal Project',
      amount: 150000,
      gst_amount: 27000,
      total_amount: 177000,
      payment_method: 'Razorpay NetBanking',
      payment_id: 'pay_rzp_live_001',
      status: 'Paid',
    },
    {
      id: 'inv_002',
      company_id: 'comp_full_03',
      lead_id: 'lead_won_02',
      date: '2026-09-25',
      plan: 'CRM Automation Retainer',
      amount: 80000,
      gst_amount: 14400,
      total_amount: 94400,
      payment_method: 'Razorpay UPI',
      payment_id: 'pay_rzp_live_002',
      status: 'Paid',
    },
  ];

  // 3.1 Growth Score with Comprehensive Evidence
  const fullGrowthResult = calculateGrowthIntelligenceScore({
    businessProfile: fullBusinessProfile,
    reviews: fullReviews,
    rankObservations: fullRankObs,
    contentPosts: fullPosts,
    leads: fullLeads,
    customDomainVerified: true,
  });

  assert.strictEqual(fullGrowthResult.status, 'CALCULATED', 'Status must be CALCULATED');
  assert.ok(fullGrowthResult.availablePillarsCount >= 5, 'Must have at least 5 available verified pillars');
  assert.ok(typeof fullGrowthResult.overall === 'number' && fullGrowthResult.overall >= 70, 'Score reflects strong telemetry');
  assert.strictEqual(fullGrowthResult.breakdown.googleProfile, 100, 'Google profile 100/100');
  assert.strictEqual(fullGrowthResult.breakdown.website, 100, 'Website & custom domain verified 100/100');
  console.log(`  ✅ 3.1 Growth Score: Composite score ${fullGrowthResult.overall}/100 calculated across ${fullGrowthResult.availablePillarsCount} verified pillars.`);

  // 3.2 AI Executive Summary with Full Evidence
  const fullEvidence = buildStructuredEvidence({
    businessProfile: fullBusinessProfile,
    reviews: fullReviews,
    posts: fullPosts,
    leads: fullLeads,
    rankObservations: fullRankObs,
    customDomainVerified: true,
    growthScore: toGrowthScorePayload(fullGrowthResult),
  });

  assert.ok(fullEvidence.some((e) => e.evidenceId === 'ev_seo_local_rank' && e.value === '#1'));
  assert.ok(fullEvidence.some((e) => e.evidenceId === 'ev_reviews_count' && e.value === 5));
  assert.ok(fullEvidence.some((e) => e.evidenceId === 'ev_leads_total' && e.value === 2));
  assert.ok(fullEvidence.some((e) => e.evidenceId === 'ev_website_custom_domain' && e.value === 'Verified'));

  const fullSummary = generateDeterministicSummary('Aaditech Digital Enterprise', 'Thane', fullEvidence);
  assert.strictEqual(fullSummary.overallStatus, 'VERIFIED');
  assert.ok(fullSummary.summary.includes('5 verified reviews'));
  assert.ok(fullSummary.summary.includes('1 customer review is awaiting response'));
  assert.ok(fullSummary.summary.includes('positioning at #1'));
  console.log('  ✅ 3.2 AI Summary: Verified status with complete multi-channel telemetry breakdown.');

  // 3.3 Audit Engine with 1 Unanswered Review
  const fullAuditItems = generateEvidenceBasedAudit({
    companyId: 'comp_full_03',
    businessProfile: fullBusinessProfile,
    reviews: fullReviews,
    rankObservations: fullRankObs,
    contentPosts: fullPosts,
    leads: fullLeads,
    customDomainVerified: true,
  });

  const unrepliedIssue = fullAuditItems.find((a) => a.id.includes('aud_reviews_unreplied'));
  assert.ok(unrepliedIssue, 'Must flag 1 unreplied review');
  assert.ok(unrepliedIssue?.evidence.includes('1 of 5 reviews marked replied = false'));
  console.log('  ✅ 3.3 Audit Engine: Pinpoints exact unreplied review without generating false claims.');

  // 3.4 Revenue Attribution & Real ROI Calculation
  const actualSpend = 30000; // Actual verified marketing spend
  const fullAttribution = calculateRevenueAttribution({
    companyId: 'comp_full_03',
    leads: fullLeads,
    invoices: fullInvoices,
    totalCost: actualSpend,
    costBySource: { Google: 20000, WhatsApp: 10000 },
  });

  assert.strictEqual(fullAttribution.totalRevenue, 230000, '150k + 80k = 230k verified revenue');
  assert.strictEqual(fullAttribution.totalSpend, 30000, 'Spend = 30,000');
  assert.strictEqual(fullAttribution.revenueBySource.Google.revenue, 150000, 'Google attributed via explicit lead_id');
  assert.strictEqual(fullAttribution.revenueBySource.WhatsApp.revenue, 80000, 'WhatsApp attributed via explicit lead_id');

  // ROI = ((230,000 - 30,000) / 30,000) * 100 = (200,000 / 30,000) * 100 = 666.67%
  const expectedRoi = 666.67;
  assert.strictEqual(fullAttribution.overallRoi, expectedRoi, 'Overall ROI calculated mathematically');
  assert.strictEqual(fullAttribution.attributionStatus, 'VERIFIED');
  console.log(`  ✅ 3.4 Revenue Attribution: Verified ₹2,30,000 revenue with exact explicit lead_id attribution and ${fullAttribution.overallRoi}% ROI.`);

  console.log('\n=========================================================================');
  console.log('🎉 ALL PHASE 5 BUSINESS INTELLIGENCE CLOSURE TESTS PASSED PERFECTLY!');
  console.log('=========================================================================\n');
}

runPhase5AcceptanceTests().catch((err) => {
  console.error('❌ Phase 5 Acceptance Tests Failed:', err);
  process.exit(1);
});
