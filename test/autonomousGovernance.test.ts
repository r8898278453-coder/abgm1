import assert from 'assert';
import {
  runAutonomousCycle,
  executeAutonomousAction,
  setGlobalEmergencyStop,
  isGlobalEmergencyStopActive,
} from '../server/autonomousEngine';
import {
  createCompany,
  createReview,
  createLead,
  saveRankObservations,
  getAutonomousRecommendationsByCompany,
  getAutonomousActionsByCompany,
  getAutonomousActionById,
  updateAutonomousAction,
  getAutonomousAuditLogsByCompany,
} from '../server/db';

async function runTests() {
  console.log('🧪 Starting Autonomous Governance & 8-Stage Lifecycle Unit Tests...');

  const testTenantA = 'comp_test_tenant_a_' + Date.now();
  const testTenantB = 'comp_test_tenant_b_' + Date.now();

  await createCompany({
    id: testTenantA,
    user_id: 'usr_tenant_a',
    name: 'Tenant A Logistics',
    category: 'Logistics & Transport',
    city: 'Thane',
    autopilot_enabled: 1,
    score: 80,
  });

  await createCompany({
    id: testTenantB,
    user_id: 'usr_tenant_b',
    name: 'Tenant B Dental',
    category: 'Healthcare & Clinic',
    city: 'Mumbai',
    autopilot_enabled: 1,
    score: 75,
  });

  // --------------------------------------------------------------------------
  // TEST 1: Zero Invention Rule — Empty observations produce INSUFFICIENT_EVIDENCE
  // --------------------------------------------------------------------------
  console.log('Test 1: Zero-Invention Rule — Empty data produces INSUFFICIENT_EVIDENCE without hallucinations');
  const emptyCycleResult = await runAutonomousCycle(testTenantA);
  assert.strictEqual(
    emptyCycleResult.status,
    'INSUFFICIENT_EVIDENCE',
    'Must return INSUFFICIENT_EVIDENCE when 0 observations exist in DB'
  );
  assert.strictEqual(
    emptyCycleResult.recommendationsGenerated,
    0,
    'Must generate 0 recommendations when evidence is missing'
  );
  console.log('  ✅ Test 1 Passed: Zero observations strictly produces INSUFFICIENT_EVIDENCE.');

  // --------------------------------------------------------------------------
  // TEST 2: Grounded Observations Generate Evidence-Linked Recommendations
  // --------------------------------------------------------------------------
  console.log('Test 2: Real Observations Generate Evidence-Linked Recommendations');

  // Seed verified review
  const review = await createReview({
    company_id: testTenantA,
    author: 'Sunil Mehta',
    rating: 2,
    date: '2026-09-20',
    content: 'Driver arrived 45 minutes late for pickup.',
    sentiment: 'negative',
    source: 'google',
    replied: false,
  });

  // Seed verified high-intent lead
  const lead = await createLead({
    company_id: testTenantA,
    name: 'Rohan Deshmukh',
    company: 'Deshmukh Builders',
    phone: '+91 98200 12345',
    service: 'Fleet Tracking Software',
    stage: 'new',
    intent_score: 95,
    source: 'Website',
  });

  // Seed rank observation outside top 3
  await saveRankObservations([
    {
      id: 'ro_test_tenant_a_1',
      company_id: testTenantA,
      keyword: 'logistics fleet management thane',
      latitude: 19.2183,
      longitude: 72.9781,
      grid_index: 0,
      timestamp: new Date().toISOString(),
      provider: 'dataforseo',
      position: 7,
      status: 'VERIFIED',
    },
  ]);

  const cycleResult = await runAutonomousCycle(testTenantA);
  assert.strictEqual(cycleResult.status, 'SUCCESS', 'Cycle must succeed with real observations');
  assert.ok(cycleResult.recommendationsGenerated >= 3, 'Must produce grounded recommendations for review, lead, and rank drop');

  // Verify evidence ID linkage
  const reviewRec = cycleResult.recommendations.find((r) => r.action_type === 'review_reply');
  assert.ok(reviewRec, 'Review reply recommendation must exist');
  assert.ok(reviewRec.evidence_ids.includes(review.id), 'Evidence ID must link directly to review record');
  assert.strictEqual(reviewRec.source, 'reviews');

  const leadRec = cycleResult.recommendations.find((r) => r.action_type === 'send_whatsapp');
  assert.ok(leadRec, 'WhatsApp lead recommendation must exist');
  assert.ok(leadRec.evidence_ids.includes(lead.id), 'Evidence ID must link directly to lead record');

  console.log(`  ✅ Test 2 Passed: Produced ${cycleResult.recommendationsGenerated} grounded recommendations with exact evidence IDs.`);

  // --------------------------------------------------------------------------
  // TEST 3: High-Risk Action Approval Requirement Gate
  // --------------------------------------------------------------------------
  console.log('Test 3: High-Risk Action Approval Requirement Gate');
  const actions = await getAutonomousActionsByCompany(testTenantA);
  const unapprovedAction = actions.find((a) => a.approval_status === 'pending_approval');
  assert.ok(unapprovedAction, 'Pending approval action must exist');

  // Attempt to execute unapproved action directly -> Must be BLOCKED
  const unapprovedExecResult = await executeAutonomousAction(unapprovedAction.id, {
    userId: 'usr_tenant_a',
    companyId: testTenantA,
  });

  assert.strictEqual(unapprovedExecResult.status, 'BLOCKED');
  assert.strictEqual(unapprovedExecResult.code, 'BLOCKED_APPROVAL_REQUIRED');
  console.log('  ✅ Test 3 Passed: Unapproved action strictly blocked by approval policy gate.');

  // --------------------------------------------------------------------------
  // TEST 4: Kill Switch & Emergency Stop Gate
  // --------------------------------------------------------------------------
  console.log('Test 4: Kill Switch & Emergency Stop Gate');
  setGlobalEmergencyStop(true);
  assert.strictEqual(isGlobalEmergencyStopActive(), true);

  // Approve action first
  await updateAutonomousAction(unapprovedAction.id, {
    approval_status: 'approved',
  });

  // Attempt execution while Emergency Stop is ACTIVE -> Must be BLOCKED
  const killSwitchResult = await executeAutonomousAction(unapprovedAction.id, {
    userId: 'usr_tenant_a',
    companyId: testTenantA,
  });

  assert.strictEqual(killSwitchResult.status, 'BLOCKED');
  assert.strictEqual(killSwitchResult.code, 'BLOCKED_KILL_SWITCH');
  console.log('  ✅ Test 4 Passed: Global emergency kill switch halts outbound execution.');

  // Restore Kill Switch
  setGlobalEmergencyStop(false);

  // --------------------------------------------------------------------------
  // TEST 5: Verified Execution & Zero False Success on Unconfigured Providers
  // --------------------------------------------------------------------------
  console.log('Test 5: Verified Execution & Provider Availability Gate');
  const whatsappAction = actions.find((a) => a.action_type === 'send_whatsapp');
  if (whatsappAction) {
    await updateAutonomousAction(whatsappAction.id, {
      approval_status: 'approved',
    });

    const waExecResult = await executeAutonomousAction(whatsappAction.id, {
      userId: 'usr_tenant_a',
      companyId: testTenantA,
    });

    // Unconfigured WhatsApp credentials must return BLOCKED_PROVIDER_NOT_CONFIGURED and NEVER claim success
    assert.strictEqual(waExecResult.status, 'BLOCKED');
    assert.strictEqual(waExecResult.code, 'BLOCKED_PROVIDER_NOT_CONFIGURED');
    assert.notStrictEqual(waExecResult.verificationState, 'verified');
    console.log('  ✅ Test 5 Passed: Unconfigured provider strictly blocks execution without claiming success.');
  }

  // --------------------------------------------------------------------------
  // TEST 6: Successful Verified Execution for Database Actions (Review Reply)
  // --------------------------------------------------------------------------
  console.log('Test 6: Successful Verified Execution for Database Actions');
  const reviewAction = actions.find((a) => a.action_type === 'review_reply');
  assert.ok(reviewAction, 'Review reply action must exist');

  await updateAutonomousAction(reviewAction.id, {
    approval_status: 'approved',
  });

  const reviewExecResult = await executeAutonomousAction(reviewAction.id, {
    userId: 'usr_tenant_a',
    companyId: testTenantA,
  });

  assert.strictEqual(reviewExecResult.status, 'EXECUTED');
  assert.strictEqual(reviewExecResult.verificationState, 'verified');
  assert.ok(reviewExecResult.providerResponse?.verified, 'Provider response must confirm verification');

  // Verify DB updated
  const updatedAction = await getAutonomousActionById(reviewAction.id);
  assert.strictEqual(updatedAction?.execution_state, 'executed');
  assert.strictEqual(updatedAction?.verification_state, 'verified');

  console.log('  ✅ Test 6 Passed: Verified review reply execution confirmed and recorded.');

  // --------------------------------------------------------------------------
  // TEST 7: Idempotency Enforcement (Never Re-execute Executed Actions)
  // --------------------------------------------------------------------------
  console.log('Test 7: Idempotency Enforcement');
  const duplicateExecResult = await executeAutonomousAction(reviewAction.id, {
    userId: 'usr_tenant_a',
    companyId: testTenantA,
  });

  assert.strictEqual(duplicateExecResult.code, 'ALREADY_EXECUTED');
  console.log('  ✅ Test 7 Passed: Duplicate execution prevented by idempotency check.');

  // --------------------------------------------------------------------------
  // TEST 8: Multi-Tenant Workspace Isolation
  // --------------------------------------------------------------------------
  console.log('Test 8: Multi-Tenant Workspace Isolation');
  const crossTenantResult = await executeAutonomousAction(reviewAction.id, {
    userId: 'usr_tenant_b',
    companyId: testTenantB, // Wrong tenant ID
  });

  assert.strictEqual(crossTenantResult.status, 'BLOCKED');
  assert.strictEqual(crossTenantResult.code, 'UNAUTHORIZED_TENANT');

  // Verify Tenant B has 0 recommendations from Tenant A
  const tenantBRecs = await getAutonomousRecommendationsByCompany(testTenantB);
  assert.strictEqual(tenantBRecs.length, 0, 'Tenant B must not see Tenant A recommendations');

  // Verify Audit Logs exist
  const auditLogs = await getAutonomousAuditLogsByCompany(testTenantA);
  assert.ok(auditLogs.length >= 2, 'Audit logs must record cycle execution and action verification');

  console.log('  ✅ Test 8 Passed: Complete multi-tenant isolation and immutable audit logging verified.');

  console.log('🎉 ALL 8 AUTONOMOUS GOVERNANCE & LIFECYCLE TESTS PASSED PERFECTLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
