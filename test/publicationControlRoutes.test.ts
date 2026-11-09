import assert from 'node:assert/strict';
import express from 'express';
import {registerPublicationControls} from '../server/publicationControlRoutes';
import {PublishingReviewError} from '../server/publishingReview';
const app=express();app.use(express.json());let writes=0,fail=0;
const controls={dailyPostLimit:null,quota:{date:'2026-11-04',reservedPosts:0,remaining:null},version:'1',paused:true,channels:['facebook'],updatedBy:'actor',updatedAtMs:Date.now()};
registerPublicationControls(app,{
 getAuthUserFromRequest:async req=>req.headers.authorization?{id:'actor'} as any:null,
 verifyCompanyWorkspaceAccess:async(_,company)=>({authorized:company==='owned',status:403}),
 read:async()=>controls,
 history:async(company,before)=>{assert.equal(company,'owned');assert.equal(before,undefined);return {history:[],nextBefore:null};},
 update:async(company,actor,input)=>{writes++;assert.equal(company,'owned');assert.equal(actor,'actor');assert.equal(input.expectedVersion,'0');if(fail===409)throw new PublishingReviewError(409,'Conflict');if(fail)throw new Error('private-control-value');return controls;},
});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
try{
 const port=(server.address() as any).port;const valid={expectedVersion:'0',paused:true,channels:['facebook']};
 async function send(company:string,body:any,status:number,auth=true){const response=await fetch(`http://127.0.0.1:${port}/api/companies/${company}/publication-controls`,{method:'PATCH',headers:{'Content-Type':'application/json',...(auth?{Authorization:'fixture'}:{})},body:JSON.stringify(body)});assert.equal(response.status,status);return response.json();}
 await send('owned',valid,401,false);await send('foreign',valid,403);
 for(const body of [{...valid,dailyPostLimit:0},{...valid,dailyPostLimit:100001},{...valid,dailyPostLimit:1.5},{...valid,actor:'forged'},{...valid,paused:'true'},{...valid,channels:['unsupported']},{...valid,channels:['facebook','facebook']},{...valid,expectedVersion:'18446744073709551616'}])await send('owned',body,400);
 assert.equal(writes,0);assert.equal((await send('owned',valid,200)).controls.paused,true);
 fail=409;await send('owned',valid,409);fail=503;assert.ok(!JSON.stringify(await send('owned',valid,503)).includes('private-control-value'));
 const history=await fetch(`http://127.0.0.1:${port}/api/companies/owned/publication-controls/history`,{headers:{Authorization:'fixture'}});assert.equal(history.status,200);assert.deepEqual((await history.json()).history,[]);
 const badHistory=await fetch(`http://127.0.0.1:${port}/api/companies/owned/publication-controls/history?before=-1`,{headers:{Authorization:'fixture'}});assert.equal(badHistory.status,400);
 const read=await fetch(`http://127.0.0.1:${port}/api/companies/owned/publication-controls`,{headers:{Authorization:'fixture'}});assert.equal(read.status,200);assert.equal((await read.json()).controls.version,'1');
 console.log('Publication control HTTP: auth/workspace scope, server actor, strict boolean/channel/version, stale conflict and redacted failure passed.');
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
