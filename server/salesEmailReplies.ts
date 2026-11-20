import type {Pool} from 'mysql2/promise';
import {z} from 'zod';
import {contactAddress} from '../shared/salesWorkspace';
import {canonicalJson} from '../shared/canonicalJson';
import {contactHash,salesHash} from './salesWorkspace';
import {EmailReceiptError,readTenantResendSettings,salesEmailWebhooksEnabled} from './salesEmailReceipts';
import {withReadOnlySqlDeadline,type ReadOnlySql} from './readOnlySqlDeadline';
import {localProviderJson} from './localProviderJson';

const idPattern=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const routePattern=/^([a-f0-9]{64})@/;
const apiKeyPattern=/^re_[A-Za-z0-9_-]{8,253}$/;
const maxSkewMs=300000;
export const tenantEmailRepliesEnabled=()=>salesEmailWebhooksEnabled()&&process.env.ENABLE_TENANT_EMAIL_REPLIES==='true';
const receivedAt=z.iso.datetime({offset:true});

function mailbox(value:unknown){
 if(typeof value!=='string'||value.length>320||/[\r\n]/.test(value))throw new EmailReceiptError(400,'EMAIL_REPLY_INPUT_INVALID');
 try{return contactAddress('EMAIL',/^[^<>]*<([^<>]+)>$/.exec(value)?.[1]??value);}
 catch{throw new EmailReceiptError(400,'EMAIL_REPLY_INPUT_INVALID');}
}

function identities(data:{from?:unknown;to?:unknown}){
 if(!Array.isArray(data.to)||data.to.length!==1)throw new EmailReceiptError(400,'EMAIL_REPLY_INPUT_INVALID');
 return {from:mailbox(data.from),to:mailbox(data.to[0])};
}

export function parseSalesEmailReply(payload:unknown,now:number){
 if(!payload||typeof payload!=='object'||!('type' in payload)||payload.type!=='email.received')return undefined;
 const envelope=payload as {data?:{email_id?:unknown;from?:unknown;to?:unknown};created_at?:unknown};
 const data=envelope.data;
 const time=receivedAt.safeParse(envelope.created_at);
 const occurredAtMs=time.success?Date.parse(time.data):NaN;
 if(!data||typeof data.email_id!=='string'||!idPattern.test(data.email_id)||
    !Number.isSafeInteger(occurredAtMs)||occurredAtMs<=0||occurredAtMs>now+maxSkewMs){
  throw new EmailReceiptError(400,'EMAIL_REPLY_INPUT_INVALID');
 }
 const {from,to}=identities(data);
 const dispatchKey=routePattern.exec(to)?.[1];
 return dispatchKey?{providerId:data.email_id,from,to,dispatchKey,occurredAtMs}:null;
}

type Reply=NonNullable<ReturnType<typeof parseSalesEmailReply>>;
type Match={id:string;lead_id:string;providerRef:string};
function checkSecret(config:Record<string,unknown>|null,secret:string){
 if(!config||config.resendWebhookSecret!==secret)throw new EmailReceiptError(409,'EMAIL_WEBHOOK_SECRET_CHANGED');
}

async function findTarget(sql:ReadOnlySql,company:string,reply:Reply):Promise<Match|null>{
 const original=salesHash('tenant-sales-email:'+company+':'+reply.dispatchKey);
 const [[row]]=await sql.query(`SELECT m.id,m.lead_id,m.contact_hash,i.status,i.provider_id providerRef,
   UNIX_TIMESTAMP(m.created_at)*1000 createdAtMs,
   JSON_UNQUOTE(JSON_EXTRACT(m.metadata_json,'$.emailReplyAddressHash')) replyHash
  FROM sales_inbox_messages m
  JOIN leads l ON l.company_id=m.company_id AND l.id=m.lead_id
  JOIN client_operations op ON op.company_id=m.company_id AND op.status='ACTIVE'
  JOIN message_dispatch_intents i ON i.company_id=m.company_id AND i.request_key=m.dispatch_key
  WHERE m.company_id=? AND m.id=? AND m.dispatch_key=? AND BINARY m.channel='EMAIL'
   AND BINARY m.direction='OUTBOUND' AND i.sender_id IS NULL`,[company,original,reply.dispatchKey]);
 if(!row||row.contact_hash!==contactHash('EMAIL',reply.from)||row.replyHash!==contactHash('EMAIL',reply.to)||
    reply.occurredAtMs<Number(row.createdAtMs)-maxSkewMs)return null;
 if(row.status!=='API_ACCEPTED'||typeof row.providerRef!=='string'||!idPattern.test(row.providerRef)){
  throw new EmailReceiptError(503,'EMAIL_REPLY_DISPATCH_UNCONFIRMED');
 }
 return row;
}

async function replay(sql:ReadOnlySql,company:string,id:string,inputHash:string){
 const [[row]]=await sql.query(`SELECT JSON_UNQUOTE(JSON_EXTRACT(metadata_json,'$.emailReplyInputHash')) inputHash
  FROM sales_inbox_messages WHERE company_id=? AND id=? AND BINARY direction='INBOUND' AND BINARY channel='EMAIL'`,[company,id]);
 if(!row)return false;
 if(row.inputHash!==inputHash)throw new EmailReceiptError(409,'EMAIL_REPLY_CONFLICT');
 return true;
}

