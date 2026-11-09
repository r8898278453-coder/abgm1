import assert from 'node:assert/strict';
import express from 'express';
import {nextMonthPlanDates,createContentDraftPlan} from '../shared/contentPlan';
import {registerContentMutationRoutes} from '../server/contentMutationRoutes';
import {createPostSchema} from '../server/validation';
assert.deepEqual(nextMonthPlanDates(Date.parse('2026-12-31T20:00:00Z')),['2027-02-01','2027-02-08','2027-02-15']);
assert.deepEqual(nextMonthPlanDates(Date.parse('2026-12-31T18:00:00Z')),['2027-01-01','2027-01-08','2027-01-15']);
const input={companyId:'B',caption:'Saved fixture',status:'draft',cta:'Ask us',time_slot:'11:00 AM',reel_script:[{scene:'One',visual:'A',audio:'B'}]};const parsed=createPostSchema.parse(input);assert.equal(parsed.cta,'Ask us');assert.equal(parsed.time_slot,'11:00 AM');assert.equal(parsed.reel_script?.length,1);assert.equal(parsed.scheduled_time,undefined);
let writes=0;
const dates=nextMonthPlanDates(Date.parse('2026-11-05T00:00:00Z'));
const partial=await createContentDraftPlan({dates,signal:new AbortController().signal,generate:async(_,i)=>{if(i===1)throw new Error('Unavailable');return 'draft';},save:async()=>{writes++;return true;}});assert.deepEqual(partial.map(row=>row.status),['saved','generation_failed','saved']);assert.equal(writes,2);
const lost=await createContentDraftPlan({dates,signal:new AbortController().signal,generate:async()=> 'draft',save:async()=>false});assert.deepEqual(lost.map(row=>row.status),['save_unconfirmed','not_started','not_started']);
const abort=new AbortController();abort.abort();assert.ok((await createContentDraftPlan({dates,signal:abort.signal,generate:async()=>{throw new Error('must not run');},save:async()=>{throw new Error('must not run');}})).every(row=>row.status==='not_started'));
const app=express();let calls=0,fail=false,allow=true,removed=true;
registerContentMutationRoutes(app,{auth:async req=>req.headers.authorization?{id:'actor'} as any:null,company:async id=>id==='missing'?null:'A',access:async()=>({authorized:allow,status:403}),remove:async()=>{calls++;if(fail)throw new Error('private-db-detail');return removed;}});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
try{
 const port=(server.address() as any).port;
 async function del(path:string,status:number,auth=true){const res=await fetch(`http://127.0.0.1:${port}/api/${path}`,{method:'DELETE',headers:auth?{Authorization:'fixture'}:{}});assert.equal(res.status,status);return res.json();}
 await del('posts/x',401,false);await del('posts/missing',404);await del('posts/x?companyId=B',403);await del('posts/x?companyId=A&companyId=B',400);allow=false;await del('posts/x?companyId=A',403);allow=true;assert.equal(calls,0);
 assert.equal((await del('content-posts/x?companyId=A',200)).providerDeletion,'NOT_PERFORMED');removed=false;await del('posts/x?companyId=A',409);fail=true;assert.ok(!JSON.stringify(await del('posts/x?companyId=A',503)).includes('private-db-detail'));
 console.log('Content mutations: IST next-month dates, partial draft planning, unconfirmed-save stop, cancellation, field preservation and scoped deletion HTTP contracts passed.');
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
