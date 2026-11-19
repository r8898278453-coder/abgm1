import crypto from 'node:crypto';
import type {Pool,PoolConnection} from 'mysql2/promise';
import {developerKeyInput,developerVersion,developerSubscription,DEVELOPER_SCOPES} from '../shared/developerAccess';
import {crmId} from '../shared/crmIdentity';
import {CrmError,crmNext} from './crmErrors';
import {crmLocked} from './crmIdentity';
import {agencyAudit} from './agencyRoutes';
import {agencyClientAccess} from './agencyPolicy';
import {developerId} from './developerEvents';
import {developerHash,developerToken,parseDeveloperToken} from './developerCrypto';
import {canonicalJson} from '../shared/canonicalJson';
import {encryptCredential} from './db';
import {websiteImportUrl} from './websiteImportPolicy';
import {withReadOnlySqlDeadline} from './readOnlySqlDeadline';
const fail=(status:number,code:string):never=>{throw new CrmError(status,code);};
const keyDto=(r:any)=>({id:r.id,label:r.label,scopes:JSON.parse(r.scopes_json),version:String(r.revision),state:r.state,expiresAtMs:Number(r.expires_at_ms),createdAtMs:Number(r.created_at_ms)});
const subDto=(r:any)=>({id:r.id,label:r.label,url:r.endpoint_url,topic:r.topic,version:String(r.revision),state:r.state,createdAtMs:Number(r.created_at_ms)});
export async function readDeveloperSettings(pool:Pool,user:any,company:string){return withReadOnlySqlDeadline(pool,async c=>{
 const access=await agencyClientAccess(c,user,company,'manage');if(!access.authorized)fail(access.status,'DEVELOPER_ACCESS_DENIED');
 const[k]:any=await c.query("SELECT * FROM developer_api_keys WHERE company_id=? ORDER BY (state='ACTIVE' AND expires_at_ms>UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000) DESC,created_at_ms DESC,id DESC LIMIT 25",[company]);
 const[s]:any=await c.query("SELECT * FROM developer_subscriptions WHERE company_id=? ORDER BY (state='ACTIVE') DESC,created_at_ms DESC,id DESC LIMIT 25",[company]);
 return {keys:k.map(keyDto),subscriptions:s.map(subDto),webhookExecutionEnabled:process.env.DEVELOPER_WEBHOOKS_ENABLED==='true',scopes:DEVELOPER_SCOPES,topic:'crm.activity',limits:{activeKeys:5,activeSubscriptions:5,keyRequestsPerMinute:60,subscriptionAttempts:5},definition:'Read-only canonical API. CRM activity webhooks contain event metadata only; consumer deduplication is required.'};
 });}
export async function createDeveloperKey(pool:Pool,user:any,company:string,input:unknown){const p=developerKeyInput.safeParse(input);if(!p.success)fail(400,'DEVELOPER_KEY_INVALID');const v=p.data!,hash=developerHash(canonicalJson(v));return crmLocked(pool,user,company,'manage',async(c,company)=>{
 const[prior]:any=await c.query('SELECT * FROM developer_api_keys WHERE company_id=? AND request_key=?',[company,v.requestKey]);if(prior.length){if(prior[0].input_hash!==hash)fail(409,'DEVELOPER_REQUEST_CONFLICT');return {...keyDto(prior[0]),reused:true,secretUnavailable:true};}
 const[count]:any=await c.query("SELECT COUNT(*) n FROM developer_api_keys WHERE company_id=? AND state='ACTIVE' AND expires_at_ms>UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000",[company]);if(Number(count[0].n)>=5)fail(409,'DEVELOPER_KEY_LIMIT');
 const id=developerId(),secret=crypto.randomBytes(32).toString('hex'),token=developerToken(id,secret),now=Date.now(),expires=now+v.expiresInDays*86400000;
 await c.query("INSERT INTO developer_api_keys(id,company_id,actor_id,request_key,input_hash,label,scopes_json,secret_hash,revision,state,expires_at_ms,window_minute,window_used,created_at_ms) VALUES (?,?,?,?,?,?,?,?,1,'ACTIVE',?,0,0,?)",[id,company,user.id,v.requestKey,hash,v.label,JSON.stringify(v.scopes),developerHash(token),expires,now]);
 await agencyAudit(c,company,user.id,'DEVELOPER_KEY_CREATED',{keyId:id,scopes:v.scopes});return{id,label:v.label,scopes:v.scopes,version:'1',state:'ACTIVE',expiresAtMs:expires,createdAtMs:now,token,reused:false};
 });}
