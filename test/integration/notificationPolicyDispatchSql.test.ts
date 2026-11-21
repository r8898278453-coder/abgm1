import {sendScheduledNotification} from '../../server/scheduledNotifications';
import {NOTIFICATION_DECISION_ACTIVITY} from '../../shared/notificationDecisionReporting';
import {recordNotificationDecision} from '../../server/notificationDecisionReporting';
import {readDailyWorkReport} from '../../server/dailyWorkReport';
import {platformDateKey,platformDayBounds} from '../../shared/dailyWorkReport';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {latestNotificationDue} from '../../server/notificationOccurrences';
import {runBoundNotificationOccurrence} from '../../server/boundNotificationOccurrences';
import {saveNotificationPolicy} from '../../server/notificationPolicies';
import {telegramTransportBinding,type TelegramAttempt} from '../../server/tenantNotifications';
if(process.env.ABGM1_LOCAL_SQL_TESTS!=='1'||process.env.DB_HOST!=='127.0.0.1'||!process.env.DB_NAME?.startsWith('abgm1_test_')||!process.env.LOCAL_SQL_CONTAINER_ID)throw new Error('Disposable SQL required');
const db=await import('../../server/db'),pool=await db.getDbPool();assert.ok(pool);
const prefix='npd_'+crypto.randomBytes(5).toString('hex'),companies:string[]=[],users:any={};let stage='setup',sends=0;
const rows=async(sql:string,args:any[]=[])=>{const [r]:any=await pool.query(sql,args);return r;};
const kind='review_reminder' as const;let due=0;
const runBound:typeof runBoundNotificationOccurrence=(p,c,k,d,m,deps)=>runBoundNotificationOccurrence(p,c,k,d,m,{budget:async()=>{},...deps});
const binding=async(company:string)=>{const b=telegramTransportBinding(company,await db.getCompanyIntegration(company,'telegram_bot'));assert.ok(b);return b;};
const add=async(label:string,actor=users.owner,enable=true)=>{const company=prefix+'_'+label;companies.push(company);await db.createCompany({id:company,user_id:users.owner.id,name:'Fixture',category:'Services',city:'Pune'});await db.saveCompanyIntegration(company,'telegram_bot',{status:'connected',credentials:{botToken:'123:PRIVATE_TOKEN',chatId:'-123456789'}});if(enable){await saveNotificationPolicy(pool,actor,company,{kind,expectedVersion:'0',enabled:true,expectedBindingHash:(await binding(company)).hash});await pool.query('UPDATE notification_policies SET first_due_ms=? WHERE company_id=? AND notification_kind=?',[due,company,kind]);}return company;};
const accepted=(company:string)=>async(hash:string,actor:any):Promise<TelegramAttempt>=>{assert.equal(hash,(await binding(company)).hash);assert.equal(actor.id,users.owner.id);const pending=await rows('SELECT status FROM notification_occurrences WHERE company_id=? AND notification_kind=?',[company,kind]);assert.equal(pending.length,1);assert.equal(pending[0].status,'RUNNING');sends++;return{state:'API_ACCEPTED',providerId:'77',reason:null};};
const fault=(mode:'claim-ack'|'settle-ack'|'settle-audit')=>new Proxy(pool!,{get(t,k){if(k==='getConnection')return async()=>{const c=await t.getConnection();let claim=false,settlement=false;return new Proxy(c,{get(c,k){if(k==='commit')return async()=>{await c.commit();if(mode==='claim-ack'&&claim||mode==='settle-ack'&&settlement)throw new Error('fixture lost acknowledgement');};if(k==='query')return async(sql:string,args:any[])=>{if(sql.startsWith('INSERT INTO notification_occurrences'))claim=true;if(sql.startsWith('UPDATE notification_occurrences SET status=?,provider_id='))settlement=true;if(mode==='settle-audit'&&settlement&&sql.startsWith('INSERT INTO autonomous_audit_logs'))throw new Error('fixture settlement rollback');return c.query(sql,args);};const v=Reflect.get(c,k);return typeof v==='function'?v.bind(c):v;}});};const v=Reflect.get(t,k);return typeof v==='function'?v.bind(t):v;}});

