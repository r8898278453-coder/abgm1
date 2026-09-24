import crypto from 'crypto';
import {
  verifyRazorpayWebhookSignature,
  verifyRazorpayPaymentSignature,
  isWebhookEventProcessed,
  markWebhookEventProcessed,
  findExistingInvoice,
  mapRazorpayEventToSubscriptionState,
  activateSubscriptionIdempotent,
  isProductionEnvironment,
} from '../server/billingService';
import { createInvoice, getInvoiceByPaymentId, getInvoiceByOrderId } from '../server/db';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

async function runRazorpayBillingTests() {
  console.log('🧪 Starting Razorpay Billing & Production Hardening Unit Tests...\n');

  const TEST_SECRET = 'whsec_test_secret_998877665544332211';
  const TEST_KEY_SECRET = 'rzp_sec_test_112233445566778899';

  // ----------------------------------------------------
  // TEST 1: Valid Webhook Signature Verification
  // ----------------------------------------------------
  console.log('Test 1: Valid Webhook Signature Verification');
  const validPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_valid_123456789',
          amount: 79900,
          currency: 'INR',
          status: 'captured',
        },
      },
    },
  });

  const validSignature = crypto
    .createHmac('sha256', TEST_SECRET)
    .update(validPayload)
    .digest('hex');

  const validResult = verifyRazorpayWebhookSignature({
    rawBody: validPayload,
    signature: validSignature,
    secret: TEST_SECRET,
    isProduction: true,
  });

  assert(validResult.isValid === true, 'Valid webhook signature must pass verification');
  assert(validResult.code === 'SUCCESS', 'Valid webhook must return SUCCESS code');
  console.log('  ✅ Test 1 Passed: Valid webhook cryptographic HMAC-SHA256 signature verified.');

  // ----------------------------------------------------
  // TEST 2: Invalid Webhook Signature Rejection
  // ----------------------------------------------------
  console.log('\nTest 2: Invalid Webhook Signature Rejection');
  const forgedSignature = 'a'.repeat(64);
  const invalidSigResult = verifyRazorpayWebhookSignature({
    rawBody: validPayload,
    signature: forgedSignature,
    secret: TEST_SECRET,
    isProduction: true,
  });

  assert(invalidSigResult.isValid === false, 'Invalid webhook signature must be rejected');
  assert(invalidSigResult.code === 'INVALID_SIGNATURE', 'Invalid signature must return INVALID_SIGNATURE code');
  console.log('  ✅ Test 2 Passed: Invalid / forged webhook signature strictly rejected.');

  // ----------------------------------------------------
  // TEST 3: Missing Secret Rejection in Production
  // ----------------------------------------------------
  console.log('\nTest 3: Missing Secret in Production');
  const missingSecretResult = verifyRazorpayWebhookSignature({
    rawBody: validPayload,
    signature: validSignature,
    secret: '', // missing secret
    isProduction: true,
  });

  assert(missingSecretResult.isValid === false, 'Missing webhook secret in production MUST be rejected');
  assert(missingSecretResult.code === 'MISSING_SECRET', 'Missing secret in production must return MISSING_SECRET code');

  const missingSigResult = verifyRazorpayWebhookSignature({
    rawBody: validPayload,
    signature: '', // missing signature
    secret: TEST_SECRET,
    isProduction: true,
  });

  assert(missingSigResult.isValid === false, 'Missing signature in production MUST be rejected');
  assert(missingSigResult.code === 'MISSING_SIGNATURE', 'Missing signature in production must return MISSING_SIGNATURE code');
  console.log('  ✅ Test 3 Passed: Missing webhook secret and missing signature in production are strictly rejected.');

  // ----------------------------------------------------
  // TEST 4: Duplicate Webhook / Event Idempotency
  // ----------------------------------------------------
  console.log('\nTest 4: Duplicate Webhook & Event Idempotency');
  const testEventId = `evt_idempotent_${Date.now()}_abc`;

  assert((await isWebhookEventProcessed(testEventId)) === false, 'New event must not be marked as processed initially');

  await markWebhookEventProcessed(testEventId, 'payment.captured', 'comp_test_tenant');

  assert((await isWebhookEventProcessed(testEventId)) === true, 'Event must be marked processed after recording');
  assert((await isWebhookEventProcessed(testEventId)) === true, 'Duplicate check on same event ID must return true');
  console.log('  ✅ Test 4 Passed: Webhook event idempotency correctly detects and deduplicates repeated events.');

  // ----------------------------------------------------
  // TEST 5: Invalid Payment Signature Rejection
  // ----------------------------------------------------
  console.log('\nTest 5: Invalid Payment Signature Rejection');
  const invalidPaymentResult = verifyRazorpayPaymentSignature({
    orderId: 'order_12345',
    paymentId: 'pay_98765',
    signature: 'bad_signature_abc123',
    keySecret: TEST_KEY_SECRET,
    isProduction: true,
  });

  assert(invalidPaymentResult.verified === false, 'Bad payment signature must fail verification');
  assert(invalidPaymentResult.code === 'INVALID_SIGNATURE', 'Must return INVALID_SIGNATURE code');
  console.log('  ✅ Test 5 Passed: Invalid payment signature rejected.');

  // ----------------------------------------------------
  // TEST 6: Verified Payment Signature Verification
  // ----------------------------------------------------
  console.log('\nTest 6: Verified Payment Signature Verification');
  const testOrderId = 'order_REAL_99001';
  const testPaymentId = 'pay_REAL_88002';
  const validPaySignature = crypto
    .createHmac('sha256', TEST_KEY_SECRET)
    .update(`${testOrderId}|${testPaymentId}`)
    .digest('hex');

  const verifiedPaymentResult = verifyRazorpayPaymentSignature({
    orderId: testOrderId,
    paymentId: testPaymentId,
    signature: validPaySignature,
    keySecret: TEST_KEY_SECRET,
    isProduction: true,
  });

  assert(verifiedPaymentResult.verified === true, 'Authentic payment signature must verify successfully');
  assert(verifiedPaymentResult.code === 'SUCCESS', 'Authentic payment must return SUCCESS');
  console.log('  ✅ Test 6 Passed: Provider-verified payment signature cryptographically validated.');

  // ----------------------------------------------------
  // TEST 7: Simulated Payment Handling & Production Separation
  // ----------------------------------------------------
  console.log('\nTest 7: Simulated Payment Separation (Forbidden in Prod)');
  const simulatedInProd = verifyRazorpayPaymentSignature({
    orderId: 'order_test_123',
    paymentId: 'sim_pay_9999',
    signature: 'any_sig',
    keySecret: TEST_KEY_SECRET,
    isProduction: true, // Production mode
  });

  assert(simulatedInProd.verified === false, 'Simulated payment in production must NEVER return verified=true');
  assert(simulatedInProd.code === 'SIMULATION_FORBIDDEN_PROD', 'Simulated payment in prod must return SIMULATION_FORBIDDEN_PROD');

  const mockInProd = verifyRazorpayPaymentSignature({
    orderId: 'order_test_123',
    paymentId: 'mock_pay_777',
    signature: 'any_sig',
    keySecret: TEST_KEY_SECRET,
    isProduction: true,
  });

  assert(mockInProd.verified === false, 'Mock payment in production must NEVER return verified=true');
  console.log('  ✅ Test 7 Passed: Simulated payments are strictly forbidden and rejected in production mode.');

  // ----------------------------------------------------
  // TEST 8: Provider-Supported Subscription States
  // ----------------------------------------------------
  console.log('\nTest 8: Supported Subscription States Mapping');
  assert(mapRazorpayEventToSubscriptionState('payment.captured') === 'active', 'payment.captured -> active');
  assert(mapRazorpayEventToSubscriptionState('order.paid') === 'active', 'order.paid -> active');
  assert(mapRazorpayEventToSubscriptionState('subscription.charged') === 'active', 'subscription.charged -> active');
  assert(mapRazorpayEventToSubscriptionState('subscription.authenticated', 'trial') === 'trial', 'subscription.authenticated trial -> trial');
  assert(mapRazorpayEventToSubscriptionState('subscription.pending') === 'past_due', 'subscription.pending -> past_due');
  assert(mapRazorpayEventToSubscriptionState('subscription.halted') === 'past_due', 'subscription.halted -> past_due');
  assert(mapRazorpayEventToSubscriptionState('payment.failed') === 'payment_failed', 'payment.failed -> payment_failed');
  assert(mapRazorpayEventToSubscriptionState('subscription.cancelled') === 'cancelled', 'subscription.cancelled -> cancelled');
  assert(mapRazorpayEventToSubscriptionState('subscription.completed') === 'expired', 'subscription.completed -> expired');
  assert(mapRazorpayEventToSubscriptionState('subscription.expired') === 'expired', 'subscription.expired -> expired');
  console.log('  ✅ Test 8 Passed: Provider states mapped strictly to trial, active, past_due, payment_failed, cancelled, expired.');

  // ----------------------------------------------------
  // TEST 9: Duplicate Invoice Creation Prevention
  // ----------------------------------------------------
  console.log('\nTest 9: Duplicate Invoice Creation Prevention');
  const uniquePayId = `pay_dedup_test_${Date.now()}`;
  const inv1 = await createInvoice({
    company_id: 'comp_test_dedup',
    plan: 'Pro Tier',
    amount: 1499,
    payment_id: uniquePayId,
    order_id: `order_dedup_${Date.now()}`,
    status: 'Paid',
  });

  const inv2 = await createInvoice({
    company_id: 'comp_test_dedup',
    plan: 'Pro Tier',
    amount: 1499,
    payment_id: uniquePayId,
    order_id: `order_dedup_${Date.now()}`,
    status: 'Paid',
  });

  assert(inv1.id === inv2.id, 'Duplicate invoice creation with same paymentId must return the existing invoice ID');

  const existingInDb = await getInvoiceByPaymentId(uniquePayId, 'comp_test_dedup');
  assert(existingInDb !== null && existingInDb.id === inv1.id, 'Invoice lookup by paymentId must retrieve existing invoice');
  console.log('  ✅ Test 9 Passed: Duplicate invoice creation prevented.');

  // ----------------------------------------------------
  // TEST 10: Duplicate Subscription Activation Idempotency
  // ----------------------------------------------------
  console.log('\nTest 10: Duplicate Subscription Activation Idempotency');
  const sub1 = await activateSubscriptionIdempotent({
    companyId: 'comp_test_sub_dedup',
    planId: 'growth',
    planName: 'Growth Tier',
    status: 'active',
    amount: 799,
    razorpaySubscriptionId: 'sub_rzp_12345',
  });

  const sub2 = await activateSubscriptionIdempotent({
    companyId: 'comp_test_sub_dedup',
    planId: 'growth',
    planName: 'Growth Tier',
    status: 'active',
    amount: 799,
    razorpaySubscriptionId: 'sub_rzp_12345',
  });

  assert(sub1.id === sub2.id, 'Subsequent subscription activations for same sub must preserve subscription ID and state');
  console.log('  ✅ Test 10 Passed: Subscription activation is idempotent and prevents duplicate subscriptions.');

  console.log('\n🎉 ALL 10 RAZORPAY BILLING HARDENING TESTS PASSED SUCCESSFULLY!\n');
}

runRazorpayBillingTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
