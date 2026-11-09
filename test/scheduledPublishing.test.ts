import assert from 'node:assert/strict';
import { admitScheduledPosts, scheduledPostKey } from '../server/scheduledPublishing';
const post = { id: 'due-post', company_id: 'client-A', status: 'scheduled' as const, scheduled_date: '2020-01-01T10:00:00Z', scheduled_time: null, time_slot: null };
const future = { ...post, id: 'future-post', scheduled_date: '2999-01-01T10:00:00Z' };
let stopped = false;
const intents = new Map<string, any>();
const deps = {
  isStopped: () => stopped,
  getScheduledPosts: async () => [post, future, { ...post, id: 'paused', company_id: 'paused' }, { ...post, id: 'missing', company_id: 'missing' }, { ...post, id: 'bad-date', scheduled_date: 'bad' }],
  getCompanyById: async (id: string) => id === 'missing' ? null : { autopilot_enabled: id === 'client-A' },
  enqueueJob: async (options: any) => { const key = `${options.company_id}:${options.idempotency_key}`; if (!intents.has(key)) intents.set(key, options); return intents.get(key); },
};
assert.deepEqual(await admitScheduledPosts(deps), { processed: 5, admitted: 1, skipped: 4, failed: 0 });
await Promise.all([admitScheduledPosts(deps), admitScheduledPosts(deps)]);
assert.equal(intents.size, 1);
const admitted = [...intents.values()][0];
assert.equal(admitted.payload.postId, post.id);
assert.equal(admitted.payload.scheduleOccurrence, admitted.idempotency_key);
assert.notEqual(scheduledPostKey(post), scheduledPostKey({ ...post, company_id: 'client-B' }));
assert.notEqual(scheduledPostKey(post), scheduledPostKey({ ...post, scheduled_date: '2020-01-02T10:00:00Z' }));
assert.equal(scheduledPostKey(post),scheduledPostKey({...post,workflow_revision:0}));
assert.notEqual(scheduledPostKey(post),scheduledPostKey({...post,workflow_revision:1}));
assert.equal(scheduledPostKey({...post,workflow_revision:1}),scheduledPostKey({...post,workflow_revision:'1'}));
await admitScheduledPosts({...deps,getScheduledPosts:async()=>[{...post,workflow_revision:1}]});assert.equal(intents.size,2,'New approval generation must not reuse a denied job');
await admitScheduledPosts({...deps,getScheduledPosts:async()=>[{...post,workflow_revision:1}]});assert.equal(intents.size,2,'Same approval generation stays idempotent');
stopped = true;
assert.equal((await admitScheduledPosts(deps)).processed, 0);
stopped = false;
const failure = await admitScheduledPosts({ ...deps, enqueueJob: async () => { throw new Error('fixture'); } });
assert.equal(failure.failed, 1);
const stoppedMidScan = await admitScheduledPosts({ ...deps, enqueueJob: async options => { stopped = true; return options as any; } });
assert.equal(stoppedMidScan.processed, 1);
console.log('Scheduled publishing admission: overdue recovery, replay identity, client/schedule separation, future/invalid/missing/paused skips, mid-scan stop and failed admission passed.');
