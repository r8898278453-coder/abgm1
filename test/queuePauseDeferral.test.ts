import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
process.env.NODE_ENV='test';for(const key of ['DB_HOST','DB_NAME','DB_USER','DB_PASSWORD','DATABASE_URL'])delete process.env[key];
const root=fs.mkdtempSync(path.join(os.tmpdir(),'abgm1-deferral-')),previous=process.cwd(),originalFetch=globalThis.fetch;
process.chdir(root);
try{
 const db=await import('../server/db');const {executeJob}=await import('../server/jobQueueService');
 const {setGlobalEmergencyStop}=await import('../server/executionStop');
 const {scheduledPostKey}=await import('../server/scheduledPublishing');
 const client=await db.createCompany({id:'paused-client',user_id:'fixture',name:'fixture',category:'fixture',city:'fixture',autopilot_enabled:false});
 await db.saveCompanyDataPayload(client.id,{engine_settings:{approvalSettings:{socialPosts:'auto',promotionalOffers:'auto'}}});
 await db.saveCompanyIntegration(client.id,'meta_social',{status:'connected',credentials:{pageId:'page',accessToken:'fixture-token'}});
 let calls=0;globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({id:'confirmed-fixture'}));};
 const post=await db.createContentPost({company_id:client.id,caption:'paused work',status:'scheduled',platforms:['facebook'],scheduled_date:'2020-01-01',scheduled_time:'10:00'});
 const job=await db.enqueueJob({company_id:client.id,job_type:'publishing',payload:{postId:post.id,scheduleOccurrence:scheduledPostKey(post)},max_attempts:1});
 const due=async(id:string)=>{const stored=await db.getJobById(id);assert.ok(stored);stored.scheduled_for='2000-01-01T00:00:00Z';return stored;};
 let stale:any;
 for(let n=1;n<=6;n++){
  await due(job.id);const claimed=await db.claimNextJob('same-worker',['publishing']);assert.ok(claimed);assert.equal(claimed.id,job.id);
  stale={workerId:'same-worker',attempt:claimed.attempts};
  assert.equal((await executeJob(claimed)).status,'SKIPPED');const stored=await db.getJobById(job.id);
  assert.equal(stored?.attempts,n);assert.equal(stored?.deferrals,n);assert.equal(stored?.status,'RETRY_WAIT');assert.ok(Date.parse(stored!.scheduled_for)>Date.now()+50000);
 }
 assert.equal(calls,0);client.autopilot_enabled=true;await due(job.id);
 const resumed=await db.claimNextJob('same-worker',['publishing']);assert.ok(resumed);assert.equal(resumed.attempts,7);
 assert.equal(await db.deferJob(job.id,'CLIENT_AUTOPILOT_PAUSED',stale),null);assert.equal(await db.completeJob(job.id,{},stale),null);
 assert.equal((await executeJob(resumed)).status,'SUCCEEDED');assert.equal(calls,1);
 const globalJob=await db.enqueueJob({company_id:client.id,job_type:'ai_summary',payload:{},max_attempts:1});
 setGlobalEmergencyStop(true);const globalClaim=await db.claimNextJob('global-worker',['ai_summary']);assert.ok(globalClaim);
 assert.equal((await executeJob(globalClaim)).status,'SKIPPED');assert.equal((await db.getJobById(globalJob.id))?.deferrals,1);setGlobalEmergencyStop(false);
 await db.cancelJob(globalJob.id,client.id);assert.equal(await db.deferJob(globalJob.id,'GLOBAL_EMERGENCY_STOP'),null);
 const budget=await db.enqueueJob({company_id:client.id,job_type:'budget-fixture',payload:{},max_attempts:2});
 let claimed=await db.claimNextJob('budget-worker',['budget-fixture']);assert.ok(claimed);
 await db.deferJob(budget.id,'PUBLICATION_QUOTA_EXHAUSTED',{workerId:'budget-worker',attempt:claimed.attempts});
 for(let n=0;n<2;n++){await due(budget.id);claimed=await db.claimNextJob('budget-worker',['budget-fixture']);assert.ok(claimed);await db.failJob(budget.id,'actual execution failure',true,{workerId:'budget-worker',attempt:claimed.attempts});}
 const failed=await db.getJobById(budget.id);assert.equal(failed?.status,'FAILED');assert.equal(failed?.attempts,3);assert.equal(failed?.deferrals,1);
 console.log('Queue pause recovery: six pauses preserve retry budget, monotonic same-worker fencing, resume sends once, global deferral/cancel and real failure exhaustion passed.');
}finally{globalThis.fetch=originalFetch;process.chdir(previous);fs.rmSync(root,{recursive:true,force:true});}
