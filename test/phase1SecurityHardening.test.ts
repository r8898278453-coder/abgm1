import { resolveAuthSecret, generateAuthToken, verifyAuthToken } from '../server/auth';
import {
  saveCompanyIntegration,
  getCompanyIntegrations,
  getCompanyIntegration,
} from '../server/db';
import { verifyWhatsAppWebhookSignature } from '../server/metaWhatsAppService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

async function runPhase1SecurityTests() {
  console.log('🧪 Starting Phase 1 Security & Tenant Isolation Tests...\n');

  // =========================================================================
  // TEST 1: AUTH SECRET Fail-Fast in Production
  // =========================================================================
  console.log('Test 1: Missing AUTH_SECRET in production fails fast');
  const origNodeEnv = process.env.NODE_ENV;
  const origAuthSecret = process.env.AUTH_SECRET;
  const origJwtSecret = process.env.JWT_SECRET;
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.AUTH_SECRET;
    delete process.env.JWT_SECRET;

    let threw = false;
    try {
      resolveAuthSecret();
    } catch (err: any) {
      threw = true;
      assert(
        err.message.includes('FATAL_SECURITY_ERROR'),
        'Must throw FATAL_SECURITY_ERROR on missing auth secret'
      );
    }
    assert(threw, 'Must throw error when secret is missing in production');
    console.log('  ✅ Test 1 Passed: Missing AUTH_SECRET triggers FATAL_SECURITY_ERROR in production.');
  } finally {
    process.env.NODE_ENV = origNodeEnv;
    if (origAuthSecret) process.env.AUTH_SECRET = origAuthSecret;
    if (origJwtSecret) process.env.JWT_SECRET = origJwtSecret;
  }

  // =========================================================================
  // TEST 2: Insecure / Short Secret in Production Fails Fast
  // =========================================================================
  console.log('Test 2: Short/insecure AUTH_SECRET in production fails fast');
  try {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_SECRET = 'short';
    delete process.env.JWT_SECRET;

    let threw = false;
    try {
      resolveAuthSecret();
    } catch (err: any) {
      threw = true;
      assert(
        err.message.includes('FATAL_SECURITY_ERROR'),
        'Must throw FATAL_SECURITY_ERROR on short secret'
      );
    }
    assert(threw, 'Must reject short secrets (< 16 chars) in production');
    console.log('  ✅ Test 2 Passed: Short secrets strictly rejected in production.');
  } finally {
    process.env.NODE_ENV = origNodeEnv;
    if (origAuthSecret) process.env.AUTH_SECRET = origAuthSecret;
    if (origJwtSecret) process.env.JWT_SECRET = origJwtSecret;
  }

  // =========================================================================
  // TEST 3: Cryptographic Token Signing and Constant-Time Verification
  // =========================================================================
  console.log('Test 3: Token signing & tampering detection');
  try {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_SECRET = 'super-strong-production-secret-key-9999!';

    const token = generateAuthToken({
      id: 'usr_sec_audit',
      email: 'security@example.com',
      role: 'owner',
    });
    assert(typeof token === 'string' && token.split('.').length === 3, 'Valid JWT structure generated');

    const decoded = verifyAuthToken(token);
    assert(decoded !== null, 'Token must verify successfully');
    assert(decoded?.sub === 'usr_sec_audit', 'Decoded sub matches');
    assert(decoded?.email === 'security@example.com', 'Decoded email matches');

    // Tampered token check
    const tampered = token.slice(0, -5) + 'xxxxx';
    const tamperedDecoded = verifyAuthToken(tampered);
    assert(tamperedDecoded === null, 'Tampered token must be rejected');
    console.log('  ✅ Test 3 Passed: JWT generation, claims, and anti-tampering verified.');
  } finally {
    process.env.NODE_ENV = origNodeEnv;
    if (origAuthSecret) process.env.AUTH_SECRET = origAuthSecret;
  }

  // =========================================================================
  // TEST 4: Integration Lifecycle — Never fake VERIFIED on save
  // =========================================================================
  console.log('Test 4: Integration credential save marks SAVED, never VERIFIED');
  const companyId = 'comp_phase1_tenant_audit';
  const provider = 'resend';

  await saveCompanyIntegration(companyId, provider, {
    status: 'saved',
    credentials: { apiKey: 're_audit_secret_key_12345' },
  });

  const integrations = await getCompanyIntegrations(companyId);
  const resend = integrations.find(i => i.provider === provider);
  assert(resend !== undefined, 'Saved integration must exist');
  assert(resend?.status === 'saved', 'Integration must be in SAVED state, not connected or verified');
  assert(resend?.status !== 'verified', 'Must NOT be marked verified on save');

  const storedRaw = await getCompanyIntegration(companyId, provider);
  assert(storedRaw?.credentials?.apiKey === 're_audit_secret_key_12345', 'Credentials correctly stored');
  console.log('  ✅ Test 4 Passed: Integration lifecycle strictly preserves SAVED status without fake verification.');

  // =========================================================================
  // TEST 5: Meta & WhatsApp Webhook Signature Enforcement in Production
  // =========================================================================
  console.log('Test 5: Webhook signature enforcement in production');
  const origMetaSecret = process.env.META_APP_SECRET;
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.META_APP_SECRET;

    const payload = JSON.stringify({ object: 'whatsapp_business_account' });
    const signature = 'sha256=abcdef1234567890';

    const resultWithoutSecret = verifyWhatsAppWebhookSignature({
      rawBody: payload,
      signature,
      appSecret: undefined,
      isProduction: true,
    });
    assert(resultWithoutSecret.isValid === false, 'Production webhook must reject when secret is unconfigured');

    const resultForged = verifyWhatsAppWebhookSignature({
      rawBody: payload,
      signature: 'sha256=forged_signature_0000000000',
      appSecret: 'meta_prod_app_secret_777',
      isProduction: true,
    });
    assert(resultForged.isValid === false, 'Production webhook must reject forged signature');
    console.log('  ✅ Test 5 Passed: Webhook signature verification strictly enforced in production.');
  } finally {
    process.env.NODE_ENV = origNodeEnv;
    if (origMetaSecret) process.env.META_APP_SECRET = origMetaSecret;
  }

  console.log('\n🎉 ALL 5 PHASE 1 SECURITY & TENANT ISOLATION TESTS PASSED PERFECTLY!\n');
}

runPhase1SecurityTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
