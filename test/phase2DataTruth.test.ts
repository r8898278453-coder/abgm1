import { calculateGrowthIntelligenceScore } from '../server/growthScoreEngine';
import { buildStructuredEvidence, generateDeterministicSummary } from '../server/aiExecutiveSummary';
import { calculateRevenueAttribution } from '../server/revenueAttribution';
import {
  createUser,
  createCompany,
  getAllLeads,
  getCompanyReviews,
  getInvoicesByCompany,
  getCompanyDataPayload,
} from '../server/db';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

async function runPhase2DataTruthTests() {
  console.log('🧪 Starting Phase 2 Data Truth & Zero Fake Metric Tests...\n');

  // =========================================================================
  // TEST 1: Brand-New Company Starts With No Fabricated Telemetry
  // =========================================================================
  console.log('Test 1: Brand-New Company Onboarding Baseline Truthfulness');
  const user = await createUser({
    email: `truth_owner_${Date.now()}@example.com`,
    password: 'SecurePassword1234!',
    full_name: 'Truthful Owner',
    role: 'owner',
  });

  const company = await createCompany({
    user_id: user.id,
    name: 'Fresh Clean Dental Clinic',
    category: 'Dental Clinic',
    city: 'Pune',
    phone: '+91 99999 88888',
  });

  const leads = await getAllLeads(company.id);
  const reviews = await getCompanyReviews(company.id);
  const invoices = await getInvoicesByCompany(company.id);
  const payload: any = (await getCompanyDataPayload(company.id)) || {};

  assert(leads.length === 0, 'New company must have 0 CRM leads');
  assert(reviews.length === 0, 'New company must have 0 customer reviews');
  assert(invoices.length === 0, 'New company must have 0 invoices/revenue');
  assert((payload.keywords || []).length === 0, 'New company must have empty keywords list');
  assert((payload.competitors || []).length === 0, 'New company must have empty competitors list');
  assert((payload.campaigns || []).length === 0, 'New company must have empty campaigns list');
  assert(company.rank_position === undefined || company.rank_position === null, 'Rank position must be undefined/null');

  console.log('  ✅ Test 1 Passed: Brand new company has strictly zero fabricated metrics.');

  // =========================================================================
  // TEST 2: Growth Score Strictly Classifies Insufficient Data as INCOMPLETE_DATA / UNAVAILABLE
  // =========================================================================
  console.log('Test 2: Growth Score Anti-Fabrication & Null Handling');
  const emptyGrowthScore = calculateGrowthIntelligenceScore({
    businessProfile: {
      id: company.id,
      name: company.name,
      category: company.category,
      city: company.city,
    } as any,
    reviews: [],
    keywordRanks: [],
    contentPosts: [],
    leads: [],
    campaigns: [],
    auditItems: [],
  });

  assert(emptyGrowthScore.overall === null, 'Overall score must be null for empty tenant');
  assert(
    emptyGrowthScore.status === 'INCOMPLETE_DATA' || emptyGrowthScore.status === 'UNAVAILABLE',
    `Status must be INCOMPLETE_DATA or UNAVAILABLE, got ${emptyGrowthScore.status}`
  );
  assert(Boolean(emptyGrowthScore.insufficientDataReason), 'Must provide clear audit reasons for incomplete data');
  console.log('  ✅ Test 2 Passed: Growth Score refuses to fabricate numbers or convert null to 0.');

  // =========================================================================
  // TEST 3: AI Executive Summary Evidence Grounding (No Fake Evidence)
  // =========================================================================
  console.log('Test 3: AI Executive Summary Evidence from Clean Tenant');
  const evidence = buildStructuredEvidence({
    businessProfile: {
      id: company.id,
      name: company.name,
      category: company.category,
      city: company.city,
      connectedAccounts: {
        googleBusiness: false,
      },
    } as any,
    reviews: [],
    posts: [],
    leads: [],
    rankObservations: [],
    competitors: [],
  });

  const reviewEvidence = evidence.find((e) => e.metric.toLowerCase().includes('review'));
  assert(reviewEvidence !== undefined, 'Review evidence item exists');
  assert(reviewEvidence?.status === 'UNAVAILABLE', 'Review count status must be UNAVAILABLE when empty');
  assert(reviewEvidence?.value === null, 'Review count value must be null when empty');

  const rankEvidence = evidence.find((e) => e.metric.toLowerCase().includes('rank'));
  assert(rankEvidence !== undefined, 'Rank evidence item exists');
  assert(rankEvidence?.status === 'UNAVAILABLE', 'Rank status must be UNAVAILABLE when empty');
  assert(rankEvidence?.value === null, 'Rank value must be null when empty');

  const summary = generateDeterministicSummary(company.name, company.city, evidence);
  assert(typeof summary.headline === 'string' && summary.headline.length > 0, 'Headline generated');
  assert(summary.overallStatus === 'UNAVAILABLE', 'Overall status must be UNAVAILABLE');
  console.log('  ✅ Test 3 Passed: AI Summary strictly marks missing signals as UNAVAILABLE.');

  // =========================================================================
  // TEST 4: Real Revenue Attribution on Unconfigured & Empty Tenant
  // =========================================================================
  console.log('Test 4: Revenue Attribution on Empty Tenant');
  const attribution = calculateRevenueAttribution({
    companyId: company.id,
    leads: [],
    invoices: [],
  });

  assert(attribution.totalLeads === 0, 'Total leads must be 0');
  assert(attribution.totalRevenue === 0, 'Total revenue must be 0');
  assert(attribution.overallRoi === 'UNAVAILABLE', 'ROI must be UNAVAILABLE when cost data is missing');
  console.log('  ✅ Test 4 Passed: Revenue attribution calculates honest zero baseline without fake revenue.');

  console.log('\n🎉 ALL 4 PHASE 2 DATA TRUTH & INTEGRITY TESTS PASSED PERFECTLY!\n');
}

runPhase2DataTruthTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