try{
 assert.equal((await rows('SELECT @@hostname hostname'))[0].hostname,process.env.LOCAL_SQL_CONTAINER_ID);for(const role of ['owner','admin']){const id=prefix+'_'+role;await pool.query("INSERT INTO users(id,email,password_hash,salt,full_name) VALUES (?,?,'fixture','fixture','Fixture')",[id,id+'@example.invalid']);users[role]=await db.findUserById(id);}due=latestNotificationDue(kind,Number((await rows('SELECT UNIX_TIMESTAMP()*1000 now_ms'))[0].now_ms));
 stage='default-off';const off=await add('off',users.owner,false);assert.equal(await runBound(pool,off,kind,due,'private report',{send:accepted(off)}),'DEFERRED');assert.equal((await rows('SELECT COUNT(*) n FROM notification_occurrences WHERE company_id=?',[off]))[0].n,0);assert.equal(sends,0);
 for(let replay=0;replay<8;replay++)assert.equal(await runBound(pool,off,kind,due,'private report',{send:accepted(off)}),'DEFERRED');
 assert.equal((await readDailyWorkReport(pool,off,platformDateKey())).activity.reviewContextUnavailable,1);
 const observedDay='2026-11-03',observed=platformDayBounds(observedDay);
 const evidence=await pool.getConnection();
 try{
  for(const decisionKind of ['daily_digest','review_reminder','critical_alert'] as const){
   for(const decision of ['ContextUnavailable','ControlChanged','RetainedLimit','RunningLimit','ReservationDeclined'] as const){
    await recordNotificationDecision(evidence,off,decisionKind,decision,observed.start);
    await recordNotificationDecision(evidence,off,decisionKind,decision,observed.end-1000);
   }
  }
  for(const decisionKind of ['daily_digest','review_reminder','critical_alert'] as const){
   await recordNotificationDecision(evidence,off,decisionKind,'PreparationFailed',observed.start);
   await recordNotificationDecision(evidence,off,decisionKind,'InvalidMessage',observed.start);
  }
  await recordNotificationDecision(evidence,off,'daily_digest','CompactSummary',observed.start);
  await recordNotificationDecision(evidence,off,'review_reminder','NoEligibleReviews',observed.start);
  await recordNotificationDecision(evidence,off,'critical_alert','NoCandidates',observed.start);
  await recordNotificationDecision(evidence,off,'critical_alert','PrecheckUnavailable',observed.start);
  await recordNotificationDecision(evidence,off,'daily_digest','ContextUnavailable',observed.end);
 }finally{evidence.release();}
 const observation=(await readDailyWorkReport(pool,off,observedDay)).activity;
 for(const metric of Object.keys(NOTIFICATION_DECISION_ACTIVITY))assert.equal(observation[metric as keyof typeof observation],1,metric);
 assert.equal((await readDailyWorkReport(pool,off,platformDateKey(observed.end))).activity.digestContextUnavailable,1);
 assert.equal((await readDailyWorkReport(pool,prefix+'_empty',observedDay)).activity.digestContextUnavailable,0);
 const storedDecisions=await rows("SELECT details FROM autonomous_audit_logs WHERE company_id=? AND event_type LIKE 'NOTIFICATION_PRECLAIM_%'",[off]);
 assert.ok(storedDecisions.length>=16);
 assert.ok(storedDecisions.every((row:any)=>row.details==='{}'));
 assert.equal(await sendScheduledNotification(off,kind,due,'x'.repeat(4097)),false);
 assert.equal((await readDailyWorkReport(pool,off,platformDateKey())).activity.reviewInvalidMessage,1);
 assert.equal((await rows('SELECT COUNT(*) n FROM notification_occurrences WHERE company_id=?',[off]))[0].n,0);
 console.log('Notification decision SQL: 25 metrics, actual scheduler refusal, daily dedupe, IST bounds, tenant scope and private evidence passed.');

 stage='future-start';await saveNotificationPolicy(pool,users.owner,off,{kind,expectedVersion:'0',enabled:true,expectedBindingHash:(await binding(off)).hash});assert.equal(await runBound(pool,off,kind,due,'private report',{send:accepted(off)}),'DEFERRED');assert.equal(sends,0);
 stage='concurrent';const a=await add('race'),message='BOUND_PRIVATE_REPORT_CONTENT';const race=await Promise.all(Array.from({length:8},()=>runBound(pool,a,kind,due,message,{send:accepted(a)})));assert.equal(race.filter(r=>r==='SENT').length,1);assert.equal(sends,1);const journal=(await rows('SELECT * FROM notification_occurrences WHERE company_id=?',[a]))[0];assert.equal(journal.status,'SENT');assert.equal(journal.content_hash,crypto.createHash('sha256').update(message).digest('hex'));assert.equal(JSON.stringify(journal).includes(message),false);assert.equal(JSON.stringify(journal).includes('PRIVATE_TOKEN'),false);assert.equal(JSON.stringify(journal).includes('-123456789'),false);
 assert.equal(await runBound(pool,a,kind,due,'changed content',{send:accepted(a)}),'EXISTING');await db.saveCompanyIntegration(a,'telegram_bot',{status:'connected',credentials:{botToken:'123:ROTATED',chatId:'-987654321'}});assert.equal(await runBound(pool,a,kind,due,'changed destination',{send:accepted(a)}),'EXISTING');assert.equal(sends,1);
 stage='unknown';const unknown=await add('unknown');assert.equal(await runBound(pool,unknown,kind,due,'unknown',{send:async()=>{sends++;return{state:'UNKNOWN',providerId:null,reason:'PROVIDER_OUTCOME_UNCONFIRMED'};}}),'UNKNOWN');const before=sends;assert.equal(await runBound(pool,unknown,kind,due,'changed after unknown',{send:accepted(unknown)}),'EXISTING');assert.equal(sends,before);
 stage='strict-ack';for(const [label,result]of [['paused',{state:'PAUSED',providerId:null,reason:'DESTINATION_CHANGED'}],['badid',{state:'API_ACCEPTED',providerId:'',reason:null}],['throw',null]] as const){const company=await add(label);const outcome=await runBound(pool,company,kind,due,label,{send:async()=>{sends++;if(!result)throw new Error('PRIVATE_PROVIDER_ERROR');return result as any;}});assert.notEqual(outcome,'SENT');assert.equal(await runBound(pool,company,kind,due,label,{send:accepted(company)}),'EXISTING');}
 stage='due-window';const window=await add('window');const beforeWindow=sends;assert.equal(await runBound(pool,window,kind,due+3600000,'future',{send:accepted(window)}),'DEFERRED');await pool.query('UPDATE notification_policies SET first_due_ms=? WHERE company_id=?',[due-30*3600000,window]);assert.equal(await runBound(pool,window,kind,due-25*3600000,'expired',{send:accepted(window)}),'DEFERRED');assert.equal(sends,beforeWindow);
 stage='budget';const budget=await add('budget'),beforeBudget=sends;assert.equal(await runBound(pool,budget,kind,due,'budget',{budget:async()=>{throw new Error('budget unavailable');},send:accepted(budget)}),'UNKNOWN');assert.equal(sends,beforeBudget);
 stage='disable-before-boundary';const disabled=await add('disabled');let release!:()=>void,signal!:()=>void;const started=new Promise<void>(r=>signal=r),waiting=runBound(pool,disabled,kind,due,'disable race',{budget:async()=>{signal();await new Promise<void>(r=>release=r);},send:accepted(disabled)});await started;await saveNotificationPolicy(pool,users.owner,disabled,{kind,expectedVersion:'1',enabled:false,expectedBindingHash:(await binding(disabled)).hash});const beforeDisable=sends;release();assert.notEqual(await waiting,'SENT');assert.equal(sends,beforeDisable);
 stage='config-before-boundary';const changed=await add('changed');const configStarted=new Promise<void>(r=>signal=r),configWaiting=runBound(pool,changed,kind,due,'config race',{budget:async()=>{signal();await new Promise<void>(r=>release=r);},send:accepted(changed)});await configStarted;await db.saveCompanyIntegration(changed,'telegram_bot',{status:'connected',credentials:{botToken:'123:CHANGED',chatId:'-999'}});const beforeConfig=sends;release();assert.notEqual(await configWaiting,'SENT');assert.equal(sends,beforeConfig);
 stage='role-before-boundary';const adminCompany=await add('adminbase');const agency=(await rows('SELECT agency_id FROM agency_clients WHERE company_id=?',[adminCompany]))[0].agency_id;await pool.query("INSERT INTO agency_memberships(agency_id,user_id,role) VALUES (?,?,'ADMIN')",[agency,users.admin.id]);const revoked=await add('revoked',users.admin);const roleStarted=new Promise<void>(r=>signal=r),roleWaiting=runBound(pool,revoked,kind,due,'role race',{budget:async()=>{signal();await new Promise<void>(r=>release=r);},send:async()=>{sends++;throw new Error('Revoked actor must not reach provider');}});await roleStarted;await pool.query("UPDATE agency_memberships SET role='VIEWER' WHERE agency_id=? AND user_id=?",[agency,users.admin.id]);const beforeRole=sends;release();assert.notEqual(await roleWaiting,'SENT');assert.equal(sends,beforeRole);
 stage='settlement-faults';for(const mode of ['claim-ack','settle-ack','settle-audit'] as const){const company=await add(mode),prior=sends;const outcome=await runBound(fault(mode),company,kind,due,'fault '+mode,{send:accepted(company)}).catch(()=> 'UNKNOWN');assert.equal(outcome,mode==='settle-ack'?'SENT':'UNKNOWN');assert.equal(sends-prior,mode.startsWith('settle')?1:0);const after=sends;assert.equal(await runBound(pool,company,kind,due,'retry '+mode,{send:accepted(company)}),'EXISTING');assert.equal(sends,after);}
 console.log('Bound notifications SQL: default-off/future-start,8-way single send with durable RUNNING boundary, exact hash/private metadata, unknown no-resend, strict ACK, due window/budget guards, disable/config/role races and claim/boundary/settlement fault fences passed without provider calls.');
}catch(e:any){console.log(JSON.stringify({fixture:'notification-policy-dispatch',stage,code:e.code||'ASSERTION',line:e.stack?.match(/notificationPolicyDispatchSql.test.ts:(\d+)/)?.[1],...(e.code==='ERR_ASSERTION'?{actual:e.actual,expected:e.expected}:{})}));process.exitCode=1;}finally{for(const c of companies){for(const t of ['notification_occurrences','notification_policies','company_integrations','autonomous_audit_logs','client_assignments','company_profiles_data','client_operations','agency_clients'])await pool.query(`DELETE FROM ${t} WHERE company_id=?`,[c]);await pool.query('DELETE FROM companies WHERE id=?',[c]);}for(const u of Object.values(users) as any[])await pool.query('DELETE FROM agency_memberships WHERE user_id=?',[u.id]);for(const u of Object.values(users) as any[]){await pool.query('DELETE FROM agencies WHERE owner_user_id=?',[u.id]);await pool.query('DELETE FROM users WHERE id=?',[u.id]);}await pool.end();}
