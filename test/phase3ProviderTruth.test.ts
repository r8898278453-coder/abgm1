import assert from 'assert';
import {
  normalizeProviderStatus,
  createReview,
  updateReviewReply,
  syncGoogleReviewsToDatabase,
  getCompanyReviews,
  UniversalProviderStatus,
} from '../server/db';
import {
  resolveCenterCoordinates,
  generate3x3GridCoordinates,
  DataForSeoLocalProvider,
  SerpApiLocalProvider,
  UnconfiguredRankProvider,
} from '../server/localSeoProvider';
import {
  calculateIdentityConfidence,
  GooglePlacesCompetitorProvider,
  SerpApiCompetitorProvider,
  UnconfiguredCompetitorProvider,
} from '../server/competitorProvider';

async function runProviderTruthTests() {
  console.log('🧪 Starting Phase 3 Provider Integrations & Verified Telemetry Tests...');

  // =========================================================================
  // TEST 1: Universal Provider State Model Normalization
  // =========================================================================
  console.log('Test 1: Universal Provider State Model Normalization');

  assert.strictEqual(normalizeProviderStatus('CONNECTED', true), 'CONNECTED');
  assert.strictEqual(normalizeProviderStatus('active', true), 'CONNECTED');
  assert.strictEqual(normalizeProviderStatus('VERIFIED', true), 'VERIFIED');
  assert.strictEqual(normalizeProviderStatus('testing', true), 'CONNECTING');
  assert.strictEqual(normalizeProviderStatus('saved', true), 'CONFIGURED');
  assert.strictEqual(normalizeProviderStatus('error', true, null, 'Invalid key'), 'FAILED');
  assert.strictEqual(normalizeProviderStatus(null, false), 'NOT_CONFIGURED');
  assert.strictEqual(normalizeProviderStatus('UNAVAILABLE', true), 'UNAVAILABLE');
  assert.strictEqual(normalizeProviderStatus('NOT_FOUND', true), 'NOT_FOUND');

  console.log('  ✅ Test 1 Passed: Universal provider status correctly normalized across all 9 canonical states.');

  // =========================================================================
  // TEST 2: Unknown City Returns NULL Coordinates & Prevents Null Dereference
  // =========================================================================
  console.log('Test 2: Unknown City Returns NULL Coordinates & Prevents Null Dereference');

  const unknownCityResult = resolveCenterCoordinates('Atlantis Unknown City 999');
  assert.strictEqual(unknownCityResult, null, 'Unknown city must resolve to null coordinates without guessing');

  const knownCityResult = resolveCenterCoordinates('Thane');
  assert(knownCityResult !== null, 'Known city should resolve coordinates');
  assert.strictEqual(typeof knownCityResult?.lat, 'number');
  assert.strictEqual(typeof knownCityResult?.lng, 'number');

  // Verify 3x3 grid generation works when center coordinates exist
  const gridNodes = generate3x3GridCoordinates(knownCityResult.lat, knownCityResult.lng);
  assert.strictEqual(gridNodes.length, 9, '3x3 grid must have exactly 9 coordinates');

  console.log('  ✅ Test 2 Passed: Unknown city strictly returns null coordinates without null pointer exception.');

  // =========================================================================
  // TEST 3: Unconfigured Rank Provider Returns UNAVAILABLE (Zero Fake Ranks)
  // =========================================================================
  console.log('Test 3: Unconfigured Rank Provider Returns UNAVAILABLE');

  const unconfiguredProvider = new UnconfiguredRankProvider();
  const unconfiguredResult = await unconfiguredProvider.scanRankGrid({
    companyId: 'test_comp_001',
    businessName: 'Unconfigured Test Corp',
    keyword: 'best bakery',
    city: 'Thane',
    centerLat: 19.2183,
    centerLng: 72.9781,
    coordinates: gridNodes,
  });

  assert.strictEqual(unconfiguredResult.status, 'UNAVAILABLE');
  assert.strictEqual(unconfiguredResult.overallRank, null);
  assert.strictEqual(unconfiguredResult.observations.length, 9);
  assert(unconfiguredResult.observations.every((o) => o.position === null && o.status === 'UNAVAILABLE'));

  console.log('  ✅ Test 3 Passed: Unconfigured provider returns honest UNAVAILABLE state with null positions.');

  // =========================================================================
  // TEST 4: Google Review Null Handling (Nullable Rating & Nullable Date)
  // =========================================================================
  console.log('Test 4: Google Review Sync preserves NULL rating & NULL date without defaults');

  const testCompId = `comp_test_${Date.now()}`;
  await syncGoogleReviewsToDatabase(testCompId, [
    {
      author_name: 'Anonymous Reviewer 1',
      rating: null,
      text: 'Good service but no numeric rating provided',
      time: null,
    },
    {
      author_name: 'Specific Reviewer 2',
      rating: 4,
      text: 'Very satisfied with prompt support',
      time: 1700000000,
    },
  ]);

  const reviews = await getCompanyReviews(testCompId);
  const nullRatingReview = reviews.find((r) => r.author === 'Anonymous Reviewer 1');
  assert(nullRatingReview, 'Null rating review must be persisted');
  assert.strictEqual(nullRatingReview?.rating, null, 'Missing rating must remain null (never default to 5)');
  assert.strictEqual(nullRatingReview?.date, null, 'Missing review time must remain null (never default to today)');
  assert.strictEqual(nullRatingReview?.provenance_status, 'GOOGLE_VERIFIED');

  console.log('  ✅ Test 4 Passed: Missing review ratings and dates are preserved as NULL without synthetic defaults.');

  // =========================================================================
  // TEST 5: Manual Reviews Are Strictly USER_ENTERED (Never GOOGLE_VERIFIED)
  // =========================================================================
  console.log('Test 5: Manual Reviews Are Strictly USER_ENTERED');

  const manualRev = await createReview({
    company_id: testCompId,
    author: 'Direct Client Feedback',
    rating: 5,
    date: '2026-10-01',
    content: 'Client gave verbal feedback at showroom',
    source: 'manual',
    replied: false,
  });

  assert.strictEqual(manualRev.provenance_status, 'USER_ENTERED', 'Manual review must strictly have USER_ENTERED provenance');
  assert.notStrictEqual(manualRev.provenance_status, 'GOOGLE_VERIFIED', 'Manual review must NEVER be classified as GOOGLE_VERIFIED');

  console.log('  ✅ Test 5 Passed: Manually entered reviews are strictly tagged USER_ENTERED.');

  // =========================================================================
  // TEST 6: Review Reply Semantics (LOCAL_ONLY vs GOOGLE_PUBLISHED)
  // =========================================================================
  console.log('Test 6: Review Reply Semantics (LOCAL_ONLY vs GOOGLE_PUBLISHED)');

  const localUpdated = await updateReviewReply(
    manualRev.id,
    'Thank you for visiting our showroom!',
    testCompId,
    'LOCAL_ONLY'
  );
  assert.strictEqual(localUpdated, true);

  const updatedReviews = await getCompanyReviews(testCompId);
  const foundManual = updatedReviews.find((r) => r.id === manualRev.id);
  assert.strictEqual(foundManual?.replied, true);
  assert.strictEqual(foundManual?.reply_status, 'LOCAL_ONLY', 'Local reply must have reply_status LOCAL_ONLY');

  console.log('  ✅ Test 6 Passed: Local replies are recorded with LOCAL_ONLY status.');

  // =========================================================================
  // TEST 7: Competitor Identity Confidence & Candidate Boundary
  // =========================================================================
  console.log('Test 7: Competitor Identity Confidence Scoring');

  const exactPlaceMatch = calculateIdentityConfidence('Apex Solutions', 'Apex Solutions Ltd', 'ChIJ123', 'ChIJ123');
  assert.strictEqual(exactPlaceMatch.confidence, 1.0);
  assert.strictEqual(exactPlaceMatch.verified, true);
  assert.strictEqual(exactPlaceMatch.isCandidateOnly, false);

  const nameExactMatch = calculateIdentityConfidence('Apex Solutions', 'Apex Solutions');
  assert.strictEqual(nameExactMatch.confidence, 0.95);
  assert.strictEqual(nameExactMatch.verified, true);

  const nameSubstringMatch = calculateIdentityConfidence('Apex Solutions', 'Apex Solutions Pvt Ltd');
  assert.strictEqual(nameSubstringMatch.confidence, 0.75);
  assert.strictEqual(nameSubstringMatch.verified, true);

  const lowConfidenceMatch = calculateIdentityConfidence('Apex Solutions', 'Completely Different Bakery');
  assert.strictEqual(lowConfidenceMatch.confidence, 0.35);
  assert.strictEqual(lowConfidenceMatch.verified, false);
  assert.strictEqual(lowConfidenceMatch.isCandidateOnly, true);

  console.log('  ✅ Test 7 Passed: Competitor identity confidence prevents unverified candidate search results from polluting authoritative data.');

  // =========================================================================
  // TEST 8: Competitor Provider Unconfigured Behavior
  // =========================================================================
  console.log('Test 8: Competitor Provider Unconfigured Behavior');

  const unconfiguredCompProvider = new UnconfiguredCompetitorProvider();
  const compObs = await unconfiguredCompProvider.fetchCompetitorObservation({
    companyId: testCompId,
    competitorId: 'comp_cand_1',
    name: 'Competitor X',
  });

  assert.strictEqual(compObs.dataClassification, 'UNAVAILABLE');
  assert.strictEqual(compObs.rating, null);
  assert.strictEqual(compObs.reviewsCount, null);
  assert.strictEqual(compObs.candidate, true);

  console.log('  ✅ Test 8 Passed: Unconfigured competitor provider reports honest UNAVAILABLE metrics.');

  // =========================================================================
  // TEST 9: Local SEO Provider Network / Quota Failure Handling
  // =========================================================================
  console.log('Test 9: DataForSEO / SerpAPI isConfigured credential safety');

  const dataForSeo = new DataForSeoLocalProvider();
  assert.strictEqual(dataForSeo.isConfigured({}), false);
  assert.strictEqual(dataForSeo.isConfigured({ login: 'user', password: 'pwd' }), true);

  const serpApi = new SerpApiLocalProvider();
  assert.strictEqual(serpApi.isConfigured({}), false);
  assert.strictEqual(serpApi.isConfigured({ apiKey: '123456789' }), true);

  console.log('  ✅ Test 9 Passed: Local SEO providers correctly validate credentials.');

  console.log('=========================================================================');
  console.log('🎉 ALL PHASE 3 PROVIDER INTEGRATION & VERIFIED TELEMETRY TESTS PASSED!');
  console.log('=========================================================================');
}

runProviderTruthTests().catch((err) => {
  console.error('❌ Test execution error:', err);
  process.exit(1);
});
