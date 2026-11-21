import {randomBytes} from 'node:crypto';
import type {Pool} from 'mysql2/promise';
import {decryptCredential,encryptCredential} from './db';
import {salesHash} from './salesWorkspace';
import {canonicalJson} from '../shared/canonicalJson';
import {readEmailWebhookSecret,EmailReceiptError} from './salesEmailReceipts';
import {parseSalesEmailReply,recordSalesEmailReply,findSalesEmailReplyTarget,tenantEmailRepliesEnabled,type SalesEmailReply} from './salesEmailReplies';
import {isGlobalEmergencyStopActive} from './executionStop';
import {withReadOnlySqlDeadline,type ReadOnlySql} from './readOnlySqlDeadline';
import {emailIntakePage} from '../shared/salesEmailReplyIntakes';

const clock='UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000';
const ttlMs=24*60*60*1000;
const leaseMs=60000;
const maxAttempts=6;
const maxActive=100;
const openStates="('PENDING','RUNNING')";
export const tenantEmailReplyRecoveryEnabled=()=>tenantEmailRepliesEnabled()&&process.env.ENABLE_TENANT_EMAIL_REPLY_RECOVERY==='true';
const identity=(company:string,providerId:string)=>salesHash('email-reply-intake:'+company+':'+providerId);
const fingerprint=(reply:SalesEmailReply)=>salesHash(canonicalJson([reply.providerId,reply.from,reply.to]));
type Intake={id:string;company_id:string;state:string;input_hash:string;secret_hash:string;payload_cipher:string|null;attempts:number|string};

export async function admitSalesEmailReply(pool:Pool,company:string,reply:SalesEmailReply,secret:string){
 const id=identity(company,reply.providerId),inputHash=fingerprint(reply);
 const sql=await pool.getConnection();
 try{
  await sql.beginTransaction();
  const [[scope]]:any=await sql.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[company]);
  if(scope?.id!==company)throw new EmailReceiptError(404,'EMAIL_REPLY_SCOPE_INVALID');
  if(!tenantEmailReplyRecoveryEnabled())throw new EmailReceiptError(503,'EMAIL_REPLY_RECOVERY_UNAVAILABLE');
  if(await readEmailWebhookSecret(sql,company,true)!==secret)throw new EmailReceiptError(409,'EMAIL_WEBHOOK_SECRET_CHANGED');
  const [[existing]]:any=await sql.query('SELECT state,input_hash FROM sales_email_reply_intakes WHERE id=? AND company_id=?',[id,company]);
  if(existing){
   if(existing.input_hash!==inputHash)throw new EmailReceiptError(409,'EMAIL_REPLY_CONFLICT');
   await sql.commit();
   return 'duplicate';
  }
  if(!await findSalesEmailReplyTarget(sql,company,reply,true)){
   await sql.commit();
   return 'ignored';
  }
  const [[total]]:any=await sql.query(`SELECT COUNT(*) total FROM sales_email_reply_intakes
   WHERE company_id=? AND state IN ${openStates} AND expires_at_ms>${clock}`,[company]);
  if(Number(total.total)>=maxActive)throw new EmailReceiptError(503,'EMAIL_REPLY_CAPACITY');
  const payload=encryptCredential(canonicalJson({company,id,reply}));
  await sql.query(`INSERT INTO sales_email_reply_intakes
   (id,company_id,input_hash,secret_hash,payload_cipher,state,attempts,due_at_ms,expires_at_ms,admitted_at_ms)
   VALUES (?,?,?,?,?,'PENDING',0,${clock},${clock}+?,${clock})`,[id,company,inputHash,salesHash(secret),payload,ttlMs]);
  await sql.commit();
  return 'queued';
 }catch(error){await sql.rollback();throw error;}
 finally{sql.release();}
}

function openPayload(row:Intake){
 if(!row.payload_cipher?.startsWith('enc:v1:'))throw new EmailReceiptError(409,'EMAIL_REPLY_PAYLOAD_INVALID');
 let data;
 try{data=JSON.parse(decryptCredential(row.payload_cipher));}
 catch{throw new EmailReceiptError(409,'EMAIL_REPLY_PAYLOAD_INVALID');}
 const {reply}=data??{};
 if(data?.company!==row.company_id||data?.id!==row.id||!reply||!Number.isSafeInteger(reply.occurredAtMs)||
    reply.occurredAtMs<=0||reply.occurredAtMs>Date.now()+300000)throw new EmailReceiptError(409,'EMAIL_REPLY_PAYLOAD_INVALID');
 const normalized=parseSalesEmailReply({type:'email.received',created_at:new Date(reply.occurredAtMs).toISOString(),
  data:{email_id:reply.providerId,from:reply.from,to:[reply.to]}},Date.now());
 if(!normalized||normalized.dispatchKey!==reply.dispatchKey||identity(row.company_id,normalized.providerId)!==row.id||
    fingerprint(normalized)!==row.input_hash)throw new EmailReceiptError(409,'EMAIL_REPLY_PAYLOAD_INVALID');
 return normalized;
}

