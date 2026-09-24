import assert from 'assert';
import {
  buildStructuredEvidence,
  buildEvidenceGroundedPrompt,
  generateDeterministicSummary,
  StructuredEvidenceItem,
} from '../server/aiExecutiveSummary';
import {
  BusinessProfile,
  ReviewItem,
  LeadItem,
  ContentPost,
  RankObservation,
} from '../src/types';

console.log('🧪 Starting AI Executive Summary Evidence Grounding Unit Tests...\n');

// 1. Real Evidence Test
console.log('Test 1: Real Verified Evidence - strict grounding and zero invention');
const realBusiness: BusinessProfile = {
  id: 'comp-real-1',
  name: 'Aaditech Solution',
  category: 'IT & Web Development',
  city: 'Thane',
  address: 'Naupada, Thane, MH',
  website: 'https://aaditechs.in',
  phone: '+919876543210',
  subCategory: 'Software Development',
  state: 'Maharashtra',
  country: 'India',
  email: 'contact@aaditechs.in',
  whatsapp: '+919876543210',
  description: 'Enterprise IT development and marketing solutions',
  services: ['Web Development', 'SEO'],
  products: [],
  priceRange: '₹₹',
  openingHours: 'Mon-Sat 9AM-8PM',
  serviceAreas: ['Thane', 'Mumbai'],
  brandKit: {
    logoUrl: '',
    primaryColor: '#4f46e5',
    secondaryColor: '#0f172a',
    fontFamily: 'Plus Jakarta Sans',
    tagline: '',
    brandTone: '',
    preferredLanguage: 'English',
  },
  connectedAccounts: {
    googleBusiness: true,
    metaFacebook: false,
    metaInstagram: false,
    whatsappBusiness: false,
    telegramBot: false,
    website: true,
  },
};

const realReviews: ReviewItem[] = [
  {
    id: 'rev-1',
    author: 'Rajesh Kumar',
    rating: 5,
    date: '2026-09-15',
    relativeTime: '5 days ago',
    content: 'Excellent web development team in Thane.',
    sentiment: 'positive',
    topic: 'Quality',
    replied: true,
    source: 'google',
  },
  {
    id: 'rev-2',
    author: 'Dr. Patwardhan',
    rating: 4,
    date: '2026-09-18',
    relativeTime: '2 days ago',
    content: 'Great support on our clinic local SEO.',
    sentiment: 'positive',
    topic: 'Support',
    replied: false,
    source: 'google',
  },
];

const realLeads: LeadItem[] = [
  {
    id: 'lead-1',
    name: 'Vikram Malhotra',
    phone: '+919820011223',
    source: 'Google Maps',
    stage: 'new',
    serviceRequested: 'Custom CRM Portal',
    intentScore: 85,
    date: '2026-09-19',
    notes: 'Inquiry via Google Maps',
    aiSuggestedReply: 'Hello Vikram, how can we assist you with your CRM Portal?',
  },
];

const realPosts: ContentPost[] = [
  {
    id: 'post-1',
    title: 'Top 5 Local SEO Tips 2026',
    type: 'educational',
    platforms: ['google'],
    caption: 'Boost your local rank today!',
    headline: 'Local SEO Tips',
    cta: 'Call Now',
    imageUrl: '',
    hashtags: ['#SEO', '#Thane'],
    status: 'published',
    scheduledDate: '2026-09-11',
    timeSlot: '10:00 AM',
  },
];

const realRankObs: RankObservation[] = [
  {
    id: 'rank-1',
    companyId: 'comp-real-1',
    keyword: 'web development thane',
    latitude: 19.2183,
    longitude: 72.9781,
    gridIndex: 0,
    position: 2,
    provider: 'places_text_search',
    status: 'VERIFIED',
    timestamp: '2026-09-19T00:00:00.000Z',
  },
];

