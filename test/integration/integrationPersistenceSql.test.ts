import {readInboxThread} from '../../server/crmInbox';
import {parseSalesEmailReceipt,recordSalesEmailReceipt,readEmailWebhookSecret} from '../../server/salesEmailReceipts';
import {platformDateKey} from '../../shared/dailyWorkReport';
import {readSalesEmailReadiness,sendApprovedSalesEmail} from '../../server/tenantSalesEmail';
import {readSalesInbox,readSalesReport,saveContactPermission,saveSalesPolicy} from '../../server/salesWorkspace';
import {DEFAULT_SALES_POLICY} from '../../shared/salesWorkspace';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readTenantEmailDomainStatus,verifyTenantEmailDomain} from '../../server/tenantEmailDomain';
if(process.env.ABGM1_LOCAL_SQL_TESTS!=='1'||process.env.DB_HOST!=='127.0.0.1'||!process.env.DB_NAME?.startsWith('abgm1_test_')||!process.env.LOCAL_SQL_CONTAINER_ID)throw new Error('Disposable SQL identity required');
const db=await import('../../server/db'),pool=await db.getDbPool();assert.ok(pool);const prefix='integration_'+crypto.randomBytes(8).toString('hex'),a=prefix+'_a',b=prefix+'_b',owner={id:prefix+'_owner'},foreign={id:prefix+'_foreign'};let stage='identity';
try{
 const [identity]:any=await pool.query('SELECT @@hostname hostname');assert.equal(identity[0].hostname,process.env.LOCAL_SQL_CONTAINER_ID);for(const [id,actor] of [[a,owner],[b,foreign]] as const){
  await pool.query("INSERT INTO users(id,email,password_hash,salt,full_name) VALUES (?,?,'fixture','fixture','Fixture')",[actor.id,actor.id+'@example.invalid']);
  await db.createCompany({id,user_id:actor.id,name:'Fixture',category:'Services',city:'Pune'});
 }
 assert.deepEqual(await db.getCompanyIntegrations(a),[]);assert.equal(await db.getCompanyIntegration(a,'transactional_email'),null);
 stage='save';const first=await db.saveCompanyIntegration(a,'transactional_email',{status:'saved',credentials:{smtpPass:'fixture-smtp-password',login:'fixture-api-login',apiKey:'fixture-api-key',fromEmail:'fixture@example.invalid'},config:{provider:'smtp'}});
 assert.equal(first.last_tested_at,null);assert.equal(first.credentials.smtpPass,'fixture-smtp-password');
 const [stored]:any=await pool.query('SELECT credentials FROM company_integrations WHERE company_id=?',[a]);const raw=typeof stored[0].credentials==='string'?stored[0].credentials:JSON.stringify(stored[0].credentials);assert.ok(!raw.includes('fixture-smtp-password'));assert.ok(!raw.includes('fixture-api-login'));assert.ok(raw.includes('enc:v1:'));
 const second=await db.saveCompanyIntegration(a,'transactional_email',{status:'saved',credentials:{smtpPass:'replacement-fixture'}});assert.equal(second.id,first.id);assert.equal((await db.getCompanyIntegrations(a)).length,1);assert.equal((await db.getCompanyIntegration(a,'transactional_email'))?.credentials.smtpPass,'replacement-fixture');assert.deepEqual(await db.getCompanyIntegrations(b),[]);
 stage='missing';await assert.rejects(db.saveCompanyIntegration(prefix+'_missing','transactional_email',{status:'saved',credentials:{apiKey:'fixture'}}));assert.equal(await db.deleteCompanyIntegration(b,'transactional_email'),false);assert.equal(await db.deleteCompanyIntegration(a,'transactional_email'),true);assert.equal(await db.deleteCompanyIntegration(a,'transactional_email'),false);
 stage='tenant-email-domain';
 const readStatus=(actor=owner)=>readTenantEmailDomainStatus(pool,actor,a);
 const domainId=crypto.randomUUID(),privateKey='re_PRIVATE_fixture_key',fromEmail='operator@example.invalid';
 const webhookSecret='whsec_'+crypto.randomBytes(32).toString('base64');
 const credentials={provider:'resend',resendDomainId:domainId,apiKey:privateKey,fromEmail,resendWebhookSecret:webhookSecret};
 const save=(patch:Record<string,string>={})=>db.saveCompanyIntegration(a,'transactional_email',{status:'saved',credentials:{...credentials,...patch}});
 const resetCooldown=()=>pool.query("DELETE FROM autonomous_audit_logs WHERE company_id=? AND event_type='AGENCY_TENANT_EMAIL_DOMAIN_CHECK_STARTED'",[a]);
 const json=(data:unknown)=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
 let calls=0;
 const provider:typeof fetch=async(url,options)=>{
  calls++;
  assert.equal(String(url),'https://api.resend.com/domains/'+domainId);
  assert.equal(options?.method,'GET');
  assert.equal(options?.redirect,'error');
  assert.equal(new Headers(options?.headers).get('authorization'),'Bearer '+privateKey);
  return json({id:domainId,name:'EXAMPLE.invalid',status:'verified',records:[{value:'PRIVATE_PROVIDER_RECORD'}]});
 };
 await assert.rejects(verifyTenantEmailDomain(pool,owner,a,provider),{code:'TENANT_EMAIL_CONFIGURATION_REQUIRED'});
 await save({provider:'smtp'});
 await assert.rejects(verifyTenantEmailDomain(pool,owner,a,provider),{code:'TENANT_EMAIL_PROVIDER_UNSUPPORTED'});
 await save({resendDomainId:'https://private.example.invalid'});
 await assert.rejects(verifyTenantEmailDomain(pool,owner,a,provider),{code:'TENANT_EMAIL_CONFIGURATION_REQUIRED'});
 assert.deepEqual(await readStatus(),{state:'NOT_CONFIGURED'});
 await save();
 assert.deepEqual(await readStatus(),{state:'UNCHECKED'});
 await assert.rejects(readStatus(foreign),{status:403});
 await assert.rejects(verifyTenantEmailDomain(pool,foreign,a,provider),{status:403});
 assert.equal(calls,0);
 const checks=await Promise.allSettled(Array.from({length:8},()=>verifyTenantEmailDomain(pool,owner,a,provider)));
 const completed=checks.filter(r=>r.status==='fulfilled');
 assert.equal(completed.length,1);
 assert.equal(calls,1);
 assert.equal(checks.filter(r=>r.status==='rejected'&&r.reason.code==='TENANT_EMAIL_DOMAIN_CHECK_COOLDOWN').length,7);
 if(completed[0].status!=='fulfilled')throw new Error('Missing proof');
 const proof=completed[0].value;
 assert.deepEqual(Object.keys(proof).sort(),['checkedAtMs','domain','provider','state']);
 assert.equal(proof.domain,'example.invalid');
 assert.equal(proof.state,'VERIFIED_DOMAIN');
 const status=await readStatus();
 assert.deepEqual(status,{state:'VERIFIED_DOMAIN',proof,expiresAtMs:proof.checkedAtMs+900000});
 assert.equal(calls,1);
 await pool.query("UPDATE autonomous_audit_logs SET timestamp=DATE_SUB(NOW(),INTERVAL 16 MINUTE) WHERE company_id=? AND event_type='AGENCY_TENANT_EMAIL_DOMAIN_CHECK_STARTED'",[a]);
 assert.deepEqual(await readStatus(),{state:'RECHECK_REQUIRED'});

 stage='tenant-email-durable-status';
 const [members]:any=await pool.query("SELECT agency_id FROM agency_clients WHERE company_id=?",[a]);
 const agencyId=members[0].agency_id;
 await pool.query("INSERT INTO agency_memberships(agency_id,user_id,role) VALUES (?,?,'ADMIN')",[agencyId,foreign.id]);
 await verifyTenantEmailDomain(pool,foreign,a,provider);
 assert.equal((await readStatus()).state,'VERIFIED_DOMAIN');
 await pool.query('DELETE FROM agency_memberships WHERE agency_id=? AND user_id=?',[agencyId,foreign.id]);
 assert.deepEqual(await readStatus(),{state:'RECHECK_REQUIRED'});
 await save();
 assert.deepEqual(await readStatus(),{state:'RECHECK_REQUIRED'});
 await resetCooldown();
 let signal!:()=>void,finish!:()=>void;
 const started=new Promise<void>(resolve=>{signal=resolve;});
 const release=new Promise<void>(resolve=>{finish=resolve;});
 const active=verifyTenantEmailDomain(pool,owner,a,async(url,options)=>{
  signal();
  await release;
  return provider(url,options);
 });
 try{
  await started;
  assert.deepEqual(await readStatus(),{state:'CHECKING'});
  await pool.query("UPDATE autonomous_audit_logs SET timestamp=DATE_SUB(NOW(),INTERVAL 31 SECOND) WHERE company_id=? AND event_type='AGENCY_TENANT_EMAIL_DOMAIN_CHECK_STARTED'",[a]);
  assert.deepEqual(await readStatus(),{state:'UNCONFIRMED'});
 }finally{finish();await active;}
 assert.equal((await readStatus()).state,'VERIFIED_DOMAIN');

 assert.equal((await db.getCompanyIntegration(a,'transactional_email'))?.status,'saved');
 for(const [response,code] of [
  [()=>json({id:domainId,name:'example.invalid',status:'pending'}),'TENANT_EMAIL_DOMAIN_UNVERIFIED'],
  [()=>json({id:domainId,name:'wrong.invalid',status:'verified'}),'TENANT_EMAIL_DOMAIN_UNCONFIRMED'],
  [()=>json({id:crypto.randomUUID(),name:'example.invalid',status:'verified'}),'TENANT_EMAIL_DOMAIN_UNCONFIRMED'],
  [()=>Response.redirect('https://different.example.invalid'),'TENANT_EMAIL_DOMAIN_UNCONFIRMED'],
  [()=>json({records:'X'.repeat(32769)}),'TENANT_EMAIL_DOMAIN_UNCONFIRMED'],
 ] as const){
  await resetCooldown();
  await assert.rejects(verifyTenantEmailDomain(pool,owner,a,async()=>response()),{code});
  assert.deepEqual(await readStatus(),{state:code==='TENANT_EMAIL_DOMAIN_UNVERIFIED'?'UNVERIFIED':'UNCONFIRMED'});
 }
 await resetCooldown();
 await assert.rejects(verifyTenantEmailDomain(pool,owner,a,async(url,options)=>{
  const response=await provider(url,options);
  await save({apiKey:'re_ROTATED_fixture_key'});
  return response;
 }),{code:'TENANT_EMAIL_CONFIGURATION_CHANGED'});
 await resetCooldown();
 await save();
 await assert.rejects(verifyTenantEmailDomain(pool,owner,a,async(url,options)=>{
  const response=await provider(url,options);
  await pool.query("UPDATE client_operations SET status='ARCHIVED' WHERE company_id=?",[a]);
  return response;
 }),{status:409});
 assert.deepEqual(await readStatus(),{state:'RECHECK_REQUIRED'});
 const [audit]:any=await pool.query("SELECT details FROM autonomous_audit_logs WHERE company_id=? AND event_type LIKE 'AGENCY_TENANT_EMAIL_%'",[a]);
 for(const secret of [privateKey,fromEmail,domainId,'PRIVATE_PROVIDER_RECORD'])assert.equal(JSON.stringify(audit).includes(secret),false);
 console.log('Tenant email SQL: saved Resend binding, wrong workspace and provider refusal, eight-way cooldown, exact domain and ID, redirect/size rejection, stale credentials and archive fencing, private journal, fresh/expired/role-revoked and abandoned-state reads and no sends passed.');
 stage='tenant-sales-email';
 await pool.query("UPDATE client_operations SET status='ACTIVE' WHERE company_id=?",[a]);
 await resetCooldown();
 const verified=await verifyTenantEmailDomain(pool,owner,a,provider);
 const lead=prefix+'_email_lead',recipient='customer@example.invalid';
 await pool.query("INSERT INTO leads(id,company_id,name,phone,email,service,stage,source) VALUES (?,?,'Email fixture','',?,'Services','new','Referral')",[lead,a,recipient]);
 const command={requestKey:crypto.randomBytes(32).toString('hex'),recipient,senderCheckedAtMs:verified.checkedAtMs,subject:'Private fixture subject',text:'Private fixture plain text'};
 const dispatch=(c=command,send=transport)=>sendApprovedSalesEmail(pool,owner,a,lead,c,send);
 let sends=0,providerKey='',providerId='';
 const transport:typeof fetch=async(url,options)=>{
  sends++;
  assert.equal(String(url),'https://api.resend.com/emails');
  assert.equal(options?.method,'POST');
  assert.equal(options?.redirect,'error');
  providerKey=new Headers(options?.headers).get('idempotency-key')||'';
  assert.match(providerKey,/^[a-f0-9]{64}$/);
  assert.deepEqual(JSON.parse(String(options?.body)),{from:fromEmail,to:[recipient],subject:command.subject,text:command.text});
  providerId=crypto.randomUUID();
  return json({id:providerId});
 };
 delete process.env.ENABLE_TENANT_SALES_EMAIL;
 await assert.rejects(dispatch(),{code:'SALES_EMAIL_DISABLED'});
 process.env.ENABLE_TENANT_SALES_EMAIL='true';
 await saveSalesPolicy(pool,owner,a,{expectedVersion:'0',policy:{...DEFAULT_SALES_POLICY,quietStart:null,quietEnd:null,dailyMessageCap:1}});
 await assert.rejects(dispatch(),{code:'CONTACT_PERMISSION_REQUIRED'});
 await saveContactPermission(pool,owner,a,{expectedVersion:'0',channel:'EMAIL',address:recipient,state:'ALLOWED',evidence:'Explicit customer fixture consent'});
 assert.equal((await readSalesEmailReadiness(pool,owner,a,lead)).blocked,null);
 await assert.rejects(dispatch({...command,recipient:'wrong@example.invalid'}),{code:'SALES_EMAIL_REVIEW_CHANGED'});
 await assert.rejects(dispatch({...command,senderCheckedAtMs:verified.checkedAtMs-1}),{code:'SALES_EMAIL_REVIEW_CHANGED'});
 assert.equal(sends,0);
 const results=await Promise.allSettled(Array.from({length:8},()=>dispatch()));
 assert.equal(sends,1);
 assert.ok(results.some(result=>result.status==='fulfilled'&&result.value.status==='API_ACCEPTED'));
 const acknowledged=await dispatch();
 assert.deepEqual(acknowledged,{status:'API_ACCEPTED',requestKey:command.requestKey,reused:true});
 await assert.rejects(dispatch({...command,subject:'Different subject'}),{code:'SALES_EMAIL_REQUEST_CONFLICT'});
 assert.equal(sends,1);
 const [outbound]:any=await pool.query("SELECT channel,body,dispatch_key FROM sales_inbox_messages WHERE company_id=? AND lead_id=? AND direction='OUTBOUND'",[a,lead]);
 assert.deepEqual(outbound,[{channel:'EMAIL',body:command.text,dispatch_key:providerKey}]);
 await assert.rejects(dispatch({...command,requestKey:crypto.randomBytes(32).toString('hex')}),{code:'SALES_DAILY_CAP'});

 await saveSalesPolicy(pool,owner,a,{expectedVersion:'1',policy:{...DEFAULT_SALES_POLICY,quietStart:null,quietEnd:null,dailyMessageCap:4}});
 const uncertain={...command,requestKey:crypto.randomBytes(32).toString('hex')};
 const ambiguous:typeof fetch=async()=>{sends++;throw new Error('PRIVATE transport timeout');};
 assert.equal((await dispatch(uncertain,ambiguous)).status,'UNKNOWN');
 assert.deepEqual(await dispatch(uncertain,ambiguous),{status:'UNKNOWN',requestKey:uncertain.requestKey,reused:true});
 assert.equal(sends,2);
 await saveContactPermission(pool,owner,a,{expectedVersion:'1',channel:'EMAIL',address:recipient,state:'OPTED_OUT',evidence:'Customer withdrew fixture consent'});
 await assert.rejects(dispatch({...command,requestKey:crypto.randomBytes(32).toString('hex')}),{code:'CONTACT_PERMISSION_REQUIRED'});
 assert.equal(sends,2);
 stage='tenant-sales-email-receipts';
 assert.equal(await readEmailWebhookSecret(pool,a),webhookSecret);
 assert.equal(await readEmailWebhookSecret(pool,b),null);
 const now=Date.now();
 const receipt=(type:string,patch:Record<string,unknown>={},at=now)=>parseSalesEmailReceipt({
  type,created_at:new Date(at).toISOString(),data:{email_id:providerId,from:fromEmail,to:[recipient],...patch}
 },now)!;
 const observe=(id:string,event:ReturnType<typeof receipt>)=>recordSalesEmailReceipt(pool,a,id,event,webhookSecret);
 const sent=receipt('email.sent');
 const concurrentReceipts=await Promise.all(Array.from({length:8},()=>observe('msg_sent',sent)));
 assert.equal(concurrentReceipts.filter(result=>result==='recorded').length,1);
 assert.equal(concurrentReceipts.filter(result=>result==='duplicate').length,7);
 await assert.rejects(observe('msg_sent',receipt('email.delivered')),{code:'EMAIL_WEBHOOK_EVENT_CONFLICT'});
 await assert.rejects(observe('msg_wrong_mailbox',receipt('email.delivered',{to:['other@example.invalid']})),{code:'EMAIL_WEBHOOK_DISPATCH_UNCONFIRMED'});
 await assert.rejects(observe('msg_wrong_from',receipt('email.delivered',{from:'different@example.invalid'})),{code:'EMAIL_WEBHOOK_DISPATCH_UNCONFIRMED'});
 await assert.rejects(observe('msg_missing_provider',receipt('email.delivered',{email_id:crypto.randomUUID()})),{code:'EMAIL_WEBHOOK_DISPATCH_UNCONFIRMED'});
 await assert.rejects(observe('msg_too_early',receipt('email.delivered',{},now-400000)),{code:'EMAIL_WEBHOOK_DISPATCH_UNCONFIRMED'});
 await assert.rejects(recordSalesEmailReceipt(pool,a,'msg_key_rotation',sent,'old-secret'),{code:'EMAIL_WEBHOOK_SECRET_CHANGED'});
 await db.saveCompanyIntegration(b,'transactional_email',{status:'saved',credentials});
 await assert.rejects(recordSalesEmailReceipt(pool,b,'msg_foreign',sent,webhookSecret),{code:'EMAIL_WEBHOOK_DISPATCH_UNCONFIRMED'});

 assert.equal(await observe('msg_delivered',receipt('email.delivered')),'recorded');
 assert.equal(await observe('msg_delivered_second',receipt('email.delivered',{},now+500)),'recorded');
 assert.equal(await observe('msg_sent_late',receipt('email.sent',{},now+700)),'recorded');
 const findEmail=async()=>((await readSalesInbox(pool,a)).messages as any[]).find(row=>row.emailDelivery);
 assert.equal((await findEmail()).emailDelivery.state,'DELIVERED');
 assert.equal((await findEmail()).emailDelivery.suppressed,false);
 assert.equal((await findEmail()).metadata.emailSenderHash,undefined);
 const thread=await readInboxThread(pool,a,lead,undefined,undefined,owner);
 const threadEmail=thread.messages.find(row=>row.emailDelivery);
 assert.equal(threadEmail?.emailDelivery.state,'DELIVERED');
 assert.equal(threadEmail?.metadata.emailSenderHash,undefined);
 assert.equal((await readSalesInbox(pool,b)).messages.length,0);
 const report=await readSalesReport(pool,a,platformDateKey(now));
 assert.equal(report.emailDelivery.SENT,1);
 assert.equal(report.emailDelivery.DELIVERED,1);
 assert.equal((await readSalesReport(pool,b,platformDateKey(now))).emailDelivery.DELIVERED,undefined);

 await saveContactPermission(pool,owner,a,{expectedVersion:'2',channel:'EMAIL',address:recipient,state:'ALLOWED',evidence:'Explicit fixture consent restored'});
 await observe('msg_transient',receipt('email.bounced',{bounce:{type:'Transient',message:'PRIVATE_REASON'}},now+1000));
 assert.equal((await readSalesEmailReadiness(pool,owner,a,lead)).blocked,null);
 assert.equal((await findEmail()).emailDelivery.state,'BOUNCED');
 assert.equal((await findEmail()).emailDelivery.suppressed,false);
 await observe('msg_delivered_after_transient',receipt('email.delivered',{},now+1500));
 assert.equal((await findEmail()).emailDelivery.state,'DELIVERED');
 await observe('msg_permanent',receipt('email.bounced',{bounce:{type:'Permanent'}}));
 await observe('msg_complaint',receipt('email.complained'));
 assert.equal((await findEmail()).emailDelivery.state,'COMPLAINED');
 assert.equal((await findEmail()).emailDelivery.suppressed,true);
 assert.equal((await readSalesEmailReadiness(pool,owner,a,lead)).blocked,'SALES_EMAIL_SUPPRESSED');
 await assert.rejects(dispatch({...command,requestKey:crypto.randomBytes(32).toString('hex')}),{code:'SALES_EMAIL_SUPPRESSED'});
 assert.equal(sends,2);
 const [privateJournal]=await pool.query('SELECT * FROM sales_email_receipts WHERE company_id=?',[a]);
 for(const forbidden of [recipient,fromEmail,webhookSecret,'PRIVATE_REASON',providerId,'msg_complaint']){
  assert.equal(JSON.stringify(privateJournal).includes(forbidden),false);
 }
 console.log('Sales Email receipts SQL: duplicates and conflicts, exact accepted dispatch and tenant, sender and recipient fences, provider time, secret rotation, inbox status, IST aggregation, hard and soft bounce, independent suppression and privacy passed.');
 console.log('Sales Email SQL: default off, saved tenant sender, explicit consent and opt-out, exact approved recipient and observation, eight contenders, IST cap, inbox threading anchor, accepted receipt and no resend of uncertain outcomes passed.');
 console.log('Integration SQL: confirmed transactional save returns actual stable ID, genuine empty/missing reads, encrypted SMTP/login/API fields, null untested timestamp, tenant isolation, missing workspace refusal and affected-row deletion passed.');
}catch(error:any){console.log(JSON.stringify({fixture:'integration-persistence',stage,code:error?.code||'ASSERTION',line:error?.stack?.match(/integrationPersistenceSql.test.ts:(\d+)/)?.[1]}));process.exitCode=1;}
finally{
 delete process.env.ENABLE_TENANT_SALES_EMAIL;
 for(const id of [a,b]){
  for(const table of ['sales_email_receipts','message_dispatch_intents','sales_inbox_messages','sales_contact_permissions','sales_client_policies','leads','company_integrations','autonomous_audit_logs','company_profiles_data','client_operations','agency_clients']){
   await pool.query(`DELETE FROM ${table} WHERE company_id=?`,[id]);
  }
  await pool.query('DELETE FROM companies WHERE id=?',[id]);
 }
 for(const actor of [owner,foreign]){
  await pool.query('DELETE FROM agency_memberships WHERE user_id=?',[actor.id]);
  await pool.query('DELETE FROM agencies WHERE owner_user_id=?',[actor.id]);
  await pool.query('DELETE FROM users WHERE id=?',[actor.id]);
 }
 await pool.end();
}
