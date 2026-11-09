import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const original=process.cwd(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'autonomous-review-'));process.chdir(dir);
try{
 const {dispatchAutonomousReviewReply}=await import('../server/autonomousReviewReply');
 const {setGlobalEmergencyStop}=await import('../server/executionStop');
 setGlobalEmergencyStop(false);
 const review={id:'fixture',company_id:'A',external_review_id:'canonical-review'} as any;
 const integration={credentials:{oauthToken:'private-token',accountId:'accounts/123',locationId:'locations/456'}};
 const calls:Array<{url:string;method:string}>=[];
 let mode='verified';const transport:typeof fetch=async(url,options)=>{
  calls.push({url:String(url),method:options?.method||'GET'});
  if(mode==='network')throw new Error('private-error-detail');
  if(options?.method==='PUT'){if(mode==='paused-after-put')setGlobalEmergencyStop(true);return new Response('{}',{status:mode==='server-error'?500:mode==='rejected'?403:200});}
  if(mode==='read-timeout')throw new Error('private-read-detail');
  return new Response(JSON.stringify({reviewReply:{comment:mode==='mismatch'?'Other reply':'Fixture reply'}}),{status:200});
 };
 await assert.rejects(dispatchAutonomousReviewReply('B',review,'Fixture reply',integration,transport),/workspace mismatch/);assert.equal(calls.length,0);
 await assert.rejects(dispatchAutonomousReviewReply('A',review,'',integration,transport),/Invalid review/);assert.equal(calls.length,0);
 assert.deepEqual(await dispatchAutonomousReviewReply('A',review,'Fixture reply',null,transport),{replyStatus:'LOCAL_ONLY',publication:'LOCAL_ONLY',verified:false});assert.equal(calls.length,0);
 setGlobalEmergencyStop(true);await assert.rejects(dispatchAutonomousReviewReply('A',review,'Fixture reply',integration,transport),/execution stop/);assert.equal(calls.length,0);setGlobalEmergencyStop(false);
 const verified=await dispatchAutonomousReviewReply('A',review,'Fixture reply',integration,transport);assert.equal(verified.verified,true);assert.equal(verified.publication,'VERIFIED');
 assert.equal(calls[0].url,'https://mybusiness.googleapis.com/v4/accounts/123/locations/456/reviews/canonical-review/reply');assert.equal(calls[1].url,'https://mybusiness.googleapis.com/v4/accounts/123/locations/456/reviews/canonical-review');assert.equal(calls[1].method,'GET');
 for(const state of ['mismatch','read-timeout','network','server-error','rejected','paused-after-put']){
  mode=state;const outcome=await dispatchAutonomousReviewReply('A',review,'Fixture reply',integration,transport);
  assert.equal(outcome.verified,state==='paused-after-put');assert.equal(outcome.publication,state==='rejected'?'REJECTED':['network','server-error'].includes(state)?'UNKNOWN':state==='paused-after-put'?'VERIFIED':'API_ACCEPTED');
  assert.ok(!JSON.stringify(outcome).includes('private-'));
 }
 console.log('Autonomous reviews: canonical tenant/source validation, no provider claim for local saves, stop at write boundary, matching read-back verification, acceptance/read failure/rejection/UNKNOWN and redaction passed.');
}finally{process.chdir(original);fs.rmSync(dir,{recursive:true,force:true});}