const realEvidence = buildStructuredEvidence({
  businessProfile: realBusiness,
  reviews: realReviews,
  leads: realLeads,
  posts: realPosts,
  rankObservations: realRankObs,
  customDomainVerified: true,
  growthScore: {
    overall: 84,
    status: 'CALCULATED',
    breakdown: {
      googleProfile: 90,
      localSeo: 80,
      reviews: 85,
      socialMedia: 75,
      content: 80,
      website: 95,
      customerEngagement: 80,
    },
  },
  isDemoMode: false,
  overrideTimestamp: '2026-09-20T00:00:00.000Z',
});

// Check evidence items
assert.ok(realEvidence.length >= 6, 'Should generate comprehensive structured evidence');
const revEvidence = realEvidence.find((e) => e.metric === 'Google reviews count');
assert.strictEqual(revEvidence?.value, 2, 'Should capture exact verified reviews count (2)');
assert.strictEqual(revEvidence?.status, 'VERIFIED', 'Status should be VERIFIED for linked account');

const leadEvidence = realEvidence.find((e) => e.metric === 'Total CRM leads');
assert.strictEqual(leadEvidence?.value, 1, 'Should capture exact CRM leads count (1)');
assert.strictEqual(leadEvidence?.status, 'VERIFIED');

const prompt = buildEvidenceGroundedPrompt('Aaditech Solution', 'Thane', 'IT Services', realEvidence);
assert.ok(prompt.includes('"metric": "Google reviews count"'), 'Prompt must contain structured JSON evidence');
assert.ok(prompt.includes('You must NOT invent'), 'Prompt must contain anti-hallucination guardrails');

const deterministicSummary = generateDeterministicSummary('Aaditech Solution', 'Thane', realEvidence);
assert.ok(deterministicSummary.headline.includes('1 active leads'), 'Headline must strictly use verified leads');
assert.ok(deterministicSummary.summary.includes('2 verified reviews'), 'Summary must strictly cite verified reviews');
assert.ok(deterministicSummary.summary.includes('#2'), 'Summary must cite verified rank #2');
console.log('  ✅ Test 1 Passed: Real verified evidence correctly grounded without hallucination.\n');

// 2. Missing Evidence Test (e.g. No Rank, No Domain)
console.log('Test 2: Missing Evidence - explicit UNAVAILABLE indicators');
const missingEvidence = buildStructuredEvidence({
  businessProfile: {
    ...realBusiness,
    connectedAccounts: {
      googleBusiness: false,
      metaFacebook: false,
      metaInstagram: false,
      whatsappBusiness: false,
      telegramBot: false,
      website: false,
    },
  },
  reviews: [],
  leads: [],
  posts: [],
  rankObservations: [],
  customDomainVerified: false,
  growthScore: null,
  isDemoMode: false,
});

const rankItem = missingEvidence.find((e) => e.metric === 'Local Map Pack rank');
assert.strictEqual(rankItem?.value, null, 'Rank value must be null when missing');
assert.strictEqual(rankItem?.status, 'UNAVAILABLE', 'Rank status must be UNAVAILABLE');

const revItem = missingEvidence.find((e) => e.metric === 'Google reviews count');
assert.strictEqual(revItem?.value, null, 'Reviews count must be null when missing');
assert.strictEqual(revItem?.status, 'UNAVAILABLE', 'Reviews status must be UNAVAILABLE');

const missingSummary = generateDeterministicSummary('New Bakery', 'Pune', missingEvidence);
assert.ok(
  missingSummary.summary.includes('Public review data is currently unavailable') ||
    missingSummary.summary.includes('unavailable'),
  'Summary must state that review data is unavailable'
);
assert.ok(
  missingSummary.summary.includes('Local Map Pack rank telemetry is currently unavailable') ||
    missingSummary.summary.includes('unavailable'),
  'Summary must state that rank data is unavailable'
);
console.log('  ✅ Test 2 Passed: Missing evidence correctly marked UNAVAILABLE and not guessed.\n');

// 3. Empty Evidence Test (all fields null/empty)
console.log('Test 3: Empty Evidence - zero telemetry handling');
const emptyEvidence = buildStructuredEvidence({
  businessProfile: null,
  reviews: null,
  leads: null,
  posts: null,
  rankObservations: null,
  customDomainVerified: false,
  growthScore: null,
  isDemoMode: false,
});

