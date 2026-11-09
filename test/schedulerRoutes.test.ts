import assert from 'node:assert/strict';
import express from 'express';
import { registerSchedulerRoutes } from '../server/schedulerRoutes';
const app = express();app.use(express.json());
let secret: string | undefined = 'dedicated-cron-fixture';
let ticks = 0, fail = false;let tickState:any={fixture:true};let historyReads=0;
registerSchedulerRoutes(app, {
  getCronSecret: () => secret,
  readHistory:async(before,limit)=>{historyReads++;assert.equal(before,null);assert.equal(limit,20);return {history:[],nextBefore:null};},
  getAuthUserFromRequest: async req => req.headers.authorization ? { is_platform_admin: req.headers.authorization === 'admin' } : null,
  runSchedulerTick: async () => { ticks++; if (fail) throw new Error('private SQL error'); return tickState; },
});
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
try {
  const address = server.address() as any;
  async function call(path: string, headers: Record<string, string>, expected: number) {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, { method: 'POST', headers });
    assert.equal(response.status, expected); return response.json();
  }
  await call('/api/scheduler/tick', {}, 403);
  await call('/api/cron/tick?secret=dedicated-cron-fixture', {}, 403);
  await call('/api/cron/tick', { 'x-cron-secret': 'wrong' }, 403);
  await call('/api/cron/tick', { Authorization: 'agency' }, 403);
  assert.equal(ticks, 0);
  await call('/api/scheduler/tick', { 'x-cron-secret': secret! }, 200);
  await call('/api/cron/tick', { Authorization: 'admin' }, 200);
  secret = undefined;
  await call('/api/cron/tick', { 'x-cron-secret': 'auth-secret-fixture' }, 403);
  assert.equal(ticks, 2);
  await call('/api/cron/tick', { Authorization: 'admin' }, 200);
  tickState={available:false,status:'UNAVAILABLE'};assert.equal((await call('/api/cron/tick',{Authorization:'admin'},503)).success,false);
  tickState={available:true,status:'EXISTING'};assert.equal((await call('/api/cron/tick',{Authorization:'admin'},202)).status,'already_observed');
  tickState={available:true,status:'PARTIAL'};assert.equal((await call('/api/cron/tick',{Authorization:'admin'},200)).status,'partial');
  await call('/api/cron/tick?secret=legacy',{Authorization:'admin'},400);
  async function history(query:string,auth:string|undefined,status:number){const response=await fetch(`http://127.0.0.1:${address.port}/api/scheduler/history${query}`,{headers:auth?{Authorization:auth}:{}});assert.equal(response.status,status);assert.ok(!JSON.stringify(await response.json()).includes('private'));return response;}
  await history('',undefined,401);await history('','agency',403);await history('?before=01','admin',400);await history('?limit=0','admin',400);await history('?companyId=A','admin',400);assert.equal(historyReads,0);assert.equal((await history('','admin',200)).headers.get('cache-control'),'no-store');
  fail = true;
  assert.ok(!JSON.stringify(await call('/api/cron/tick', { Authorization: 'admin' }, 500)).includes('private'));
  console.log('Scheduler HTTP dedicated secret/admin access, legacy query rejection, aliases and redaction passed.');
} finally { await new Promise<void>(resolve => server.close(() => resolve())); }