async function fetchReply(reply:Reply,key:string,transport:typeof fetch){
 try{
  const response=await transport('https://api.resend.com/emails/receiving/'+reply.providerId,{
   method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(5000),
   headers:{Authorization:'Bearer '+key,Accept:'application/json'},
  });
  if(!response.ok||response.redirected||!/^application\/json\b/i.test(response.headers.get('content-type')||'')){
   await response.body?.cancel().catch(()=>{});
   throw new Error('Provider response unavailable');
  }
  const data=await localProviderJson(response,131072);
  const verified=identities(data);
  if(data.id!==reply.providerId||verified.from!==reply.from||verified.to!==reply.to)throw new Error('Provider identity changed');
  const raw=typeof data.text==='string'?data.text.replace(/\r\n?/g,'\n').trim():'';
  const sanitized=raw.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'');
  const text=Array.from(sanitized).slice(0,8000).join('');
  const subject=typeof data.subject==='string'?Array.from(data.subject.replace(/[\u0000-\u001f\u007f]/g,' ').trim()).slice(0,160).join(''):'';
  const textAvailable=Boolean(text.trim());
  return {text:textAvailable?text:'Plain-text reply unavailable.',textAvailable,subject,
   truncated:Array.from(sanitized).length>8000,
   optOut:/^(stop|unsubscribe|opt out|band karo)[.!]?$/i.test(raw)};
 }catch{throw new EmailReceiptError(503,'EMAIL_REPLY_PROVIDER_UNCONFIRMED');}
}

export async function recordSalesEmailReply(pool:Pool,company:string,reply:Reply,secret:string,transport:typeof fetch=fetch){
 if(!tenantEmailRepliesEnabled())return 'ignored';
 const id=salesHash('tenant-email-reply:'+company+':'+reply.providerId);
 // The provider message ID and addressing define retry identity even if the provider reissues a webhook at a new time.
 const inputHash=salesHash(canonicalJson([reply.providerId,reply.from,reply.to]));
 const target=await withReadOnlySqlDeadline(pool,async sql=>{
  const config=await readTenantResendSettings(sql,company);
  checkSecret(config,secret);
  if(await replay(sql,company,id,inputHash))return 'duplicate' as const;
  const found=await findTarget(sql,company,reply);
  if(!found)return null;
  const key=config?.apiKey;
  if(typeof key!=='string'||!apiKeyPattern.test(key))throw new EmailReceiptError(503,'EMAIL_REPLY_PROVIDER_UNCONFIRMED');
  return {found,key};
 });
 if(target==='duplicate')return target;
 if(!target)return 'ignored';

 const message=await fetchReply(reply,target.key,transport);
 const sql=await pool.getConnection();
 try{
  await sql.beginTransaction();
  const [[scope]]:any=await sql.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[company]);
  if(scope?.id!==company||!tenantEmailRepliesEnabled())throw new EmailReceiptError(503,'EMAIL_REPLY_UNAVAILABLE');
  const config=await readTenantResendSettings(sql,company,true);
  checkSecret(config,secret);
  if(config?.apiKey!==target.key)throw new EmailReceiptError(409,'EMAIL_REPLY_CONFIGURATION_CHANGED');
  if(await replay(sql,company,id,inputHash)){
   await sql.commit();
   return 'duplicate';
  }
  const current=await findTarget(sql,company,reply);
  if(!current||current.id!==target.found.id||current.lead_id!==target.found.lead_id||current.providerRef!==target.found.providerRef){
   throw new EmailReceiptError(503,'EMAIL_REPLY_THREAD_CHANGED');
  }
  const hash=contactHash('EMAIL',reply.from);
  await sql.query(`INSERT INTO sales_inbox_messages(id,company_id,lead_id,channel,direction,contact_hash,provider_ref,body,metadata_json)
   VALUES (?,?,?,'EMAIL','INBOUND',?,?,?,?)`,[id,company,current.lead_id,hash,reply.providerId,message.text,JSON.stringify({
    emailReplyInputHash:inputHash,verifiedEmailReply:true,replyToMessageId:current.id,
    subject:message.subject,textAvailable:message.textAvailable,truncated:message.truncated,
    emailOccurredAtMs:reply.occurredAtMs,emailOptOut:message.optOut,
   })]);
  if(message.optOut){
   await sql.query(`INSERT INTO sales_contact_permissions(company_id,channel,contact_hash,revision,state,evidence,actor_id)
    VALUES (?,'EMAIL',?,1,'OPTED_OUT','Explicit opt-out in a linked email reply','webhook')
    ON DUPLICATE KEY UPDATE revision=revision+1,state='OPTED_OUT',evidence=VALUES(evidence),actor_id=VALUES(actor_id)`,[company,hash]);
  }
  await sql.commit();
  return 'recorded';
 }catch(error){await sql.rollback();throw error;}
 finally{sql.release();}
}

export async function readSalesEmailReplyDay(sql:ReadOnlySql,company:string,start:number,end:number){
 const [[row]]=await sql.query(`SELECT COUNT(*) replies,
   COUNT(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(metadata_json,'$.emailOptOut'))='true' THEN 1 END) optOuts
  FROM sales_inbox_messages WHERE company_id=? AND BINARY channel='EMAIL' AND BINARY direction='INBOUND'
   AND JSON_UNQUOTE(JSON_EXTRACT(metadata_json,'$.verifiedEmailReply'))='true'
   AND CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata_json,'$.emailOccurredAtMs')) AS UNSIGNED)>=?
   AND CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata_json,'$.emailOccurredAtMs')) AS UNSIGNED)<?`,[company,start,end]);
 const replies=Number(row.replies),optOuts=Number(row.optOuts);
 if(!Number.isSafeInteger(replies)||!Number.isSafeInteger(optOuts)||optOuts<0||replies<optOuts)throw new Error('EMAIL_REPLY_COUNT_INVALID');
 return {replies,optOuts};
}
