import crypto from 'node:crypto';
import type {Pool} from 'mysql2/promise';
import {crmLocked} from './crmIdentity';
import {CrmError} from './crmErrors';
import {crmId} from '../shared/crmIdentity';
import {agencyAudit} from './agencyRoutes';
import {agencyClientAccess} from './agencyPolicy';
import {decryptCredential} from './db';
import {developerReplay,DEVELOPER_EVENT_TYPES} from '../shared/developerAccess';
import {developerId} from './developerEvents';
import {canonicalJson} from '../shared/canonicalJson';
import {signDeveloperWebhook} from './developerCrypto';
import {postDeveloperWebhook} from './developerWebhookTransport';
import {isGlobalEmergencyStopActive} from './executionStop';
const LEASE=120000,MAX_ATTEMPTS=5;
const executionEnabled=()=>process.env.DEVELOPER_WEBHOOKS_ENABLED==='true'&&!isGlobalEmergencyStopActive();
export async function replayDeveloperEvent(pool:Pool,user:any,company:string,subscription:string,input:unknown){const p=developerReplay.safeParse(input);if(!p.success||!crmId.safeParse(subscription).success)throw new CrmError(400,'DEVELOPER_REPLAY_INVALID');return crmLocked(pool,user,company,'manage',async(c,company)=>{
 const[s]:any=await c.query("SELECT revision FROM developer_subscriptions WHERE company_id=? AND id=? AND state='ACTIVE'",[company,subscription]);const[e]:any=await c.query('SELECT id FROM developer_events WHERE company_id=? AND id=?',[company,p.data!.eventId]);if(s.length!==1||e.length!==1)throw new CrmError(404,'DEVELOPER_REPLAY_SOURCE_MISSING');
 const[prior]:any=await c.query('SELECT id,state FROM developer_deliveries WHERE company_id=? AND subscription_id=? AND event_id=? AND subscription_revision=?',[company,subscription,p.data!.eventId,s[0].revision]);if(prior.length)return{...prior[0],reused:true};
 const id=developerId(),now=Date.now();await c.query("INSERT INTO developer_deliveries(id,company_id,subscription_id,event_id,subscription_revision,state,attempts,next_at_ms,created_at_ms,updated_at_ms) VALUES (?,?,?,?,?,'PENDING',0,?,?,?)",[id,company,subscription,p.data!.eventId,s[0].revision,now,now,now]);await agencyAudit(c,company,user.id,'DEVELOPER_EVENT_REPLAY_QUEUED',{deliveryId:id,eventId:p.data!.eventId});return{id,state:'PENDING',reused:false};
 });}
