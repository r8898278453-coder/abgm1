import {recordNotificationDecision,type NotificationDecision} from './notificationDecisionReporting';
import {OPERATIONAL_LIMITS} from '../shared/operationalCapacity';
import {createHash,randomUUID} from 'node:crypto';
import type {Pool} from 'mysql2/promise';
import {latestNotificationDue,type NotificationKind} from './notificationOccurrences';
import {resolveNotificationDispatchContext} from './notificationPolicies';
import {agencyAudit} from './agencyRoutes';
import {admitClientAction} from './clientPolicy';
import {isGlobalEmergencyStopActive} from './executionStop';
import {withReadOnlySqlDeadline} from './readOnlySqlDeadline';
import type {TelegramAttempt} from './tenantNotifications';
type SendContext={policyVersion:string;claimToken:string};
type Dependencies={send:(bindingHash:string,actor:any,context:SendContext)=>Promise<TelegramAttempt>;canStart?:()=>boolean;budget?:(actor:any)=>Promise<unknown>;admit?:(sql:any,context:SendContext)=>Promise<boolean>};
const dueSql=(due:number)=>new Date(due).toISOString().slice(0,19).replace('T',' ');
async function clock(sql:any){const [r]:any=await sql.query('SELECT UNIX_TIMESTAMP()*1000 now_ms');const n=Number(r[0].now_ms);if(!Number.isSafeInteger(n))throw new Error('NOTIFICATION_CLOCK_INVALID');return n;}
function input(company:string,kind:NotificationKind,due:number,message:string){if(!company||company.length>64||!['daily_digest','review_reminder','critical_alert'].includes(kind)||!Number.isSafeInteger(due)||due<0||due>8640000000000000||latestNotificationDue(kind,due)!==due||typeof message!=='string'||!message.trim()||message.length>4096)throw new Error('INVALID_NOTIFICATION_OCCURRENCE');}
async function settle(pool:Pool,company:string,kind:NotificationKind,due:string,token:string,state:'SENT'|'UNKNOWN',providerId:string|null,reason:string|null){
 const c=await pool.getConnection();try{await c.beginTransaction();await c.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[company]);const [r]:any=await c.query("UPDATE notification_occurrences SET status=?,provider_id=?,reason_code=? WHERE company_id=? AND notification_kind=? AND due_at=? AND claim_token=? AND status='RUNNING'",[state,providerId,reason,company,kind,due,token]);if(r.affectedRows!==1){await c.commit();return false;}await agencyAudit(c,company,'scheduled-notification-worker','NOTIFICATION_'+(state==='SENT'?'API_ACCEPTED':'UNKNOWN'),{kind,dueAt:due,reason});await c.commit();return true;}catch(e){await c.rollback();throw e;}finally{c.release();}
}
/** Final adapter guard: no cached actor, credentials or policy can authorize provider I/O. */
export async function scheduledNotificationCanSend(pool:Pool,company:string,kind:NotificationKind,dueAt:number,context:SendContext,bindingHash:string){if(isGlobalEmergencyStopActive())return false;return withReadOnlySqlDeadline(pool,async sql=>{const current=await resolveNotificationDispatchContext(sql,company,kind,dueAt,await clock(sql));if(!current||current.policy.version!==context.policyVersion||current.binding.hash!==bindingHash)return false;const [r]:any=await sql.query("SELECT claim_token FROM notification_occurrences WHERE company_id=? AND notification_kind=? AND due_at=? AND status='RUNNING' AND claim_token=? AND policy_revision=? AND binding_hash=?",[company,kind,dueSql(dueAt),context.claimToken,context.policyVersion,bindingHash]);return r.length===1;});}
/** Durable at-most-once boundary; an ambiguous provider or storage outcome is never retried. */
export async function runBoundNotificationOccurrence(pool:Pool,company:string,kind:NotificationKind,dueAt:number,message:string,deps:Dependencies):Promise<'SENT'|'UNKNOWN'|'EXISTING'|'DEFERRED'>{
 input(company,kind,dueAt,message);if(kind==='critical_alert'&&typeof deps.admit!=='function')throw new Error('CRITICAL_ALERT_RESERVATION_REQUIRED');const canStart=deps.canStart||(()=>true);if(!canStart()||isGlobalEmergencyStopActive())return'DEFERRED';const due=dueSql(dueAt),token=randomUUID(),contentHash=createHash('sha256').update(message).digest('hex');let plan:NonNullable<Awaited<ReturnType<typeof resolveNotificationDispatchContext>>>;
 const c=await pool.getConnection();try{await c.beginTransaction();const [companies]:any=await c.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[company]);if(companies.length!==1||companies[0].id!==company){await c.commit();return'DEFERRED';}
  // Stale pre-I/O claims remain unknown; no slot is deleted or reopened.
  const [stale]:any=await c.query("UPDATE notification_occurrences SET status='UNKNOWN',reason_code='STALE_BOUNDARY' WHERE company_id=? AND notification_kind=? AND status='RUNNING' AND created_at<DATE_SUB(NOW(),INTERVAL 5 MINUTE) LIMIT 100",[company,kind]);if(stale.affectedRows)await agencyAudit(c,company,'scheduled-notification-recovery','NOTIFICATION_STALE_RECOVERED',{kind,count:stale.affectedRows});
  const [old]:any=await c.query('SELECT status FROM notification_occurrences WHERE company_id=? AND notification_kind=? AND due_at=?',[company,kind,due]);if(old.length){await c.commit();return'EXISTING';}
  const observedAt=await clock(c);
  const defer=async(reason:NotificationDecision)=>{
   await recordNotificationDecision(c,company,kind,reason,observedAt);
   await c.commit();
   return 'DEFERRED' as const;
  };
  const current=await resolveNotificationDispatchContext(c,company,kind,dueAt,observedAt);
  if(!current)return await defer('ContextUnavailable');
  if(!canStart()||isGlobalEmergencyStopActive())return await defer('ControlChanged');
  const [limits]:any=await c.query("SELECT COUNT(*) retained,COUNT(CASE WHEN status='RUNNING' THEN 1 END) running FROM notification_occurrences WHERE company_id=? AND notification_kind=?",[company,kind]);if(Number(limits[0].retained)>=OPERATIONAL_LIMITS.retainedRows)return await defer('RetainedLimit');
  if(Number(limits[0].running)>0)return await defer('RunningLimit');
  plan=current;
  if(deps.admit){await c.query('SAVEPOINT notification_admission');if(!await deps.admit(c,{policyVersion:current.policy.version,claimToken:token})){await c.query('ROLLBACK TO SAVEPOINT notification_admission');return await defer('ReservationDeclined');}}
  await c.query("INSERT INTO notification_occurrences(company_id,notification_kind,due_at,status,claim_token,actor_id,policy_revision,binding_hash,content_hash) VALUES (?,?,?,'RUNNING',?,?,?,?,?)",[company,kind,due,token,current.actor.id,current.policy.version,current.binding.hash,contentHash]);await agencyAudit(c,company,current.actor.id,'NOTIFICATION_BOUNDARY_RECORDED',{kind,dueAt:due,policyVersion:current.policy.version,contentHash});await c.commit();
 }catch(e){await c.rollback();throw e;}finally{c.release();}
 try{await(deps.budget||(()=>admitClientAction(pool,company,'MESSAGE','scheduled-notification:'+kind+':'+dueAt)))(plan!.actor);}catch{try{await settle(pool,company,kind,due,token,'UNKNOWN',null,'CLIENT_BUDGET_OR_POLICY');}catch{}return'UNKNOWN';}
 const context={policyVersion:plan!.policy.version,claimToken:token};let result:TelegramAttempt;
 try{if(!canStart()||!await scheduledNotificationCanSend(pool,company,kind,dueAt,context,plan!.binding.hash))result={state:'PAUSED',providerId:null,reason:'POLICY_OR_CONTEXT_CHANGED'};else result=await deps.send(plan!.binding.hash,plan!.actor,context);}catch{result={state:'UNKNOWN',providerId:null,reason:'PROVIDER_OUTCOME_UNCONFIRMED'};}
 const accepted=result?.state==='API_ACCEPTED'&&typeof result.providerId==='string'&&/^[1-9][0-9]{0,31}$/.test(result.providerId)&&result.reason===null;const reason=accepted?null:result?.state==='PAUSED'&&/^[A-Z0-9_]{1,64}$/.test(result.reason)?result.reason:'PROVIDER_ACK_UNCONFIRMED';
 try{if(await settle(pool,company,kind,due,token,accepted?'SENT':'UNKNOWN',accepted?result.providerId:null,reason))return accepted?'SENT':'UNKNOWN';}catch{/* A commit acknowledgement can be lost. Reconcile exact token, never call send again. */}
 const [known]:any=await pool.query("SELECT status,provider_id FROM notification_occurrences WHERE company_id=? AND notification_kind=? AND due_at=? AND claim_token=?",[company,kind,due,token]);return known.length===1&&known[0].status==='SENT'&&/^[1-9][0-9]{0,31}$/.test(known[0].provider_id)?'SENT':'UNKNOWN';
}
