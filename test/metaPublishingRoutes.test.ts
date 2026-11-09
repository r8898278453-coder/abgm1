import {publishingSourceVersion} from '../server/publishingSource';
import assert from 'node:assert/strict';
import express from 'express';
import { registerMetaPublishing } from '../server/metaPublishingRoutes';
import { createPostSchema } from '../server/validation';
const app=express();app.use(express.json());
let calls=0,fail=false,state='PUBLISHED';
let actualDb:typeof import('../server/db')|undefined;
let realPublisher:typeof import('../server/publishingEngine').executePublishingJob|undefined;
const post={id:'saved',company_id:'owned',caption:'Saved content',platforms:['facebook','instagram'],status:'draft'} as any;
registerMetaPublishing(app,{
  getAuthUserFromRequest:async req=>req.headers.authorization?{id:'owner'} as any:null,
  verifyCompanyWorkspaceAccess:async(_,id)=>({authorized:id==='owned',status:403}),
  getPostById:async id=>actualDb ? actualDb.getPostById(id) : id==='saved'?post:id==='foreign'?{...post,company_id:'foreign'}:null,
  executePublishingJob:async(value,options)=>{
    if(realPublisher)return realPublisher(value,options);
    calls++;assert.equal(value,post);assert.equal(options?.triggeredBy,'owner');
    if(fail)throw new Error('private provider token');
    return {overallStatus:state,message:'Canonical outcome',platformResults:[{platform:'facebook',status:'PUBLISHED',providerPostId:'confirmed'},{platform:'instagram',status:state==='PUBLISHED'?'PUBLISHED':'UNKNOWN'}]} as any;
  },
});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
try{
  const address=server.address() as any;
  const valid={expectedVersion:publishingSourceVersion(post),companyId:'owned',postId:'saved',content:'Saved content',platforms:['facebook','instagram']};
  async function send(body:unknown,status:number,auth=true){
    const response=await fetch(`http://127.0.0.1:${address.port}/api/meta/publish-post`,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'fixture'}:{})},body:JSON.stringify(body)});
    assert.equal(response.status,status);return response.json();
  }
  await send(valid,401,false);await send({...valid,companyId:'foreign'},403);
  for(const body of [{...valid,expectedVersion:undefined},{...valid,postId:undefined},{...valid,companyId:undefined},{...valid,platforms:['whatsapp']},{...valid,platforms:[]},{...valid,platforms:['facebook','facebook']},{...valid,force:true}])await send(body,400);
  await send({...valid,postId:'foreign'},404);await send({...valid,postId:'missing'},404);
  for(const body of [{...valid,content:'changed'}, {...valid,imageUrl:'https://example.invalid/changed'}, {...valid,platforms:['facebook']}])await send(body,409);
  await send({...valid,expectedVersion:'f'.repeat(64)},409);
  assert.equal(calls,0);
  assert.equal((await send(valid,200)).success,true);
  state='UNKNOWN';const unknown=await send(valid,200);assert.equal(unknown.success,false);assert.equal(unknown.status,'UNKNOWN');assert.equal(unknown.results.facebook.id,'confirmed');
  state='IN_PROGRESS';assert.equal((await send(valid,202)).success,false);
  fail=true;assert.ok(!JSON.stringify(await send(valid,500)).includes('private'));
  const saved=createPostSchema.parse({caption:'Saved content',companyId:'owned',platforms:['facebook','instagram'],video_url:'https://example.invalid/video.mp4',status:'draft'});
  assert.equal(saved.companyId,'owned');assert.deepEqual(saved.platforms,['facebook','instagram']);assert.ok(saved.video_url);
  assert.equal(createPostSchema.safeParse({caption:'Saved content',companyId:'owned',company_id:'foreign'}).success,false);
  process.env.NODE_ENV='test';
  for(const key of ['DB_HOST','DB_NAME','DB_USER','DB_PASSWORD','DATABASE_URL'])delete process.env[key];
  actualDb=await import('../server/db');assert.equal(await actualDb.getDbPool(),null);
  realPublisher=(await import('../server/publishingEngine')).executePublishingJob;
  await actualDb.saveCompanyDataPayload('owned',{engine_settings:{approvalSettings:{googlePosts:'auto',socialPosts:'auto',promotionalOffers:'auto'}}});
  await actualDb.saveCompanyIntegration('owned','meta_social',{status:'connected',credentials:{pageId:'fixture-page',accessToken:'private-fixture'}});
  const originalFetch=globalThis.fetch;
  let providerCalls=0,uncertain=false;
  globalThis.fetch=async(input,init)=>{
    if(String(input).startsWith('https://graph.facebook.com/')){providerCalls++;if(uncertain)throw new Error('unconfirmed');return new Response(JSON.stringify({id:'real-provider-fixture'}));}
    return originalFetch(input,init);
  };
  try{
    const stored=await actualDb.createContentPost({company_id:'owned',caption:'Real canonical bridge',platforms:['facebook'],status:'draft'} as any);
    const body={expectedVersion:publishingSourceVersion(stored),companyId:'owned',postId:stored.id,content:stored.caption,platforms:['facebook']};
    assert.equal((await send(body,200)).status,'PUBLISHED');
    body.expectedVersion=publishingSourceVersion((await actualDb.getPostById(stored.id))!);
    assert.equal((await send(body,200)).status,'SKIPPED_ALREADY_PUBLISHED');assert.equal(providerCalls,1);
    const pending=await actualDb.createContentPost({company_id:'owned',caption:'Unknown bridge',platforms:['facebook'],status:'draft'} as any);
    uncertain=true;
    const uncertainBody={...body,expectedVersion:publishingSourceVersion(pending),postId:pending.id,content:pending.caption};
    assert.equal((await send(uncertainBody,200)).status,'UNKNOWN');
    uncertainBody.expectedVersion=publishingSourceVersion((await actualDb.getPostById(pending.id))!);
    assert.equal((await send(uncertainBody,200)).status,'UNKNOWN');assert.equal(providerCalls,2);
  }finally{globalThis.fetch=originalFetch;}
  console.log('Meta compatibility HTTP: stored workspace/post required, overrides/unsupported targets rejected, canonical dispatch only, truthful unknown/in-progress and draft schema preservation passed.');
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
