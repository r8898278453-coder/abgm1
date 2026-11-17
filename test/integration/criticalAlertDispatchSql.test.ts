import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {latestNotificationDue} from '../../server/notificationOccurrences';
import {runBoundNotificationOccurrence} from '../../server/boundNotificationOccurrences';
import {saveNotificationPolicy} from '../../server/notificationPolicies';
import {telegramTransportBinding,type TelegramAttempt} from '../../server/tenantNotifications';
import {observeCriticalAlerts,reserveCriticalAlertCandidates,readCriticalAlertHistory} from '../../server/criticalAlertIncidents';
import {formatCriticalAlertMessage,type CriticalAlertCandidate} from '../../shared/criticalAlerts';

if(process.env.ABGM1_LOCAL_SQL_TESTS!=='1'||process.env.DB_HOST!=='127.0.0.1'||!process.env.DB_NAME?.startsWith('abgm1_test_')||!process.env.LOCAL_SQL_CONTAINER_ID)throw new Error('Disposable SQL required');
const db=await import('../../server/db'),pool=await db.getDbPool();assert.ok(pool);
const prefix='cad_'+crypto.randomBytes(5).toString('hex'),companies:string[]=[],users:any={};
const kind='critical_alert' as const;let stage='setup',due=0,sends=0;
const rows=async(sql:string,args:any[]=[])=>{const [r]:any=await pool.query(sql,args);return r;};
const binding=async(company:string)=>{const b=telegramTransportBinding(company,await db.getCompanyIntegration(company,'telegram_bot'));assert.ok(b);return b;};
const add=async(label:string,actor=users.owner)=>{
 const company=prefix+'_'+label;companies.push(company);
 await db.createCompany({id:company,user_id:users.owner.id,name:'PRIVATE_CLIENT_NAME',category:'Services',city:'Pune'});
 await db.saveCompanyIntegration(company,'telegram_bot',{status:'connected',credentials:{botToken:'123:PRIVATE_TOKEN',chatId:'-123456789'}});
 await saveNotificationPolicy(pool,actor,company,{kind,expectedVersion:'0',enabled:true,expectedBindingHash:(await binding(company)).hash});
 await pool.query('UPDATE notification_policies SET first_due_ms=? WHERE company_id=? AND notification_kind=?',[due,company,kind]);
 await pool.query("INSERT INTO job_queue(id,company_id,job_type,payload,status) VALUES (?,?,'fixture_source',?,'FAILED')",[company+'_source',company,JSON.stringify({name:'PRIVATE_CONTACT_NAME',body:'PRIVATE_JOB_BODY'})]);
 return company;
};
const accepted=(company:string)=>async(hash:string):Promise<TelegramAttempt>=>{
 assert.equal(hash,(await binding(company)).hash);
 assert.equal((await rows("SELECT COUNT(*) n FROM notification_occurrences WHERE company_id=? AND notification_kind=? AND status='RUNNING'",[company,kind]))[0].n,1);
 assert.ok((await rows('SELECT COUNT(*) n FROM critical_alert_reservations WHERE company_id=?',[company]))[0].n>=1);
 sends++;return{state:'API_ACCEPTED',providerId:'93',reason:null};
};
const dispatch=(company:string,at:number,candidates:CriticalAlertCandidate[],extra:any={},p=pool)=>runBoundNotificationOccurrence(p!,company,kind,at,formatCriticalAlertMessage(candidates),{
 budget:async()=>{},admit:async(sql:any)=>reserveCriticalAlertCandidates(sql,company,at,candidates),send:accepted(company),...extra,
});
const fault=(mode:'boundary-audit'|'claim-ack')=>new Proxy(pool!,{get(t,k){
 if(k==='getConnection')return async()=>{const c=await t.getConnection();let claimed=false;return new Proxy(c,{get(c,k){
  if(k==='commit')return async()=>{await c.commit();if(mode==='claim-ack'&&claimed)throw new Error('fixture lost claim ACK');};
  if(k==='query')return async(sql:string,args:any[])=>{if(sql.startsWith('INSERT INTO notification_occurrences'))claimed=true;if(mode==='boundary-audit'&&sql.startsWith('INSERT INTO autonomous_audit_logs')&&args?.includes('AGENCY_NOTIFICATION_BOUNDARY_RECORDED'))throw new Error('fixture boundary rollback');return c.query(sql,args);};
  const v=Reflect.get(c,k);return typeof v==='function'?v.bind(c):v;
 }});};const v=Reflect.get(t,k);return typeof v==='function'?v.bind(t):v;
}});

