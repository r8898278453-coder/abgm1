import assert from 'node:assert/strict';

// Never connect this regression suite to an injected production database.
process.env.NODE_ENV = 'test';
for (const key of ['DB_HOST', 'DB_USER', 'DB_NAME', 'DB_PASSWORD', 'DATABASE_URL']) delete process.env[key];
const { enqueueJob, getJobById, createContentPost } = await import('../server/db');
const { executeJob } = await import('../server/jobQueueService');
const { unconfiguredProvider, mockTestProvider } = await import('../server/localSeoProvider');

async function runFailure(type: string, payload: Record<string, unknown>, expected: RegExp) {
  const job = await enqueueJob({ company_id: 'queue_safety_tenant', job_type: type, payload });
  const result = await executeJob(job);
  assert.equal(result.status, 'FAILED');
  assert.match(result.error || '', expected);
  assert.notEqual((await getJobById(job.id))?.status, 'SUCCEEDED');
}

await runFailure('seo_scan', { keyword: 'dentist', city: 'Pune' }, /UNAVAILABLE/);
await runFailure('seo_scan', { keyword: 'dentist', city: 'Unresolved City' }, /LOCATION_NOT_RESOLVED/);
await runFailure('seo_scan', { keyword: 'dentist', city: 'Pune', centerLat: 100, centerLng: 0 }, /LOCATION_NOT_RESOLVED/);
await runFailure('seo_scan', { keyword: 'dentist', centerLat: '', centerLng: '' }, /LOCATION_NOT_RESOLVED/);
await runFailure('competitor_scan', { competitorId: 'competitor', competitorName: 'Clinic' }, /UNAVAILABLE/);

const scan = unconfiguredProvider.scanRankGrid;
let observed: { centerLat: number; centerLng: number } | undefined;
unconfiguredProvider.scanRankGrid = async function(context, credentials) {
  observed = context;
  return scan.call(this, context, credentials);
};
try {
  await runFailure('seo_scan', { keyword: 'dentist', centerLat: 0, centerLng: 0 }, /UNAVAILABLE/);
  assert.equal(observed?.centerLat, 0);
  assert.equal(observed?.centerLng, 0);
} finally {
  unconfiguredProvider.scanRankGrid = scan;
}

const post = await createContentPost({ company_id: 'another_tenant', caption: 'Ownership fixture', status: 'draft', platforms: ['facebook'] } as any);
await runFailure('publishing', { postId: post.id }, /company/);
const db = await import('../server/db');
const persistence = {
  saveRankObservations: db.saveRankObservations,
  saveCompetitorObservation: db.saveCompetitorObservation,
};
const originalScan = unconfiguredProvider.scanRankGrid;
try {
  unconfiguredProvider.scanRankGrid = context => mockTestProvider.scanRankGrid(context);
  const successJob = await enqueueJob({ company_id: 'queue_safety_tenant', job_type: 'seo_scan', payload: { keyword: 'contract fixture', city: 'Pune' } });
  assert.equal((await executeJob(successJob)).status, 'SUCCEEDED');
  assert.equal((await getJobById(successJob.id))?.status, 'SUCCEEDED');
  assert.equal((await db.getLatestKeywordObservations('queue_safety_tenant', 'contract fixture')).length, 9);

  const failureJob = await enqueueJob({ company_id: 'queue_safety_tenant', job_type: 'seo_scan', payload: { keyword: 'storage failure', city: 'Pune' } });
  const failed = await executeJob(failureJob, {
    ...persistence,
    saveRankObservations: async () => { throw new Error('PERSISTENCE_FIXTURE_FAILURE'); },
  });
  assert.equal(failed.status, 'FAILED');
  assert.match(failed.error || '', /PERSISTENCE_FIXTURE_FAILURE/);
  assert.notEqual((await getJobById(failureJob.id))?.status, 'SUCCEEDED');

  unconfiguredProvider.scanRankGrid = async context => ({ ...await mockTestProvider.scanRankGrid(context), status: 'PARTIAL' });
  await runFailure('seo_scan', { keyword: 'partial scan', city: 'Pune' }, /PARTIAL/);
} finally {
  unconfiguredProvider.scanRankGrid = originalScan;
}
const { UnconfiguredCompetitorProvider } = await import('../server/competitorProvider');
const originalCompetitorFetch = UnconfiguredCompetitorProvider.prototype.fetchCompetitorObservation;
UnconfiguredCompetitorProvider.prototype.fetchCompetitorObservation = async function(context) {
  return {
    ...await originalCompetitorFetch.call(this, context),
    provider: 'contract_fixture', dataClassification: 'VERIFIED', candidate: false,
    identityConfidence: 1, rating: 4.2, reviewsCount: 12,
  };
};
try {
  const payload = { competitorId: 'verified_fixture', competitorName: 'Clinic' };
  const job = await enqueueJob({ company_id: 'queue_safety_tenant', job_type: 'competitor_scan', payload });
  assert.equal((await executeJob(job)).status, 'SUCCEEDED');
  const observations = await db.getLatestCompetitorObservations('queue_safety_tenant');
  assert.ok(observations.some(o => o.competitor_id === payload.competitorId && o.rating === 4.2));
  const failedJob = await enqueueJob({ company_id: 'queue_safety_tenant', job_type: 'competitor_scan', payload });
  const result = await executeJob(failedJob, {
    ...persistence,
    saveCompetitorObservation: async () => { throw new Error('COMPETITOR_STORAGE_FAILURE'); },
  });
  assert.equal(result.status, 'FAILED');
  assert.match(result.error || '', /COMPETITOR_STORAGE_FAILURE/);
  assert.notEqual((await getJobById(failedJob.id))?.status, 'SUCCEEDED');
} finally {
  UnconfiguredCompetitorProvider.prototype.fetchCompetitorObservation = originalCompetitorFetch;
}
console.log('Queue execution safety: 12 scenarios passed, including SEO and competitor persistence failures.');

const { scheduledPostKey } = await import('../server/scheduledPublishing');
const scheduledFixture = await createContentPost({ company_id: 'queue_safety_tenant', caption: 'Schedule guard fixture', status: 'scheduled', scheduled_date: '2020-01-01T10:00:00Z', platforms: ['facebook'] } as any);
await runFailure('publishing', { postId: scheduledFixture.id, scheduleOccurrence: 'old-schedule' }, /SCHEDULE_CHANGED/);
const pausedJob=await enqueueJob({company_id:'queue_safety_tenant',job_type:'publishing',payload:{postId:scheduledFixture.id,scheduleOccurrence:scheduledPostKey(scheduledFixture)}});
assert.equal((await executeJob(pausedJob)).status,'SKIPPED');assert.equal((await getJobById(pausedJob.id))?.status,'RETRY_WAIT');
console.log('Scheduled publishing worker rejects superseded occurrence and missing/paused client before provider dispatch.');