const emptySummary = generateDeterministicSummary('', '', emptyEvidence);
assert.strictEqual(emptySummary.overallStatus, 'UNAVAILABLE');
assert.ok(
  emptySummary.summary.includes('No verified marketing telemetry'),
  'Empty evidence must inform user that telemetry is uninitialized'
);
console.log('  ✅ Test 3 Passed: Empty evidence handled safely.\n');

// 4. Demo Data Test (Demo data must NEVER be classified VERIFIED)
console.log('Test 4: Demo Data - must NEVER be classified as VERIFIED');
const demoEvidence = buildStructuredEvidence({
  businessProfile: realBusiness,
  reviews: realReviews,
  leads: realLeads,
  posts: realPosts,
  rankObservations: realRankObs,
  customDomainVerified: true,
  growthScore: { overall: 90, status: 'CALCULATED', breakdown: {} as any },
  isDemoMode: true, // FLAG DEMO
});

const verifiedItemsInDemo = demoEvidence.filter((e) => e.status === 'VERIFIED');
assert.strictEqual(
  verifiedItemsInDemo.length,
  0,
  'CRITICAL: Demo data must NEVER contain VERIFIED status items!'
);

const demoItems = demoEvidence.filter((e) => e.status === 'DEMO');
assert.ok(demoItems.length >= 4, 'Demo items must be tagged with DEMO status');

const demoSummary = generateDeterministicSummary('Demo Enterprise', 'Demo City', demoEvidence);
assert.strictEqual(demoSummary.overallStatus, 'DEMO', 'Overall status for demo data must be DEMO');
console.log('  ✅ Test 4 Passed: Demo data strictly isolated and never classified as VERIFIED.\n');

// 5. Conflicting Data Test
console.log('Test 5: Conflicting Data - conservative normalization');
const conflictingReviews: ReviewItem[] = [
  {
    id: 'rev-c1',
    author: 'A',
    rating: 5,
    date: '2026-09-01',
    relativeTime: '1m',
    content: 'Great',
    sentiment: 'positive',
    topic: 'General',
    replied: true,
    source: 'google',
  },
  {
    id: 'rev-c2',
    author: 'B',
    rating: 1,
    date: '2026-09-02',
    relativeTime: '1m',
    content: 'Bad',
    sentiment: 'negative',
    topic: 'Service',
    replied: false,
    source: 'facebook',
  },
];

const conflictingEvidence = buildStructuredEvidence({
  businessProfile: {
    ...realBusiness,
    connectedAccounts: {
      googleBusiness: false, // Google disconnected but reviews exist in database
      metaFacebook: false,
      metaInstagram: false,
      whatsappBusiness: false,
      telegramBot: false,
      website: false,
    },
  },
  reviews: conflictingReviews,
  leads: [],
  posts: [],
  rankObservations: [
    { id: '1', companyId: 'c1', keyword: 'k', latitude: 0, longitude: 0, gridIndex: 0, position: 0, timestamp: '' }, // Position 0 (invalid)
  ],
  isDemoMode: false,
});

const conflictingRank = conflictingEvidence.find((e) => e.metric === 'Local Map Pack rank');
// Rank with invalid position 0 should be treated as UNAVAILABLE rather than rank #0
assert.strictEqual(conflictingRank?.status, 'UNAVAILABLE', 'Invalid rank 0 must be treated as UNAVAILABLE');

const conflictingReviewCount = conflictingEvidence.find((e) => e.metric === 'Google reviews count');
assert.strictEqual(conflictingReviewCount?.value, 2);
assert.strictEqual(conflictingReviewCount?.status, 'USER_ENTERED', 'Disconnected provider must be USER_ENTERED');

console.log('  ✅ Test 5 Passed: Conflicting and irregular data resolved safely.\n');

console.log('🎉 ALL 5 AI EXECUTIVE SUMMARY EVIDENCE TESTS PASSED PERFECTLY!\n');
