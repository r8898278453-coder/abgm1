import assert from 'node:assert/strict';
import express from 'express';
import {registerPublicationWorkflow} from '../server/publicationWorkflowRoutes';
import {publishingSourceVersion} from '../server/publishingSource';
const app=express();app.use(express.json());let transitions=0,sends=0;
const post={id:'post',company_id:'owned',caption:'visible',status:'scheduled'} as any;
registerPublicationWorkflow(app,{
 getAuthUserFromRequest:async req=>req.headers.authorization?{id:'actor'} as any:null,
 verifyCompanyWorkspaceAccess:async(_,company)=>({authorized:company==='owned',status:403}),
 getPostById:async id=>id==='post'?post:null,
 history:async(company,post,before)=>{assert.equal(company,'owned');assert.equal(post,'post');assert.equal(before,undefined);return {history:[],nextBefore:null};},
 transition:async(_,actor,input)=>{transitions++;assert.equal(actor,'actor');assert.equal(input.status,'pending_approval');return {sourceVersion:'b'.repeat(64),status:input.status};},
 publish:async(value,options)=>{sends++;assert.equal(value,post);assert.equal(options.triggeredBy,'actor');assert.equal(options.expectedVersion,publishingSourceVersion(post));return {overallStatus:'PUBLISHED'};},
});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
try{
 const port=(server.address() as any).port;const valid={companyId:'owned',expectedVersion:publishingSourceVersion(post)};
 async function send(mode:string,body:any,status:number,auth=true){const response=await fetch(`http://127.0.0.1:${port}/api/posts/post/${mode}`,{method:mode==='status'?'PATCH':'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'fixture'}:{})},body:JSON.stringify(body)});assert.equal(response.status,status);return response.json();}
 async function history(company:string,query:string,status:number,auth=true){const response=await fetch(`http://127.0.0.1:${port}/api/companies/${company}/posts/post/workflow-history${query}`,{headers:auth?{Authorization:'fixture'}:{}});assert.equal(response.status,status);return response.json();}
 await history('owned','',401,false);await history('foreign','',403);await history('owned','?before=-1',400);await history('owned','?before=18446744073709551616',400);await history('owned','?before=1&before=2',400);assert.deepEqual((await history('owned','',200)).history,[]);
 await send('publish',valid,401,false);await send('publish',{...valid,companyId:'foreign'},403);
 await send('publish',{companyId:'owned'},400);await send('publish',{...valid,expectedVersion:'f'.repeat(64)},409);await send('publish',{...valid,actor:'forged'},400);
 await send('status',{...valid,status:'scheduled',schedule:{date:'2026-11-04',time:'10:00'}},400);
 await send('status',{...valid,status:'pending_approval',schedule:{date:'2026-02-30',time:'10:00'}},400);
 for(const status of ['published','publishing','unknown','failed','anything'])await send('status',{...valid,status},400);
 assert.equal(sends,0);assert.equal(transitions,0);
 await send('status',{...valid,status:'pending_approval'},200);assert.equal(transitions,1);
 assert.equal((await send('publish',valid,200)).success,true);assert.equal(sends,1);
 console.log('Publication workflow HTTP: actor/auth/workspace scope, strict statuses, mandatory viewed source version, stale rejection and canonical send passed.');
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
