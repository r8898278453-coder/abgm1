import assert from 'node:assert/strict';
process.env.NODE_ENV='test';
for(const key of ['DB_HOST','DB_NAME','DB_USER','DB_PASSWORD','DATABASE_URL']) delete process.env[key];
const db=await import('../server/db');
assert.equal(await db.getDbPool(),null,'Publishing fixtures must not use a configured DB');
const {executePublishingJob,classifyProviderError}=await import('../server/publishingEngine');
const {executeJob}=await import('../server/jobQueueService');
await db.createCompany({id:'outcome-fixture',user_id:'fixture',name:'Fixture',category:'fixture',city:'fixture',autopilot_enabled:true});
await db.saveCompanyDataPayload('outcome-fixture',{engine_settings:{approvalSettings:{googlePosts:'auto',socialPosts:'auto',promotionalOffers:'auto'}}});
await db.saveCompanyIntegration('outcome-fixture','meta_social',{status:'connected',credentials:{pageId:'fixture-page',instagramId:'fixture-ig',accessToken:'private-fixture-token'}});
const originalFetch=globalThis.fetch;
let mode='timeout',calls:string[]=[];
globalThis.fetch=async(input,init)=>{
  const url=String(input);calls.push(url);
  if(url.startsWith('https://api.telegram.org/')) { const body=JSON.parse(String(init?.body)); assert.equal(body.chat_id,'-1001'); return new Response(JSON.stringify({ok:true,result:{message_id:17,chat:{id:mode==='wrong-chat' ? -999 : -1001}}})); }
  assert.ok(url.startsWith('https://graph.facebook.com/'));
  assert.ok(init?.signal,'Provider calls must have an abort deadline');
  if(mode==='timeout') throw new Error('private-fixture-token in network URL');
  if(mode==='server') return new Response(JSON.stringify({error:{message:'upstream error'}}),{status:503});
  if(mode==='malformed') return new Response('not json',{status:200});
  if(mode==='noid') return new Response('{}',{status:200});
  if(mode==='rate' && calls.length===1) return new Response(JSON.stringify({error:{message:'rate limit'}}),{status:429});
  if(url.endsWith('/feed') || url.endsWith('/photos')) return new Response(JSON.stringify({id:'confirmed-facebook'}));
  if(mode==='partial') return new Response(JSON.stringify({error:{message:'permission denied'}}),{status:403});
  if(url.endsWith('/media')) return new Response(JSON.stringify({id:'created-container'}));
  throw new DOMException('Unconfirmed publish','TimeoutError');
};
async function post(platforms=['facebook']) {return db.createContentPost({company_id:'outcome-fixture',caption:'fixture',status:'scheduled',platforms,image_url:'https://example.invalid/fixture.png'} as any);}
try {
  await db.saveCompanyIntegration('approval-default-fixture','meta_social',{status:'connected',credentials:{pageId:'fixture-page',accessToken:'private-fixture-token'}});
  const blockedByPolicy=await db.createContentPost({company_id:'approval-default-fixture',caption:'Needs review',status:'draft',platforms:['facebook']} as any);
  calls=[];const denied=await executePublishingJob(blockedByPolicy,{force:true});
  assert.equal(denied.overallStatus,'FAILED');assert.equal(denied.finalPostStatus,'draft');assert.match(denied.message,/Approval required/);assert.equal(calls.length,0);
  const pendingApproval=await db.createContentPost({company_id:'outcome-fixture',caption:'needs approval',status:'pending_approval',platforms:['facebook']} as any);
  calls=[];assert.equal((await executePublishingJob(pendingApproval,{force:true})).overallStatus,'FAILED');assert.equal(calls.length,0);
  const canonical=await post();calls=[];
  for(const input of [{...canonical,caption:'forged'}, {postId:canonical.id,companyId:'foreign'}, {postId:canonical.id,payload:{caption:'forged'}}, {postId:canonical.id,platform:'instagram'}, {postId:'missing-post',payload:{caption:'invented'}}]){
    assert.equal((await executePublishingJob(input as any)).overallStatus,'FAILED');
    assert.equal(calls.length,0,'Stale/overridden/missing source must never reach provider');
  }
  assert.equal(classifyProviderError('timeout').isRetryable,false);
  assert.equal(classifyProviderError('upstream',503).errorType,'TIMEOUT_UNKNOWN');
  assert.equal(classifyProviderError('rate',429).isRetryable,true);
  for(const current of ['timeout','server','malformed','noid']) {
    mode=current;calls=[];const content=await post();
    const result=await executePublishingJob(content);
    assert.equal(result.overallStatus,'UNKNOWN');assert.equal(calls.length,1);
    assert.ok(!JSON.stringify(result).includes('private-fixture-token'));
    const latest=await db.getPostById(content.id);assert.equal(latest?.status,'unknown');
    await executePublishingJob(latest!,{force:true});assert.equal(calls.length,1,'Force must not blindly resend unconfirmed attempt');
  }
  mode='timeout';calls=[];const queuePost=await post();
  const job=await db.enqueueJob({company_id:'outcome-fixture',job_type:'publishing',payload:{postId:queuePost.id}});
  assert.equal((await executeJob(job)).status,'FAILED');
  assert.equal((await db.getJobById(job.id))?.status,'FAILED');
  assert.equal(calls.length,1);assert.equal((await db.getPostById(queuePost.id))?.status,'unknown');
  mode='mixed';calls=[];const mixed=await post(['facebook','instagram']);
  const mixedResult=await executePublishingJob(mixed);
  assert.equal(mixedResult.overallStatus,'UNKNOWN');assert.equal((await db.getPostById(mixed.id))?.status,'unknown');
  assert.equal(mixedResult.platformResults.find(r=>r.platform==='facebook')?.status,'PUBLISHED');
  const priorCalls=calls.length;await executePublishingJob((await db.getPostById(mixed.id))!,{force:true});assert.equal(calls.length,priorCalls);
  mode='partial';calls=[];const partial=await post(['facebook','instagram']);
  const partialResult=await executePublishingJob(partial);
  assert.equal(partialResult.overallStatus,'FAILED');assert.match(partialResult.message,/Partially published/);
  assert.notEqual((await db.getPostById(partial.id))?.status,'published');
  const stalled=await post();await db.createPublishingRecord({post_id:stalled.id,company_id:stalled.company_id,platform:'facebook',status:'RETRYING',attempt_count:1,max_attempts:3,idempotency_key:'stalled-fixture'});
  calls=[];assert.equal((await executePublishingJob(stalled)).overallStatus,'UNKNOWN');assert.equal(calls.length,0);
  process.env.TELEGRAM_BOT_TOKEN='999:GlobalFixture';process.env.TELEGRAM_CHAT_ID='-999';
  const foreign=await db.createContentPost({company_id:'unconfigured-client',caption:'private',status:'scheduled',platforms:['telegram']} as any);
  calls=[];assert.equal((await executePublishingJob(foreign)).overallStatus,'FAILED');assert.equal(calls.length,0);
  await db.saveCompanyIntegration('outcome-fixture','telegram_bot',{status:'connected',credentials:{botToken:'123:TenantFixture',chatId:'-1001'}});
  mode='telegram';calls=[];assert.equal((await executePublishingJob(await post(['telegram']))).overallStatus,'PUBLISHED');assert.equal(calls.length,1);
  mode='wrong-chat';calls=[];assert.equal((await executePublishingJob(await post(['telegram']))).overallStatus,'UNKNOWN');assert.equal(calls.length,1);
  process.env.WHATSAPP_ADMIN_PHONE='15550000000';
  await db.saveCompanyIntegration('outcome-fixture','whatsapp_cloud',{status:'connected',credentials:{phoneNumberId:'fixture-id',accessToken:'fixture-token'}});
  calls=[];assert.equal((await executePublishingJob(await post(['whatsapp']))).overallStatus,'FAILED');assert.equal(calls.length,0);
  const shadowed=await post();
  await db.createPublishingRecord({post_id:shadowed.id,company_id:shadowed.company_id,platform:'facebook',status:'UNKNOWN',attempt_count:1,max_attempts:3,idempotency_key:'unknown-older'});
  await db.createPublishingRecord({post_id:shadowed.id,company_id:shadowed.company_id,platform:'facebook',status:'FAILED',attempt_count:1,max_attempts:3,idempotency_key:'failed-newer'});
  calls=[];assert.equal((await executePublishingJob(shadowed,{force:true})).overallStatus,'UNKNOWN');assert.equal(calls.length,0);
  const unverifiable=await post();
  await db.createPublishingRecord({post_id:unverifiable.id,company_id:unverifiable.company_id,platform:'facebook',status:'PUBLISHED',attempt_count:1,max_attempts:3,idempotency_key:'no-confirmed-id'});
  calls=[];assert.equal((await executePublishingJob(unverifiable)).overallStatus,'UNKNOWN');assert.equal(calls.length,0);
  mode='rate';calls=[];const limited=await post();assert.equal((await executePublishingJob(limited)).overallStatus,'PUBLISHED');assert.equal(calls.length,2);
  console.log('Publishing uncertainty: timeout/5xx/malformed acknowledgment sends once, force/replay blocked, queue not retried, mixed outcomes truthful and definite429 retry succeeds.');
} finally {globalThis.fetch=originalFetch;}
