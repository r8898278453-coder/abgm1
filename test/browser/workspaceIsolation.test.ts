import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { freshBlankBusiness } from '../../src/data/initialData';

// Browser tests serve only the frontend. All APIs are fixtures; no server.ts or DB imports.
const vite = await createServer({ server: { host: '127.0.0.1', port: 0,watch:{ignored:['**/uploads/**','**/dist/**','**/docs/**']} }, logLevel: 'error' });
await vite.listen();
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let releaseHolidaySave:(()=>void)|undefined;
let releaseAutoApproval:(()=>void)|undefined;
let releaseAudit:(()=>void)|undefined;
let releaseControlPatch:(()=>void)|undefined;
let releaseCampaignSync:(()=>void)|undefined;
let releaseDailyReport:(()=>void)|undefined;
let releaseSlow: (() => void) | undefined;
let releaseReview: (()=>void)|undefined;
let releaseMetaDraft: (()=>void) | undefined;
let releaseStatus: (() => void) | undefined;
let releaseNotify: (() => void) | undefined;
let releaseFeed: (() => void) | undefined;
let releaseSave: (() => void) | undefined;
try {
  const address = vite.httpServer?.address();
  assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ serviceWorkers: 'block', timezoneId: 'America/Los_Angeles' });
  const user = { id: 'fixture-owner', email: 'fixture@example.invalid', full_name: 'Fixture Owner', role: 'agency', is_platform_admin: false };
  const companies = [
    { id: 'A', user_id: user.id, name: 'Alpha Clinic', category: 'Clinic', city: 'Pune', phone: '+911111111111', website: 'https://alpha.example.invalid' },
    { id: 'B', user_id: user.id, name: 'Beta Software', category: 'Software', city: 'Mumbai', phone: '', website: '' },
  ];
  await context.addInitScript(({ user }) => {
    localStorage.setItem('abga_auth_token', 'fixture-token');
    localStorage.setItem('abga_user_profile', JSON.stringify(user));
    localStorage.setItem('abga_active_company_id', 'A');
  }, { user });
  const controlStates:Record<string,any>={A:{version:'0',paused:false,channels:[],dailyPostLimit:null,quota:{date:'2026-11-04',reservedPosts:0,remaining:null},updatedBy:null,updatedAtMs:null},B:{version:'0',paused:false,channels:[],dailyPostLimit:null,quota:{date:'2026-11-04',reservedPosts:0,remaining:null},updatedBy:null,updatedAtMs:null}};
  const controlHistory:Record<string,any[]>={A:[],B:[]};let failControlHistory=false;
  const controlWrites:any[]=[];let controlConflict=false,holdControlPatch=false,failControlRead=false;let signalControlPatch:(()=>void)|undefined;let signalControlFlushed:(()=>void)|undefined;
  let failDailyReport=false,holdDailyReport=false;let signalDailyReport:(()=>void)|undefined;let signalDailyFlushed:(()=>void)|undefined;
  let signalNotify: (() => void) | undefined;
  let verificationLimited=false;
  let holdReview=false,conflictReview=false,reviewCount=0;
  let signalReview:(()=>void)|undefined;
  let signalReviewFlushed:(()=>void)|undefined;
  const reviewWrites:any[]=[];const chatRequests:any[]=[];
  let holdMetaDraft=false;
  let signalMetaDraft:(()=>void)|undefined;
  let loseDraftAcknowledgment=true;
  const metaDrafts:any[]=[];
  const metaPublishes:any[]=[];
  const workflowWrites:any[]=[];const workflowPublishes:any[]=[];let workflowAttempts=0,workflowPolicyDenied=false;let workflowConflict=false,workflowRevision=0;const workflowHistory:any[]=[];
  let workflowPost:any={id:'workflow-post',company_id:'A',title:'Approval fixture',caption:'Visible approved copy',platforms:['facebook'],hashtags:[],status:'draft',sourceVersion:'a'.repeat(64)};
  let failStatus = false;
  let holdStatus = false;
  let signalStatus: (() => void) | undefined;
  let failNotify = false;
  const notifications: any[] = [];
  let failFeed = false;
  let delayFeed = false;
  let signalFeed: (() => void) | undefined;
  let delayAlpha = false;
  let betaFailureStatus = 0;
  let failReviewCreate=true,failReviewDelete=true;const reviewCreates:any[]=[],reviewDeletes:string[]=[];let savedReviews:any[]=[];
  let failAudit=false,holdAudit=false;let signalAudit:(()=>void)|undefined;const auditActions:any[]=[];
  let plannedPosts:any[]=[],crmLeads:any[]=[];const contentCreates:any[]=[],contentDeletes:string[]=[],leadStageWrites:any[]=[],crmCreates:any[]=[],whatsAppWrites:any[]=[];let planAiCalls=0,failContentCreate=true,failContentDelete=true,failLeadStage=true,failCrmCreate=true,failLeadReads=false;
  let failAutoRead=false,wrongAutoAck=false,holdAutoApproval=false;let signalAutoApproval:(()=>void)|undefined;const autoControls:any[]=[],autoApprovals:any[]=[],autoExecutions:any[]=[];const autoState:Record<string,boolean>={A:false,B:true};
  let holdCampaignSync=false,failCampaignRead=false;let signalCampaignSync:(()=>void)|undefined;const campaignSyncs:any[]=[];
  let failWrites = false;
  let holdWrites = false;
  let signalSave: (() => void) | undefined;
  let signalSlow: (() => void) | undefined;
  let malformedHolidaySettings=false,holdHolidaySave=false;let signalHolidaySave:(()=>void)|undefined;
  const profileVersions:Record<string,string>={A:'0',B:'0'};
  const writes: Array<{ company: string; body: any }> = [];
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    let heldReviewRequest=false,heldDailyRequest=false,heldControlRequest=false;
    if (url.origin !== origin) { await route.abort(); return; }
    if (!url.pathname.startsWith('/api/')) { await route.continue(); return; }
    let body: any = { success: true,companyId:url.searchParams.get('companyId'),reviews: [], posts: [], leads: [] };
    if(url.pathname==='/api/campaigns/external'){
      const company=url.searchParams.get('company_id')||url.searchParams.get('companyId');
      if(failCampaignRead){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false})});return;}
      body={success:true,companyId:company,campaigns:company==='A'?[{id:'ads-A',company_id:'A',provider:'meta_ads',external_campaign_id:'456',name:'Alpha Ads Fixture',status:'UNKNOWN',fetched_at:'2026-11-05T00:00:00Z',spend:null,impressions:null,clicks:0,conversions:null,revenue:null,roas:null}]:[]};
    }else if(url.pathname==='/api/campaigns/external/sync'){
      const input=route.request().postDataJSON();campaignSyncs.push(input);if(holdCampaignSync){signalCampaignSync?.();await new Promise<void>(resolve=>{releaseCampaignSync=resolve;});}
      body={success:false,companyId:input.company_id,syncResult:{status:'PARTIAL',campaignsCount:1,message:'Fixture partial sync:1 record saved; more remain.'}};
    }else if(url.pathname==='/api/campaigns/internal'){body={success:true,companyId:url.searchParams.get('company_id'),campaigns:[]};}
    else if(url.pathname==='/api/leads'&&route.request().method()==='GET'){

      if(failLeadReads){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false})});return;}
      body={success:true,companyId:url.searchParams.get('companyId'),leads:crmLeads.filter(lead=>lead.company_id===url.searchParams.get('companyId'))};
    }
    else if(url.pathname==='/api/leads'&&route.request().method()==='POST'){
      const input=route.request().postDataJSON();crmCreates.push(input);if(failCrmCreate){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false})});return;}
      const lead={...input,id:'created-crm',company_id:input.company_id,stage:'new',intent_score:null,ai_suggested_reply:'Draft fixture'};crmLeads.unshift(lead);body={success:true,lead};
    }
    else if(/\/api\/leads\/[^/]+\/stage$/.test(url.pathname)){
      const input=route.request().postDataJSON();leadStageWrites.push(input);if(failLeadStage){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false})});return;}
      const lead=crmLeads.find(lead=>lead.id===url.pathname.split('/')[3]);assert.equal(input.companyId,lead.company_id);assert.equal(input.expectedStage,lead.stage);lead.stage=input.stage;body={success:true,lead};
    }
    else if(url.pathname==='/api/whatsapp/send'){whatsAppWrites.push(route.request().postDataJSON());body={success:false,method:'wa_link',waLink:'https://wa.me/fixture'};}
    else if(url.pathname==='/api/content-posts'&&route.request().method()==='POST'){
      const input=route.request().postDataJSON();contentCreates.push(input);if(failContentCreate){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false})});return;}
      const post={...input,id:`planned-${contentCreates.length}`,company_id:input.companyId,sourceVersion:'c'.repeat(64)};plannedPosts.unshift(post);body={success:true,post};
    }
    else if(/\/api\/content-posts\/planned-/.test(url.pathname)&&route.request().method()==='DELETE'){
      contentDeletes.push(url.pathname);if(failContentDelete){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false})});return;}
      plannedPosts=plannedPosts.filter(post=>!url.pathname.endsWith('/'+post.id));body={success:true};
    }
    else     if(url.pathname==='/api/reviews'&&route.request().method()==='POST'){
      const input=route.request().postDataJSON();reviewCreates.push(input);if(failReviewCreate){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false})});return;}
      const review={...input,id:'review-crud-fixture',company_id:input.companyId};savedReviews=[review];body={success:true,review};
    }
    else if(url.pathname==='/api/reviews'&&route.request().method()==='GET')body={success:true,companyId:url.searchParams.get('companyId'),reviews:savedReviews.filter(review=>review.company_id===url.searchParams.get('companyId'))};
    else if(url.pathname==='/api/reviews/review-crud-fixture'&&route.request().method()==='DELETE'){
      reviewDeletes.push(url.searchParams.get('companyId')||'');if(failReviewDelete){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false})});return;}savedReviews=[];body={success:true};
    }
    else if(/\/companies\/[AB]\/message-dispatch\/[a-f0-9]{64}$/.test(url.pathname))body={success:true,companyId:url.pathname.split('/')[3],dispatch:{status:'UNKNOWN',providerId:null,needsReview:true,delivery:'UNOBSERVED',receiptCount:0,conflicting:false}};
    else if(url.pathname==='/api/autonomous/kill-switch'){
      const input=route.request().postDataJSON();autoControls.push(input);
      if(input.emergencyStop!==undefined){await route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({success:false,error:'Administrator required'})});return;}
      autoState[input.companyId]=input.autopilotEnabled;body={success:true,companyId:input.companyId,autopilotEnabled:wrongAutoAck?!input.autopilotEnabled:input.autopilotEnabled,globalEmergencyStop:false};
    }
    else if(url.pathname==='/api/autonomous/status'){
      const company=url.searchParams.get('companyId')!;if(failAutoRead){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false})});return;}
      body={success:true,companyId:company,autopilotEnabled:autoState[company],globalEmergencyStop:false};
    }
    else if(['/api/autonomous/actions','/api/autonomous/recommendations','/api/autonomous/audit-logs'].includes(url.pathname)){
      const company=url.searchParams.get('companyId')!;body={success:true,companyId:company,actions:company==='A'?[{id:'auto-action-A',company_id:'A',timestamp:'2026-11-05T00:00:00Z',action:'Alpha autonomous fixture',status:'pending_approval',approval_status:'pending_approval'},{id:'auto-message-A',company_id:'A',timestamp:'2026-11-05T00:00:00Z',action:'Recorded WhatsApp request fixture',action_type:'send_whatsapp',execution_state:'executed',approval_status:'approved',verification_state:'verified',provider_response:{verified:true,requestKey:'a'.repeat(64),dispatchStatus:'API_ACCEPTED'}}]:[],recommendations:[],logs:[]};
    }
    else if(url.pathname==='/api/autonomous/actions/auto-action-A/approve'){
      const input=route.request().postDataJSON();autoApprovals.push(input);if(holdAutoApproval){signalAutoApproval?.();await new Promise<void>(resolve=>{releaseAutoApproval=resolve;});}body={success:true,action:{id:'auto-action-A',company_id:'A',approval_status:'approved'}};
    }
    else if(url.pathname==='/api/autonomous/actions/auto-action-A/execute'){autoExecutions.push(route.request().postDataJSON());body={success:true,result:{status:'EXECUTED',message:'Recorded fixture execution'}};}
    else if (url.pathname === '/api/auth/me') body = { success: true, user };
    else if (url.pathname === '/api/companies') body = { success: true, companies };
    else if(/\/companies\/[AB]\/audit(?:\/scan)?$/.test(url.pathname)){
      const company=url.pathname.split('/')[3];
      if(failAudit){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false})});return;}
      if(holdAudit&&company==='A'){signalAudit?.();await new Promise<void>(resolve=>{releaseAudit=resolve;});}
      body={success:true,companyId:company,timestamp:'2026-11-05T02:30:00Z',auditItems:company==='A'?[{id:'audit-A',title:'Alpha current audit issue',category:'reviews',severity:'important',evidence:'One record needs review',recommendation:'Review current saved records',impact:'Recorded backlog',actionText:'Review fixture issue',resolved:false,status:'OPEN',timestamp:'2026-11-05T02:30:00Z'}]:[]};
    }
    else if(url.pathname.includes('/audit/')&&url.pathname.endsWith('/resolve')){auditActions.push(route.request().postDataJSON());body={success:false};}
    else if(url.pathname.endsWith('/publication-controls/history')){
      const company=url.pathname.split('/')[3];
      if(failControlHistory){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,error:'Unavailable'})});return;}
      const older=url.searchParams.has('before');body={success:true,history:older?controlHistory[company].slice(2):controlHistory[company].slice(0,2),nextBefore:older||controlHistory[company].length<=2?null:controlHistory[company][1].version};
    }
    else if(url.pathname.endsWith('/publication-controls')){
      const company=url.pathname.split('/')[3];
      if(route.request().method()==='PATCH'){
        const input=route.request().postDataJSON();controlWrites.push({company,...input});
        if(controlConflict){await route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({success:false,error:'Conflict'})});return;}
        assert.equal(input.expectedVersion,controlStates[company].version);assert.equal(input.actorId,undefined);
        if(holdControlPatch && company==='A'){heldControlRequest=true;signalControlPatch?.();await new Promise<void>(resolve=>{releaseControlPatch=resolve;});}
        const previous=controlStates[company],version=String(BigInt(previous.version)+1n),limit=input.dailyPostLimit===undefined?previous.dailyPostLimit:input.dailyPostLimit;
        const before={paused:previous.paused,channels:previous.channels,...(version==='1'?{}:{dailyPostLimit:previous.dailyPostLimit})},after={paused:input.paused,channels:input.channels,...(version==='1'?{}:{dailyPostLimit:limit})};
        controlHistory[company].unshift({id:`control-${company}-${version}`,version,actor_id:user.id,before_state:before,after_state:after,recordedAtMs:Date.parse('2026-11-04T02:30:00Z')});
        controlStates[company]={version,paused:input.paused,channels:input.channels,dailyPostLimit:limit,quota:{date:'2026-11-04',reservedPosts:0,remaining:limit},updatedBy:user.id,updatedAtMs:Date.parse('2026-11-04T02:30:00Z')};
      }else if(failControlRead){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,error:'Unavailable'})});return;}
      body={success:true,controls:controlStates[company]};
    }
    else if(url.pathname.endsWith('/daily-work-report')){
      const company=url.pathname.split('/')[3],date=url.searchParams.get('date')!;
      if(failDailyReport){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,error:'Unavailable'})});return;}
      if(holdDailyReport && company==='A' && date==='2000-01-02'){heldDailyRequest=true;signalDailyReport?.();await new Promise<void>(resolve=>{releaseDailyReport=resolve;});}
      body={success:true,report:{date,timeZone:'Asia/Kolkata',generatedAt:'2026-11-03T02:30:00Z',activity:{completedJobs:company==='A'?(date==='2000-01-01'?9:7):0,failedJobs:0,pausedJobs:company==='A'?1:0,approvedPosts:0,rescheduledPosts:0,admittedPosts:company==='A'?3:0,controlChanges:company==='A'?2:0,messageRequests:company==='A'?2:0,apiAcceptedMessages:company==='A'?1:0,websiteInquiries:company==='A'?2:0,inquiryAlertsAccepted:company==='A'?1:0},backlog:{waitingJobs:company==='A'?4:0,runningJobs:0,failedJobs:0,pendingApprovals:0,uncertainPublications:0,unconfirmedMessages:0,inquiryAlertsNotAttempted:0,inquiryAlertsUnconfirmed:0}}};
    }
    else if(url.pathname==='/api/content-posts' && route.request().method()==='GET')body={success:true,companyId:url.searchParams.get('companyId'),posts:url.searchParams.get('companyId')==='A'?[workflowPost,...plannedPosts]:[]};
    else if(url.pathname.endsWith('/workflow-history'))body={success:true,history:url.searchParams.has('before')?workflowHistory.slice(2):workflowHistory.slice(0,2),nextBefore:url.searchParams.has('before')?null:'2'};
    else if(url.pathname==='/api/content-posts/workflow-post/status'){
      const update=route.request().postDataJSON();workflowWrites.push(update);
      if(workflowConflict){await route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({success:false,error:'Post changed. Reload before approving.'})});return;}
      assert.equal(update.companyId,'A');assert.equal(update.expectedVersion,workflowPost.sourceVersion);
      workflowRevision++;
      workflowHistory.unshift({id:`audit-${workflowRevision}`,actor_id:'fixture-owner',from_status:workflowPost.status,to_status:update.status,change_kind:update.schedule?'RESCHEDULE':'STATUS',schedule_after:update.schedule || null,recordedAtMs:Date.parse('2026-11-03T02:30:00Z')});
      workflowPost={...workflowPost,status:update.status,sourceVersion:String.fromCharCode(97+workflowRevision).repeat(64),...(update.schedule?{scheduled_date:update.schedule.date,scheduled_time:update.schedule.time,time_slot:update.schedule.time}:{})};
      body={success:true,status:workflowPost.status,sourceVersion:workflowPost.sourceVersion};
    }
    else if(url.pathname==='/api/content-posts/workflow-post/publish'){
      const publish=route.request().postDataJSON();workflowAttempts++;assert.equal(publish.expectedVersion,workflowPost.sourceVersion);
      if(workflowPolicyDenied){body={success:false,result:{overallStatus:'FAILED',finalPostStatus:'scheduled',message:'Policy changed. Approval required.'}};}else{
      workflowPublishes.push(publish);
      workflowPost={...workflowPost,status:'published'};body={success:true,result:{overallStatus:'PUBLISHED',message:'Fixture verified result'}};}
    }
    else if(url.pathname.endsWith('/publishing-verification')){
      if(verificationLimited){await route.fulfill({status:429,headers:{'Retry-After':'1'},contentType:'application/json',body:JSON.stringify({success:false,error:'Rate limited'})});return;}
      const check=route.request().postDataJSON();assert.equal(check.platform,'facebook');assert.equal(check.providerPostId,'101_202');assert.equal(check.actorId,undefined);
      body={success:true,id:'check-1',verification:{status:'MATCHED'},resendEnabled:false,claimStateChanged:false};
    }
    else if(/\/companies\/[AB]\/posts\/[^/]+\/publishing-review$/.test(url.pathname)){
      const company=url.pathname.split('/')[3];
      if(company==='B'){await route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({success:false,error:'Stored post not found in this workspace'})});return;}
      if(route.request().method()==='POST'){
        const observation=route.request().postDataJSON();reviewWrites.push(observation);
        if(conflictReview){await route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({success:false,error:'Evidence changed'})});return;}
        reviewCount++;body={success:true,recorded:true,id:'audit-note-1',resendEnabled:false};
      }else{
        if(holdReview){heldReviewRequest=true;signalReview?.();await new Promise<void>(resolve=>{releaseReview=resolve;});}
        body={success:true,review:{version:(reviewCount?'b':'a').repeat(64),status:'UNKNOWN',needsReview:true,platforms:['facebook'],providerRecords:[{id:'provider-evidence',platform:'facebook',status:'UNKNOWN',provider_post_id:null}],providerRecordsTruncated:false,nextBefore:null,
          history:reviewCount?[{id:'audit-note-1',actor_id:'fixture-owner',decision:'UNRESOLVED',platform:'facebook',provider_post_id:null,evidence_reference:'Provider dashboard checked',note:'Observation for Alpha only',recordedAtMs:Date.parse('2026-11-03T02:30:00Z')}]:[]}};
      }
    }
    else if(url.pathname==='/api/integrations') body={success:true,companyId:url.searchParams.get('companyId'),integrations:[{id:'meta_social',name:'Meta Social',description:'Fixture Meta connection',category:'Meta',icon:'M',docsUrl:'https://example.invalid',requiredFields:[],connected:true,status:'connected'}]};
    else if(url.pathname.endsWith('/meta-publication-drafts') && route.request().method()==='POST') {
      const request=route.request().postDataJSON();
      const companyId=url.pathname.split('/')[3];
      let draft=metaDrafts.find(row=>row.requestKey===request.requestKey && row.companyId===companyId);
      if(!draft){draft={...request,companyId};metaDrafts.push(draft);}
      if(holdMetaDraft){signalMetaDraft?.();await new Promise<void>(resolve=>{releaseMetaDraft=resolve;});}
      if(loseDraftAcknowledgment){loseDraftAcknowledgment=false;await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({success:false,error:'Draft acknowledgment unconfirmed. Retry identical content.'})});return;}
      body={success:true,post:{...draft,id:`fixture-meta-${metaDrafts.indexOf(draft)+1}`,company_id:companyId},sourceVersion:'a'.repeat(64)};
    }
    else if(url.pathname==='/api/meta/publish-post') {
      const publish=route.request().postDataJSON();metaPublishes.push(publish);
      body={success:false,status:'UNKNOWN',postId:publish.postId,message:'Unconfirmed fixture publication',results:{facebook:{success:false,error:'Unconfirmed'}}};
    }
    else if (/\/companies\/[AB]\/notification-status$/.test(url.pathname)) {
      const company = url.pathname.split('/')[3];
      if (failStatus) { await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false }) }); return; }
      if (holdStatus && company === 'A') { signalStatus?.(); await new Promise<void>(resolve => { releaseStatus = resolve; }); }
      const older = url.searchParams.has('before');
      body = { available: true, occurrences: company === 'A' ? [{ kind: older ? 'review_reminder' : 'daily_digest', dueAt: older ? '2026-11-02T01:30:00Z' : '2026-11-03T02:30:00Z', status: older ? 'SENT' : 'UNKNOWN', needsReview: !older }] : [], nextCursor: company === 'A' && !older ? '2026-11-03T02:30:00Z|daily_digest' : null };
    }
    else if (['/api/ai/reply-review','/api/ai/generate-content'].includes(url.pathname)) {
      const input=route.request().postDataJSON();const mode=input.businessName;
      if(mode==='Alpha Clinic'){assert.equal(input.companyId,'A');planAiCalls++;if(planAiCalls===3){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false})});return;}body={caption:'AI educational fixture draft',headline:`AI draft ${planAiCalls}`,hashtags:['#Fixture']};await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});return;}

      const status=mode==='limited'?429:mode==='unauthenticated'?401:mode==='offline'?503:200;
      body=mode==='valid'?(url.pathname.endsWith('reply-review')?{replyText:'Verified fixture draft'}:{caption:'Verified fixture caption',hashtags:['#Fixture']}):{replyText:' ',caption:123,error:'private-provider-diagnostic'};
      await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});return;
    }
    else if (url.pathname === '/api/ai/chat') {chatRequests.push(route.request().postDataJSON()); await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'fixture unavailable'})});return; }
    else if (url.pathname === '/api/telegram/notify') {
      const notification = route.request().postDataJSON(); notifications.push(notification);
      if (notification.companyId === 'A') { signalNotify?.(); await new Promise<void>(resolve => { releaseNotify = resolve; }); }
      if (failNotify) { await route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'Delivery not confirmed' }) }); return; }
      body = { success: true };
    }
    else if (/\/companies\/[AB]\/job-actions$/.test(url.pathname)) {
      const company = url.pathname.split('/')[3];
      if (failFeed) { await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false }) }); return; }
      if (company === 'A' && delayFeed) { signalFeed?.(); await new Promise<void>(resolve => { releaseFeed = resolve; }); }
      const second = url.searchParams.get('after') === '1';
      body = { success: true, available: true, nextCursor: company === 'A' ? (second ? '3' : '1') : '0', latestRevision: company === 'A' ? '3' : '0', events: company === 'A' ? [{ id: second ? 'a2' : 'a1', revision: second ? '2' : '1', job_id: 'Alpha-private-job', job_type: 'seo_scan', event_type: second ? 'JOB_SUCCEEDED' : 'JOB_QUEUED', job_status: second ? 'SUCCEEDED' : 'QUEUED', attempt: second ? 1 : 0, reason_code: null, recorded_at: '2026-11-02T10:00:00Z' },...(second?[{id:'a3',revision:'3',job_id:'Alpha-private-job',job_type:'seo_scan',event_type:'JOB_DEFERRED',job_status:'RETRY_WAIT',attempt:2,reason_code:'CLIENT_HOLIDAY_PAUSED',recorded_at:'2026-11-02T10:01:00Z'}]:[])] : [] };
    }
    else if (/\/companies\/[AB]\/data$/.test(url.pathname)) {
      const company = url.pathname.split('/')[3];
      if (route.request().method() === 'PUT') {
        writes.push({ company, body: route.request().postDataJSON() });
        if(holdHolidaySave&&route.request().postDataJSON().data.engine_settings?.isHolidayPaused===true){signalHolidaySave?.();await new Promise<void>(resolve=>{releaseHolidaySave=resolve;});}
        if (holdWrites) {
          signalSave?.();
          await new Promise<void>(resolve => { releaseSave = resolve; });
        }
        if (failWrites) {
          await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'Fixture storage failure' }) });
          return;
        }
        const input=route.request().postDataJSON();if(input.expectedVersion!==profileVersions[company]){await route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({success:false,error:'Fixture conflict'})});return;}profileVersions[company]=String(BigInt(profileVersions[company])+1n);body={success:true,companyId:company,version:profileVersions[company]};
      } else {
        if (company === 'B' && betaFailureStatus) {
          await route.fulfill({ status: betaFailureStatus, contentType: betaFailureStatus === 403 ? 'text/html' : 'application/json', body: betaFailureStatus === 403 ? '<h1>Forbidden</h1>' : JSON.stringify({ success: false, error: 'Fixture load failure' }) });
          return;
        }
        if (company === 'A' && delayAlpha) {
          signalSlow?.();
          await new Promise<void>(resolve => { releaseSlow = resolve; });
        }
        const record = companies.find(c => c.id === company)!;
        body = { success: true,companyId:company,version:profileVersions[company], company: record, data: {
          ...(malformedHolidaySettings?{engine_settings:{isHolidayPaused:'false'}}:{}),
          business: { ...freshBlankBusiness, ...record,googlePlaceId:company==='A'?'ChIJ-fixture_123':undefined },
          ...(company==='B'?{leads:[{id:'obsolete-lead',name:'Obsolete JSON lead'}],reviews:[{id:'obsolete-review',author:'Obsolete JSON review'}],posts:[{id:'obsolete-post',title:'Obsolete JSON post'}]}:{}),
          ...(company === 'A' ? { knowledge_base: {
            documents: [{ id: 'private-doc', name: 'Alpha-private-pricing.pdf', category: 'Pricing & Packages', size: '1 MB', uploadedAt: 'Today', status: 'indexed', chunksCount: 1, textContent: 'Alpha-only offer' }],
            faqs: [{ id: 'private-faq', question: 'Alpha secret policy?', answer: 'Alpha-only answer', category: 'General' }],
          } } : {}),
        } };
      }
    }
    try{await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });}
    finally{if(heldReviewRequest)signalReviewFlushed?.();if(heldDailyRequest)signalDailyFlushed?.();if(heldControlRequest)signalControlFlushed?.();}
  });
  const page = await context.newPage();
  await page.goto(origin);
  const generationChecks=await page.evaluate(async()=>{
    const ai=await import(/* @vite-ignore */ String('/src/services/aiService.ts'));const outcomes=[];
    for(const mode of ['limited','unauthenticated','offline','malformed']){
      for(const kind of ['review','content']){
        try{if(kind==='review')await ai.generateReviewReply({businessName:mode,reviewText:'fixture',rating:5,reviewerName:'Fixture'});else await ai.generateMarketingContent({businessName:mode});outcomes.push('UNEXPECTED_SUCCESS');}
        catch(error){outcomes.push((error as Error).message);}
      }
    }
    const reply=await ai.generateReviewReply({businessName:'valid',reviewText:'fixture',rating:5,reviewerName:'Fixture'});
    const content=await ai.generateMarketingContent({businessName:'valid'});
    const aborted=new AbortController();aborted.abort();let cancelled=false;try{await ai.generateMarketingContent({businessName:'valid'},aborted.signal);}catch{cancelled=true;}
    return {outcomes,reply,content,cancelled};
  });
  assert.equal(generationChecks.outcomes.length,8);assert.ok(generationChecks.outcomes.every(value=>value!=='UNEXPECTED_SUCCESS'&&!value.includes('private-provider')));
  assert.equal(generationChecks.reply,'Verified fixture draft');assert.equal(generationChecks.content.caption,'Verified fixture caption');assert.ok(generationChecks.cancelled);

  console.log('Browser stage: publication-controls');
  const controlsPanel=page.getByRole('region',{name:'Workspace publishing controls'});
  await controlsPanel.getByText(/Saved workspace pause: Off/).waitFor();
  await controlsPanel.getByLabel('Pause facebook publishing',{exact:true}).check();
  await controlsPanel.getByRole('button',{name:'Save publishing controls',exact:true}).click();
  await controlsPanel.getByText(/Publishing controls saved/).waitFor();
  assert.equal(controlWrites[0].expectedVersion,'0');assert.deepEqual(controlWrites[0].channels,['facebook']);
  controlConflict=true;await controlsPanel.getByLabel('Pause workspace publishing',{exact:true}).check();
  await controlsPanel.getByRole('button',{name:'Save publishing controls',exact:true}).click();await controlsPanel.getByRole('alert').waitFor();
  assert.equal(await controlsPanel.getByRole('button',{name:'Save publishing controls',exact:true}).isDisabled(),true);
  controlConflict=false;await controlsPanel.getByRole('button',{name:'Reload publishing controls',exact:true}).click();
  await controlsPanel.getByText(/Saved workspace pause: Off/).waitFor();assert.equal(await controlsPanel.getByLabel('Pause workspace publishing',{exact:true}).isChecked(),false);
  holdControlPatch=true;const controlStarted=new Promise<void>(resolve=>{signalControlPatch=resolve;});
  await controlsPanel.getByLabel('Pause workspace publishing',{exact:true}).check();await controlsPanel.getByRole('button',{name:'Save publishing controls',exact:true}).click();
  await Promise.race([controlStarted,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Control save did not start')),10000))]);
  await page.locator('header select').first().selectOption('B');await controlsPanel.getByText(/Saved workspace pause: Off/).waitFor();
  const controlFlushed=new Promise<void>(resolve=>{signalControlFlushed=resolve;});releaseControlPatch!();holdControlPatch=false;await controlFlushed;
  assert.equal(await controlsPanel.getByLabel('Pause workspace publishing',{exact:true}).isChecked(),false);assert.equal(await controlsPanel.getByLabel('Pause facebook publishing',{exact:true}).isChecked(),false);
  await page.locator('header select').first().selectOption('A');await controlsPanel.getByText(/Saved workspace pause: On/).waitFor();
  await controlsPanel.getByLabel('Pause workspace publishing',{exact:true}).uncheck();await controlsPanel.getByLabel('Pause facebook publishing',{exact:true}).uncheck();
  await controlsPanel.getByRole('button',{name:'Save publishing controls',exact:true}).click();await controlsPanel.getByText(/Publishing controls saved/).waitFor();
  await controlsPanel.getByLabel('Use daily publishing admission limit',{exact:true}).check();
  await controlsPanel.getByLabel('Daily publishing admission limit',{exact:true}).fill('0');assert.equal(await controlsPanel.getByRole('button',{name:'Save publishing controls',exact:true}).isDisabled(),true);
  await controlsPanel.getByLabel('Daily publishing admission limit',{exact:true}).fill('2');
  await controlsPanel.getByRole('button',{name:'Save publishing controls',exact:true}).click();await controlsPanel.getByText(/Publishing controls saved/).waitFor();
  assert.equal(controlWrites.at(-1).dailyPostLimit,2);await controlsPanel.getByText(/Daily limit: 2/).waitFor();
  await controlsPanel.getByRole('button',{name:'Load control history',exact:true}).click();
  const controlAudit=controlsPanel.getByRole('list',{name:'Publishing control change history'});
  await controlAudit.getByText(/After:.*daily admission limit 2/).waitFor();
  await controlsPanel.getByRole('button',{name:'Older control changes',exact:true}).click();await controlAudit.locator('li').filter({hasText:'not recorded'}).first().waitFor();
  failControlHistory=true;await controlsPanel.getByRole('button',{name:'Load control history',exact:true}).click();await controlsPanel.getByRole('alert').waitFor();
  await controlsPanel.getByLabel('Pause workspace publishing',{exact:true}).check();assert.equal(await controlsPanel.getByRole('button',{name:'Save publishing controls',exact:true}).isEnabled(),true);await controlsPanel.getByLabel('Pause workspace publishing',{exact:true}).uncheck();
  failControlHistory=false;await controlsPanel.getByLabel('Use daily publishing admission limit',{exact:true}).uncheck();await controlsPanel.getByRole('button',{name:'Save publishing controls',exact:true}).click();await controlsPanel.getByText(/Publishing controls saved/).waitFor();
  failControlRead=true;await controlsPanel.getByRole('button',{name:'Reload publishing controls',exact:true}).click();await controlsPanel.getByRole('alert').waitFor();assert.equal(await controlsPanel.getByRole('button',{name:'Save publishing controls',exact:true}).isDisabled(),true);
  failControlRead=false;await controlsPanel.getByRole('button',{name:'Reload publishing controls',exact:true}).click();await controlsPanel.getByText(/Saved workspace pause: Off/).waitFor();
  console.log('Browser stage: daily-work-report');
  const workReport=page.getByRole('region',{name:'Daily recorded work'});
  await workReport.getByLabel('Website inquiries received',{exact:true}).filter({hasText:'2'}).waitFor();await workReport.getByLabel('Inquiry alerts API-accepted',{exact:true}).filter({hasText:'1'}).waitFor();
  await workReport.getByLabel('Completed jobs',{exact:true}).filter({hasText:'7'}).waitFor();
  await workReport.getByLabel('Recorded message requests',{exact:true}).filter({hasText:'2'}).waitFor();
  await workReport.getByLabel('Message requests API-accepted',{exact:true}).filter({hasText:'1'}).waitFor();
  await workReport.getByLabel('Posts admitted for publishing',{exact:true}).filter({hasText:'3'}).waitFor();
  await workReport.getByLabel('Publishing control changes',{exact:true}).filter({hasText:'2'}).waitFor();
  const reportDownload=page.waitForEvent('download');await workReport.getByRole('button',{name:'Download work report CSV'}).click();
  assert.match((await reportDownload).suggestedFilename(),/^recorded-work-\d{4}-\d{2}-\d{2}-IST\.csv$/);

  await workReport.getByLabel('Recorded work date',{exact:true}).fill('2000-01-01');
  await workReport.getByLabel('Completed jobs',{exact:true}).filter({hasText:'9'}).waitFor();
  failDailyReport=true;await workReport.getByRole('button',{name:'Refresh work report',exact:true}).click();
  await workReport.getByRole('alert').waitFor();assert.equal(await workReport.getByLabel('Completed jobs',{exact:true}).count(),0);
  failDailyReport=false;await workReport.getByRole('button',{name:'Refresh work report',exact:true}).click();
  await workReport.getByLabel('Completed jobs',{exact:true}).filter({hasText:'9'}).waitFor();
  holdDailyReport=true;const reportStarted=new Promise<void>(resolve=>{signalDailyReport=resolve;});
  await workReport.getByLabel('Recorded work date',{exact:true}).fill('2000-01-02');await Promise.race([reportStarted,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Daily report did not start')),10000))]);
  await page.locator('header select').first().selectOption('B');
  await workReport.getByLabel('Completed jobs',{exact:true}).filter({hasText:'0'}).waitFor();
  const reportFlushed=new Promise<void>(resolve=>{signalDailyFlushed=resolve;});releaseDailyReport!();holdDailyReport=false;await reportFlushed;
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  assert.equal(await workReport.getByLabel('Completed jobs',{exact:true}).innerText(),'0');
  await page.locator('header select').first().selectOption('A');
  await workReport.getByLabel('Completed jobs',{exact:true}).filter({hasText:'7'}).waitFor();
  const history = page.getByRole('region', { name: 'Automation action history' });
  await history.getByText('SEO scan · Queued', { exact: true }).waitFor();
  assert.match(await history.locator('time').first().innerText(), /3:30:00.*IST/i);
  await history.getByRole('button', { name: 'Load more history' }).click();
  await history.getByText('SEO scan · Completed', { exact: true }).waitFor();
  await history.getByText(/Claim 2.*Paused: holiday pause; retry scheduled/).waitFor();
  assert.equal(await history.getByRole('button', { name: 'Load more history' }).count(), 0);
  failFeed = true;
  await history.getByRole('button', { name: 'Refresh history' }).click();
  await history.getByRole('alert').waitFor();
  assert.equal(await history.getByText('SEO scan · Completed', { exact: true }).count(), 1);
  await page.locator('header select').first().selectOption('B');
  await history.getByRole('alert').waitFor();
  assert.equal(await page.getByText(/Alpha-private-job/).count(), 0);
  failFeed = false;
  await history.getByRole('button', { name: 'Refresh history' }).click();
  await history.getByText(/No processed action history yet/).waitFor();
  delayFeed = true;
  const pendingFeed = new Promise<void>(resolve => { signalFeed = resolve; });
  await page.locator('header select').first().selectOption('A');
  await Promise.race([pendingFeed, new Promise((_, reject) => setTimeout(() => reject(new Error('Feed request did not start')), 10000))]);
  await page.locator('header select').first().selectOption('B');
  await history.getByText(/No processed action history yet/).waitFor();
  releaseFeed!(); delayFeed = false;
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  assert.equal(await page.getByText(/Alpha-private-job/).count(), 0);
  await page.locator('header select').first().selectOption('A');
  await history.getByText('SEO scan · Queued', { exact: true }).waitFor();
  const notificationStatus = page.getByRole('region', { name: 'Scheduled notification delivery' });
  await notificationStatus.getByText('Daily digest · Delivery uncertain', { exact: true }).waitFor();
  assert.match(await notificationStatus.locator('time').first().innerText(), /8:00:00.*IST/i);
  await notificationStatus.getByRole('button', { name: 'Load older notifications' }).click();
  await notificationStatus.getByText('Review reminder · Sent', { exact: true }).waitFor();
  failStatus = true;
  await notificationStatus.getByRole('button', { name: 'Refresh notifications' }).click();
  await notificationStatus.getByRole('alert').waitFor();
  assert.equal(await notificationStatus.getByText('Review reminder · Sent', { exact: true }).count(), 1);
  failStatus = false;
  await page.locator('header select').first().selectOption('B');
  await notificationStatus.getByText(/No scheduled delivery attempts recorded/).waitFor();
  assert.equal(await notificationStatus.getByText('Daily digest · Delivery uncertain', { exact: true }).count(), 0);
  holdStatus = true;
  const pendingStatus = new Promise<void>(resolve => { signalStatus = resolve; });
  await page.locator('header select').first().selectOption('A');
  await Promise.race([pendingStatus, new Promise((_, reject) => setTimeout(() => reject(new Error('Status request did not start')), 10000))]);
  await page.locator('header select').first().selectOption('B');
  await notificationStatus.getByText(/No scheduled delivery attempts recorded/).waitFor();
  releaseStatus!(); holdStatus = false;
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  assert.equal(await notificationStatus.getByText('Daily digest · Delivery uncertain', { exact: true }).count(), 0);
  await page.locator('header select').first().selectOption('A');
  await notificationStatus.getByText('Daily digest · Delivery uncertain', { exact: true }).waitFor();
  console.log('Browser stage: publishing-review');
  const reviewPanel=page.getByRole('region',{name:'Publishing outcome review'});
  await reviewPanel.getByRole('textbox',{name:'Publishing review post ID'}).fill('review-A');
  await reviewPanel.getByRole('button',{name:'Load publishing review'}).click();
  await reviewPanel.getByText('Post review-A · Dispatch state: UNKNOWN',{exact:true}).waitFor();
  await reviewPanel.getByRole('textbox',{name:'Observed provider post ID'}).fill('101_202');
  await reviewPanel.getByRole('button',{name:'Check Meta publication'}).click();
  await reviewPanel.getByText('Provider check recorded: MATCHED. Dispatch state and resend permissions are unchanged.',{exact:true}).waitFor();
  verificationLimited=true;
  await reviewPanel.getByRole('button',{name:'Check Meta publication'}).click();
  await reviewPanel.getByRole('alert').filter({hasText:'Verification busy or rate limited. Wait before checking again.'}).waitFor();
  assert.equal(await reviewPanel.getByText('Provider check recorded: MATCHED. Dispatch state and resend permissions are unchanged.',{exact:true}).count(),0);
  verificationLimited=false;

  await reviewPanel.getByRole('textbox',{name:'Review evidence reference'}).fill('Provider dashboard checked');
  await reviewPanel.getByRole('textbox',{name:'Review note'}).fill('Observation for Alpha only');
  await reviewPanel.getByRole('button',{name:'Record observation only'}).click();
  await reviewPanel.getByRole('listitem').filter({hasText:'Observation for Alpha only'}).waitFor();
  assert.equal(reviewWrites[0].expectedVersion,'a'.repeat(64));assert.equal(reviewWrites[0].actorId,undefined);
  assert.equal(await reviewPanel.getByRole('button',{name:/resend/i}).count(),0);
  conflictReview=true;
  await reviewPanel.getByRole('button',{name:'Record observation only'}).click();
  await reviewPanel.getByRole('alert').waitFor();
  assert.equal(await reviewPanel.getByRole('listitem').filter({hasText:'Observation for Alpha only'}).count(),1);
  conflictReview=false;holdReview=true;
  const pendingReview=new Promise<void>(resolve=>{signalReview=resolve;});
  await reviewPanel.getByRole('button',{name:'Load publishing review'}).click();
  await Promise.race([pendingReview,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Review read did not start')),10000))]);
  await page.locator('header select').first().selectOption('B');
  const lateReview=new Promise<void>(resolve=>{signalReviewFlushed=resolve;});
  releaseReview!();holdReview=false;await lateReview;
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  assert.equal(await reviewPanel.getByRole('textbox',{name:'Publishing review post ID'}).inputValue(),'');
  assert.equal(await reviewPanel.getByRole('listitem').filter({hasText:'Observation for Alpha only'}).count(),0);
  await reviewPanel.getByRole('textbox',{name:'Publishing review post ID'}).fill('review-A');
  await reviewPanel.getByRole('button',{name:'Load publishing review'}).click();
  await reviewPanel.getByRole('alert').waitFor();
  assert.equal(await reviewPanel.getByRole('listitem').filter({hasText:'Observation for Alpha only'}).count(),0);
  assert.equal(metaPublishes.length,0);assert.equal(notifications.length,0);
  await page.locator('header select').first().selectOption('A');
  await page.getByRole('button', { name: /Telegram AI Command/ }).click();
  const alertInput = page.getByPlaceholder('Type a test alert message to deliver to Telegram...');
  const assistantInput=page.getByPlaceholder("Type a command in natural language (e.g. 'Generate 20% discount offer')...");
  await assistantInput.fill('Check unavailable assistant');await assistantInput.press('Enter');
  await page.getByText('Assistant unavailable. Your request was not completed and no publishing action was started.',{exact:true}).waitFor();assert.equal(chatRequests.at(-1).companyId,'A');
  assert.equal(await page.getByText(/Ready to deploy changes|Public reply verified|visibility in Sector 17/).count(),0);
  await alertInput.fill('Alpha-private-notification');
  const pendingNotify = new Promise<void>(resolve => { signalNotify = resolve; });
  await page.getByRole('button', { name: 'Send Test Alert', exact: true }).first().click();
  await Promise.race([pendingNotify, new Promise((_, reject) => setTimeout(() => reject(new Error('Notification request did not start')), 10000))]);
  await page.locator('header select').first().selectOption('B');
  await alertInput.waitFor();
  assert.ok((await alertInput.inputValue()).includes('Beta Software'));
  const lateNotify = page.waitForResponse(r => r.url().endsWith('/api/telegram/notify'));
  releaseNotify!(); await lateNotify;
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  assert.equal(await page.getByText(/Telegram accepted the test alert/).count(), 0);
  assert.equal(await page.getByText('Alpha-private-notification', { exact: true }).count(), 0);
  failNotify = true;
  await page.getByRole('button', { name: 'Send Test Alert', exact: true }).first().click();
  await page.getByText('Delivery failed: Delivery not confirmed', { exact: true }).waitFor();
  assert.deepEqual(notifications.map(n => n.companyId), ['A', 'B']);
  failNotify = false;
  await page.getByRole('button', { name: 'Send Test Alert', exact: true }).first().click();
  await page.getByText(/Telegram accepted the test alert/).waitFor();
  await page.locator('header select').first().selectOption('A');
  console.log('Browser stage: truthful-onboarding');
  await page.setViewportSize({width:1440,height:1000});
  await page.getByTitle('Business Setup Wizard').click();
  let setup=page.getByRole('dialog',{name:'Business setup'});
  await setup.getByRole('button',{name:'Next Step'}).click();
  await setup.getByRole('button',{name:'Next Step'}).click();
  await setup.getByText(/Saved profile flags only/).waitFor();
  assert.equal(await setup.getByText('Connected',{exact:true}).count(),0);
  await setup.getByRole('button',{name:'Next Step'}).click();
  await setup.getByText(/no provider audit, scan or campaign has run/).waitFor();
  await setup.getByRole('button',{name:'Close business setup'}).click();
  await page.getByTitle('Business Setup Wizard').click();
  await setup.getByText('1. Business Identity & Profile',{exact:true}).waitFor();
  await setup.getByRole('button',{name:'Close business setup'}).click();
  await page.setViewportSize({width:1280,height:720});
  console.log('Browser stage: review-collection');
  await page.getByRole('button',{name:'Review Management',exact:true}).click();
  await page.getByRole('button',{name:'Log Review',exact:true}).click();
  await page.getByPlaceholder('e.g. Vikramaditya Sharma').fill('CRUD fixture author');
  await page.getByPlaceholder('Write customer review text...').fill('CRUD private feedback');
  await page.getByRole('button',{name:'Save to MySQL Database',exact:true}).click();
  await page.getByRole('alert').filter({hasText:/Failed to save review/}).waitFor();
  assert.equal(await page.getByText('CRUD fixture author',{exact:true}).count(),0);assert.equal(reviewCreates.length,1);
  assert.equal(await page.getByPlaceholder('Write customer review text...').inputValue(),'CRUD private feedback');
  failReviewCreate=false;
  await page.getByRole('button',{name:'Save to MySQL Database',exact:true}).click();
  await page.getByText('CRUD fixture author',{exact:true}).waitFor();assert.equal(reviewCreates.length,2);
  page.once('dialog',dialog=>void dialog.accept());await page.getByTitle('Delete Review from MySQL').click();
  await page.getByRole('alert').filter({hasText:/Failed to delete review/}).waitFor();
  assert.equal(await page.getByText('CRUD fixture author',{exact:true}).count(),1);assert.equal(reviewDeletes.length,1);
  failReviewDelete=false;page.once('dialog',dialog=>void dialog.accept());await page.getByTitle('Delete Review from MySQL').click();
  await page.getByText('CRUD fixture author',{exact:true}).waitFor({state:'detached'});assert.equal(reviewDeletes.length,2);
  await page.getByRole('button',{name:'Collection QR & Links',exact:true}).click();
  await page.getByRole('img',{name:'Google review collection QR',exact:true}).waitFor();
  const qrDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Sticker SVG',exact:true}).click();
  assert.equal((await qrDownload).suggestedFilename(),'google-review-qr.svg');
  await page.locator('header select').first().selectOption('B');
  await page.getByRole('button',{name:'Collection QR & Links',exact:true}).click();
  assert.equal(await page.getByRole('img',{name:'Google review collection QR',exact:true}).count(),0);
  assert.ok(await page.getByRole('button',{name:'Sticker SVG',exact:true}).isDisabled());
  await page.locator('header select').first().selectOption('A');
  console.log('Browser stage: audit-evidence');
  await page.getByRole('button',{name:'Business Evidence Audit',exact:true}).click();
  const auditPanel=page.getByRole('region',{name:'Workspace audit evidence'});
  await auditPanel.getByText('Alpha current audit issue',{exact:true}).waitFor();
  await auditPanel.getByRole('button',{name:'Review fixture issue'}).click();
  await page.getByRole('button',{name:'Collection QR & Links',exact:true}).waitFor();assert.equal(auditActions.length,0);
  await page.getByRole('button',{name:'Business Evidence Audit',exact:true}).click();
  await auditPanel.getByText('Alpha current audit issue',{exact:true}).waitFor();failAudit=true;
  await auditPanel.getByRole('button',{name:'Refresh Evidence Audit',exact:true}).click();
  await auditPanel.getByRole('alert').waitFor();assert.equal(await auditPanel.getByText('Alpha current audit issue',{exact:true}).count(),0);failAudit=false;
  holdAudit=true;const auditPending=new Promise<void>(resolve=>{signalAudit=resolve;});
  await auditPanel.getByRole('button',{name:'Refresh Evidence Audit',exact:true}).click();await auditPending;
  await page.locator('header select').first().selectOption('B');
  await auditPanel.getByRole('button',{name:'Refresh Evidence Audit',exact:true}).waitFor();releaseAudit!();holdAudit=false;
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  assert.equal(await auditPanel.getByText('Alpha current audit issue',{exact:true}).count(),0);
  await page.locator('header select').first().selectOption('A');
  await auditPanel.getByText('Alpha current audit issue',{exact:true}).waitFor();
  console.log('Browser stage: meta-composer');
  await page.getByRole('button',{name:'Connected Accounts'}).click();
  await page.getByRole('button',{name:'Test Post',exact:true}).click();
  const metaCaption=page.getByPlaceholder("What's new with your business today?");
  assert.equal(await metaCaption.inputValue(),'');
  await metaCaption.fill('Alpha publication fixture');
  await page.getByPlaceholder('https://images.unsplash.com/photo-...').fill('https://example.invalid/approved-media.png');
  await page.getByRole('button',{name:'Publish to Meta',exact:true}).click();
  await page.getByText('Draft acknowledgment unconfirmed. Retry identical content.',{exact:true}).waitFor();
  assert.equal(metaDrafts.length,1);assert.equal(metaPublishes.length,0);
  await page.getByRole('button',{name:'Publish to Meta',exact:true}).click();
  await page.getByText('Unconfirmed fixture publication',{exact:true}).waitFor();
  assert.equal(metaDrafts.length,1);assert.equal(metaDrafts[0].companyId,'A');
  assert.deepEqual(metaDrafts[0].platforms,['facebook','instagram']);
  assert.equal(metaPublishes[0].postId,'fixture-meta-1');assert.equal(metaPublishes[0].expectedVersion,'a'.repeat(64));
  console.log('Browser stage: meta-remount');
  // Remount destroys in-memory references; tab storage must reuse the acknowledged draft.
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('button', { name: /Telegram AI Command/ }).click();
  await alertInput.waitFor();
  await page.getByRole('button',{name:'Connected Accounts'}).click();
  await page.getByRole('button',{name:'Test Post',exact:true}).click();
  await metaCaption.fill('Alpha publication fixture');
  await page.getByPlaceholder('https://images.unsplash.com/photo-...').fill('https://example.invalid/approved-media.png');
  const repeatedMeta=page.waitForResponse(r=>r.url().endsWith('/api/meta/publish-post'));
  await page.getByRole('button',{name:'Publish to Meta',exact:true}).click();
  await repeatedMeta;
  assert.equal(metaDrafts.length,1);assert.equal(metaPublishes[1].postId,metaPublishes[0].postId);
  await page.locator('header select').first().selectOption('B');
  await page.getByRole('button',{name:'Test Post',exact:true}).click();
  assert.equal(await metaCaption.inputValue(),'');
  assert.equal(await page.getByText('Unconfirmed fixture publication',{exact:true}).count(),0);
  console.log('Browser stage: meta-client-switch');
  holdMetaDraft=true;
  const draftStarted=new Promise<void>(resolve=>{signalMetaDraft=resolve;});
  await metaCaption.fill('Beta pending draft');
  await page.getByPlaceholder('https://images.unsplash.com/photo-...').fill('https://example.invalid/beta-media.png');
  await page.getByRole('button',{name:'Publish to Meta',exact:true}).click();
  await Promise.race([draftStarted,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Meta draft did not start')),10000))]);
  await page.locator('header select').first().selectOption('A');
  await page.getByRole('button',{name:'Test Post',exact:true}).waitFor();
  const lateMetaDraft=page.waitForResponse(r=>r.url().endsWith('/meta-publication-drafts') && r.request().method()==='POST');
  releaseMetaDraft!();holdMetaDraft=false;await lateMetaDraft;
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  assert.equal(metaPublishes.length,2,'Old-client draft completion must not trigger provider request');
  console.log('Browser stage: approval-workflow');
  await page.getByRole('button',{name:/AI Content & Reels/}).click();
  await page.getByRole('button',{name:'Posts Queue (1)',exact:true}).click();
  workflowConflict=true;
  await page.getByRole('button',{name:'Request approval',exact:true}).click();
  await page.getByText('Post changed. Reload before approving.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Approve for scheduled publishing',exact:true}).count(),0);
  workflowConflict=false;
  await page.getByRole('button',{name:'Request approval',exact:true}).click();
  await page.getByRole('button',{name:'Approve for scheduled publishing',exact:true}).click();
  await page.getByRole('button',{name:'Return to draft',exact:true}).waitFor();
  workflowPolicyDenied=true;
  await page.getByRole('button',{name:'Publish to MySQL Now',exact:true}).click();
  await page.getByText('Failed to publish post: Policy changed. Approval required.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Request reapproval',exact:true}).count(),1);
  assert.equal(workflowPublishes.length,0);
  workflowPolicyDenied=false;
  await page.getByLabel('Schedule date workflow-post',{exact:true}).fill('2026-11-04');
  await page.getByLabel('Schedule time workflow-post',{exact:true}).fill('14:30');
  await page.getByRole('button',{name:'Reschedule for approval',exact:true}).click();
  await page.getByRole('button',{name:'Approve for scheduled publishing',exact:true}).waitFor();
  assert.equal(workflowPublishes.length,0,'Reschedule must not publish');
  await page.getByRole('button',{name:'Approve for scheduled publishing',exact:true}).click();
  await page.getByRole('button',{name:'Approval history',exact:true}).click();
  const approvalHistory=page.getByRole('list',{name:'Approval history workflow-post',exact:true});
  await approvalHistory.getByText(/RESCHEDULE:.*Actor fixture-owner.*IST/).waitFor();
  await page.getByRole('button',{name:'Older approval changes',exact:true}).click();
  await approvalHistory.getByText(/draft → pending_approval/).waitFor();
  await page.getByRole('button',{name:'Publish to MySQL Now',exact:true}).click();
  await page.getByText(/Fixture verified result/).waitFor();
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  assert.equal(workflowPublishes.length,1,'Success callback must refresh without issuing another send');assert.equal(workflowAttempts,2);
  assert.equal(workflowWrites.length,5);assert.deepEqual(workflowWrites[3].schedule,{date:'2026-11-04',time:'14:30'});assert.equal(workflowWrites[1].expectedVersion,'a'.repeat(64));assert.equal(workflowWrites[2].expectedVersion,'b'.repeat(64));
  console.log('Browser stage: truthful-content-planning');
  await page.getByRole('button',{name:'30-Day Content Plan',exact:true}).click();
  assert.equal(await page.getByText('September 2026 Strategic Plan & Local Festivities',{exact:true}).count(),0);
  await page.getByRole('button',{name:'Create 3 AI Drafts for Next Month',exact:true}).click();
  const planPanel=page.getByRole('region',{name:'Draft plan results'});await planPanel.getByText(/save unconfirmed/).waitFor();assert.equal(contentCreates.length,1);assert.equal(contentCreates[0].status,'draft');
  assert.ok(await page.getByRole('button',{name:'Create 3 AI Drafts for Next Month',exact:true}).isDisabled());
  await page.getByRole('button',{name:/^Lead CRM & Sales AI/}).click();
  await page.getByRole('button',{name:'30-Day Content Plan',exact:true}).click();failContentCreate=false;
  await page.getByRole('button',{name:'Create 3 AI Drafts for Next Month',exact:true}).click();
  await page.getByText('2 of 3 AI drafts saved for review. No posts were scheduled or published.',{exact:true}).waitFor();
  assert.equal(contentCreates.length,3);assert.ok(contentCreates.every(post=>post.status==='draft'&&post.companyId==='A'));
  assert.equal(await planPanel.getByText(/generation failed/).count(),1);
  const deletePlanned=page.getByRole('button',{name:'Delete stored post planned-3',exact:true});page.once('dialog',dialog=>void dialog.accept());await deletePlanned.click();
  await page.getByText(/Failed to delete post:/).waitFor();assert.equal(contentDeletes.length,1);assert.equal(plannedPosts.length,2);
  failContentDelete=false;page.once('dialog',dialog=>void dialog.accept());await deletePlanned.click();await page.getByText('✓ Post deleted from MySQL database.',{exact:true}).waitFor();assert.equal(contentDeletes.length,2);assert.equal(plannedPosts.length,1);
  plannedPosts=[];
  console.log('Browser stage: truthful-crm');
  crmLeads=[{id:'lead-crm',company_id:'A',name:'CRM fixture',phone:'9999999999',stage:'new',intent_score:0,ai_suggested_reply:'Draft fixture'}];
  await page.locator('header select').first().selectOption('B');await page.locator('header select').first().selectOption('A');
  await page.getByRole('button',{name:/^Lead CRM & Sales AI/}).click();await page.getByLabel('Lead stage',{exact:true}).waitFor();
  await page.getByText('Intent: 0%',{exact:true}).waitFor();
  await page.getByLabel('Lead stage',{exact:true}).selectOption('qualified');await page.getByRole('alert').filter({hasText:/Lead stage update not confirmed/}).waitFor();assert.equal(await page.getByLabel('Lead stage',{exact:true}).inputValue(),'new');
  failLeadStage=false;await page.getByLabel('Lead stage',{exact:true}).selectOption('opportunity');await page.waitForFunction(()=>document.querySelector<HTMLSelectElement>('[aria-label="Lead stage"]')?.value==='opportunity');assert.equal(leadStageWrites.length,2);
  await page.getByRole('button',{name:'Record Inbound Lead (API / Form)',exact:true}).click();await page.getByPlaceholder('e.g., Rajesh Mehta').fill('New CRM fixture');await page.getByPlaceholder('+91 98200 00000').fill('9999999998');
  await page.getByRole('button',{name:'Save Lead Record',exact:true}).click();await page.getByRole('alert').filter({hasText:/Lead creation not confirmed/}).waitFor();assert.equal(await page.getByPlaceholder('e.g., Rajesh Mehta').inputValue(),'New CRM fixture');
  failCrmCreate=false;await page.getByRole('button',{name:'Save Lead Record',exact:true}).click();await page.getByText('Lead saved to workspace records. Customer messaging requires an explicit send action.',{exact:true}).waitFor();assert.equal(crmCreates.length,2);assert.equal(whatsAppWrites.length,0);
  await page.getByRole('button',{name:'Send via WhatsApp API',exact:true}).click();await page.getByRole('link',{name:'Open WhatsApp draft',exact:true}).waitFor();await page.getByRole('region',{name:'Stored message dispatch'}).getByText('Stored state: UNKNOWN',{exact:true}).waitFor();await page.getByRole('region',{name:'Stored message dispatch'}).getByText('Provider receipt: UNOBSERVED (0 recorded events)',{exact:true}).waitFor();assert.equal(await page.getByLabel('Lead stage',{exact:true}).inputValue(),'new');assert.equal(leadStageWrites.length,2);
  failLeadReads=true;await page.locator('header select').first().selectOption('B');await page.getByText('Workspace unavailable — changes are paused',{exact:true}).waitFor();
  assert.equal(await page.getByText('New CRM fixture',{exact:true}).count(),0);failLeadReads=false;
  await page.getByRole('button',{name:'Retry workspace load',exact:true}).click();await page.getByRole('button',{name:'Record Inbound Lead (API / Form)',exact:true}).waitFor();assert.equal(await page.getByText('Obsolete JSON lead',{exact:true}).count(),0);
  crmLeads=[];await page.locator('header select').first().selectOption('A');
  console.log('Browser stage: ads-partial-sync-isolation');
  await page.getByRole('button',{name:/^Campaigns & Attribution/}).click();
  await page.getByRole('button',{name:/^External Ad Telemetry/}).click();
  await page.getByText('Alpha Ads Fixture',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Sync Meta Ads Now',exact:true}).click();
  await page.getByText('Fixture partial sync:1 record saved; more remain.',{exact:true}).waitFor();assert.equal(campaignSyncs[0].company_id,'A');
  holdCampaignSync=true;const pendingCampaignSync=new Promise<void>(resolve=>{signalCampaignSync=resolve;});
  await page.getByRole('button',{name:'Sync Meta Ads Now',exact:true}).click();await pendingCampaignSync;
  await page.locator('header select').first().selectOption('B');await page.getByRole('button',{name:/^External Ad Telemetry/}).click();
  await page.getByText('No external ad campaigns synced yet.',{exact:true}).waitFor();releaseCampaignSync?.();holdCampaignSync=false;
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));assert.equal(await page.getByText('Alpha Ads Fixture',{exact:true}).count(),0);assert.equal(await page.getByText('Fixture partial sync:1 record saved; more remain.',{exact:true}).count(),0);
  failCampaignRead=true;await page.locator('header select').first().selectOption('A');await page.getByRole('button',{name:/^External Ad Telemetry/}).click();
  await page.getByRole('button',{name:'Reload campaign records',exact:true}).waitFor();assert.equal(await page.getByText('No external ad campaigns synced yet.',{exact:true}).count(),0);
  failCampaignRead=false;await page.getByRole('button',{name:'Reload campaign records',exact:true}).click();await page.getByText('Alpha Ads Fixture',{exact:true}).waitFor();

  console.log('Browser stage: autonomous-state-truth');
  await page.getByRole('button',{name:/^Autonomous Engine/}).click();
  const autonomous=page.getByRole('region',{name:'Autonomous execution controls'});
  await autonomous.getByRole('region',{name:'Stored message dispatch'}).getByText('Provider receipt: UNOBSERVED (0 recorded events)',{exact:true}).waitFor();assert.equal(await autonomous.getByText('Provider Verified',{exact:true}).count(),0);
  await autonomous.getByRole('button',{name:'Autopilot: Paused',exact:true}).waitFor();wrongAutoAck=true;
  await autonomous.getByRole('button',{name:'Autopilot: Paused',exact:true}).click();
  await autonomous.getByText('Backend state unconfirmed; execution controls are disabled.',{exact:true}).waitFor();assert.ok(await autonomous.getByRole('button',{name:'Autopilot: Unconfirmed',exact:true}).isDisabled());
  wrongAutoAck=false;await autonomous.getByRole('button',{name:'Reload autonomous state',exact:true}).click();await autonomous.getByRole('button',{name:'Autopilot: Active',exact:true}).waitFor();assert.equal(autoControls[0].companyId,'A');
  failAutoRead=true;await autonomous.getByRole('button',{name:'Reload autonomous state',exact:true}).click();await autonomous.getByText('Autonomous state unavailable. Reload before changing controls or executing work.',{exact:true}).waitFor();assert.ok(await autonomous.getByRole('button',{name:'Run Observation Cycle',exact:true}).isDisabled());
  failAutoRead=false;await autonomous.getByRole('button',{name:'Reload autonomous state',exact:true}).click();await autonomous.getByRole('button',{name:'Approve & Execute',exact:true}).waitFor();
  holdAutoApproval=true;const pendingAutoApproval=new Promise<void>(resolve=>{signalAutoApproval=resolve;});await autonomous.getByRole('button',{name:'Approve & Execute',exact:true}).click();await pendingAutoApproval;
  await page.locator('header select').first().selectOption('B');await autonomous.getByRole('button',{name:'Autopilot: Active',exact:true}).waitFor();releaseAutoApproval!();holdAutoApproval=false;
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));assert.equal(autoApprovals[0].companyId,'A');assert.equal(autoExecutions.length,0);assert.equal(await autonomous.getByText('Alpha autonomous fixture',{exact:true}).count(),0);
  await page.locator('header select').first().selectOption('A');await autonomous.getByRole('button',{name:'Autopilot: Active',exact:true}).waitFor();
  console.log('Browser stage: message-retry-identity');
  const retryIdentity=await page.evaluate(async()=>{const api=await import(/* @vite-ignore */ String('/src/services/authService.ts'));const payload={companyId:'A',to:'919999999999',message:'Retry identity fixture'};const first=await api.sendWhatsAppMessageApi(payload);const second=await api.sendWhatsAppMessageApi(payload);const other=await api.sendWhatsAppMessageApi({...payload,companyId:'B'});return {first:first.requestKey,second:second.requestKey,other:other.requestKey};});
  assert.match(retryIdentity.first!,/^[a-f0-9]{64}$/);assert.equal(retryIdentity.first,retryIdentity.second);assert.notEqual(retryIdentity.first,retryIdentity.other);
  console.log('Browser stage: saved-controls-navigation');
  await page.getByRole('button',{name:/^AI Control & Guardrails/}).click();await page.getByRole('heading',{name:'Execution controls & recorded outcomes',exact:true}).waitFor();
  assert.equal(await page.getByText('100% Compliant',{exact:true}).count(),0);assert.equal(await page.getByText('All 7 Flags Controlled',{exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'ON',exact:true}).count(),0);assert.equal(await page.getByRole('region',{name:'Scheduler run history'}).count(),0);
  holdHolidaySave=true;const holidayStarted=new Promise<void>(resolve=>{signalHolidaySave=resolve;});
  const holidayPauseSaved=page.waitForResponse(response=>response.request().method()==='PUT'&&response.url().endsWith('/api/companies/A/data')&&response.request().postDataJSON().data.engine_settings.isHolidayPaused===true);
  await page.getByLabel('Draft holiday publishing pause',{exact:true}).check();await holidayStarted;
  const holidayResumeSaved=page.waitForResponse(response=>response.request().method()==='PUT'&&response.url().endsWith('/api/companies/A/data')&&response.request().postDataJSON().data.engine_settings.isHolidayPaused===false);
  await page.getByLabel('Draft holiday publishing pause',{exact:true}).uncheck();releaseHolidaySave?.();holdHolidaySave=false;
  await holidayPauseSaved;assert.equal(await page.getByText('Saved to server',{exact:true}).count(),0);
  await holidayResumeSaved;await page.getByText('Saved to server',{exact:true}).waitFor();
  malformedHolidaySettings=true;const invalidHoliday=await page.evaluate(async()=>{const api=await import(/* @vite-ignore */ String('/src/services/authService.ts'));try{await api.fetchCompanyData('A');return 'UNEXPECTED_SUCCESS';}catch(error){return (error as Error).message;}});assert.equal(invalidHoliday,'Workspace execution settings invalid');malformedHolidaySettings=false;
  const beforeNavigation=autoControls.length;await page.getByRole('button',{name:'Review backend stop controls',exact:true}).click();await page.getByRole('region',{name:'Autonomous execution controls'}).waitFor();assert.equal(autoControls.length,beforeNavigation);
  await page.getByRole('button',{name:/^AI Control & Guardrails/}).click();await page.getByRole('button',{name:'Open publishing controls',exact:true}).click();await page.getByRole('region',{name:'Workspace publishing controls'}).waitFor();
  console.log('Browser stage: workspace-memory');
  await page.getByRole('button', { name: 'Knowledge & AI Memory' }).click();
  await page.getByText('Alpha-private-pricing.pdf', { exact: true }).waitFor();
  const selector = page.locator('header select').first();
  await selector.selectOption('B');
  await page.getByRole('heading', { name: 'Beta Software Knowledge Base & Fact Memory' }).waitFor();
  assert.equal(await page.getByText('Alpha-private-pricing.pdf', { exact: true }).count(), 0);
  assert.ok(!(await page.locator('body').innerText()).includes('Alpha secret policy?'));

  delayAlpha = true;
  const slowStarted = new Promise<void>(resolve => { signalSlow = resolve; });
  await selector.selectOption('A');
  await slowStarted;
  await selector.selectOption('B');
  await page.getByRole('heading', { name: 'Beta Software Knowledge Base & Fact Memory' }).waitFor();
  const alphaResponse = page.waitForResponse(r => r.url().endsWith('/api/companies/A/data'));
  releaseSlow!();
  await alphaResponse;
  // Allow promise handlers and render to run before inspecting the retained active view.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  assert.ok(await page.getByRole('heading', { name: 'Beta Software Knowledge Base & Fact Memory' }).isVisible());
  assert.equal(await page.getByText('Alpha-private-pricing.pdf', { exact: true }).count(), 0);
  // Allow any queued UI work to settle; initial loads no longer suppress user edits with a timer.
  await page.waitForTimeout(650);
  await page.getByRole('button', { name: 'Add FAQ', exact: true }).click();
  await page.getByPlaceholder('e.g., Do you provide support after launch?').fill('Beta support policy?');
  await page.locator('textarea').first().fill('Beta-only answer');
  const saved = page.waitForRequest(r => r.method() === 'PUT' && r.url().endsWith('/api/companies/B/data'));
  await page.getByRole('button', { name: 'Save to AI Memory', exact: true }).click();
  const saveRequest = await saved;
  assert.ok(JSON.stringify(saveRequest.postDataJSON()).includes('Beta-only answer'));
  assert.ok(!JSON.stringify(saveRequest.postDataJSON()).includes('Alpha-only'));
  assert.equal(saveRequest.postDataJSON().data.knowledge_base.documents.length, 0);

  await page.getByText('Saved to server', { exact: true }).waitFor();
  const cachedBeforeFailure = await page.evaluate(() => localStorage.getItem('localpulse_app_state_fixture-owner_B'));
  failWrites = true;
  await page.getByRole('button', { name: 'Add FAQ', exact: true }).click();
  await page.getByPlaceholder('e.g., Do you provide support after launch?').fill('Unsaved Beta question?');
  await page.locator('textarea').first().fill('Unsaved Beta answer');
  await page.getByRole('button', { name: 'Save to AI Memory', exact: true }).click();
  await page.getByText('Not saved — reload workspace before saving.', { exact: true }).waitFor();
  assert.equal(await page.getByText('Saved to server', { exact: true }).count(), 0);
  assert.equal(await page.evaluate(() => localStorage.getItem('localpulse_app_state_fixture-owner_B')), cachedBeforeFailure);
  failWrites = false;
  await page.getByRole('button',{name:'Reload workspace before saving',exact:true}).click();await page.getByRole('heading',{name:'Beta Software Knowledge Base & Fact Memory'}).waitFor();await page.waitForTimeout(720);

  console.log('Browser stage: cross-tab-profile-conflict');
  profileVersions.B=String(BigInt(profileVersions.B)+1n); // Another tab/server writer wins after this view loaded.
  const beforeConflict=writes.length;
  await page.getByRole('button',{name:'Add FAQ',exact:true}).click();await page.getByPlaceholder('e.g., Do you provide support after launch?').fill('Stale revision question?');await page.locator('textarea').first().fill('Stale answer');await page.getByRole('button',{name:'Save to AI Memory',exact:true}).click();
  await page.getByRole('button',{name:'Reload workspace before saving',exact:true}).waitFor();assert.equal(writes.length,beforeConflict+1);
  await page.getByRole('button',{name:'Add FAQ',exact:true}).click();await page.getByPlaceholder('e.g., Do you provide support after launch?').fill('Must not auto-retry?');await page.locator('textarea').first().fill('No blind retry');await page.getByRole('button',{name:'Save to AI Memory',exact:true}).click();await page.waitForTimeout(1700);assert.equal(writes.length,beforeConflict+1);
  await page.getByRole('button',{name:'Reload workspace before saving',exact:true}).click();await page.getByRole('heading',{name:'Beta Software Knowledge Base & Fact Memory'}).waitFor();await page.waitForTimeout(720);

  console.log('Browser stage: pending-save');
  holdWrites = true;
  const saveStarted = new Promise<void>(resolve => { signalSave = resolve; });
  await page.getByRole('button', { name: 'Add FAQ', exact: true }).click();
  await page.getByPlaceholder('e.g., Do you provide support after launch?').fill('Delayed Beta question?');
  await page.locator('textarea').first().fill('Delayed Beta answer');
  await page.getByRole('button', { name: 'Save to AI Memory', exact: true }).click();
  await Promise.race([saveStarted,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Pending-save request did not start')),10000))]);
  delayAlpha = false;
  await selector.selectOption('A');
  await page.getByText('Alpha-private-pricing.pdf', { exact: true }).waitFor();
  // Return to the same client before the old request finishes: client ID alone is insufficient.
  await selector.selectOption('B');
  await page.getByRole('heading', { name: 'Beta Software Knowledge Base & Fact Memory' }).waitFor();
  const cacheAfterReload = await page.evaluate(() => localStorage.getItem('localpulse_app_state_fixture-owner_B'));
  const lateSaveResponse = page.waitForResponse(r => r.request().method() === 'PUT' && r.url().endsWith('/api/companies/B/data'));
  releaseSave!();
  await lateSaveResponse;
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  assert.equal(await page.getByText('Saved to server', { exact: true }).count(), 0);
  assert.equal(await page.evaluate(() => localStorage.getItem('localpulse_app_state_fixture-owner_B')), cacheAfterReload);
  holdWrites = false;
  await selector.selectOption('B');
  await page.getByRole('heading', { name: 'Beta Software Knowledge Base & Fact Memory' }).waitFor();
  delayAlpha = true;

  betaFailureStatus = 503;
  delayAlpha = false;
  await selector.selectOption('A');
  await page.getByText('Alpha-private-pricing.pdf', { exact: true }).waitFor();
  await selector.selectOption('B');
  await page.getByRole('heading', { name: 'Workspace unavailable — changes are paused' }).waitFor();
  await page.getByText(/A cached snapshot exists/).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Add FAQ', exact: true }).count(), 0);
  const beforeOfflineWait = writes.length;
  // Cross both the initial-load and autosave debounce windows: failed loads must never write.
  await page.waitForTimeout(2300);
  assert.equal(writes.length, beforeOfflineWait);

  betaFailureStatus = 403;
  await page.getByRole('button', { name: 'Retry workspace load' }).click();
  await page.getByText('The workspace could not be loaded. Reconnect before making changes.').waitFor();
  assert.equal(await page.getByText(/A cached snapshot exists/).count(), 0);
  await page.evaluate(() => {
    const key = 'localpulse_app_state_fixture-owner_B';
    const cached = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify({ ...cached, userId: 'another-user' }));
  });
  betaFailureStatus = 503;
  await page.getByRole('button', { name: 'Retry workspace load' }).click();
  await page.getByRole('heading', { name: 'Workspace unavailable — changes are paused' }).waitFor();
  assert.equal(await page.getByText(/A cached snapshot exists/).count(), 0);
  betaFailureStatus = 0;
  await page.getByRole('button', { name: 'Retry workspace load' }).click();
  await page.getByRole('heading', { name: 'Beta Software Knowledge Base & Fact Memory' }).waitFor();
  delayAlpha = true;

  const logoutLoad = new Promise<void>(resolve => { signalSlow = resolve; });
  await selector.selectOption('A');
  await logoutLoad;
  await page.getByTitle('Sign Out of ABGA').click();
  await page.locator('input[type="password"]').first().waitFor();
  const loggedOutResponse = page.waitForResponse(r => r.url().endsWith('/api/companies/A/data'));
  releaseSlow!();
  await loggedOutResponse;
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  assert.equal(await page.getByText('Alpha-private-pricing.pdf', { exact: true }).count(), 0);
  assert.equal(await page.evaluate(() => localStorage.getItem('abga_auth_token')), null);
  delayAlpha = false;
  console.log('Browser stage: cross-tab');
  const signedInTab = await context.newPage();
  await signedInTab.goto(origin);
  await signedInTab.locator('header select').first().waitFor();
  const sessionChangingTab = await context.newPage();
  await sessionChangingTab.goto(origin);
  await sessionChangingTab.locator('header select').first().waitFor();
  assert.equal(await signedInTab.evaluate(() => localStorage.getItem('abga_auth_token')), 'fixture-token');
  await sessionChangingTab.evaluate(() => localStorage.removeItem('abga_auth_token'));
  await signedInTab.locator('input[type="password"]').first().waitFor();
  assert.equal(await signedInTab.locator('header select').count(), 0);
  console.log('Browser isolation: audit observation/no-resend/conflict/client isolation; stored Meta draft/retry/client-switch isolation; notification-status pagination/unavailable/stale-client isolation; manual notification scope/failure/stale-client isolation; action history pagination/failure/retry/stale-client isolation; empty-client switch, stale response, tenant-specific FAQ autosave, failed-save cache protection, stale save completion, failed-load write blocking, cache ownership/access denial, logout during load and cross-tab session invalidation passed.');
} finally {
  releaseHolidaySave?.();
  releaseCampaignSync?.();
  releaseAutoApproval?.();
  releaseControlPatch?.();
  releaseDailyReport?.();
  releaseSlow?.();
  releaseFeed?.();
  releaseNotify?.();
  releaseStatus?.();
  releaseMetaDraft?.();
  releaseReview?.();
  releaseSave?.();
  await browser?.close();
  await vite.close();
}
