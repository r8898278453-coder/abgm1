import {recoverKnowledgeIngestion} from '../server/knowledgeIngestion';
import assert from 'node:assert/strict';
import { createWorkBudget, runBudgetedStages } from '../server/workBudget';
import { processActionOutbox } from '../server/actionOutbox';
import { admitScheduledPosts } from '../server/scheduledPublishing';
let now = 0;
const budget = createWorkBudget(10, () => now);
const calls: string[] = [];
const result = await runBudgetedStages({
  first: async gate => { assert.equal(gate(),true); calls.push('first'); now = 8; return { completed:true }; },
  second: async gate => { calls.push('second'); assert.equal(gate(),true); now = 12; assert.equal(gate(),false); return { processed:1 }; },
  third: async () => { calls.push('third'); return { completed:true }; },
},budget);
assert.deepEqual(calls,['first','second']);
assert.deepEqual(result.results.third,{ deferred:true, reason:'TICK_BUDGET_EXHAUSTED' });
assert.deepEqual(result.budget.deferredStages,['third']);
assert.equal(result.budget.mode,'cooperative'); assert.equal(result.budget.exhausted,true); assert.equal(result.budget.elapsedMs,12);
assert.deepEqual(result.results.second,{processed:1});
assert.throws(() => createWorkBudget(0)); assert.throws(() => createWorkBudget(60001));
await assert.rejects(runBudgetedStages({ fault: async () => { throw new Error('fixture'); }, later: async () => { throw new Error('must not start'); } }), /fixture/);
const stoppedOutbox = await processActionOutbox({ getConnection: async () => { throw new Error('must not acquire connection'); } } as any,'budget-test',25,() => false);
assert.equal(stoppedOutbox.processed,0);
let selected = 0, enqueued = 0, allow = false;
const deps = {
  isStopped: () => false, canStart: () => allow,
  getScheduledPosts: async () => { selected++; return [{id:'post',company_id:'client',status:'scheduled' as const,scheduled_date:'2020-01-01T10:00:00Z'}]; },
  getCompanyById: async () => { allow = false; return { autopilot_enabled:true }; },
  enqueueJob: async () => { enqueued++; throw new Error('must not enqueue'); },
};
await admitScheduledPosts(deps); assert.equal(selected,0);
allow = true; await admitScheduledPosts(deps); assert.equal(selected,1); assert.equal(enqueued,0);
// A running claimed handler settles normally; the next queued job is left unclaimed.
process.env.NODE_ENV = 'test';
for (const key of ['DB_HOST','DB_NAME','DB_USER','DB_PASSWORD','DATABASE_URL']) delete process.env[key];
const db = await import('../server/db');
assert.equal(await db.getDbPool(),null,'Budget test must never write a configured DB');
const { tickJobQueue } = await import('../server/jobQueueService');
const first = await db.enqueueJob({company_id:'budget-fixture',job_type:'unsupported_fixture',payload:{}});
const second = await db.enqueueJob({company_id:'budget-fixture',job_type:'unsupported_fixture',payload:{}});
const summary = await tickJobQueue('budget-worker',5,() => first.status!=='FAILED'); // A pure budget signal closes when the active handler settles, independent of admission/read checks.
assert.equal(summary.processedCount,1);
assert.equal((await db.getJobById(first.id))?.status,'FAILED');
assert.equal((await db.getJobById(second.id))?.status,'QUEUED');
assert.equal((await tickJobQueue('budget-stopped',5,()=>false)).processedCount,0);assert.equal((await db.getJobById(second.id))?.status,'QUEUED');
console.log('Cooperative budget: monotonic deadline, explicit deferred stages, active settlement, next-claim blocking, admission recheck and outbox pre-acquisition stop passed.');

await recoverKnowledgeIngestion({getConnection:async()=>{throw new Error('Must not acquire source recovery SQL after budget');}} as any,()=>false);
