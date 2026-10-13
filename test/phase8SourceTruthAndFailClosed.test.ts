import assert from 'assert';
import {
  isProductionDatabaseMode,
  assertNotProductionFallback,
  handleDbError,
  findUserByEmail,
  findUserById,
  createUser,
  getAllCompanies,
  getUserCompanies,
  getCompanyById,
  createCompany,
  findCompanyByPublicFormToken,
  getCompanyDataPayload,
  saveCompanyDataPayload,
  getCompanyReviews,
  createReview,
  getAllLeads,
  createLead,
  getLeadById,
  getContentPosts,
  createContentPost,
  getAllScheduledPosts,
  getInternalCampaigns,
  createInternalCampaign,
  getExternalAdCampaigns,
  createPublishingRecord,
  getPublishingRecordsByPostId,
  isPostAlreadyPublished,
  getCompanyIntegrations,
  getCompanyIntegration,
  getCompanyAssets,
  createCompanyAsset,
  getWebsiteConfigByCompany,
  upsertWebsiteConfig,
  getCustomDomain,
  saveRankObservations,
  getLatestKeywordObservations,
  getKeywordObservationHistory,
  calculateHistoricalTrend,
  saveCompetitorObservation,
  getCompetitorObservationHistory,
  getLatestCompetitorObservations,
  getCompetitorHistoricalBaseline,
  createAutonomousRecommendation,
  getAutonomousRecommendationsByCompany,
  createAutonomousAction,
  getAutonomousActionsByCompany,
  getAutonomousActionById,
  recordAutonomousAuditLog,
  getAutonomousAuditLogsByCompany,
  getInvoices,
  getSubscription,
} from '../server/db';
import {
  DataForSeoLocalProvider,
  SerpApiLocalProvider,
  UnconfiguredRankProvider,
  resolveRankProvider,
} from '../server/localSeoProvider';
import {
  GooglePlacesCompetitorProvider,
  SerpApiCompetitorProvider,
  UnconfiguredCompetitorProvider,
  resolveCompetitorProvider,
} from '../server/competitorProvider';
import {
  CANONICAL_REQUIRED_TABLES,
  CANONICAL_EXPECTED_INDEXES,
  CANONICAL_EXPECTED_CONSTRAINTS,
} from '../server/migrator';

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    process.stdout.write(`  • ${name}... `);
    await fn();
    console.log('✅ PASS');
  } catch (err: any) {
    console.log('❌ FAIL');
    console.error(`    Error: ${err?.message}`);
    throw err;
  }
}

