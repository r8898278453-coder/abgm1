import {
  calculateGrowthIntelligenceScore,
  toGrowthScorePayload,
  GrowthScoreInputs,
} from '../server/growthScoreEngine';
import { BusinessProfile, ReviewItem, ContentPost, LeadItem, RankObservation } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTests() {
  console.log('🧪 Starting Centralized Growth Intelligence Score Engine Unit Tests...\n');

  // TEST 1: Empty / Zero Inputs -> UNAVAILABLE
  {
    console.log('Test 1: Empty inputs produce UNAVAILABLE score without fabricating metrics');
    const emptyInputs: GrowthScoreInputs = {
      businessProfile: null,
      reviews: [],
      rankObservations: [],
      keywordRanks: [],
      contentPosts: [],
      leads: [],
      campaigns: [],
      auditItems: [],
    };

    const res = calculateGrowthIntelligenceScore(emptyInputs);
    assert(res.overall === null, 'Overall score must be null for empty inputs');
    assert(res.status === 'UNAVAILABLE', 'Status must be UNAVAILABLE');
    assert(res.statusLabel === 'UNAVAILABLE', 'Status label must be UNAVAILABLE');
    assert(res.availablePillarsCount === 0, 'Available pillars count must be 0');
    assert(res.breakdown.reviews === null, 'Reviews score must be null');
    assert(res.breakdown.localSeo === null, 'Local SEO score must be null');
    assert(res.breakdown.googleProfile === null, 'Google profile score must be null');
    assert(res.breakdown.website === null, 'Website score must be null');
    assert(res.breakdown.content === null, 'Content score must be null');
    assert(res.breakdown.customerEngagement === null, 'Customer engagement score must be null');

    // Check telemetry
    assert(res.telemetry.length >= 7, 'Telemetry must contain records for all pillars');
    for (const t of res.telemetry) {
      assert(t.status === 'UNAVAILABLE', `Pillar ${t.pillarKey} must have UNAVAILABLE status`);
      assert(typeof t.formula === 'string' && t.formula.length > 0, `Pillar ${t.pillarKey} must have formula`);
      assert(typeof t.inputValues === 'object', `Pillar ${t.pillarKey} must have inputValues record`);
    }

    console.log('  ✅ Test 1 Passed: Correct UNAVAILABLE response on zero inputs.\n');
  }

  // TEST 2: Partial Inputs (< 3 pillars) -> INCOMPLETE DATA
  {
    console.log('Test 2: Insufficient inputs (< 3 pillars) produce INCOMPLETE DATA');
    const partialInputs: GrowthScoreInputs = {
      businessProfile: null,
      reviews: [
        {
          id: 'r1',
          author: 'Alice',
          rating: 5,
          date: '2026-09-18',
          relativeTime: '2 days ago',
          content: 'Great work',
          sentiment: 'positive',
          topic: 'Service',
          replied: true,
          replyText: 'Thanks Alice!',
          source: 'google',
        },
      ],
      rankObservations: [],
      keywordRanks: [],
      contentPosts: [],
      leads: [],
    };

    const res = calculateGrowthIntelligenceScore(partialInputs);
    assert(typeof res.overall === 'number', 'Overall score is calculated from available pillars');
    assert(res.status === 'INCOMPLETE_DATA', 'Status must be INCOMPLETE_DATA when < 3 pillars are available');
    assert(res.statusLabel === 'INCOMPLETE DATA', 'Status label must be INCOMPLETE DATA');
    assert(res.insufficientDataReason !== null, 'Insufficient data reason must be documented');
    assert(res.availablePillarsCount === 2, 'Available pillars count must be 2 (reviews + customerEngagement)');
    assert(res.breakdown.reviews !== null, 'Reviews score must exist');
    assert(res.breakdown.customerEngagement !== null, 'Customer engagement score must exist');
    assert(res.breakdown.localSeo === null, 'Local SEO must be null');

    console.log('  ✅ Test 2 Passed: Correct INCOMPLETE DATA classification.\n');
  }

  // TEST 3: Comprehensive Real Data Inputs -> CALCULATED
  {
    console.log('Test 3: Comprehensive inputs produce CALCULATED score with exact mathematical breakdown');
    const mockProfile: BusinessProfile = {
      id: 'comp_1',
      name: 'Aaditech Solution',
      category: 'Software & Web Development',
      subCategory: 'Custom Web Apps',
      address: 'Shop 4, Sunrise Tower, Sector 17, Vashi',
      city: 'Navi Mumbai',
      state: 'Maharashtra',
      country: 'India',
      phone: '+91 98765 43210',
      email: 'contact@aaditechs.in',
      website: 'https://aaditechs.in',
      whatsapp: '+91 98765 43210',
      description: 'Award-winning software and local business growth agency.',
      services: ['Web Dev', 'SEO'],
      products: [],
      priceRange: '₹₹',
      openingHours: 'Mon-Sat 9AM-8PM',
      serviceAreas: ['Navi Mumbai', 'Thane', 'Mumbai'],
      brandKit: {
        logoUrl: '',
        primaryColor: '#4f46e5',
        secondaryColor: '#06b6d4',
        fontFamily: 'Plus Jakarta Sans',
        tagline: 'Driving Local Excellence',
        brandTone: 'Professional',
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

    const mockReviews: ReviewItem[] = [
      { id: '1', author: 'Rohan', rating: 5, date: '2026-09-10', relativeTime: '10d', content: 'Superb', sentiment: 'positive', topic: 'IT', replied: true, replyText: 'Thank you!', source: 'google' },
      { id: '2', author: 'Sneha', rating: 5, date: '2026-09-12', relativeTime: '8d', content: 'Loved the site', sentiment: 'positive', topic: 'Web', replied: true, replyText: 'Appreciated!', source: 'google' },
      { id: '3', author: 'Vikram', rating: 4, date: '2026-09-15', relativeTime: '5d', content: 'Good service', sentiment: 'positive', topic: 'SEO', replied: false, source: 'google' },
    ];

    const mockRankObs: RankObservation[] = [
      { id: 'o1', companyId: 'comp_1', keyword: 'web dev', latitude: 19.07, longitude: 72.99, gridIndex: 0, timestamp: '2026-09-20', provider: 'dataforseo', position: 1, status: 'LIVE' },
      { id: 'o2', companyId: 'comp_1', keyword: 'web dev', latitude: 19.08, longitude: 73.00, gridIndex: 1, timestamp: '2026-09-20', provider: 'dataforseo', position: 2, status: 'LIVE' },
      { id: 'o3', companyId: 'comp_1', keyword: 'web dev', latitude: 19.06, longitude: 72.98, gridIndex: 2, timestamp: '2026-09-20', provider: 'dataforseo', position: 1, status: 'LIVE' },
    ];

    const mockPosts: ContentPost[] = [
      { id: 'p1', title: 'Special Promo', type: 'offer', platforms: ['google'], caption: 'Save 20%', headline: 'Special', cta: 'Call', hashtags: [], imageUrl: '', status: 'published', scheduledDate: '2026-09-15', timeSlot: '10:00' },
      { id: 'p2', title: 'Tech Tips', type: 'educational', platforms: ['instagram'], caption: 'SEO Guide', headline: 'Tips', cta: 'Read', hashtags: [], imageUrl: '', status: 'scheduled', scheduledDate: '2026-09-22', timeSlot: '11:00' },
    ];

    const fullInputs: GrowthScoreInputs = {
      businessProfile: mockProfile,
      reviews: mockReviews,
      rankObservations: mockRankObs,
      contentPosts: mockPosts,
      customDomainVerified: true,
      auditItems: [],
    };

    const res = calculateGrowthIntelligenceScore(fullInputs);
    assert(res.status === 'CALCULATED', 'Status must be CALCULATED for complete dataset');
    assert(typeof res.overall === 'number' && res.overall > 0 && res.overall <= 100, 'Overall score must be 1-100');
    assert(res.availablePillarsCount === 6, 'All 6 core pillars must be available');
    assert(res.breakdown.googleProfile === 100, 'Complete Google Profile with all NAP details must score 100');
    assert(res.breakdown.localSeo !== null && res.breakdown.localSeo >= 95, 'Top 1-2 rank grid must score >= 95');
    assert(res.breakdown.website === 100, 'Connected site with verified domain & clean audit must score 100');
    assert(res.breakdown.reviews !== null, 'Reviews score must exist');
    assert(res.breakdown.customerEngagement !== null, 'Customer engagement (67% response rate) must exist');
    assert(res.breakdown.content !== null, 'Content score must exist');

    // Verify payload transformer
    const payload = toGrowthScorePayload(res);
    assert(payload.overall === res.overall, 'Payload overall matches calculation');
    assert(payload.status === 'CALCULATED', 'Payload status matches');
    assert(Array.isArray(payload.telemetry) && payload.telemetry.length > 0, 'Payload telemetry is preserved');

    console.log(`  ✅ Test 3 Passed: Overall calculated score: ${res.overall}/100, Status: ${res.status}.\n`);
  }

  // TEST 4: Lead and Campaign Performance Calculation
  {
    console.log('Test 4: Lead and campaign performance calculation');
    const mockLeads: LeadItem[] = [
      { id: 'l1', name: 'John', phone: '99999', source: 'Google Maps', stage: 'won', serviceRequested: 'Web', intentScore: 90, date: '2026-09-18', notes: '', aiSuggestedReply: '' },
      { id: 'l2', name: 'Mark', phone: '88888', source: 'Website', stage: 'qualified', serviceRequested: 'SEO', intentScore: 80, date: '2026-09-19', notes: '', aiSuggestedReply: '' },
      { id: 'l3', name: 'Dave', phone: '77777', source: 'Walk-in', stage: 'contacted', serviceRequested: 'App', intentScore: 50, date: '2026-09-20', notes: '', aiSuggestedReply: '' },
    ];

    const inputs: GrowthScoreInputs = {
      leads: mockLeads,
    };

    const res = calculateGrowthIntelligenceScore(inputs);
    assert(res.breakdown.leadConversion !== null, 'Lead conversion score must be calculated');
    const leadTelemetry = res.telemetry.find((t) => t.pillarKey === 'leadConversion');
    assert(leadTelemetry !== undefined, 'Lead telemetry must be present');
    assert(leadTelemetry?.inputValues.totalLeads === 3, 'Total leads must be recorded in telemetry');
    assert(leadTelemetry?.inputValues.wonLeads === 1, 'Won leads must be recorded in telemetry');
    assert(leadTelemetry?.inputValues.qualifiedLeads === 2, 'Qualified leads must be recorded in telemetry');

    console.log(`  ✅ Test 4 Passed: Lead conversion score computed: ${res.breakdown.leadConversion}/100.\n`);
  }

  console.log('🎉 ALL UNIT TESTS PASSED SUCCESSFULLY!\n');
}

runTests();
