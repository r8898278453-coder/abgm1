import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {verifyTenantEmailDomain} from '../../server/tenantEmailDomain';
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
 const domainId=crypto.randomUUID(),privateKey='re_PRIVATE_fixture_key',fromEmail='operator@example.invalid';
 const credentials={provider:'resend',resendDomainId:domainId,apiKey:privateKey,fromEmail};
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
 await save();
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
 const [audit]:any=await pool.query("SELECT details FROM autonomous_audit_logs WHERE company_id=? AND event_type LIKE 'AGENCY_TENANT_EMAIL_%'",[a]);
 for(const secret of [privateKey,fromEmail,domainId,'PRIVATE_PROVIDER_RECORD'])assert.equal(JSON.stringify(audit).includes(secret),false);
 console.log('Tenant email SQL: saved Resend binding, wrong workspace and provider refusal, eight-way cooldown, exact domain and ID, redirect/size rejection, stale credentials and archive fencing, private journal and no sends passed.');
 console.log('Integration SQL: confirmed transactional save returns actual stable ID, genuine empty/missing reads, encrypted SMTP/login/API fields, null untested timestamp, tenant isolation, missing workspace refusal and affected-row deletion passed.');
}catch(error:any){console.log(JSON.stringify({fixture:'integration-persistence',stage,code:error?.code||'ASSERTION',line:error?.stack?.match(/integrationPersistenceSql.test.ts:(\d+)/)?.[1]}));process.exitCode=1;}
finally{
 for(const id of [a,b]){
  for(const table of ['company_integrations','autonomous_audit_logs','company_profiles_data','client_operations','agency_clients']){
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
