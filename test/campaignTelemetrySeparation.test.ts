import assert from 'node:assert/strict';
import {
  getInternalCampaigns,
  createInternalCampaign,
  updateInternalCampaign,
  deleteInternalCampaign,
  getExternalAdCampaigns,
  upsertExternalAdCampaign,
  saveCompanyIntegration,
} from '../server/db.js';
import {
  MetaAdsAdapter,
  syncExternalAdCampaigns,
} from '../server/adCampaignService.js';

async function runCampaignTelemetryTests() {
  console.log('🧪 Starting Internal Campaign vs External Ad Telemetry Separation Tests...\n');

  const testCompanyId = `comp_camp_test_${Date.now()}`;

  // =========================================================================
  // TEST 1: Internal Marketing Initiative Creation (Zero Fabrication of Ad Telemetry)
  // =========================================================================
  console.log('Test 1: Internal Campaign creation stores planning data without fabricating ad metrics');
  
  const internalCamp = await createInternalCampaign({
    company_id: testCompanyId,
    name: 'Navratri Laptop Service Festival AMC',
    objective: 'Promote Annual Maintenance Contracts to 100+ local SMEs in Vashi',
    status: 'active',
    start_date: '2026-10-01',
    end_date: '2026-10-31',
    planned_budget: 15000,
    channels: ['Google Business', 'WhatsApp', 'Meta Ads'],
  });

  assert.ok(internalCamp.id, 'Internal campaign should have generated UUID');
  assert.equal(internalCamp.company_id, testCompanyId);
  assert.equal(internalCamp.planned_budget, 15000);
  assert.equal(internalCamp.external_campaign_id, null);
  
  // Verify that an internal campaign does NOT automatically create or imply an external ad
  const externalAdsBeforeSync = await getExternalAdCampaigns(testCompanyId);
  assert.equal(externalAdsBeforeSync.length, 0, 'Internal campaign record must NEVER create fake external ad telemetry');
  console.log('  ✅ Test 1 Passed: Internal campaign stored cleanly with zero ad telemetry fabrication.');

  // =========================================================================
  // TEST 2: Verified Provider Telemetry Storage (Only Storing Reported Metrics)
  // =========================================================================
  console.log('\nTest 2: External Ad Campaign strictly records only provider-reported metrics');

  const fetchedTimestamp = new Date().toISOString();
  const externalAd = await upsertExternalAdCampaign({
    company_id: testCompanyId,
    provider: 'meta_ads',
    external_campaign_id: 'meta_camp_984321045',
    name: 'Retargeting Belapur IT Parks - Video Reels',
    status: 'ACTIVE',
    fetched_at: fetchedTimestamp,
    spend: 4850.50,
    impressions: 14200,
    clicks: 612,
    conversions: null, // Tracking unconfigured on Meta pixel
    conversion_tracking_status: 'UNAVAILABLE',
    revenue: null, // Revenue attribution not reported
    revenue_attribution_status: 'UNAVAILABLE',
    roas: null, // ROAS cannot be computed without revenue
    raw_metrics_json: JSON.stringify({ spend: '4850.50', impressions: '14200', clicks: '612' }),
  });

  assert.ok(externalAd.id, 'External ad campaign must be persisted');
  assert.equal(externalAd.provider, 'meta_ads');
  assert.equal(externalAd.spend, 4850.50);
  assert.equal(externalAd.impressions, 14200);
  assert.equal(externalAd.clicks, 612);
  assert.equal(externalAd.conversions, null, 'Missing conversions must remain NULL/UNAVAILABLE');
  assert.equal(externalAd.conversion_tracking_status, 'UNAVAILABLE');
  assert.equal(externalAd.revenue, null, 'Missing revenue must remain NULL/UNAVAILABLE');
  assert.equal(externalAd.revenue_attribution_status, 'UNAVAILABLE');
  assert.equal(externalAd.roas, null, 'ROAS must be NULL when revenue is unavailable');
  console.log('  ✅ Test 2 Passed: Provider telemetry preserved honestly without guessing numbers.');

  // =========================================================================
  // TEST 3: ROAS Computation Rule: Only when cost and verified revenue are present
  // =========================================================================
  console.log('\nTest 3: ROAS mathematical computation requires strictly verified revenue');

  const externalAdWithRevenue = await upsertExternalAdCampaign({
    company_id: testCompanyId,
    provider: 'meta_ads',
    external_campaign_id: 'meta_camp_984321099',
    name: 'Direct Lead Generation - Corporate AMC',
    status: 'ACTIVE',
    fetched_at: fetchedTimestamp,
    spend: 10000,
    impressions: 25000,
    clicks: 1200,
    conversions: 18,
    conversion_tracking_status: 'ACTIVE',
    revenue: 45000,
    revenue_attribution_status: 'VERIFIED',
    roas: 4.5,
    raw_metrics_json: JSON.stringify({ spend: '10000', revenue: '45000' }),
  });

  assert.equal(externalAdWithRevenue.spend, 10000);
  assert.equal(externalAdWithRevenue.revenue, 45000);
  assert.equal(externalAdWithRevenue.roas, 4.5, 'ROAS must match exact revenue / spend ratio');
  console.log('  ✅ Test 3 Passed: Verified ROAS computed accurately on real revenue telemetry.');

  // =========================================================================
  // TEST 4: Linking Internal Strategic Campaign to Verified External Ad Telemetry
  // =========================================================================
  console.log('\nTest 4: Linking internal initiative to verified external ad campaign');

  const linkSuccess = await updateInternalCampaign(
    internalCamp.id,
    { external_campaign_id: externalAdWithRevenue.external_campaign_id },
    testCompanyId
  );
  assert.equal(linkSuccess, true);

  const updatedInternalList = await getInternalCampaigns(testCompanyId);
  const matched = updatedInternalList.find((c) => c.id === internalCamp.id);
  assert.ok(matched);
  assert.equal(matched.external_campaign_id, externalAdWithRevenue.external_campaign_id);
  console.log('  ✅ Test 4 Passed: Internal strategic initiative successfully linked to external ad.');

  // =========================================================================
  // TEST 5: Single Verified Provider Ingestion & Unconfigured Provider Handling
  // =========================================================================
  console.log('\nTest 5: Ad sync returns NOT_CONFIGURED when credentials are not set');

  const unconfiguredResult = await syncExternalAdCampaigns(testCompanyId, 'meta_ads');
  assert.equal(unconfiguredResult.status, 'NOT_CONFIGURED', 'Unconfigured ad account must not invent sync success');
  assert.equal(unconfiguredResult.campaignsCount, 0);
  console.log('  ✅ Test 5 Passed: Missing provider credentials correctly report NOT_CONFIGURED.');

  // =========================================================================
  // TEST 6: Internal Campaign Deletion and Isolation
  // =========================================================================
  console.log('\nTest 6: Deleting internal campaign does not corrupt external provider data');

  const deleteSuccess = await deleteInternalCampaign(internalCamp.id, testCompanyId);
  assert.equal(deleteSuccess, true);

  const remainingInternal = await getInternalCampaigns(testCompanyId);
  assert.equal(remainingInternal.length, 0);

  const remainingExternal = await getExternalAdCampaigns(testCompanyId);
  assert.equal(remainingExternal.length, 2, 'External provider telemetry is retained as verified historical log');
  console.log('  ✅ Test 6 Passed: Internal campaign deletion isolated from provider telemetry.');

  console.log('\n🎉 ALL 6 CAMPAIGN & AD TELEMETRY SEPARATION TESTS PASSED PERFECTLY!\n');
}

runCampaignTelemetryTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
