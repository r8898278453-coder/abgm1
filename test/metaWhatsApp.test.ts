import crypto from 'crypto';
import {
  resolveWhatsAppCredentials,
  resolveMetaSocialCredentials,
  findCompanyByWhatsAppIdentifier,
  verifyWhatsAppWebhookSignature,
  verifyMetaWebhookHandshake,
  publishToFacebookPage,
  publishToInstagram,
  sendWhatsAppCloudMessage,
} from '../server/metaWhatsAppService';
import { isWebhookEventProcessed, markWebhookEventProcessed } from '../server/billingService';
import { saveCompanyIntegration, createLead, getLeadById, updateContentPostStatus } from '../server/db';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

async function runMetaWhatsAppTests() {
  console.log('🧪 Starting Meta & WhatsApp Integration Production Hardening Tests...\n');

  const TEST_APP_SECRET = 'meta_test_secret_abcdef1234567890';
  const TEST_VERIFY_TOKEN = 'aaditech_bga_whatsapp_verify_token';

  // ----------------------------------------------------
  // TEST 1: Webhook Handshake Verification (hub.challenge)
  // ----------------------------------------------------
  console.log('Test 1: Meta Webhook Handshake Verification');
  const validHandshake = verifyMetaWebhookHandshake({
    mode: 'subscribe',
    token: TEST_VERIFY_TOKEN,
    challenge: '1122334455',
    expectedToken: TEST_VERIFY_TOKEN,
  });
  assert(validHandshake.verified === true, 'Valid handshake must pass verification');
  assert(validHandshake.challenge === '1122334455', 'Handshake must return challenge back');

  const invalidHandshake = verifyMetaWebhookHandshake({
    mode: 'subscribe',
    token: 'wrong_token',
    challenge: '1122334455',
    expectedToken: TEST_VERIFY_TOKEN,
  });
  assert(invalidHandshake.verified === false, 'Invalid token must fail handshake verification');
  console.log('  ✅ Test 1 Passed: Webhook handshake challenge verified correctly.');

  // ----------------------------------------------------
  // TEST 2: Inbound Webhook HMAC-SHA256 Signature Verification
  // ----------------------------------------------------
  console.log('Test 2: Inbound Webhook Signature Verification');
  const rawPayload = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'waba_test_9999',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '919876543210',
                phone_number_id: 'phone_id_9999',
              },
              contacts: [{ profile: { name: 'Rohan Sharma' }, wa_id: '919876543210' }],
              messages: [{ from: '919876543210', id: 'wamid.HBgLMTIzNDU2Nw==', timestamp: '1700000000', text: { body: 'Inquiry for AI ERP' }, type: 'text' }],
            },
          },
        ],
      },
    ],
  });

  const validSignature =
    'sha256=' +
    crypto.createHmac('sha256', TEST_APP_SECRET).update(rawPayload).digest('hex');

  const validSigResult = verifyWhatsAppWebhookSignature({
    rawBody: rawPayload,
    signature: validSignature,
    appSecret: TEST_APP_SECRET,
  });
  assert(validSigResult.isValid === true, 'Valid HMAC signature must pass');

  const invalidSigResult = verifyWhatsAppWebhookSignature({
    rawBody: rawPayload,
    signature: 'sha256=badsignature000000000000000000000000000000000000000000000000000000',
    appSecret: TEST_APP_SECRET,
  });
  assert(invalidSigResult.isValid === false, 'Tampered HMAC signature must be rejected');
  console.log('  ✅ Test 2 Passed: Cryptographic HMAC-SHA256 signature verification enforced.');

  // ----------------------------------------------------
  // TEST 3: Strict Multi-Tenant Mapping (No Generic Company Routing)
  // ----------------------------------------------------
  console.log('Test 3: Strict Multi-Tenant Mapping for Inbound Webhooks');
  const tenantCompanyId = 'comp_tenant_alpha_123';
  await saveCompanyIntegration(tenantCompanyId, 'whatsapp_cloud', {
    status: 'connected',
    credentials: {
      phoneNumberId: 'phone_id_9999',
      wabaId: 'waba_test_9999',
      accessToken: 'EAAB_test_token',
    },
  });

  const mappedCompany = await findCompanyByWhatsAppIdentifier({
    phoneNumberId: 'phone_id_9999',
    wabaId: 'waba_test_9999',
  });
  assert(mappedCompany === tenantCompanyId, `Tenant mapping must return ${tenantCompanyId}, got: ${mappedCompany}`);

  // Test unmatched tenant returns null (strictly NO generic fallback)
  const unmatchedCompany = await findCompanyByWhatsAppIdentifier({
    phoneNumberId: 'phone_id_unregistered_xyz',
    wabaId: 'waba_unregistered_xyz',
  });
  assert(unmatchedCompany === null, 'Unmatched WhatsApp identifiers must NOT route to generic company');
  console.log('  ✅ Test 3 Passed: Multi-tenant isolation verified with zero generic routing leaks.');

  // ----------------------------------------------------
  // TEST 4: Webhook Event Idempotency & Duplicate Prevention
  // ----------------------------------------------------
  console.log('Test 4: Inbound Webhook Event Idempotency');
  const testEventId = 'wamid.HBgLMTIzNDU2Nw==';
  const isProcessedBefore = await isWebhookEventProcessed(testEventId);
  assert(isProcessedBefore === false, 'New event must not be marked as processed');

  await markWebhookEventProcessed(testEventId, 'whatsapp_inbound_message', tenantCompanyId);
  const isProcessedAfter = await isWebhookEventProcessed(testEventId);
  assert(isProcessedAfter === true, 'Processed event must be marked as processed');
  console.log('  ✅ Test 4 Passed: Webhook event idempotency deduplication verified.');

  // ----------------------------------------------------
  // TEST 5: Unconfigured Credentials Handling (NOT_CONFIGURED & No Fake Success)
  // ----------------------------------------------------
  console.log('Test 5: Credential Resolution & NOT_CONFIGURED Status Enforcement');
  const unconfiguredCreds = await resolveWhatsAppCredentials('comp_nonexistent_empty');
  assert(unconfiguredCreds.configured === false, 'Unconfigured tenant must have configured=false');

  const unconfiguredSocial = await resolveMetaSocialCredentials('comp_nonexistent_empty');
  assert(unconfiguredSocial.configured === false, 'Unconfigured social must have configured=false');

  // WhatsApp send must reject when unconfigured
  const sendResult = await sendWhatsAppCloudMessage(unconfiguredCreds, {
    to: '919876543210',
    message: 'Hello world',
  });
  assert(sendResult.success === false, 'sendWhatsAppCloudMessage must fail when unconfigured');
  assert(sendResult.status === 'NOT_CONFIGURED', 'Must return NOT_CONFIGURED status');

  // Meta Facebook & Instagram publish must reject when unconfigured
  const fbResult = await publishToFacebookPage({
    pageId: '',
    accessToken: '',
    message: 'Post text',
  });
  assert(fbResult.success === false, 'publishToFacebookPage must fail when unconfigured');

  const igResult = await publishToInstagram({
    instagramId: '',
    accessToken: '',
    caption: 'Post text',
    imageUrl: 'https://example.com/image.jpg',
  });
  assert(igResult.success === false, 'publishToInstagram must fail when unconfigured');
  console.log('  ✅ Test 5 Passed: Missing credentials strictly return NOT_CONFIGURED with no fake success.');

  // ----------------------------------------------------
  // TEST 6: Provider Message ID Persistence & Verification
  // ----------------------------------------------------
  console.log('Test 6: Provider Message ID Persistence in CRM Pipeline');
  const inboundMsgId = 'wamid.TEST_PROVIDER_MSG_9876';
  const created = await createLead({
    company_id: tenantCompanyId,
    name: 'Pooja Verma',
    company: 'WhatsApp Inbound Lead',
    phone: '+919876543210',
    service: 'Enterprise AI Consultation',
    stage: 'new',
    intent_score: 95,
    source: 'WhatsApp Cloud Inbound',
    notes: `Inbound text: "Need full stack AI integration" [Provider Message ID: ${inboundMsgId}]`,
  });

  const savedLead = await getLeadById(created.id);
  assert(Boolean(savedLead && savedLead.notes?.includes(inboundMsgId)), 'Inbound lead must persist provider message ID in CRM database');
  console.log('  ✅ Test 6 Passed: Provider message ID properly persisted in database records.');

  console.log('\n🎉 ALL META & WHATSAPP INTEGRATION TESTS PASSED PERFECTLY!\n');
}

runMetaWhatsAppTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