export async function changeDeveloperKey(pool:Pool,user:any,company:string,id:string,action:'rotate'|'revoke',input:unknown){const p=developerVersion.safeParse(input);if(!crmId.safeParse(id).success||!p.success)fail(400,'DEVELOPER_KEY_INVALID');return crmLocked(pool,user,company,'manage',async(c,company)=>{
 const[rows]:any=await c.query('SELECT * FROM developer_api_keys WHERE company_id=? AND id=? FOR UPDATE',[company,id]);const r=rows[0];if(!r)fail(404,'DEVELOPER_KEY_MISSING');if(String(r.revision)!==p.data!.expectedVersion||r.state!=='ACTIVE')fail(409,'DEVELOPER_KEY_CHANGED');
 const version=crmNext(p.data!.expectedVersion),token=action==='rotate'?developerToken(id,crypto.randomBytes(32).toString('hex')):undefined;
 await c.query('UPDATE developer_api_keys SET revision=?,state=?,secret_hash=?,actor_id=? WHERE company_id=? AND id=?',[version,action==='revoke'?'REVOKED':'ACTIVE',token?developerHash(token):developerHash(crypto.randomBytes(32).toString('hex')),user.id,company,id]);
 await agencyAudit(c,company,user.id,'DEVELOPER_KEY_'+action.toUpperCase(),{keyId:id,version});return{id,version,state:action==='revoke'?'REVOKED':'ACTIVE',...(token?{token}:{})};
 });}
/** Counts admitted valid requests atomically across processes. No fallback to browser/platform credentials. */
export async function authorizeDeveloper(pool:Pool,token:unknown,company:string,scope:typeof DEVELOPER_SCOPES[number]){
 const parsed=parseDeveloperToken(token);if(!parsed||!crmId.safeParse(company).success)fail(401,'DEVELOPER_TOKEN_INVALID');const c=await pool.getConnection();try{await c.beginTransaction();
 const[companies]:any=await c.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[company]);if(companies.length!==1)fail(401,'DEVELOPER_TOKEN_INVALID');company=companies[0].id;
 const[rows]:any=await c.query('SELECT k.*,CAST(k.revision AS CHAR) version,FLOOR(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))/60) db_minute,UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000 db_now FROM developer_api_keys k JOIN users u ON u.id=k.actor_id WHERE k.company_id=? AND k.id=? FOR UPDATE',[company,parsed!.id]);const r=rows[0];
 if(!r||r.state!=='ACTIVE'||Number(r.expires_at_ms)<=Number(r.db_now)||!crypto.timingSafeEqual(Buffer.from(r.secret_hash,'hex'),Buffer.from(parsed!.hash,'hex')))fail(401,'DEVELOPER_TOKEN_INVALID');
 let scopes:unknown;try{scopes=JSON.parse(r.scopes_json);}catch{fail(503,'DEVELOPER_SCOPES_UNAVAILABLE');}if(!Array.isArray(scopes)||scopes.some(s=>!DEVELOPER_SCOPES.includes(s))||!scopes.includes(scope))fail(403,'DEVELOPER_SCOPE_DENIED');
 const user={id:r.actor_id};const access=await agencyClientAccess(c,user,company,'read');const[active]:any=await c.query('SELECT status FROM client_operations WHERE company_id=?',[company]);if(!access.authorized||active[0]?.status!=='ACTIVE')fail(403,'DEVELOPER_ACCESS_REVOKED');
 const minute=Math.max(Number(r.window_minute),Number(r.db_minute)),used=minute===Number(r.window_minute)?Number(r.window_used):0;if(used>=60)fail(429,'DEVELOPER_RATE_LIMIT');
 await c.query('UPDATE developer_api_keys SET window_minute=?,window_used=? WHERE company_id=? AND id=?',[minute,used+1,company,r.id]);await c.commit();return{user,company,keyId:r.id,version:r.version};
 }catch(e){await c.rollback();throw e;}finally{c.release();}}