try{
 assert.equal((await rows('SELECT @@hostname hostname'))[0].hostname,process.env.LOCAL_SQL_CONTAINER_ID);
 for(const role of ['owner','admin']){const id=prefix+'_'+role;await pool.query("INSERT INTO users(id,email,password_hash,salt,full_name) VALUES (?,?,'fixture','fixture','Fixture')",[id,id+'@example.invalid']);users[role]=await db.findUserById(id);}
 const now=Number((await rows('SELECT UNIX_TIMESTAMP()*1000 now_ms'))[0].now_ms);due=latestNotificationDue(kind,now)-5*60000;

 stage='concurrent-observation-and-send';
 const raceCompany=await add('race');
 const observations=await Promise.all(Array.from({length:8},()=>observeCriticalAlerts(pool,raceCompany)));
 for(const candidates of observations){assert.equal(candidates.length,1);assert.equal(candidates[0].signal,'failedJobs');assert.equal(candidates[0].episode,'1');assert.equal(candidates[0].level,0);}
 const outcomes=await Promise.all(observations.map(candidates=>dispatch(raceCompany,due,candidates)));
 assert.equal(outcomes.filter(r=>r==='SENT').length,1);assert.equal(sends,1);
 const reservations=await rows('SELECT * FROM critical_alert_reservations WHERE company_id=?',[raceCompany]);assert.equal(reservations.length,1);assert.equal(Number(reservations[0].level),0);
 const evidence=await readCriticalAlertHistory(pool,raceCompany);
 assert.equal(evidence.reservations.length,1);assert.equal(evidence.reservations[0].status,'SENT');
 const privateEvidence=JSON.stringify(evidence)+formatCriticalAlertMessage(observations[0]);
 for(const secret of ['PRIVATE_CLIENT_NAME','PRIVATE_CONTACT_NAME','PRIVATE_JOB_BODY','PRIVATE_TOKEN','-123456789'])assert.equal(privateEvidence.includes(secret),false);

 stage='cross-minute-dedupe';
 const prior=sends;assert.equal(await dispatch(raceCompany,due+60000,observations[0]),'DEFERRED');assert.equal(sends,prior);
 assert.equal((await rows('SELECT COUNT(*) n FROM notification_occurrences WHERE company_id=?',[raceCompany]))[0].n,1);
 assert.deepEqual(await observeCriticalAlerts(pool,raceCompany),[]);

 stage='atomic-boundary-rollback';
 const rollbackCompany=await add('rollback'),rollbackCandidates=await observeCriticalAlerts(pool,rollbackCompany),beforeRollback=sends;
 await assert.rejects(dispatch(rollbackCompany,due,rollbackCandidates,{},fault('boundary-audit')));
 assert.equal((await rows('SELECT COUNT(*) n FROM critical_alert_reservations WHERE company_id=?',[rollbackCompany]))[0].n,0);
 assert.equal((await rows('SELECT COUNT(*) n FROM notification_occurrences WHERE company_id=?',[rollbackCompany]))[0].n,0);assert.equal(sends,beforeRollback);
 assert.equal(await dispatch(rollbackCompany,due,rollbackCandidates),'SENT');

 stage='false-hook-rollback';
 const falseCompany=await add('falsehook'),falseCandidates=await observeCriticalAlerts(pool,falseCompany),beforeFalse=sends;
 assert.equal(await dispatch(falseCompany,due,falseCandidates,{admit:async(sql:any)=>{assert.equal(await reserveCriticalAlertCandidates(sql,falseCompany,due,falseCandidates),true);return false;}}),'DEFERRED');
 assert.equal((await rows('SELECT COUNT(*) n FROM critical_alert_reservations WHERE company_id=?',[falseCompany]))[0].n,0);
 assert.equal((await rows('SELECT COUNT(*) n FROM notification_occurrences WHERE company_id=?',[falseCompany]))[0].n,0);assert.equal(sends,beforeFalse);

 stage='unknown-and-escalation';
 const unknownCompany=await add('unknown'),initial=await observeCriticalAlerts(pool,unknownCompany);
 assert.equal(await dispatch(unknownCompany,due,initial,{send:async()=>{sends++;return{state:'UNKNOWN',providerId:null,reason:'PROVIDER_OUTCOME_UNCONFIRMED'};}}),'UNKNOWN');
 const beforeUnknown=sends;assert.equal(await dispatch(unknownCompany,due+60000,initial),'DEFERRED');assert.equal(sends,beforeUnknown);assert.deepEqual(await observeCriticalAlerts(pool,unknownCompany),[]);
 await pool.query("UPDATE critical_alert_incidents SET first_seen_ms=? WHERE company_id=? AND signal_key='failedJobs'",[now-3600001,unknownCompany]);
 const escalation1=await observeCriticalAlerts(pool,unknownCompany);assert.equal(escalation1.length,1);assert.equal(escalation1[0].level,1);
 assert.equal(await dispatch(unknownCompany,due+2*60000,escalation1),'SENT');
 await pool.query("UPDATE critical_alert_incidents SET first_seen_ms=? WHERE company_id=? AND signal_key='failedJobs'",[now-86400001,unknownCompany]);
 const escalation2=await observeCriticalAlerts(pool,unknownCompany);assert.equal(escalation2.length,1);assert.equal(escalation2[0].level,2);
 assert.equal(await dispatch(unknownCompany,due+3*60000,escalation2),'SENT');
 assert.deepEqual(await observeCriticalAlerts(pool,unknownCompany),[]);
 assert.deepEqual((await rows('SELECT level FROM critical_alert_reservations WHERE company_id=? ORDER BY level',[unknownCompany])).map((r:any)=>Number(r.level)),[0,1,2]);

 stage='resolve-and-reopen';
 await pool.query("UPDATE job_queue SET status='SUCCEEDED' WHERE company_id=?",[unknownCompany]);assert.deepEqual(await observeCriticalAlerts(pool,unknownCompany),[]);
 await pool.query("UPDATE job_queue SET status='FAILED' WHERE company_id=?",[unknownCompany]);
 const reopened=await observeCriticalAlerts(pool,unknownCompany);assert.equal(reopened.length,1);assert.equal(reopened[0].episode,'2');assert.equal(reopened[0].level,0);
 assert.equal(await dispatch(unknownCompany,due+4*60000,reopened),'SENT');
 assert.equal((await rows('SELECT COUNT(*) n FROM critical_alert_reservations WHERE company_id=?',[unknownCompany]))[0].n,4);

 stage='stale-candidate-refusal';
 const staleCompany=await add('stale'),staleCandidates=await observeCriticalAlerts(pool,staleCompany),beforeStale=sends;
 await pool.query("UPDATE job_queue SET status='SUCCEEDED' WHERE company_id=?",[staleCompany]);await observeCriticalAlerts(pool,staleCompany);
 assert.equal(await dispatch(staleCompany,due,staleCandidates),'DEFERRED');assert.equal(sends,beforeStale);

 stage='post-reservation-context-fences';
 const anchor=await add('anchor'),agency=(await rows('SELECT agency_id FROM agency_clients WHERE company_id=?',[anchor]))[0].agency_id;
 await pool.query("INSERT INTO agency_memberships(agency_id,user_id,role) VALUES (?,?,'ADMIN')",[agency,users.admin.id]);
 for(const mode of ['disable','configuration','actor'] as const){
  const company=await add(mode,mode==='actor'?users.admin:users.owner),candidates=await observeCriticalAlerts(pool,company);let release!:()=>void,signal!:()=>void;
  const began=new Promise<void>(r=>signal=r),pending=dispatch(company,due,candidates,{budget:async()=>{signal();await new Promise<void>(r=>release=r);}});
  await began;
  if(mode==='disable')await saveNotificationPolicy(pool,users.owner,company,{kind,expectedVersion:'1',enabled:false,expectedBindingHash:null});
  if(mode==='configuration')await db.saveCompanyIntegration(company,'telegram_bot',{status:'connected',credentials:{botToken:'123:ROTATED',chatId:'-999999'}});
  if(mode==='actor')await pool.query("UPDATE agency_memberships SET role='VIEWER' WHERE agency_id=? AND user_id=?",[agency,users.admin.id]);
  const before=sends;release();assert.notEqual(await pending,'SENT');assert.equal(sends,before);
  assert.equal((await rows('SELECT COUNT(*) n FROM critical_alert_reservations WHERE company_id=?',[company]))[0].n,1);
  assert.deepEqual(await observeCriticalAlerts(pool,company),[]);
 }

 stage='lost-claim-ack';
 const lostCompany=await add('lostack'),lostCandidates=await observeCriticalAlerts(pool,lostCompany),beforeLost=sends;
 await assert.rejects(dispatch(lostCompany,due,lostCandidates,{},fault('claim-ack')));assert.equal(sends,beforeLost);
 assert.equal((await rows('SELECT COUNT(*) n FROM critical_alert_reservations WHERE company_id=?',[lostCompany]))[0].n,1);
 await pool.query("UPDATE notification_occurrences SET created_at=DATE_SUB(NOW(),INTERVAL 6 MINUTE) WHERE company_id=?",[lostCompany]);
 assert.equal(await dispatch(lostCompany,due+60000,lostCandidates),'DEFERRED');assert.equal(sends,beforeLost);
 assert.equal((await rows('SELECT status FROM notification_occurrences WHERE company_id=?',[lostCompany]))[0].status,'UNKNOWN');

 console.log('Critical alert dispatch SQL: concurrent episode/single-send, atomic reservation+occurrence rollback, false-hook rollback, unknown cross-minute dedupe, two bounded escalations, resolve/reopen, stale evidence/context fences, privacy and lost-claim recovery passed without provider calls.');
}catch(e:any){console.log(JSON.stringify({fixture:'critical-alert-dispatch',stage,code:e.code||'ASSERTION',line:e.stack?.match(/criticalAlertDispatchSql.test.ts:(\d+)/)?.[1],...(e.code==='ERR_ASSERTION'?{actual:e.actual,expected:e.expected}:{})}));process.exitCode=1;}
finally{
 for(const company of companies){for(const table of ['critical_alert_reservations','critical_alert_incidents','notification_occurrences','notification_policies','job_queue','company_integrations','autonomous_audit_logs','client_assignments','company_profiles_data','client_operations','agency_clients'])await pool.query(`DELETE FROM ${table} WHERE company_id=?`,[company]);await pool.query('DELETE FROM companies WHERE id=?',[company]);}
 for(const user of Object.values(users) as any[])await pool.query('DELETE FROM agency_memberships WHERE user_id=?',[user.id]);
 for(const user of Object.values(users) as any[]){await pool.query('DELETE FROM agencies WHERE owner_user_id=?',[user.id]);await pool.query('DELETE FROM users WHERE id=?',[user.id]);}
 await pool.end();
}
