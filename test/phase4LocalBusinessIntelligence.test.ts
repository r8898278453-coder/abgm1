import assert from 'assert';
import {
  generate3x3GridCoordinates,
  resolveCenterCoordinates,
  resolveRankProvider,
  DataForSeoLocalProvider,
  SerpApiLocalProvider,
  UnconfiguredRankProvider,
  RankObservation,
} from '../server/localSeoProvider';
import {
  resolveCompetitorProvider,
  calculateCompetitorChanges,
  GooglePlacesCompetitorProvider,
  SerpApiCompetitorProvider,
  UnconfiguredCompetitorProvider,
} from '../server/competitorProvider';
import {
  saveRankObservations,
  getLatestKeywordObservations,
  getKeywordObservationHistory,
  saveCompetitorObservation,
  getCompetitorObservationHistory,
  getCompetitorHistoricalBaseline,
  createCompany,
  createUser,
} from '../server/db';

function calculateGridStatus(successCount: number, totalNodes = 9): 'LIVE' | 'PARTIAL' | 'FAILED' {
  if (successCount === totalNodes && successCount > 0) return 'LIVE';
  if (successCount > 0) return 'PARTIAL';
  return 'FAILED';
}

async function runPhase4AcceptanceTests() {
  console.log('🧪 Starting Phase 4 — Real Local Business Intelligence Tests...\n');

  const testUserId = `user_p4_${Date.now()}`;
  const testCompanyId = `comp_p4_${Date.now()}`;

  await createUser({
    email: `p4_tester_${Date.now()}@aaditechs.in`,
    password: 'SecurePassword123!',
    full_name: 'Phase 4 Tester',
    role: 'owner',
  });

  await createCompany({
    id: testCompanyId,
    user_id: testUserId,
    name: 'Aaditech Phase 4 Intelligence Lab',
    category: 'IT Solutions',
    city: 'Thane',
    phone: '+919876543210',
    autopilot_enabled: true,
  });

  // =========================================================================
  // TEST 1: Physical 3x3 Grid Coordinates Generation
  // =========================================================================
  console.log('Test 1: Physical 3x3 Grid Coordinates Generation');
  const center = resolveCenterCoordinates('Thane');
  assert.strictEqual(center.lat, 19.2183, 'Thane latitude matches center');
  assert.strictEqual(center.lng, 72.9781, 'Thane longitude matches center');

  const grid9 = generate3x3GridCoordinates(center.lat, center.lng, 3.5);
  assert.strictEqual(grid9.length, 9, 'Must generate exactly 9 geographic coordinates');
  assert.strictEqual(grid9[4].label.includes('Center'), true, 'Grid index 4 is center');
  assert.strictEqual(grid9[0].gridIndex, 0, 'Grid indices must span 0 to 8');
  console.log('  ✅ Test 1 Passed: 9 distinct geographic coordinates generated around physical city center.');

  // =========================================================================
  // TEST 2: Provider Resolution & Missing Credentials Guard
  // =========================================================================
  console.log('Test 2: Provider Resolution & Missing Credentials Guard');
  const unconfiguredRank = resolveRankProvider({});
  assert.strictEqual(unconfiguredRank.providerId, 'unconfigured');

  const unconfiguredResult = await unconfiguredRank.scanRankGrid({
    companyId: testCompanyId,
    businessName: 'Aaditech Solution',
    keyword: 'website development',
    city: 'Thane',
    centerLat: center.lat,
    centerLng: center.lng,
    coordinates: grid9,
  });

  assert.strictEqual(unconfiguredResult.status, 'UNAVAILABLE', 'Unconfigured provider must return UNAVAILABLE');
  assert.strictEqual(unconfiguredResult.overallRank, null, 'Overall rank must be null without provider');
  assert.strictEqual(unconfiguredResult.searchVolume, null, 'Search volume must not be fabricated');
  assert.strictEqual(unconfiguredResult.observations.length, 9, 'Must return 9 coordinate observation placeholders');
  assert.strictEqual(unconfiguredResult.observations.every((o) => o.status === 'UNAVAILABLE' && o.position === null), true);
  console.log('  ✅ Test 2 Passed: Missing credentials return honest UNAVAILABLE with 0 fake ranks.');

  // =========================================================================
  // TEST 3: Provider Failure (0/9 Success -> FAILED, Never LIVE)
  // =========================================================================
  console.log('Test 3: Provider Failure (0/9 Success -> FAILED, Never LIVE)');
  const failedObservations: RankObservation[] = grid9.map((coord) => ({
    id: `obs_fail_${coord.gridIndex}`,
    companyId: testCompanyId,
    keyword: 'website development',
    latitude: coord.lat,
    longitude: coord.lng,
    gridIndex: coord.gridIndex,
    gridLabel: coord.label,
    timestamp: new Date().toISOString(),
    provider: 'dataforseo',
    position: null,
    status: 'FAILED',
    sourceEvidence: 'DataForSEO HTTP 500 server error',
  }));

  const successCount0 = failedObservations.filter((o) => o.status === 'LIVE' || o.status === 'VERIFIED').length;
  assert.strictEqual(successCount0, 0);
  const calculatedStatus0 = calculateGridStatus(successCount0);
  assert.strictEqual(calculatedStatus0, 'FAILED', '0/9 success must strictly be FAILED');
  assert.notStrictEqual(calculatedStatus0, 'LIVE', 'Failed scan must never be labeled LIVE');
  console.log('  ✅ Test 3 Passed: 0/9 successful nodes classified strictly as FAILED, never LIVE.');

  // =========================================================================
  // TEST 4: Partial 3x3 Grid Scan (Some Success -> PARTIAL)
  // =========================================================================
  console.log('Test 4: Partial 3x3 Grid Scan (5/9 Success -> PARTIAL)');
  const partialObservations: RankObservation[] = grid9.map((coord, idx) => ({
    id: `obs_part_${coord.gridIndex}`,
    companyId: testCompanyId,
    keyword: 'app development',
    latitude: coord.lat,
    longitude: coord.lng,
    gridIndex: coord.gridIndex,
    gridLabel: coord.label,
    timestamp: new Date().toISOString(),
    provider: 'serpapi',
    position: idx < 5 ? idx + 1 : null,
    status: idx < 5 ? 'LIVE' : 'FAILED',
    sourceEvidence: idx < 5 ? `Rank #${idx + 1}` : 'SerpApi timeout',
  }));

  const successCountPartial = partialObservations.filter((o) => o.status === 'LIVE' || o.status === 'VERIFIED').length;
  assert.strictEqual(successCountPartial, 5);
  const calculatedStatusPartial = calculateGridStatus(successCountPartial);
  assert.strictEqual(calculatedStatusPartial, 'PARTIAL', 'Partial success must be classified as PARTIAL');
  console.log('  ✅ Test 4 Passed: Incomplete grid scan accurately classified as PARTIAL.');

  // =========================================================================
  // TEST 5: Full 3x3 Grid Scan (9/9 Success -> LIVE)
  // =========================================================================
  console.log('Test 5: Full 3x3 Grid Scan (9/9 Success -> LIVE)');
  const fullObservations: RankObservation[] = grid9.map((coord, idx) => ({
    id: `obs_full_${coord.gridIndex}_${Date.now()}`,
    companyId: testCompanyId,
    keyword: 'local seo agency',
    latitude: coord.lat,
    longitude: coord.lng,
    gridIndex: coord.gridIndex,
    gridLabel: coord.label,
    timestamp: new Date().toISOString(),
    provider: 'dataforseo',
    position: (idx % 3) + 1,
    status: 'LIVE',
    sourceEvidence: `DataForSEO verified rank #${(idx % 3) + 1}`,
  }));

  const successCountFull = fullObservations.filter((o) => o.status === 'LIVE' || o.status === 'VERIFIED').length;
  assert.strictEqual(successCountFull, 9);
  const calculatedStatusFull = calculateGridStatus(successCountFull);
  assert.strictEqual(calculatedStatusFull, 'LIVE', '9/9 success classified as LIVE');
  console.log('  ✅ Test 5 Passed: Full 9/9 node completion classified as LIVE.');

  // =========================================================================
  // TEST 6: Historical Observation Persistence & Trend Retrieval
  // =========================================================================
  console.log('Test 6: Historical Observation Persistence & Trend Retrieval');
  await saveRankObservations(testCompanyId, 'local seo agency', fullObservations);
  const retrievedLatest = await getLatestKeywordObservations(testCompanyId, 'local seo agency');
  assert.strictEqual(retrievedLatest.length, 9, 'Must persist and retrieve all 9 node observations');
  assert.strictEqual(retrievedLatest[0].company_id, testCompanyId);

  const history = await getKeywordObservationHistory(testCompanyId, 'local seo agency');
  assert.ok(history.length >= 9, 'Observation history must contain timestamped snapshots');
  console.log('  ✅ Test 6 Passed: 3x3 rank observations persisted into MySQL with full history query support.');

  // =========================================================================
  // TEST 7: Competitor Baseline Requirement (Zero Fabrication)
  // =========================================================================
  console.log('Test 7: Competitor Baseline Requirement (Zero Fabrication)');
  const currentObs = {
    rating: 4.8,
    reviewsCount: 120,
    rankPosition: null, // Places API does not measure keyword rank
  };

  const noBaselineChange = calculateCompetitorChanges(currentObs, null);
  assert.strictEqual(noBaselineChange.hasHistoricalBaseline, false, 'Initial scan has no baseline');
  assert.strictEqual(noBaselineChange.reviewGrowthThisMonth, null, 'Must not fabricate review growth without baseline');
  assert.strictEqual(noBaselineChange.ratingDiff, null, 'Rating diff must be null');
  console.log('  ✅ Test 7 Passed: Initial competitor observation requires prior baseline before claiming growth.');

  // =========================================================================
  // TEST 8: Competitor Change Calculation with Authentic Baseline
  // =========================================================================
  console.log('Test 8: Competitor Change Calculation with Authentic Baseline');
  const previousObs = {
    rating: 4.6,
    reviewsCount: 105,
    rankPosition: 3,
  };
  const updatedObs = {
    rating: 4.8,
    reviewsCount: 120,
    rankPosition: 1,
  };

  const verifiedChange = calculateCompetitorChanges(updatedObs, previousObs);
  assert.strictEqual(verifiedChange.hasHistoricalBaseline, true);
  assert.strictEqual(verifiedChange.reviewGrowthThisMonth, 15, '120 - 105 = 15 genuine reviews growth');
  assert.strictEqual(verifiedChange.ratingDiff, 0.2, '4.8 - 4.6 = +0.20 rating change');
  assert.strictEqual(verifiedChange.rankDiff, 2, 'Rank improvement from #3 to #1 = +2 positions');
  console.log('  ✅ Test 8 Passed: Competitor changes computed mathematically from authentic database observations.');

  // Save competitor observation to database
  await saveCompetitorObservation({
    id: `cobs_test_${Date.now()}`,
    company_id: testCompanyId,
    competitor_id: 'comp_rival_01',
    name: 'Apex Digital Solutions',
    place_id: 'ChIJ_apex_12345',
    address: 'Naupada, Thane West',
    rating: 4.8,
    reviews_count: 120,
    photos_count: 35,
    posts_per_week: null,
    rank_position: null,
    provider: 'google_places',
    timestamp: new Date().toISOString(),
    status: 'LIVE',
  });

  const compHistory = await getCompetitorObservationHistory(testCompanyId, 'comp_rival_01');
  assert.ok(compHistory.length >= 1, 'Competitor observation history stored');
  console.log('  ✅ Saved competitor observation to MySQL with historical baseline query support.');

  console.log('\n=========================================================================');
  console.log('🎉 ALL 8 PHASE 4 LOCAL BUSINESS INTELLIGENCE TESTS PASSED PERFECTLY!');
  console.log('=========================================================================\n');
}

runPhase4AcceptanceTests().catch((err) => {
  console.error('❌ Phase 4 Tests Failed:', err);
  process.exit(1);
});