export async function currentDeveloperPermit(pool:Pool,company:string,permit:{keyId:string;version:string;user:{id:string}}){
 const[r]:any=await pool.query("SELECT id FROM developer_api_keys WHERE company_id=? AND id=? AND revision=? AND actor_id=? AND state='ACTIVE' AND expires_at_ms>UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000",[company,permit.keyId,permit.version,permit.user.id]);if(r.length!==1)fail(403,'DEVELOPER_ACCESS_REVOKED');const access=await agencyClientAccess(pool,permit.user,company,'read');const[a]:any=await pool.query('SELECT status FROM client_operations WHERE company_id=?',[company]);if(!access.authorized||a[0]?.status!=='ACTIVE')fail(403,'DEVELOPER_ACCESS_REVOKED');
}
export async function createDeveloperSubscription(pool:Pool,user:any,company:string,input:unknown){const p=developerSubscription.safeParse(input);if(!p.success)fail(400,'DEVELOPER_SUBSCRIPTION_INVALID');let url:string;try{url=websiteImportUrl(p.data!.url).href;}catch{fail(400,'DEVELOPER_ENDPOINT_INVALID');}return crmLocked(pool,user,company,'manage',async(c,company)=>{
 const inputHash=developerHash(canonicalJson(p.data));const[prior]:any=await c.query('SELECT * FROM developer_subscriptions WHERE company_id=? AND request_key=?',[company,p.data!.requestKey]);if(prior.length){if(prior[0].input_hash!==inputHash)fail(409,'DEVELOPER_REQUEST_CONFLICT');return{...subDto(prior[0]),reused:true,secretUnavailable:true};}
 const[count]:any=await c.query("SELECT COUNT(*) n FROM developer_subscriptions WHERE company_id=? AND state='ACTIVE'",[company]);if(Number(count[0].n)>=5)fail(409,'DEVELOPER_SUBSCRIPTION_LIMIT');
 const id=developerId(),secret=crypto.randomBytes(32).toString('hex'),now=Date.now(),cipher=encryptCredential(JSON.stringify({company,id,secret}));if(!cipher||cipher===JSON.stringify({company,id,secret}))fail(503,'DEVELOPER_ENCRYPTION_UNAVAILABLE');
 await c.query("INSERT INTO developer_subscriptions(id,company_id,actor_id,request_key,input_hash,label,endpoint_url,topic,secret_cipher,revision,state,created_at_ms) VALUES (?,?,?,?,?,?,?,?,?,1,'ACTIVE',?)",[id,company,user.id,p.data!.requestKey,inputHash,p.data!.label,url!,p.data!.topic,cipher,now]);await agencyAudit(c,company,user.id,'DEVELOPER_SUBSCRIPTION_CREATED',{subscriptionId:id});return{id,version:'1',state:'ACTIVE',secret};
 });}