async function expireOne(pool:Pool){
 const [[record]]:any=await pool.query(`SELECT id FROM sales_email_reply_intakes WHERE state IN ${openStates}
  AND expires_at_ms<=${clock} ORDER BY expires_at_ms,id LIMIT 1`);
 if(!record)return false;
 const [expired]:any=await pool.query(`UPDATE sales_email_reply_intakes SET state='EXPIRED',reason='EXPIRED',payload_cipher=NULL,
  claim_token=NULL,settled_at_ms=${clock} WHERE id=? AND state IN ${openStates} AND expires_at_ms<=${clock}`,[record.id]);
 return expired.affectedRows===1;
}

/** One bounded claim per dispatcher tick. A reclaimed read can reuse the committed CRM reply. */
export async function recoverSalesEmailReplies(pool:Pool,canStart=()=>true,transport:typeof fetch=fetch){
 if(!canStart())return {state:'IDLE'};
 const expired=await expireOne(pool);
 const allowed=()=>canStart()&&tenantEmailReplyRecoveryEnabled()&&!isGlobalEmergencyStopActive();
 if(expired||!allowed())return {state:expired?'EXPIRED':'IDLE'};
 const [[row]]:[Intake[]]=await pool.query(`SELECT i.id,i.company_id,i.state,i.input_hash,i.secret_hash,i.payload_cipher,i.attempts
  FROM sales_email_reply_intakes i JOIN client_operations op ON op.company_id=i.company_id AND op.status='ACTIVE'
  WHERE i.state IN ${openStates} AND i.due_at_ms<=${clock} AND i.expires_at_ms>${clock}
  ORDER BY i.due_at_ms,i.id LIMIT 1`) as unknown as [Intake[]];
 if(!row||!allowed())return {state:'IDLE'};
 const token=randomBytes(16).toString('hex');
 const [claim]:any=await pool.query(`UPDATE sales_email_reply_intakes SET state='RUNNING',claim_token=?,
  attempts=attempts+1,due_at_ms=${clock}+? WHERE id=? AND state IN ${openStates}
  AND due_at_ms<=${clock} AND expires_at_ms>${clock} AND attempts=?`,[token,leaseMs,row.id,row.attempts]);
 if(claim.affectedRows!==1)return {state:'IDLE'};
 const attempts=Number(row.attempts)+1;
 const verifyLease=async(sql:ReadOnlySql)=>{
  if(!allowed())throw new EmailReceiptError(503,'EMAIL_REPLY_RECOVERY_PAUSED');
  const [[lease]]=await sql.query(`SELECT id FROM sales_email_reply_intakes WHERE id=? AND state='RUNNING' AND claim_token=?
    AND due_at_ms>${clock} AND expires_at_ms>${clock} FOR UPDATE`,[row.id,token]);
  if(!lease)throw new EmailReceiptError(503,'EMAIL_REPLY_RECOVERY_CLAIM_CHANGED');
 };
 let state='FAILED',reason:string|null=null;
 try{
  if(!allowed())throw new EmailReceiptError(503,'EMAIL_REPLY_RECOVERY_PAUSED');
  const reply=openPayload(row);
  const secret=await readEmailWebhookSecret(pool,row.company_id);
  if(!secret||salesHash(secret)!==row.secret_hash)throw new EmailReceiptError(409,'EMAIL_REPLY_RECOVERY_CONFIGURATION_CHANGED');
  // A sixth attempt that crashed after committing is replay-safe. It can still resolve without fetching.
  const boundedTransport:typeof fetch=attempts<=maxAttempts?transport:async()=>{
   throw new Error('EMAIL_REPLY_RECOVERY_EXHAUSTED');
  };
  const result=await recordSalesEmailReply(pool,row.company_id,reply,secret,boundedTransport,verifyLease);
  state=result==='ignored'?'IGNORED':'RECORDED';
 }catch(error){
  const retry=error instanceof EmailReceiptError?error.status===503:true;
  const known:Record<string,string>={
   EMAIL_REPLY_PROVIDER_UNCONFIRMED:'PROVIDER_UNAVAILABLE',
   EMAIL_REPLY_DISPATCH_UNCONFIRMED:'DISPATCH_UNCONFIRMED',
   EMAIL_REPLY_RECOVERY_CONFIGURATION_CHANGED:'CONFIGURATION_CHANGED',
   EMAIL_WEBHOOK_SECRET_CHANGED:'CONFIGURATION_CHANGED',
   EMAIL_REPLY_CONFIGURATION_CHANGED:'CONFIGURATION_CHANGED',
   EMAIL_REPLY_PAYLOAD_INVALID:'PAYLOAD_INVALID',
   EMAIL_REPLY_THREAD_CHANGED:'THREAD_CHANGED',
   EMAIL_REPLY_RECOVERY_PAUSED:'PAUSED',
  };
  reason=error instanceof EmailReceiptError?(known[error.code]||'STORAGE_UNAVAILABLE'):'STORAGE_UNAVAILABLE';
  if(reason==='PAUSED'||retry&&attempts<maxAttempts)state='PENDING';
 }
 const delay=Math.min(15*60*1000,30000*2**Math.min(attempts-1,5));
 const pending=state==='PENDING';
 const [settled]:any=await pool.query(`UPDATE sales_email_reply_intakes SET state=?,reason=?,claim_token=NULL,attempts=attempts-?,due_at_ms=${clock}+?,
  payload_cipher=CASE WHEN ? THEN payload_cipher ELSE NULL END,settled_at_ms=CASE WHEN ? THEN NULL ELSE ${clock} END
  WHERE id=? AND state='RUNNING' AND claim_token=? AND due_at_ms>${clock} AND expires_at_ms>${clock}`,
  [state,reason,reason==='PAUSED'?1:0,pending?delay:0,pending,pending,row.id,token]);
 return {state:settled.affectedRows===1?state:'IDLE'};
}

