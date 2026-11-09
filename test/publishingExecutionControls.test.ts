import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'abgm1-stop-'));const previous=process.cwd();
process.env.NODE_ENV='test';for(const key of ['DB_HOST','DB_NAME','DB_USER','DB_PASSWORD','DATABASE_URL'])delete process.env[key];
process.chdir(root);
const originalFetch=globalThis.fetch;
try{
 const {createFileEmergencyStop,setGlobalEmergencyStop,isGlobalEmergencyStopActive}=await import('../server/executionStop');
 const file=path.join(root,'factory','stop.json');
 const store=createFileEmergencyStop(file,false);assert.equal(store.isActive(),false);assert.equal(createFileEmergencyStop(file,true).isActive(),true);
 store.setActive(true);assert.equal(createFileEmergencyStop(file).isActive(),true);store.setActive(false);assert.equal(store.isActive(),false);
 fs.writeFileSync(file,'broken-json');assert.equal(store.isActive(),true);
 fs.writeFileSync(file,JSON.stringify({globalEmergencyStop:'false'}));assert.equal(store.isActive(),true);
 fs.writeFileSync(path.join(root,'blocker'),'not a directory');const broken=createFileEmergencyStop(path.join(root,'blocker','state'),false);
 assert.throws(()=>broken.setActive(false),/GLOBAL_STOP_PERSISTENCE_FAILED/);assert.equal(broken.isActive(),true);
 const db=await import('../server/db');const {executePublishingJob}=await import('../server/publishingEngine');
 const {publishingExecutionBlock}=await import('../server/publishingExecutionControls');
 const auto={approvalSettings:{googlePosts:'auto',socialPosts:'auto',promotionalOffers:'auto'}};
 for(const [company,enabled] of [['automatic',true],['manual',false]] as const){
  await db.createCompany({id:company,user_id:'fixture',name:company,category:'fixture',city:'fixture',autopilot_enabled:enabled});
  await db.saveCompanyDataPayload(company,{engine_settings:auto});
  await db.saveCompanyIntegration(company,'meta_social',{status:'connected',credentials:{pageId:'page',instagramId:'instagram',accessToken:'fixture-token'}});
 }
 let calls:string[]=[],mode='normal';
 globalThis.fetch=async(input)=>{const url=String(input);calls.push(url);if(mode==='stop-after-facebook'&&url.endsWith('/feed'))setGlobalEmergencyStop(true);if(mode==='stop-after-container'&&url.endsWith('/media'))setGlobalEmergencyStop(true);return new Response(JSON.stringify({id:url.endsWith('/media')?'container':'provider-id'}));};
 const post=async(company='automatic',platforms=['facebook'])=>db.createContentPost({company_id:company,caption:'fixture',status:'draft',platforms,image_url:platforms.includes('instagram')?'https://example.invalid/image':undefined});
 setGlobalEmergencyStop(true);const globallyBlocked=await executePublishingJob(await post());assert.match(globallyBlocked.message,/GLOBAL_EMERGENCY_STOP/);assert.equal(calls.length,0);setGlobalEmergencyStop(false);
 assert.equal((await executePublishingJob(await post('manual'),{executionMode:'automatic'})).overallStatus,'FAILED');assert.equal(calls.length,0);
 assert.equal((await executePublishingJob(await post('manual'))).overallStatus,'PUBLISHED');assert.equal(calls.length,1);
 await db.saveCompanyDataPayload('automatic',{engine_settings:{...auto,isHolidayPaused:true}});calls=[];
 assert.match((await executePublishingJob(await post(),{executionMode:'automatic'})).message,/CLIENT_HOLIDAY_PAUSED/);assert.equal(calls.length,0);
 await db.saveCompanyDataPayload('automatic',{engine_settings:{...auto,isHolidayPaused:'invalid'}});assert.equal(await publishingExecutionBlock('automatic','automatic'),'CLIENT_HOLIDAY_PAUSED');
 await db.saveCompanyDataPayload('automatic',{engine_settings:{...auto,isHolidayPaused:false}});
 mode='stop-after-facebook';calls=[];
 // Save a canonical Facebook+Instagram source without media: Facebook completes before the stop blocks Instagram.
 const stored=await db.createContentPost({company_id:'automatic',caption:'mixed',status:'draft',platforms:['facebook','instagram']});
 const mixedResult=await executePublishingJob(stored,{executionMode:'automatic'});assert.equal(calls.length,1);assert.equal(mixedResult.platformResults[0].status,'PUBLISHED');assert.equal(mixedResult.platformResults[1].attemptsMade,0);assert.equal(mixedResult.overallStatus,'FAILED');
 setGlobalEmergencyStop(false);mode='stop-after-container';calls=[];const containerPost=await post('automatic',['instagram']);
 const containerResult=await executePublishingJob(containerPost);assert.equal(containerResult.overallStatus,'UNKNOWN');assert.equal(calls.length,1);assert.ok(!calls.some(url=>url.endsWith('/media_publish')));
 setGlobalEmergencyStop(false);calls=[];await executePublishingJob((await db.getPostById(containerPost.id))!,{force:true});assert.equal(calls.length,0);
 assert.equal(isGlobalEmergencyStopActive(),false);
 console.log('Publishing execution controls: atomic shared stop/restart, malformed/persistence fail closed, direct/global block, automatic client/holiday guards, manual separation, mid-batch stop and Instagram second-step/replay fence passed.');
}finally{globalThis.fetch=originalFetch;process.chdir(previous);fs.rmSync(root,{recursive:true,force:true});}