/** One explicit, durable delivery attempt. No autonomous sender or shared retry loop; callers drain bounded IDs. */
export async function deliverDeveloperWebhook(pool:Pool,user:any,company:string,id:string,deps:{enabled?:()=>boolean;send?:typeof postDeveloperWebhook}={}){
 if(!crmId.safeParse(id).success)throw new CrmError(400,'DEVELOPER_DELIVERY_INVALID');const enabled=deps.enabled||executionEnabled;if(!enabled())throw new CrmError(409,'DEVELOPER_WEBHOOKS_DISABLED');
 const claim=await crmLocked(pool,user,company,'manage',async(c,company)=>{
 const[rows]:any=await c.query(`SELECT d.*,s.endpoint_url,s.secret_cipher,s.actor_id,s.state subscription_state,s.revision current_revision,e.event_type,e.created_at_ms event_time,UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000 db_now
 FROM developer_deliveries d JOIN developer_subscriptions s ON s.id=d.subscription_id AND s.company_id=d.company_id JOIN developer_events e ON e.id=d.event_id AND e.company_id=d.company_id WHERE d.company_id=? AND d.id=? FOR UPDATE`,[company,id]);const r=rows[0];if(!r)throw new CrmError(404,'DEVELOPER_DELIVERY_MISSING');
 if(['ACKNOWLEDGED','CANCELLED','DEAD'].includes(r.state))return{terminal:true,id,state:r.state};
 const now=Math.floor(Number(r.db_now));if(r.state==='SENDING'&&Number(r.claim_started_at_ms)>now-LEASE)throw new CrmError(409,'DEVELOPER_DELIVERY_BUSY');if(Number(r.next_at_ms)>now)throw new CrmError(409,'DEVELOPER_RETRY_NOT_DUE');
 const actor=await agencyClientAccess(c,{id:r.actor_id},company,'manage');const[exists]:any=await c.query('SELECT id FROM users WHERE id=?',[r.actor_id]);
 if(!actor.authorized||exists.length!==1||r.subscription_state!=='ACTIVE'||String(r.current_revision)!==String(r.subscription_revision)||!DEVELOPER_EVENT_TYPES.has(r.event_type)||now-Number(r.created_at_ms)>7*86400000||Number(r.attempts)>=MAX_ATTEMPTS){await c.query("UPDATE developer_deliveries SET state='DEAD',claim_token=NULL,result_code='DELIVERY_GATE_CLOSED',updated_at_ms=? WHERE company_id=? AND id=?",[now,company,id]);return{terminal:true,id,state:'DEAD'};}
 let decoded:any;try{if(!String(r.secret_cipher).startsWith('enc:v1:'))throw Error('encrypted secret required');decoded=JSON.parse(decryptCredential(r.secret_cipher));}catch{}if(decoded?.company!==company||decoded?.id!==r.subscription_id||!/^[a-f0-9]{64}$/.test(decoded?.secret||''))throw new CrmError(503,'DEVELOPER_SECRET_UNAVAILABLE');
 const token=crypto.randomBytes(32).toString('hex');await c.query("UPDATE developer_deliveries SET state='SENDING',attempts=attempts+1,claim_token=?,claim_started_at_ms=?,updated_at_ms=?,http_status=NULL,result_code=NULL WHERE company_id=? AND id=?",[token,now,now,company,id]);
 await agencyAudit(c,company,user.id,'DEVELOPER_DELIVERY_CLAIMED',{deliveryId:id,attempt:Number(r.attempts)+1});return{...r,terminal:false,token,secret:decoded.secret,attempt:Number(r.attempts)+1};
 });
 if(claim.terminal)return claim;
 const c:any=claim;
 // Fresh permit immediately before transport; an already admitted HTTPS request cannot be recalled.
 await crmLocked(pool,user,company,'manage',async(sql,company)=>{const[r]:any=await sql.query("SELECT d.id,s.actor_id FROM developer_deliveries d JOIN developer_subscriptions s ON s.id=d.subscription_id AND s.company_id=d.company_id WHERE d.company_id=? AND d.id=? AND d.state='SENDING' AND d.claim_token=? AND d.claim_started_at_ms>UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000-? AND s.state='ACTIVE' AND s.revision=d.subscription_revision",[company,id,c.token,LEASE]);if(r.length!==1||!enabled()||!(await agencyClientAccess(sql,{id:r[0].actor_id},company,'manage')).authorized)throw new CrmError(409,'DEVELOPER_DELIVERY_CHANGED');});
 const timestamp=String(Date.now()),body=canonicalJson({version:1,topic:'crm.activity',companyId:company,event:{id:c.event_id,type:c.event_type,occurredAtMs:Number(c.event_time)}}),headers={'X-ABGM-Timestamp':timestamp,'X-ABGM-Delivery':id,'X-ABGM-Signature':signDeveloperWebhook(c.secret,timestamp,id,body),'X-ABGM-Event':c.event_id};
 let status:number|null=null;try{status=await(deps.send||postDeveloperWebhook)(c.endpoint_url,headers,body);}catch{/* Ambiguous HTTP result retries the same event; consumer MUST deduplicate. */}
 const accepted=status!==null&&status>=200&&status<300;
 // Settle admitted attempt using its fence even if actor permissions were removed during network I/O.
 const sql=await pool.getConnection();try{await sql.beginTransaction();await sql.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[company]);const[r]:any=await sql.query("SELECT id FROM developer_deliveries WHERE company_id=? AND id=? AND state='SENDING' AND claim_token=? FOR UPDATE",[company,id,c.token]);if(r.length!==1){await sql.commit();return{id,state:'CHANGED',acknowledged:false};}
 const state=accepted?'ACKNOWLEDGED':c.attempt>=MAX_ATTEMPTS?'DEAD':'RETRY',now=Date.now(),next=now+Math.min(3600000,60000*2**(c.attempt-1));await sql.query('UPDATE developer_deliveries SET state=?,claim_token=NULL,http_status=?,result_code=?,next_at_ms=?,updated_at_ms=? WHERE company_id=? AND id=?',[state,status,accepted?'HTTP_ACKNOWLEDGED':status?'HTTP_NOT_ACKNOWLEDGED':'TRANSPORT_UNCONFIRMED',next,now,company,id]);await agencyAudit(sql,company,user.id,'DEVELOPER_DELIVERY_SETTLED',{deliveryId:id,state});await sql.commit();return{id,state,acknowledged:accepted};
 }catch(e){await sql.rollback();throw e;}finally{sql.release();}
}
/** Existing scheduler budget; at most one due delivery per client and five clients per tick. */
export async function runDeveloperWebhookBatch(pool:Pool,canStart:()=>boolean=()=>true,deps:Parameters<typeof deliverDeveloperWebhook>[4]={}){
 const enabled=deps.enabled||executionEnabled,summary={webhooksEnabled:enabled(),webhooksChecked:0,webhooksAcknowledged:0,webhooksDeferred:0,webhooksFailed:0};if(!summary.webhooksEnabled||!canStart())return summary;
 const[clients]:any=await pool.query(`SELECT d.company_id,c.user_id,MIN(d.next_at_ms) due FROM developer_deliveries d JOIN companies c ON c.id=d.company_id JOIN users u ON u.id=c.user_id JOIN client_operations o ON o.company_id=d.company_id AND o.status='ACTIVE'
 WHERE (d.state IN ('PENDING','RETRY') AND d.next_at_ms<=UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000) OR (d.state='SENDING' AND d.claim_started_at_ms<=UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000-120000) GROUP BY d.company_id,c.user_id ORDER BY due,d.company_id LIMIT 5`);
 for(const client of clients){if(!canStart()||!enabled()){summary.webhooksDeferred+=clients.length-summary.webhooksChecked;break;}const[r]:any=await pool.query("SELECT id FROM developer_deliveries WHERE company_id=? AND ((state IN ('PENDING','RETRY') AND next_at_ms<=UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000) OR (state='SENDING' AND claim_started_at_ms<=UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000-120000)) ORDER BY next_at_ms,id LIMIT 1",[client.company_id]);if(!r.length)continue;summary.webhooksChecked++;
 try{const result=await deliverDeveloperWebhook(pool,{id:client.user_id},client.company_id,r[0].id,deps);if(result.state==='ACKNOWLEDGED')summary.webhooksAcknowledged++;else if(['CANCELLED','CHANGED'].includes(result.state))summary.webhooksDeferred++;else summary.webhooksFailed++;}
 catch(e){if(e instanceof CrmError&&[403,409].includes(e.status))summary.webhooksDeferred++;else summary.webhooksFailed++;}
 }return summary;
}