export async function readSalesEmailIntakeReport(sql:ReadOnlySql,company:string,start:number,end:number){
 const [[admission]]=await sql.query(`SELECT COUNT(*) admitted FROM sales_email_reply_intakes
  WHERE company_id=? AND admitted_at_ms>=? AND admitted_at_ms<?`,[company,start,end]);
 const [[settled]]=await sql.query(`SELECT COUNT(CASE WHEN state='RECORDED' THEN 1 END) recorded,
   COUNT(CASE WHEN state='IGNORED' THEN 1 END) ignored,
   COUNT(CASE WHEN state='FAILED' THEN 1 END) failed,COUNT(CASE WHEN state='EXPIRED' THEN 1 END) expired
  FROM sales_email_reply_intakes WHERE company_id=? AND settled_at_ms>=? AND settled_at_ms<?`,[company,start,end]);
 const [[backlog]]=await sql.query(`SELECT COUNT(CASE WHEN state='PENDING' THEN 1 END) pending,
   COUNT(CASE WHEN state='RUNNING' THEN 1 END) running
  FROM sales_email_reply_intakes WHERE company_id=? AND state IN ${openStates} AND expires_at_ms>${clock}`,[company]);
 const counts=(input:Record<string,unknown>)=>Object.fromEntries(Object.entries(input).map(([key,value])=>{
  const count=Number(value);
  if(!Number.isSafeInteger(count)||count<0)throw new Error('EMAIL_REPLY_INTAKE_COUNT_INVALID');
  return [key,count];
 }));
 return {activity:counts({...admission,...settled}),backlog:counts(backlog)};
}

export async function readSalesEmailIntakes(pool:Pool,company:string,before?:string){
 if(before&&!/^[a-f0-9]{64}$/.test(before))throw new EmailReceiptError(400,'EMAIL_REPLY_CURSOR_INVALID');
 return withReadOnlySqlDeadline(pool,async sql=>{
  let cursor:number|string|undefined;
  if(before){
   const [[row]]=await sql.query('SELECT admitted_at_ms FROM sales_email_reply_intakes WHERE company_id=? AND id=?',[company,before]);
   if(!row)throw new EmailReceiptError(409,'EMAIL_REPLY_CURSOR_CHANGED');
   cursor=row.admitted_at_ms;
  }
  const [rows]=await sql.query(`SELECT id,state,reason,attempts,admitted_at_ms,expires_at_ms,settled_at_ms
   FROM sales_email_reply_intakes WHERE company_id=? ${before?'AND (admitted_at_ms<? OR(admitted_at_ms=? AND id<?))':''}
   ORDER BY admitted_at_ms DESC,id DESC LIMIT 21`,[company,...(before?[cursor,cursor,before]:[])]);
  return emailIntakePage.parse({enabled:tenantEmailReplyRecoveryEnabled(),
   items:rows.slice(0,20).map((row:any)=>({id:row.id,state:row.state,reason:row.reason,attempts:Number(row.attempts),
    admittedAtMs:Number(row.admitted_at_ms),expiresAtMs:Number(row.expires_at_ms),
    settledAtMs:row.settled_at_ms===null?null:Number(row.settled_at_ms)})),
   nextBefore:rows.length>20?rows[19].id:null});
 });
}
