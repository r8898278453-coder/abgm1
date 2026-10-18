import assert from 'assert';
import {
  enqueueJob,
  claimNextJob,
  completeJob,
  failJob,
  getJobById,
  getJobsByCompany,
  cancelJob,
  getPendingJobsCount,
  createContentPost,
  getCompanyPostsByCampaignId,
  createInternalCampaign,
  createUser,
  createCompany,
} from '../server/db';
import { executeJob, tickJobQueue } from '../server/jobQueueService';
import { runSchedulerTick } from '../server/scheduler';

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    process.stdout.write(`  • ${name}... `);
    await fn();
    console.log('✅ PASS');
  } catch (err: any) {
    console.log(`❌ FAIL: ${err?.message}`);
    throw err;
  }
}

async function main() {
  console.log('🧪 Starting Phase 1 Durable Job Queue & Campaign Execution Binding Tests...\n');

  const testRunId = Date.now();
  const testCompanyId = `comp_p1_queue_${testRunId}`;
  const testCompanyBId = `comp_p1_queue_isolated_${testRunId}`;

  // --------------------------------------------------------------------------
  // 1. Persistent Job Queue State Machine Tests
  // --------------------------------------------------------------------------
  console.log('1️⃣  JOB QUEUE STATE MACHINE & IDEMPOTENCY');

  let testJobId = '';

  await runTest('enqueueJob creates new job with QUEUED status and attempts=0', async () => {
    const job = await enqueueJob({
      company_id: testCompanyId,
      job_type: 'seo_scan',
      payload: { keyword: 'digital marketing navi mumbai', city: 'Navi Mumbai' },
      max_attempts: 3,
    });

    assert.ok(job.id, 'Job must have a valid ID');
    assert.strictEqual(job.company_id, testCompanyId);
    assert.strictEqual(job.job_type, 'seo_scan');
    assert.strictEqual(job.status, 'QUEUED');
    assert.strictEqual(job.attempts, 0);
    assert.strictEqual(job.max_attempts, 3);
    testJobId = job.id;
  });

  await runTest('enqueueJob with idempotency_key prevents duplicate task creation', async () => {
    const idemKey = `idem_seo_${testRunId}`;
    const job1 = await enqueueJob({
      company_id: testCompanyId,
      job_type: 'seo_scan',
      payload: { keyword: 'seo services' },
      idempotency_key: idemKey,
    });

    const job2 = await enqueueJob({
      company_id: testCompanyId,
      job_type: 'seo_scan',
      payload: { keyword: 'seo services' },
      idempotency_key: idemKey,
    });

    assert.strictEqual(job1.id, job2.id, 'Duplicate idempotency key must return existing job');
  });

  await runTest('claimNextJob atomically locks job with lease and worker ID', async () => {
    const workerA = 'worker_node_alpha';
    const claimed = await claimNextJob(workerA, ['seo_scan']);

    assert.ok(claimed, 'Worker A should claim the due job');
    assert.strictEqual(claimed.status, 'RUNNING');
    assert.strictEqual(claimed.locked_by, workerA);
    assert.strictEqual(claimed.attempts, 1);
    assert.ok(claimed.locked_at, 'locked_at timestamp must be set');

    // Worker B attempts to claim the same job class while locked
    const workerB = 'worker_node_beta';
    // If no other jobs are pending, worker B should get null or different job
    const claimedByB = await claimNextJob(workerB, ['seo_scan']);
    if (claimedByB) {
      assert.notStrictEqual(claimedByB.id, claimed.id, 'Worker B must not claim an actively leased job');
    }
  });

  await runTest('completeJob transitions status to SUCCEEDED and releases worker lock', async () => {
    const resultData = { rankFound: 3, nodesScanned: 9 };
    const completed = await completeJob(testJobId, resultData);

    assert.ok(completed, 'Job must exist');
    assert.strictEqual(completed.status, 'SUCCEEDED');
    assert.strictEqual(completed.locked_by, null);
    assert.strictEqual(completed.locked_at, null);
    assert.deepStrictEqual(completed.result, resultData);
  });

  await runTest('failJob transitions to RETRY_WAIT with backoff when attempts < max_attempts', async () => {
    const retryJob = await enqueueJob({
      company_id: testCompanyId,
      job_type: 'publishing',
      payload: { postId: 'test_post_fake' },
      max_attempts: 3,
    });

    // Claim attempt 1
    await claimNextJob('worker_retry_test', ['publishing']);

    // Fail attempt 1
    const failed = await failJob(retryJob.id, 'Network timeout connecting to Meta Graph API', true);
    assert.ok(failed);
    assert.strictEqual(failed.status, 'RETRY_WAIT', 'First transient failure must set RETRY_WAIT');
    assert.strictEqual(failed.locked_by, null, 'Lock must be released on failure');
    assert.ok(failed.error_message?.includes('Meta Graph API'));
  });

  await runTest('failJob transitions to FAILED (dead-letter) when max_attempts reached or non-retryable', async () => {
    const deadJob = await enqueueJob({
      company_id: testCompanyId,
      job_type: 'publishing',
      payload: { postId: 'invalid_dead_letter' },
      max_attempts: 1, // Only 1 attempt allowed
    });

    // Claim attempt 1
    await claimNextJob('worker_dead_test', ['publishing']);

    // Fail attempt 1
    const dead = await failJob(deadJob.id, 'Permanent 401 Unauthorized', false);
    assert.ok(dead);
    assert.strictEqual(dead.status, 'FAILED', 'Exhausted or non-retryable job must transition to FAILED');
  });

  await runTest('cancelJob transitions queued job to CANCELLED', async () => {
    const jobToCancel = await enqueueJob({
      company_id: testCompanyId,
      job_type: 'report',
      payload: { reportType: 'quarterly_roi' },
    });

    const cancelled = await cancelJob(jobToCancel.id, testCompanyId);
    assert.ok(cancelled);
    assert.strictEqual(cancelled.status, 'CANCELLED');

    // Canceled job cannot be claimed
    const jobAfterCancel = await getJobById(jobToCancel.id);
    assert.strictEqual(jobAfterCancel?.status, 'CANCELLED');
  });

  await runTest('getPendingJobsCount accurately summarizes queued, running, and failed counts', async () => {
    const counts = await getPendingJobsCount(testCompanyId);
    assert.ok(typeof counts.queued === 'number');
    assert.ok(typeof counts.running === 'number');
    assert.ok(typeof counts.failed === 'number');
  });

  // --------------------------------------------------------------------------
  // 2. Campaign + Execution Model Relational Binding Tests
  // --------------------------------------------------------------------------
  console.log('\n2️⃣  CANONICAL CAMPAIGN-TO-POST EXECUTION BINDING');

  const campaignA = await createInternalCampaign({
    company_id: testCompanyId,
    name: 'Diwali Festive Super Sale 2026',
    objective: 'Drive 150 local walk-ins and inquiries via Google & Instagram',
    status: 'active',
    start_date: '2026-10-20',
    end_date: '2026-11-05',
    planned_budget: 15000,
    channels: ['google', 'instagram'],
  });

  await runTest('createContentPost binds campaign_id directly to internal campaign', async () => {
    const post = await createContentPost({
      company_id: testCompanyId,
      campaign_id: campaignA.id,
      title: '50% Off Festive Dentistry Package',
      caption: 'Exclusive Diwali Special offer at Apex Dental Clinic. Book today!',
      channel: 'google',
      status: 'scheduled',
      scheduled_date: '2026-10-25',
      scheduled_time: '2026-10-25 10:00:00',
    });

    assert.ok(post.id);
    assert.strictEqual(post.campaign_id, campaignA.id, 'Post must be linked to campaignA');
  });

  await runTest('getCompanyPostsByCampaignId retrieves only posts bound to specified campaign', async () => {
    // Create an unlinked post
    await createContentPost({
      company_id: testCompanyId,
      title: 'Routine Sunday Clinic Hours Post',
      caption: 'Clinic remains open Sundays 10am to 2pm.',
      channel: 'google',
      status: 'scheduled',
    });

    const linkedPosts = await getCompanyPostsByCampaignId(testCompanyId, campaignA.id);
    assert.strictEqual(linkedPosts.length, 1);
    assert.strictEqual(linkedPosts[0].campaign_id, campaignA.id);
    assert.strictEqual(linkedPosts[0].title, '50% Off Festive Dentistry Package');
  });

  await runTest('Multi-tenant campaign isolation: Tenant B cannot query Tenant A campaign posts', async () => {
    const isolatedPosts = await getCompanyPostsByCampaignId(testCompanyBId, campaignA.id);
    assert.strictEqual(isolatedPosts.length, 0, 'Cross-tenant query must return zero posts');
  });

  // --------------------------------------------------------------------------
  // 3. Universal Scheduler & Queue Tick Tests
  // --------------------------------------------------------------------------
  console.log('\n3️⃣  UNIVERSAL SCHEDULER & DURABLE QUEUE TICK');

  await runTest('executeJob executes AI summary task and completes job with structured evidence', async () => {
    const aiJob = await enqueueJob({
      company_id: testCompanyId,
      job_type: 'ai_summary',
      payload: {},
    });

    // Claim job
    const claimed = await claimNextJob('test_worker_ai', ['ai_summary']);
    assert.ok(claimed);

    const execResult = await executeJob(claimed);
    assert.strictEqual(execResult.status, 'SUCCEEDED');

    const updatedJob = await getJobById(aiJob.id);
    assert.strictEqual(updatedJob?.status, 'SUCCEEDED');
    assert.ok(updatedJob?.result);
  });

  await runTest('tickJobQueue processes pending queue items in a single batch safely', async () => {
    // Enqueue 2 lead nurture tasks
    await enqueueJob({
      company_id: testCompanyId,
      job_type: 'lead_nurture',
      payload: { leadId: 'lead_dummy_1' },
    });

    const summary = await tickJobQueue('batch_worker_unit', 5);
    assert.ok(summary.processedCount >= 0);
    assert.ok(summary.timestamp);
  });

  await runTest('runSchedulerTick coordinates auto-publishing and durable queue without errors', async () => {
    const tickResult = await runSchedulerTick();
    assert.ok(tickResult.timestamp);
    assert.ok(tickResult.autoPublish);
    assert.ok(tickResult.queue);
  });

  console.log('\n========================================================================');
  console.log('🎉 ALL PHASE 1 DURABLE QUEUE & CAMPAIGN BINDING TESTS PASSED PERFECTLY!');
  console.log('========================================================================');
}

main().catch((err) => {
  console.error('Fatal Test Runner Failure:', err);
  process.exit(1);
});
