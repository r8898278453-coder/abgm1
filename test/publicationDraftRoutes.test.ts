import assert from 'node:assert/strict';
import express from 'express';
import {registerPublicationDrafts} from '../server/publicationDraftRoutes';
import {PublishingReviewError} from '../server/publishingReview';
const app=express();app.use(express.json());let calls=0,reused=false,fail=0;
registerPublicationDrafts(app,{
 getAuthUserFromRequest:async req=>req.headers.authorization?{id:'actor'} as any:null,
 verifyCompanyWorkspaceAccess:async(_,company)=>({authorized:company==='owned',status:403}),
 prepare:async(company,actor,input)=>{calls++;assert.equal(actor,'actor');assert.equal(company,'owned');assert.equal(input.content,'content');if(fail===409)throw new PublishingReviewError(409,'Intent conflict');if(fail)throw new Error('private-secret');return {post:{id:'stored'},sourceVersion:'b'.repeat(64),reused};},
});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
try{
 const port=(server.address() as any).port;
 const valid={requestKey:'a'.repeat(64),content:'content',platforms:['facebook']};
 async function send(company:string,body:any,status:number,auth=true){const response=await fetch(`http://127.0.0.1:${port}/api/companies/${company}/meta-publication-drafts`,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'fixture'}:{})},body:JSON.stringify(body)});assert.equal(response.status,status);return response.json();}
 await send('owned',valid,401,false);await send('foreign',valid,403);
 for(const bad of [{...valid,actor:'forged'},{...valid,requestKey:'bad'},{...valid,platforms:['instagram']},{...valid,platforms:['facebook','facebook']},{...valid,status:'published'}])await send('owned',bad,400);
 assert.equal(calls,0);
 assert.equal((await send('owned',valid,201)).post.id,'stored');reused=true;assert.equal((await send('owned',valid,200)).reused,true);
 fail=409;await send('owned',valid,409);fail=500;assert.ok(!JSON.stringify(await send('owned',valid,500)).includes('private-secret'));
 console.log('Durable draft HTTP: authenticated actor, workspace scope, strict intent/content/targets, create/reuse, conflict and redacted failure passed.');
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
