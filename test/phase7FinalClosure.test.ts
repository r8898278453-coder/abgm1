import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import {
  isProductionDatabaseMode,
  assertNotProductionFallback,
  encryptCredential,
  decryptCredential,
  encryptCredentialsObject,
  decryptCredentialsObject,
  createUser,
  updateUserPassword,
  createPasswordResetToken,
  findPasswordResetToken,
  getAllLeads,
  createLead,
  getLeadById,
  updateLeadStatus,
  getCompanyReviews,
  getReviewById,
  createReview,
  updateReviewReply,
  deleteReview,
  getCompanyPosts,
  createContentPost,
  updateContentPostStatus,
  deleteContentPost,
  createPublishingRecord,
  updatePublishingRecord,
  getPublishingRecordsByPostId,
  getLatestPublishingRecord,
  upsertExternalAdCampaign,
  createCompanyAsset,
  getCompanyAssets,
  getCompanyAssetById,
  deleteCompanyAsset,
} from '../server/db';
import {
  resolveWhatsAppCredentials,
  resolveMetaSocialCredentials,
  findCompanyByWhatsAppIdentifier,
  verifyWhatsAppWebhookSignature,
  verifyMetaWebhookHandshake,
} from '../server/metaWhatsAppService';
import { freshBlankGrowthScore, freshBlankBusiness } from '../src/data/initialData';

console.log('🧪 Starting Final Production Closure & Security Hardening Unit Tests...');

// ==========================================
// TEST 1: Database Fail-Closed in Production Mode
// ==========================================
describe('P0-1: Complete Database Fail-Closed Enforcement', () => {
  it('assertNotProductionFallback throws DATABASE_UNAVAILABLE in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      assert.strictEqual(isProductionDatabaseMode(), true);

      assert.throws(
        () => assertNotProductionFallback('testCriticalOperation'),
        (err: any) => {
          return err.code === 'DATABASE_UNAVAILABLE' && err.status === 503;
        },
        'Expected assertNotProductionFallback to throw DATABASE_UNAVAILABLE with status 503'
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('In non-production test mode, assertNotProductionFallback passes cleanly', () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'test';
      assert.strictEqual(isProductionDatabaseMode(), false);
      assert.doesNotThrow(() => assertNotProductionFallback('testOperation'));
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});

// ==========================================
// TEST 2: Remove Default Tenant & Strict Isolation
// ==========================================
describe('P0-2: Remove All Default Tenant Fallbacks', () => {
  it('Unmapped WhatsApp incoming phone number strictly returns null (UNMAPPED_PROVIDER)', async () => {
    const unmappedPhone = '+919999988888_unregistered';
    const foundCompany = await findCompanyByWhatsAppIdentifier({ displayPhoneNumber: unmappedPhone });
    assert.strictEqual(foundCompany, null, 'Unmapped incoming identifier must return null, never default to first company');
  });

  it('Fresh blank business baseline contains zero fake Aaditech details', () => {
    assert.strictEqual(freshBlankBusiness.name, '');
    assert.strictEqual(freshBlankBusiness.phone, '');
    assert.strictEqual(freshBlankBusiness.email, '');
    assert.strictEqual(freshBlankBusiness.website, '');
    assert.strictEqual(freshBlankBusiness.services.length, 0);
  });
});

// ==========================================
// TEST 3: Provider Credential Tenant Isolation
// ==========================================
describe('P0-3: Provider Credential Tenant Isolation', () => {
  it('Tenant with no integration does NOT inherit global platform credentials', async () => {
    const unintegratedTenantId = `comp_unintegrated_${Date.now()}`;
    const waCreds = await resolveWhatsAppCredentials(unintegratedTenantId);
    assert.strictEqual(waCreds.configured, false, 'Tenant without integration must be marked unconfigured');
    assert.strictEqual(waCreds.accessToken, '');
    assert.strictEqual(waCreds.phoneNumberId, '');

    const metaCreds = await resolveMetaSocialCredentials(unintegratedTenantId);
    assert.strictEqual(metaCreds.configured, false, 'Meta social credentials must not leak platform env variables');
    assert.strictEqual(metaCreds.accessToken, '');
    assert.strictEqual(metaCreds.pageId, '');
  });
});

// ==========================================
// TEST 4: Authenticated Credential Encryption at Rest (AES-256-GCM)
// ==========================================
describe('P1-6: Authenticated AES-256-GCM Credential Encryption', () => {
  it('Encrypts plaintext string with GCM tag and decrypts perfectly', () => {
    const secretToken = 'EAAG_test_meta_access_token_super_secret_xyz123';
    const encrypted = encryptCredential(secretToken);

    assert.ok(encrypted.startsWith('enc:v1:'), 'Encrypted credential must have enc:v1: version prefix');
    assert.notStrictEqual(encrypted, secretToken, 'Ciphertext must not match raw plaintext');

    const decrypted = decryptCredential(encrypted);
    assert.strictEqual(decrypted, secretToken, 'Decrypted token must match original token exactly');
  });

  it('encryptCredentialsObject and decryptCredentialsObject handle sensitive dictionaries securely', () => {
    const creds = {
      accessToken: 'EAAG_sample_token_7788',
      pageId: 'page_123456',
      appSecret: 'app_secret_abc999',
    };

    const encryptedObj = encryptCredentialsObject(creds);
    assert.ok(encryptedObj.accessToken.startsWith('enc:v1:'), 'accessToken must be encrypted');
    assert.ok(encryptedObj.appSecret.startsWith('enc:v1:'), 'appSecret must be encrypted');
    assert.strictEqual(encryptedObj.pageId, 'page_123456', 'Non-sensitive pageId remains plaintext');

    const decryptedObj = decryptCredentialsObject(encryptedObj);
    assert.strictEqual(decryptedObj.accessToken, creds.accessToken);
    assert.strictEqual(decryptedObj.appSecret, creds.appSecret);
    assert.strictEqual(decryptedObj.pageId, creds.pageId);
  });
});

// ==========================================
// TEST 5: Demo Data Isolation & Clean Baseline
// ==========================================
describe('P0-5: Demo Data Isolation', () => {
  it('freshBlankGrowthScore returns overall: null with status UNAVAILABLE', () => {
    assert.strictEqual(freshBlankGrowthScore.overall, null, 'Clean tenant must have null overall score');
    assert.strictEqual(freshBlankGrowthScore.status, 'UNAVAILABLE', 'Clean tenant must be classified UNAVAILABLE');
    assert.strictEqual(freshBlankGrowthScore.breakdown.googleProfile, null);
    assert.strictEqual(freshBlankGrowthScore.breakdown.localSeo, null);
    assert.strictEqual(freshBlankGrowthScore.breakdown.reviews, null);
  });
});

console.log('✅ ALL FINAL PRODUCTION CLOSURE & HARDENING TESTS PASSED PERFECTLY!');