export async function changeDeveloperSubscription(pool:Pool,user:any,company:string,id:string,action:'rotate'|'revoke',input:unknown){const p=developerVersion.safeParse(input);if(!crmId.safeParse(id).success||!p.success)fail(400,'DEVELOPER_SUBSCRIPTION_INVALID');return crmLocked(pool,user,company,'manage',async(c,company)=>{
 const[r]:any=await c.query('SELECT * FROM developer_subscriptions WHERE company_id=? AND id=? FOR UPDATE',[company,id]);if(!r[0])fail(404,'DEVELOPER_SUBSCRIPTION_MISSING');if(String(r[0].revision)!==p.data!.expectedVersion||r[0].state!=='ACTIVE')fail(409,'DEVELOPER_SUBSCRIPTION_CHANGED');
 const version=crmNext(p.data!.expectedVersion),secret=action==='rotate'?crypto.randomBytes(32).toString('hex'):undefined,cipher=secret?encryptCredential(JSON.stringify({company,id,secret})):r[0].secret_cipher;if(!cipher)fail(503,'DEVELOPER_ENCRYPTION_UNAVAILABLE');
 await c.query('UPDATE developer_subscriptions SET revision=?,state=?,actor_id=?,secret_cipher=? WHERE company_id=? AND id=?',[version,action==='revoke'?'REVOKED':'ACTIVE',user.id,cipher,company,id]);
 await c.query("UPDATE developer_deliveries SET state='CANCELLED',claim_token=NULL,result_code='SUBSCRIPTION_CHANGED',updated_at_ms=? WHERE company_id=? AND subscription_id=? AND state IN ('PENDING','RETRY','SENDING')",[Date.now(),company,id]);
 await agencyAudit(c,company,user.id,'DEVELOPER_SUBSCRIPTION_'+action.toUpperCase(),{subscriptionId:id,version});return{id,version,state:action==='revoke'?'REVOKED':'ACTIVE',...(secret?{secret}:{})};
 });}
export async function readDeveloperEvents(pool:Pool,user:any,company:string,before?:string){if(before!==undefined&&!crmId.safeParse(before).success)fail(400,'DEVELOPER_CURSOR_INVALID');return withReadOnlySqlDeadline(pool,async c=>{
 const access=await agencyClientAccess(c,user,company,'read');if(!access.authorized)fail(access.status,'DEVELOPER_ACCESS_DENIED');let cursor:any;
 if(before){const[r]:any=await c.query('SELECT created_at_ms,id FROM developer_events WHERE company_id=? AND id=?',[company,before]);if(r.length!==1)fail(409,'DEVELOPER_CURSOR_CHANGED');cursor=r[0];}
 const[r]:any=await c.query('SELECT id,event_type,created_at_ms FROM developer_events WHERE company_id=?'+(cursor?' AND (created_at_ms<? OR (created_at_ms=? AND id<?))':'')+' ORDER BY created_at_ms DESC,id DESC LIMIT 21',[company,...(cursor?[cursor.created_at_ms,cursor.created_at_ms,cursor.id]:[])]);return{events:r.slice(0,20).map((v:any)=>({id:v.id,type:v.event_type,occurredAtMs:Number(v.created_at_ms),topic:'crm.activity'})),nextBefore:r.length>20?r[19].id:null};
 });}
export async function readDeveloperDeliveries(pool:Pool,user:any,company:string,before?:string){if(before!==undefined&&!crmId.safeParse(before).success)fail(400,'DEVELOPER_CURSOR_INVALID');return withReadOnlySqlDeadline(pool,async c=>{
 const a=await agencyClientAccess(c,user,company,'manage');if(!a.authorized)fail(a.status,'DEVELOPER_ACCESS_DENIED');let cursor:any;if(before){const[r]:any=await c.query('SELECT created_at_ms,id FROM developer_deliveries WHERE company_id=? AND id=?',[company,before]);if(r.length!==1)fail(409,'DEVELOPER_CURSOR_CHANGED');cursor=r[0];}
 const[r]:any=await c.query('SELECT id,subscription_id,event_id,state,attempts,next_at_ms,http_status,result_code,created_at_ms,updated_at_ms FROM developer_deliveries WHERE company_id=?'+(cursor?' AND (created_at_ms<? OR (created_at_ms=? AND id<?))':'')+' ORDER BY created_at_ms DESC,id DESC LIMIT 21',[company,...(cursor?[cursor.created_at_ms,cursor.created_at_ms,cursor.id]:[])]);return{deliveries:r.slice(0,20),nextBefore:r.length>20?r[19].id:null};
 });}
