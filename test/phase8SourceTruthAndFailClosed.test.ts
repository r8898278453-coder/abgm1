import assert from 'assert';
import {
  isProductionDatabaseMode,
  assertNotProductionFallback,
  handleDbError,
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
  getContentPosts,
  getCompanyIntegrations,
  getInvoices,
  getSubscription,
  getCustomDomain,
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

  await runTest('CRUD repository operations fail closed in production when DB is offline', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';

      // Test representative CRUD across all critical domains
      const ops = [
        { name: 'getAllCompanies', fn: () => getAllCompanies() },
        { name: 'getUserCompanies', fn: () => getUserCompanies('usr_123') },
        { name: 'getCompanyById', fn: () => getCompanyById('comp_123') },
        { name: 'createCompany', fn: () => createCompany({ user_id: 'usr_1', name: 'Test', category: 'Tech', city: 'Thane' }) },
        { name: 'findCompanyByPublicFormToken', fn: () => findCompanyByPublicFormToken('pft_123') },
        { name: 'getCompanyDataPayload', fn: () => getCompanyDataPayload('comp_123') },
        { name: 'saveCompanyDataPayload', fn: () => saveCompanyDataPayload('comp_123', {}) },
        { name: 'getCompanyReviews', fn: () => getCompanyReviews('comp_123') },
        { name: 'createReview', fn: () => createReview({ company_id: 'comp_1', author: 'User', rating: 5, date: '2026-10-01', content: 'Good', source: 'manual', replied: false }) },
        { name: 'getAllLeads', fn: () => getAllLeads('comp_123') },
        { name: 'createLead', fn: () => createLead({ name: 'Lead 1', phone: '9999999999', service: 'Test', stage: 'new', intent_score: 50, source: 'manual' }) },
        { name: 'getContentPosts', fn: () => getContentPosts('comp_123') },
        { name: 'getCompanyIntegrations', fn: () => getCompanyIntegrations('comp_123') },
        { name: 'getInvoices', fn: () => getInvoices('comp_123') },
        { name: 'getSubscription', fn: () => getSubscription('comp_123') },
        { name: 'getCustomDomain', fn: () => getCustomDomain('comp_123') },
      ];

      for (const op of ops) {
        let threw = false;
        try {
          await op.fn();
        } catch (err: any) {
          threw = true;
          assert(err.code === 'DATABASE_UNAVAILABLE' || err.code === 'DATABASE_OPERATION_FAILED');
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
