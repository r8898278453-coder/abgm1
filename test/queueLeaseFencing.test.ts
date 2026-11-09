import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

process.env.NODE_ENV = 'test';
for (const key of ['DB_HOST', 'DB_USER', 'DB_NAME', 'DB_PASSWORD', 'DATABASE_URL']) delete process.env[key];
const previousCwd = process.cwd();
const temporary = await mkdtemp(path.join(os.tmpdir(), 'abgm1-lease-fixture-'));
process.chdir(temporary);
try {
  const db = await import('../server/db');
await db.createCompany({id:'lease-fixture',user_id:'fixture',name:'Fixture',category:'fixture',city:'fixture',autopilot_enabled:true});
  await db.saveCompanyDataPayload('lease-fixture',{engine_settings:{approvalSettings:{googlePosts:'auto',socialPosts:'auto',promotionalOffers:'auto'}}});
  const { executeJob } = await import('../server/jobQueueService');
  const post = await db.createContentPost({ company_id: 'lease-fixture', caption: 'Lease fixture', platforms: ['facebook'], status: 'draft' } as any);
  const queued = await db.enqueueJob({ company_id: 'lease-fixture', job_type: 'publishing', payload: { postId: post.id } });
  const old = await db.claimNextJob('same-worker', ['publishing']);
  assert.equal(old?.id, queued.id);
  assert.equal(await db.completeJob(queued.id, {}), null);
  const stored = await db.getJobById(queued.id);
  assert.ok(stored);
  stored.locked_at = new Date(Date.now() - 6 * 60 * 1000).toISOString();
  const current = await db.claimNextJob('same-worker', ['publishing']);
  assert.equal(current?.attempts, 2);
  assert.equal(old?.attempts, 1, 'Claim snapshots cannot mutate when another worker reclaims');
  const staleLease = { workerId: 'same-worker', attempt: 1 };
  assert.equal(await db.completeJob(queued.id, {}, staleLease), null);
  assert.equal(await db.failJob(queued.id, 'stale error', false, staleLease), null);
  assert.equal(await db.renewJobLease(queued.id, staleLease), false);
  const rejected = await executeJob(old!);
  assert.equal(rejected.status, 'FAILED');
  assert.equal(rejected.error, 'JOB_LEASE_LOST');
  assert.equal((await db.getPostById(post.id))?.status, 'draft');
  const lease = { workerId: 'same-worker', attempt: 2 };
  assert.equal(await db.renewJobLease(queued.id, lease), true);
  assert.equal((await db.completeJob(queued.id, { current: true }, lease))?.status, 'SUCCEEDED');
  assert.equal(await db.failJob(queued.id, 'late stale failure', false, staleLease), null);

  const exhausted = await db.enqueueJob({ company_id: 'lease-fixture', job_type: 'publishing', payload: { postId: post.id }, max_attempts: 1 });
  await db.claimNextJob('crashed-worker', ['publishing']);
  const crashed = await db.getJobById(exhausted.id);
  assert.ok(crashed);
  crashed.locked_at = new Date(Date.now() - 6 * 60 * 1000).toISOString();
  assert.equal(await db.claimNextJob('recovery', ['publishing']), null);
  assert.equal((await db.getJobById(exhausted.id))?.status, 'FAILED');
  const { unconfiguredProvider, mockTestProvider } = await import('../server/localSeoProvider');
  const scan = unconfiguredProvider.scanRankGrid;
  const originalInterval = globalThis.setInterval;
  const originalClear = globalThis.clearInterval;
  let heartbeat: (() => Promise<void>) | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let timerCleared = false;
  let releasePersistence: (() => void) | undefined;
  try {
    unconfiguredProvider.scanRankGrid = context => mockTestProvider.scanRankGrid(context);
    globalThis.setInterval = ((callback: any, delay: number) => {
      heartbeat = callback;
      timer = originalInterval(callback, delay);
      return timer;
    }) as typeof setInterval;
    globalThis.clearInterval = ((value: any) => {
      if (value === timer) timerCleared = true;
      originalClear(value);
    }) as typeof clearInterval;
    const pending = await db.enqueueJob({ company_id: 'lease-fixture', job_type: 'seo_scan', payload: { keyword: 'fixture', city: 'Pune' } });
    const claimed = await db.claimNextJob('heartbeat-worker', ['seo_scan']);
    assert.equal(claimed?.id, pending.id);
    let signalPersistence: (() => void) | undefined;
    const started = new Promise<void>(resolve => { signalPersistence = resolve; });
    const running = executeJob(claimed!, {
      saveRankObservations: async () => {
        signalPersistence!();
        await new Promise<void>(resolve => { releasePersistence = resolve; });
      },
      saveCompetitorObservation: db.saveCompetitorObservation,
    });
    await started;
    const active = await db.getJobById(pending.id);
    assert.ok(active);
    const aged = new Date(Date.now() - 4 * 60 * 1000).toISOString();
    active.locked_at = aged;
    await heartbeat!();
    assert.ok(Date.parse(active.locked_at!) > Date.parse(aged));
    // Inject a cancellation state while the executor is paused; the public cancel helper
    // currently permits only pending jobs and is not changed by this lease test.
    active.status = 'CANCELLED';
    active.locked_by = null;
    active.locked_at = null;
    await heartbeat!();
    releasePersistence!();
    assert.equal((await running).error, 'JOB_LEASE_LOST');
    assert.equal((await db.getJobById(pending.id))?.status, 'CANCELLED');
    assert.equal(timerCleared, true);
  } finally {
    releasePersistence?.();
    if (timer) originalClear(timer);
    globalThis.setInterval = originalInterval;
    globalThis.clearInterval = originalClear;
    unconfiguredProvider.scanRankGrid = scan;
  }
  console.log('Queue lease fencing: stale/reused worker settlement, pre-dispatch rejection, renewal, heartbeat loss/cancellation/cleanup and exhaustion passed.');
} finally {
  process.chdir(previousCwd);
  await rm(temporary, { recursive: true, force: true });
}
