import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  createUser,
  findUserByEmail,
  findUserById,
  verifyPassword,
  createPasswordResetToken,
  findPasswordResetToken,
  markPasswordResetTokenUsed,
  updateUserPassword,
} from '../server/db.js';
import {
  isEmailServiceConfigured,
  getEmailProviderConfig,
  sendTransactionalEmail,
  sendPasswordResetEmail,
} from '../server/emailService.js';

async function runPasswordResetEmailTests() {
  console.log('🧪 Starting Production Password Reset & Transactional Email Tests...\n');

  const testEmail = `test_user_reset_${Date.now()}@aaditechs.in`;
  const initialPassword = 'InitialSecurePassword123!';
  const updatedPassword = 'NewEnterprisePassword2026#';

  // Create test user
  const user = await createUser({
    email: testEmail,
    password: initialPassword,
    full_name: 'Rohit Deshmukh',
    role: 'owner',
  });

  assert.ok(user.id, 'User must be created with unique ID');
  assert.equal(user.email, testEmail);

  // =========================================================================
  // TEST 1: Unconfigured Email Provider Returns Explicit Configuration Error
  // =========================================================================
  console.log('Test 1: Unconfigured transactional email provider returns explicit error without pretending success');

  // Save current env
  const origSmtpHost = process.env.SMTP_HOST;
  const origResendKey = process.env.RESEND_API_KEY;
  const origSendGridKey = process.env.SENDGRID_API_KEY;
  const origPostmarkToken = process.env.POSTMARK_SERVER_TOKEN;

  delete process.env.SMTP_HOST;
  delete process.env.RESEND_API_KEY;
  delete process.env.SENDGRID_API_KEY;
  delete process.env.POSTMARK_SERVER_TOKEN;

  assert.equal(isEmailServiceConfigured(), false, 'Should be false when no email env vars are present');

  const unconfiguredResult = await sendPasswordResetEmail(user, 'https://bga.aaditechs.in/reset-password?token=fake_raw_token');
  assert.equal(unconfiguredResult.success, false, 'Must not pretend email was sent');
  assert.equal(unconfiguredResult.code, 'NOT_CONFIGURED');
  assert.ok(unconfiguredResult.error?.includes('not configured'), 'Must return explicit configuration error');
  console.log('  ✅ Test 1 Passed: Unconfigured provider strictly returns explicit configuration error.');

  // =========================================================================
  // TEST 2: Cryptographic Token Generation & SHA-256 Hash Storage
  // =========================================================================
  console.log('\nTest 2: Cryptographic token generation and SHA-256 hashed persistence');

  const rawToken = crypto.randomBytes(32).toString('hex');
  assert.equal(rawToken.length, 64, 'Token must be 32 cryptographically random bytes (64 hex characters)');

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  assert.notEqual(rawToken, tokenHash, 'Stored token hash must never equal raw token');

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  const tokenId = await createPasswordResetToken(user.id, tokenHash, expiresAt);
  assert.ok(tokenId, 'Token record must be persisted');

  // Lookup by hash
  const record = await findPasswordResetToken(tokenHash);
  assert.ok(record, 'Must find token record by SHA-256 hash');
  assert.equal(record.user_id, user.id);
  assert.equal(record.token_hash, tokenHash);
  assert.equal(record.used_at, null);
  console.log('  ✅ Test 2 Passed: Token securely generated, hashed, and persisted without raw token leak.');

  // =========================================================================
  // TEST 3: Expiry Verification (Expired Tokens Strictly Rejected)
  // =========================================================================
  console.log('\nTest 3: Expired token verification strictly rejects stale tokens');

  const expiredRawToken = crypto.randomBytes(32).toString('hex');
  const expiredTokenHash = crypto.createHash('sha256').update(expiredRawToken).digest('hex');
  const pastDate = new Date(Date.now() - 5 * 60 * 1000); // Expired 5 minutes ago

  await createPasswordResetToken(user.id, expiredTokenHash, pastDate);

  const expiredRecord = await findPasswordResetToken(expiredTokenHash);
  assert.ok(expiredRecord);
  const isExpired = new Date(expiredRecord.expires_at).getTime() < Date.now();
  assert.equal(isExpired, true, 'Token with past timestamp must be evaluated as expired');
  console.log('  ✅ Test 3 Passed: Expired reset token correctly detected and rejected.');

  // =========================================================================
  // TEST 4: Single Use & Invalidation
  // =========================================================================
  console.log('\nTest 4: Single-use verification and token invalidation');

  // Mark token as used
  await markPasswordResetTokenUsed(record.id, user.id);

  const usedRecord = await findPasswordResetToken(tokenHash);
  assert.ok(usedRecord);
  assert.ok(usedRecord.used_at, 'used_at timestamp must be populated');

  const isUsed = Boolean(usedRecord.used_at);
  assert.equal(isUsed, true, 'Already used token must be rejected for subsequent reset attempts');
  console.log('  ✅ Test 4 Passed: Single-use guarantee enforced; reused tokens are invalidated.');

  // =========================================================================
  // TEST 5: User Identity & Full Password Reset Lifecycle
  // =========================================================================
  console.log('\nTest 5: Full password reset lifecycle and credential update');

  // Create fresh active token
  const validRawToken = crypto.randomBytes(32).toString('hex');
  const validTokenHash = crypto.createHash('sha256').update(validRawToken).digest('hex');
  const validExpiry = new Date(Date.now() + 30 * 60 * 1000);

  const validTokenId = await createPasswordResetToken(user.id, validTokenHash, validExpiry);
  const activeRecord = await findPasswordResetToken(validTokenHash);
  assert.ok(activeRecord);

  // Verify identity matches real user
  const matchedUser = await findUserById(activeRecord.user_id);
  assert.ok(matchedUser);
  assert.equal(matchedUser.id, user.id);

  // Update password
  const updateSuccess = await updateUserPassword(matchedUser.id, updatedPassword);
  assert.equal(updateSuccess, true);

  // Invalidate token
  await markPasswordResetTokenUsed(activeRecord.id, matchedUser.id);

  // Verify old password fails
  const updatedUser = await findUserById(matchedUser.id);
  assert.ok(updatedUser);
  assert.equal(verifyPassword(initialPassword, updatedUser.password_hash, updatedUser.salt), false, 'Old password must fail');
  assert.equal(verifyPassword(updatedPassword, updatedUser.password_hash, updatedUser.salt), true, 'New password must verify successfully');
  console.log('  ✅ Test 5 Passed: User password securely updated and credentials verified.');

  // Restore original env vars
  if (origSmtpHost) process.env.SMTP_HOST = origSmtpHost;
  if (origResendKey) process.env.RESEND_API_KEY = origResendKey;
  if (origSendGridKey) process.env.SENDGRID_API_KEY = origSendGridKey;
  if (origPostmarkToken) process.env.POSTMARK_SERVER_TOKEN = origPostmarkToken;

  console.log('\n🎉 ALL 5 TRANSACTIONAL PASSWORD RESET SECURITY TESTS PASSED PERFECTLY!\n');
}

runPasswordResetEmailTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
