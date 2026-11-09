import assert from 'node:assert/strict';
import express from 'express';
import {registerMetaVerification} from '../server/metaVerificationRoutes';
const app=express();app.use(express.json());let calls=0,status='MATCHED',fail=false;let release:(()=>void)|undefined;let started:(()=>void)|undefined;let hold=false;
registerMetaVerification(app,{
 getAuthUserFromRequest:async req=>req.headers.authorization?{id:'session-actor'} as any:null,
 verifyCompanyWorkspaceAccess:async(_,company)=>({authorized:company==='owned',status:403}),
 check:async(company,post,actor)=>{calls++;if(hold){started?.();await new Promise<void>(resolve=>{release=resolve;});}assert.equal(company,'owned');assert.equal(post,'post');assert.equal(actor,'session-actor');if(fail)throw new Error('private-token');return {id:'check',verification:{status,reason:'FIXTURE'},resendEnabled:false,claimStateChanged:false};},
});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
try{
 const address=server.address() as any;
 const valid={expectedVersion:'a'.repeat(64),platform:'facebook',providerPostId:'101_202'};
 async function send(company:string,body:any,expected:number,auth=true){const response=await fetch(`http://127.0.0.1:${address.port}/api/companies/${company}/posts/post/publishing-verification`,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'fixture'}:{})},body:JSON.stringify(body)});assert.equal(response.status,expected);return response.json();}
 await send('owned',valid,401,false);await send('foreign',valid,403);
 for(const body of [{...valid,actorId:'forged'},{...valid,status:'MATCHED'},{...valid,platform:'telegram'},{...valid,providerPostId:'../token?x=1'},{...valid,expectedVersion:'bad'}])await send('owned',body,400);
 assert.equal(calls,0);
 assert.equal((await send('owned',valid,200)).resendEnabled,false);
 status='UNAVAILABLE';assert.equal((await send('owned',valid,200)).verification.status,'UNAVAILABLE');
 status='STALE';assert.equal((await send('owned',valid,409)).success,false);
 fail=true;assert.ok(!JSON.stringify(await send('owned',valid,500)).includes('private-token'));
 fail=false;status='MATCHED';hold=true;
 const pendingStart=new Promise<void>(resolve=>{started=resolve;});
 const pending=send('owned',valid,200);await pendingStart;
 const busy=await send('owned',valid,429);assert.equal(busy.success,false);assert.equal(calls,5);
 release!();hold=false;await pending;
 await send('owned',valid,200);assert.equal(calls,6);
 await send('owned',valid,429);assert.equal(calls,6);
 console.log('Meta verification HTTP: workspace/auth scope, server actor, strict provider ID/version, stale response and redaction passed.');
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