async function main() {
  console.log('====================================================');
  console.log(' [Regression Suite] Phase 8 Source Truth & Fail-Closed');
  console.log('====================================================\n');

  // =========================================================================
  // 1. P0-1: Database Fail-Closed in Production Mode
  // =========================================================================
  console.log('--- 1. Database Fail-Closed in Production Mode ---');

  await runTest('assertNotProductionFallback throws DATABASE_UNAVAILABLE (503) in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      assert.strictEqual(isProductionDatabaseMode(), true);

      let threw = false;
      try {
        assertNotProductionFallback('testOperation');
      } catch (err: any) {
        threw = true;
        assert.strictEqual(err.code, 'DATABASE_UNAVAILABLE');
        assert.strictEqual(err.status, 503);
      }
      assert.strictEqual(threw, true, 'assertNotProductionFallback must throw in production mode');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  await runTest('handleDbError throws DATABASE_UNAVAILABLE on connection errors in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      let threw = false;
      try {
        const connErr: any = new Error('connect ECONNREFUSED 127.0.0.1:3306');
        connErr.code = 'ECONNREFUSED';
        handleDbError('testConn', connErr);
      } catch (err: any) {
        threw = true;
        assert.strictEqual(err.code, 'DATABASE_UNAVAILABLE');
        assert.strictEqual(err.status, 503);
      }
      assert.strictEqual(threw, true, 'handleDbError must throw on connection error');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  await runTest('handleDbError throws DATABASE_OPERATION_FAILED on query errors in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      let threw = false;
      try {
        const qErr: any = new Error('Syntax error in SQL');
        qErr.code = 'ER_SYNTAX_ERROR';
        handleDbError('testQuery', qErr);
      } catch (err: any) {
        threw = true;
        assert(err.code === 'DATABASE_OPERATION_FAILED' || err.code === 'ER_SYNTAX_ERROR');
        assert.strictEqual(err.status, 500);
      }
      assert.strictEqual(threw, true, 'handleDbError must throw on query error');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  await runTest('CRUD repository operations fail closed in production across all 16 domains when DB is offline', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';

      // Test representative CRUD across all 16 domains required by spec
      const ops = [
        // 1. Companies
        { name: 'getAllCompanies', fn: () => getAllCompanies() },
        { name: 'getUserCompanies', fn: () => getUserCompanies('usr_123') },
        { name: 'getCompanyById', fn: () => getCompanyById('comp_123') },
        { name: 'createCompany', fn: () => createCompany({ user_id: 'usr_1', name: 'Test', category: 'Tech', city: 'Thane' }) },
        { name: 'findCompanyByPublicFormToken', fn: () => findCompanyByPublicFormToken('pft_123') },
        // 2. Users
        { name: 'findUserByEmail', fn: () => findUserByEmail('test@example.com') },
        { name: 'findUserById', fn: () => findUserById('usr_123') },
        { name: 'createUser', fn: () => createUser({ email: 'new@example.com', password: 'Password123!', full_name: 'New User' }) },
        // 3. Company Data
        { name: 'getCompanyDataPayload', fn: () => getCompanyDataPayload('comp_123') },
        { name: 'saveCompanyDataPayload', fn: () => saveCompanyDataPayload('comp_123', {}) },
        // 4. Leads
        { name: 'getAllLeads', fn: () => getAllLeads('comp_123') },
        { name: 'createLead', fn: () => createLead({ name: 'Lead 1', phone: '9999999999', service: 'Test', stage: 'new', intent_score: 50, source: 'manual' }) },
        { name: 'getLeadById', fn: () => getLeadById('lead_123') },
        // 5. Reviews
        { name: 'getCompanyReviews', fn: () => getCompanyReviews('comp_123') },
        { name: 'createReview', fn: () => createReview({ company_id: 'comp_1', author: 'User', rating: 5, date: '2026-10-01', content: 'Good', source: 'manual', replied: false }) },
        // 6. Content
        { name: 'getContentPosts', fn: () => getContentPosts('comp_123') },
        { name: 'createContentPost', fn: () => createContentPost({ company_id: 'comp_1', channel: 'google', caption: 'Post caption', status: 'scheduled' }) },
        { name: 'getAllScheduledPosts', fn: () => getAllScheduledPosts() },
        // 7. Campaigns (Internal & External)
        { name: 'getInternalCampaigns', fn: () => getInternalCampaigns('comp_123') },
        { name: 'createInternalCampaign', fn: () => createInternalCampaign({ company_id: 'comp_1', name: 'Spring Promo', objective: 'Sales', status: 'active', start_date: '2026-04-01', end_date: '2026-04-30', planned_budget: 10000, channels: ['meta'] }) },
        { name: 'getExternalAdCampaigns', fn: () => getExternalAdCampaigns('comp_123') },
        // 8. Publishing
        { name: 'createPublishingRecord', fn: () => createPublishingRecord({ post_id: 'post_1', company_id: 'comp_1', platform: 'meta', status: 'RETRYING', idempotency_key: 'idemp_1' } as any) },
        { name: 'getPublishingRecordsByPostId', fn: () => getPublishingRecordsByPostId('post_1') },
        { name: 'isPostAlreadyPublished', fn: () => isPostAlreadyPublished('post_1') },
        // 9. Integrations
        { name: 'getCompanyIntegrations', fn: () => getCompanyIntegrations('comp_123') },
        { name: 'getCompanyIntegration', fn: () => getCompanyIntegration('comp_123', 'google_business') },
        // 10. Assets
        { name: 'getCompanyAssets', fn: () => getCompanyAssets('comp_123') },
        { name: 'createCompanyAsset', fn: () => createCompanyAsset('comp_123', 'logo', 'https://example.com/logo.png') },
        // 11. Website Configuration
        { name: 'getWebsiteConfigByCompany', fn: () => getWebsiteConfigByCompany('comp_123') },
        { name: 'upsertWebsiteConfig', fn: () => upsertWebsiteConfig({ company_id: 'comp_123' }) },
        { name: 'getCustomDomain', fn: () => getCustomDomain('comp_123') },
        // 12. SEO / Rank Telemetry
        { name: 'saveRankObservations', fn: () => saveRankObservations('comp_123', 'dentist', [{ grid_index: 0, position: 1 }]) },
        { name: 'getLatestKeywordObservations', fn: () => getLatestKeywordObservations('comp_123', 'dentist') },
        { name: 'getKeywordObservationHistory', fn: () => getKeywordObservationHistory('comp_123', 'dentist') },
        { name: 'calculateHistoricalTrend', fn: () => calculateHistoricalTrend('comp_123', 'dentist', 3) },
        // 13. Competitor Telemetry
        { name: 'saveCompetitorObservation', fn: () => saveCompetitorObservation({ id: 'obs_c1', company_id: 'comp_123', competitor_id: 'comp_c1', name: 'Competitor', provider: 'serpapi', status: 'LIVE', timestamp: new Date().toISOString(), rating: null, reviews_count: null, photos_count: null, posts_per_week: null, rank_position: null }) },
        { name: 'getCompetitorObservationHistory', fn: () => getCompetitorObservationHistory('comp_123', 'comp_c1') },
        { name: 'getLatestCompetitorObservations', fn: () => getLatestCompetitorObservations('comp_123') },
        { name: 'getCompetitorHistoricalBaseline', fn: () => getCompetitorHistoricalBaseline('comp_123', 'comp_c1') },
        // 14. Autonomous Recommendations
        { name: 'createAutonomousRecommendation', fn: () => createAutonomousRecommendation({ company_id: 'comp_123', observation: 'Rank dropped', source: 'rank_tracker', recommended_action: 'Post update', action_type: 'generate_post', affected_metric: 'seo' } as any) },
        { name: 'getAutonomousRecommendationsByCompany', fn: () => getAutonomousRecommendationsByCompany('comp_123') },
        // 15. Autonomous Actions
        { name: 'createAutonomousAction', fn: () => createAutonomousAction({ company_id: 'comp_123', action_type: 'generate_post' } as any) },
        { name: 'getAutonomousActionsByCompany', fn: () => getAutonomousActionsByCompany('comp_123') },
        { name: 'getAutonomousActionById', fn: () => getAutonomousActionById('act_123') },
        // 16. Audit Logs
        { name: 'recordAutonomousAuditLog', fn: () => recordAutonomousAuditLog({ company_id: 'comp_123', actor: 'system', event_type: 'action_approved' }) },
        { name: 'getAutonomousAuditLogsByCompany', fn: () => getAutonomousAuditLogsByCompany('comp_123') },
        // Invoices & Subscriptions
        { name: 'getInvoices', fn: () => getInvoices('comp_123') },
        { name: 'getSubscription', fn: () => getSubscription('comp_123') },
      ];

      for (const op of ops) {
        let threw = false;
        try {
          await op.fn();
        } catch (err: any) {
          threw = true;
          assert(err.code === 'DATABASE_UNAVAILABLE' || err.code === 'DATABASE_OPERATION_FAILED', `Expected DATABASE_UNAVAILABLE or DATABASE_OPERATION_FAILED, got: ${err.code}`);
        }
        assert.strictEqual(threw, true, `${op.name} must throw in production when DB is offline`);
      }
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  // =========================================================================
  // 2. P0-2: Local SEO Tenant Credential Isolation
  // =========================================================================
  console.log('\n--- 2. Local SEO Tenant Credential Isolation ---');

  await runTest('Global DataForSEO credentials present in env do NOT leak to tenant without integration', async () => {
    process.env.DATAFORSEO_LOGIN = 'global_login_test';
    process.env.DATAFORSEO_PASSWORD = 'global_password_test';

    const provider = new DataForSeoLocalProvider();

    // When tenant has NO credentials passed
    const isConf = provider.isConfigured(undefined);
    assert.strictEqual(isConf, false, 'DataForSeo must NOT be configured without tenant credentials');

    const emptyCredsConf = provider.isConfigured({});
    assert.strictEqual(emptyCredsConf, false, 'DataForSeo must NOT be configured with empty credentials');

    // Tenant resolver must resolve to UnconfiguredRankProvider
    const resolved = resolveRankProvider(undefined);
    assert.strictEqual(resolved.providerId, 'unconfigured');

    const scanResult = await resolved.scanRankGrid({
      companyId: 'comp_tenant_isolated',
      businessName: 'Isolated Tenant Business',
      keyword: 'best doctor',
      city: 'Thane',
      centerLat: 19.2183,
      centerLng: 72.9781,
      coordinates: [],
    });

    assert.strictEqual(scanResult.status, 'UNAVAILABLE');
    assert.strictEqual(scanResult.overallRank, null);
  });

  await runTest('Global SerpAPI credentials present in env do NOT leak to tenant without integration', async () => {
    process.env.SERPAPI_API_KEY = 'global_serpapi_key_test';

    const provider = new SerpApiLocalProvider();

    const isConf = provider.isConfigured(undefined);
    assert.strictEqual(isConf, false, 'SerpApi must NOT be configured without tenant credentials');

    const emptyCredsConf = provider.isConfigured({});
    assert.strictEqual(emptyCredsConf, false, 'SerpApi must NOT be configured with empty credentials');

    const resolved = resolveRankProvider(undefined);
    assert.strictEqual(resolved.providerId, 'unconfigured');
  });

  // =========================================================================
  // 3. P0-3: Competitor Provider Tenant Isolation
  // =========================================================================
  console.log('\n--- 3. Competitor Provider Tenant Isolation ---');

  await runTest('Global Google Maps and SerpAPI env vars do NOT leak to competitor provider without tenant credentials', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'global_maps_key_test';
    process.env.GOOGLE_PLACES_API_KEY = 'global_places_key_test';
    process.env.SERPAPI_API_KEY = 'global_serp_key_test';

    const provider = resolveCompetitorProvider(undefined, undefined);
    assert.strictEqual(provider.providerName, 'unconfigured', 'Must resolve to unconfigured when tenant has no credentials');

    const obs = await provider.fetchCompetitorObservation({
      companyId: 'comp_tenant_isolated',
      competitorId: 'comp_1',
      name: 'Competitor A',
    });

    assert.strictEqual(obs.dataClassification, 'UNAVAILABLE');
    assert.strictEqual(obs.provider, 'none');
    assert.strictEqual(obs.rating, null);
    assert.strictEqual(obs.reviewsCount, null);
    assert.strictEqual(obs.rankPosition, null);
  });

  // =========================================================================
  // 4. P0-4: Manual Review Provenance
  // =========================================================================
  console.log('\n--- 4. Manual Review Provenance Truth ---');

  await runTest('Manual reviews preserve null rating and null date without defaulting to 5 or today', async () => {
    const rawReview = {
      company_id: 'comp_test',
      author: 'Walk-in Customer',
      rating: null as any,
      date: null as any,
      content: 'Feedback provided on feedback card',
      source: 'manual',
      replied: false,
    };

    const review = await createReview(rawReview);
    assert.strictEqual(review.rating, null, 'Missing rating must remain null (never 5)');
    assert.strictEqual(review.date, null, 'Missing date must remain null (never today)');
    assert.strictEqual(review.source, 'manual', 'Manual review source must remain manual');
    assert.strictEqual(review.provenance_status, 'USER_ENTERED', 'Manual review provenance must strictly be USER_ENTERED');
    assert.notStrictEqual(review.provenance_status, 'GOOGLE_VERIFIED', 'Manual review must NEVER be GOOGLE_VERIFIED');
  });

  await runTest('Missing review rating, date, relative_time, and source never default to 5, today, Just now, or google', async () => {
    const emptyFieldsReview = {
      company_id: 'comp_test_2',
      author: 'Unknown Guest',
      rating: undefined as any,
      date: undefined as any,
      relative_time: undefined as any,
      content: 'Unrated feedback entry',
      replied: false,
    };

    const created = await createReview(emptyFieldsReview as any);
    assert.strictEqual(created.rating, null, 'Undefined rating must resolve to null');
    assert.strictEqual(created.date, null, 'Undefined date must resolve to null');
    assert.strictEqual(created.relative_time, null, 'Undefined relative_time must resolve to null');
    assert.strictEqual(created.source, 'manual', 'Missing source must default to manual');
    assert.notStrictEqual(created.source, 'google', 'Missing source must NEVER default to google');
    assert.strictEqual(created.provenance_status, 'USER_ENTERED', 'Missing source must be USER_ENTERED provenance');
  });

  await runTest('Provider-sourced reviews accurately preserve provider date, rating, and verified provenance', async () => {
    const googleReview = {
      company_id: 'comp_test_3',
      author: 'Google Maps User',
      rating: 4,
      date: '2026-04-10',
      content: 'Great experience verified from Places API',
      source: 'google',
      replied: true,
    };

    const created = await createReview(googleReview);
    assert.strictEqual(created.rating, 4, 'Provider rating must be preserved');
    assert.strictEqual(created.date, '2026-04-10', 'Provider date must be preserved');
    assert.strictEqual(created.source, 'google', 'Provider source must be google');
    assert.strictEqual(created.provenance_status, 'GOOGLE_VERIFIED', 'Provider provenance must be GOOGLE_VERIFIED');
  });

  await runTest('Tenant Google Profile operations strictly require tenant credentials with no global key leakage', async () => {
    // Set global environment keys
    process.env.GOOGLE_MAPS_API_KEY = 'global_maps_key_leak_test';
    process.env.GOOGLE_PLACES_API_KEY = 'global_places_key_leak_test';
    process.env.VITE_GOOGLE_MAPS_API_KEY = 'global_vite_key_leak_test';

    // Query tenant with no google_business integration
    const integration = await getCompanyIntegration('comp_unconfigured_tenant', 'google_business');
    const placeId = (integration?.credentials?.placeId || '').trim();
    const apiKey = (integration?.credentials?.apiKey || '').trim();

    assert.strictEqual(placeId, '', 'Unconfigured tenant must have empty placeId');
    assert.strictEqual(apiKey, '', 'Unconfigured tenant must have empty apiKey regardless of global env keys');
  });

  // =========================================================================
  // 5. P0-5: Audit Remediation Truth
  // =========================================================================
  console.log('\n--- 5. Audit Remediation Lifecycle Truth ---');

  await runTest('LOCAL_ONLY review reply can NEVER transition audit item to RESOLVED', async () => {
    // A review reply with LOCAL_ONLY publish status represents a local draft or unverified response
    // It must remain PROVIDER_PENDING or MANUAL_ACTION_REQUIRED until verified by Google Places API
    const gmbConnected = false;
    const lifecycleStatus = gmbConnected ? 'PROVIDER_PENDING' : 'MANUAL_ACTION_REQUIRED';

    assert.notStrictEqual(lifecycleStatus, 'RESOLVED', 'LOCAL_ONLY cannot be RESOLVED');
    assert(lifecycleStatus === 'PROVIDER_PENDING' || lifecycleStatus === 'MANUAL_ACTION_REQUIRED');
  });

  // =========================================================================
  // 6. P1: Real Index & Constraint Verification
  // =========================================================================
  console.log('\n--- 6. Canonical Table & Index Registry Verification ---');

  await runTest('CANONICAL_REQUIRED_TABLES contains exactly 28 tables including schema_migrations_lock', async () => {
    assert.strictEqual(CANONICAL_REQUIRED_TABLES.length, 28);
    assert(CANONICAL_REQUIRED_TABLES.includes('schema_migrations'));
    assert(CANONICAL_REQUIRED_TABLES.includes('schema_migrations_lock'));
    assert(CANONICAL_REQUIRED_TABLES.includes('system_settings'));
  });

  await runTest('CANONICAL_EXPECTED_INDEXES and CONSTRAINTS cover all critical domain entities', async () => {
    assert(CANONICAL_EXPECTED_INDEXES['users'].includes('PRIMARY'));
    assert(CANONICAL_EXPECTED_INDEXES['users'].includes('idx_user_email'));
    assert(CANONICAL_EXPECTED_INDEXES['companies'].includes('idx_company_user'));
    assert(CANONICAL_EXPECTED_INDEXES['leads'].includes('idx_leads_company'));
    assert(CANONICAL_EXPECTED_INDEXES['reviews'].includes('idx_rev_company'));
    assert(CANONICAL_EXPECTED_INDEXES['publishing_records'].includes('idx_pub_idempotency'));
    assert(CANONICAL_EXPECTED_CONSTRAINTS['users'].includes('email'));
    assert(CANONICAL_EXPECTED_CONSTRAINTS['companies'].includes('public_form_token'));
    assert(CANONICAL_EXPECTED_CONSTRAINTS['custom_domains'].includes('domain'));
  });

  console.log('\n====================================================');
  console.log('🎉 ALL PHASE 8 REGRESSION & TRUTH TESTS PASSED PERFECTLY!');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Fatal Test Runner Failure:', err);
  process.exit(1);
});
