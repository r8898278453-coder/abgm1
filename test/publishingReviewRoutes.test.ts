import assert from 'node:assert/strict';
import express from 'express';
import { registerPublishingReview } from '../server/publishingReviewRoutes';
import { PublishingReviewError } from '../server/publishingReview';
const app=express();app.use(express.json());
let reads=0,writes=0,conflict=false,fail=false;
registerPublishingReview(app,{
  getAuthUserFromRequest:async req=>req.headers.authorization?{id:'session-actor'} as any:null,
  verifyCompanyWorkspaceAccess:async(_,id)=>({authorized:id==='owned',status:403}),
  read:async(company,post,before)=>{reads++;assert.equal(company,'owned');assert.equal(post,'post');if(fail)throw new Error('private-token');return {version:'a'.repeat(64),before};},
  append:async(company,post,actor)=>{writes++;assert.equal(actor,'session-actor');assert.equal(company,'owned');assert.equal(post,'post');if(conflict)throw new PublishingReviewError(409,'Evidence changed');return {id:'fixture-note',recorded:true,resendEnabled:false};},
});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
try{
 const address=server.address() as any;
 async function call(company:string,method:string,body:any,status:number,auth=true,query=''){
  const response=await fetch(`http://127.0.0.1:${address.port}/api/companies/${company}/posts/post/publishing-review${query}`,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'fixture'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  assert.equal(response.status,status);return response.json();
 }
 const valid={expectedVersion:'a'.repeat(64),decision:'UNRESOLVED',evidenceReference:'Manual provider check'};
 await call('owned','GET',undefined,401,false);await call('foreign','GET',undefined,403);await call('foreign','POST',valid,403);
 await call('owned','GET',undefined,400,true,'?before[]=1');await call('owned','GET',undefined,400,true,'?before=18446744073709551616');
 for(const body of [{...valid,actorId:'forged'},{...valid,expectedVersion:'bad'},{...valid,evidenceReference:'x'},{...valid,decision:'OBSERVED_PUBLISHED'},{...valid,providerPostId:'unexpected'}])await call('owned','POST',body,400);
 assert.equal(reads,0);assert.equal(writes,0);
 await call('owned','GET',undefined,200);
 assert.equal((await call('owned','POST',valid,201)).resendEnabled,false);
 conflict=true;await call('owned','POST',valid,409);
 fail=true;assert.ok(!JSON.stringify(await call('owned','GET',undefined,500)).includes('private-token'));
 console.log('Publishing review HTTP: workspace/auth scope, actor spoof rejection, evidence/version validation, conflict and redaction passed; no resend action.');
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
