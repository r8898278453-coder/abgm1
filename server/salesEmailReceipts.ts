import {decryptCredentialsObject} from './db';
import {contactHash,salesHash} from './salesWorkspace';
import {canonicalJson} from '../shared/canonicalJson';
import {contactAddress} from '../shared/salesWorkspace';
import {EMAIL_RECEIPT_TYPES,emailReceiptEvidence,emailReceiptState,type EmailReceiptState} from '../shared/salesEmailReceipts';
import type {Pool} from 'mysql2/promise';
import type {ReadOnlySql} from './readOnlySqlDeadline';
import {z} from 'zod';

export const salesEmailWebhooksEnabled=()=>process.env.ENABLE_TENANT_EMAIL_WEBHOOKS==='true';
export class EmailReceiptError extends Error {
 constructor(public status:number,public code:string){super(code);}
}
const providerTypes=new Map<string,EmailReceiptState>([
 ['email.sent','SENT'],['email.delivery_delayed','DELAYED'],['email.delivered','DELIVERED'],
 ['email.failed','FAILED'],['email.bounced','BOUNCED'],['email.suppressed','SUPPRESSED'],['email.complained','COMPLAINED'],
]);
const maxSkew=300000;
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const providerTime=z.iso.datetime({offset:true});

export function parseSalesEmailReceipt(payload:unknown,nowMs=Date.now()){
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new EmailReceiptError(400,'EMAIL_WEBHOOK_INPUT_INVALID');
 const {type,data,created_at}=payload as {type:unknown;data?:Record<string,unknown>;created_at?:unknown};
 if(typeof type!=='string'||!/^email\.[a-z_]{1,40}$/.test(type))throw new EmailReceiptError(400,'EMAIL_WEBHOOK_INPUT_INVALID');
 const kind=providerTypes.get(type);
 if(!kind)return null;
 const parsedTime=providerTime.safeParse(created_at);
 const occurredAtMs=parsedTime.success?Date.parse(parsedTime.data):NaN;
 if(!data||Array.isArray(data)||!Number.isSafeInteger(occurredAtMs)||occurredAtMs<=0||occurredAtMs>nowMs+maxSkew||
    typeof data.email_id!=='string'||!uuid.test(data.email_id)||typeof data.from!=='string'||data.from.length>320||
    !Array.isArray(data.to)||data.to.length!==1||typeof data.to[0]!=='string'){
  throw new EmailReceiptError(400,'EMAIL_WEBHOOK_INPUT_INVALID');
 }
 let senderHash:string,contact:string;
 try{
  const address=/^[^<>\r\n]*<([^<>\r\n]+)>$/.exec(data.from)?.[1]??data.from;
  senderHash=contactHash('EMAIL',contactAddress('EMAIL',address));
  contact=contactHash('EMAIL',contactAddress('EMAIL',data.to[0]));
 }catch{throw new EmailReceiptError(400,'EMAIL_WEBHOOK_INPUT_INVALID');}
 const bounce=data.bounce as {type?:unknown}|undefined;
 const suppresses=kind==='COMPLAINED'||kind==='SUPPRESSED'||kind==='BOUNCED'&&
  typeof bounce?.type==='string'&&bounce.type.toLowerCase()==='permanent';
 return {providerId:data.email_id,kind,occurredAtMs,senderHash,contact,suppresses};
}

export async function readTenantResendSettings(sql:ReadOnlySql,company:string,lock=false){
 const [rows]=await sql.query(`SELECT company_id,provider,status,credentials FROM company_integrations
   WHERE company_id=? AND provider IN ('transactional_email','smtp')${lock?' FOR UPDATE':''}`,[company]);
 const row=rows[0];
 if(rows.length!==1||row.company_id!==company||!['saved','connected','verified','error'].includes(row.status))return null;
 const credentials=decryptCredentialsObject(typeof row.credentials==='string'?JSON.parse(row.credentials):row.credentials||{});
 return credentials.provider==='resend'?credentials:null;
}

export async function readEmailWebhookSecret(sql:ReadOnlySql,company:string,lock=false){
 const value=(await readTenantResendSettings(sql,company,lock))?.resendWebhookSecret;
 return typeof value==='string'?value:null;
}

export async function recordSalesEmailReceipt(pool:Pool,company:string,eventId:string,receipt:NonNullable<ReturnType<typeof parseSalesEmailReceipt>>,verifiedSecret:string){
 const sql=await pool.getConnection();
 try{
  await sql.beginTransaction();
  const [[scope]]:any=await sql.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[company]);
  if(scope?.id!==company)throw new EmailReceiptError(404,'EMAIL_WEBHOOK_SCOPE_INVALID');
  if(await readEmailWebhookSecret(sql,company,true)!==verifiedSecret)throw new EmailReceiptError(409,'EMAIL_WEBHOOK_SECRET_CHANGED');
  const eventHash=salesHash(eventId),inputHash=salesHash(canonicalJson(receipt));
  const [[existing]]:any=await sql.query('SELECT input_hash FROM sales_email_receipts WHERE company_id=? AND event_hash=?',[company,eventHash]);
  if(existing){
   if(existing.input_hash!==inputHash)throw new EmailReceiptError(409,'EMAIL_WEBHOOK_EVENT_CONFLICT');
   await sql.commit();
   return 'duplicate';
  }
  const [matches]:any=await sql.query(`SELECT i.request_key,m.contact_hash,UNIX_TIMESTAMP(m.created_at)*1000 createdAtMs,
    JSON_UNQUOTE(JSON_EXTRACT(m.metadata_json,'$.emailSenderHash')) sender_hash
   FROM message_dispatch_intents i JOIN sales_inbox_messages m ON m.company_id=i.company_id AND m.dispatch_key=i.request_key
   WHERE i.company_id=? AND i.sender_id IS NULL AND i.provider_id=? AND i.status='API_ACCEPTED'
     AND BINARY m.channel='EMAIL' AND BINARY m.direction='OUTBOUND' LIMIT 2`,[company,receipt.providerId]);
  const match=matches[0];
  if(matches.length!==1||match.contact_hash!==receipt.contact||receipt.occurredAtMs<Number(match.createdAtMs)-maxSkew||
     match.sender_hash!==null&&match.sender_hash!==receipt.senderHash){
   // A signed callback can arrive while the application is committing API acceptance.
   throw new EmailReceiptError(503,'EMAIL_WEBHOOK_DISPATCH_UNCONFIRMED');
  }
  await sql.query(`INSERT INTO sales_email_receipts(company_id,event_hash,input_hash,dispatch_key,contact_hash,event_type,occurred_at_ms,suppresses)
    VALUES (?,?,?,?,?,?,?,?)`,[company,eventHash,inputHash,match.request_key,receipt.contact,receipt.kind,receipt.occurredAtMs,Number(receipt.suppresses)]);
  await sql.commit();
  return 'recorded';
 }catch(error){await sql.rollback();throw error;}
 finally{sql.release();}
}

export async function hasSalesEmailSuppression(sql:ReadOnlySql,company:string,contact:string){
 const [[row]]=await sql.query('SELECT 1 present FROM sales_email_receipts WHERE company_id=? AND contact_hash=? AND suppresses=1 LIMIT 1',[company,contact]);
 return Boolean(row);
}

async function readSalesEmailReceipts(sql:ReadOnlySql,company:string,keys:string[]){
 if(!keys.length)return new Map<string,ReturnType<typeof emailReceiptEvidence.parse>>();
 const [rows]=await sql.query(`SELECT dispatch_key,event_type,MAX(occurred_at_ms) occurredAtMs,suppresses
   FROM sales_email_receipts WHERE company_id=? AND dispatch_key IN (${keys.map(()=>'?').join(',')})
   GROUP BY dispatch_key,event_type,suppresses`,[company,...keys]);
 const output=new Map<string,ReturnType<typeof emailReceiptEvidence.parse>>();
 for(const row of rows){
  const current=output.get(row.dispatch_key),suppresses=Number(row.suppresses);
  if(![0,1].includes(suppresses))throw new Error('EMAIL_RECEIPT_SUPPRESSION_INVALID');
  const sample=emailReceiptEvidence.parse({state:row.event_type,occurredAtMs:Number(row.occurredAtMs),suppressed:suppresses===1});
  if(!current||compareEvidence(sample,current)>0)output.set(row.dispatch_key,sample);
 }
 return output;
}

function compareEvidence(first:ReturnType<typeof emailReceiptEvidence.parse>,second:ReturnType<typeof emailReceiptEvidence.parse>){
 // Severe suppression stays visible. New delivery can supersede a previous transient failure.
 const priority=(e:typeof first)=>e.suppressed?3+EMAIL_RECEIPT_TYPES.indexOf(e.state):e.state==='SENT'?0:e.state==='DELAYED'?1:2;
 return priority(first)-priority(second)||first.occurredAtMs-second.occurredAtMs||
  EMAIL_RECEIPT_TYPES.indexOf(first.state)-EMAIL_RECEIPT_TYPES.indexOf(second.state);
}

export async function readSalesEmailReceiptDay(sql:ReadOnlySql,company:string,start:number,end:number){
 const [rows]=await sql.query(`SELECT event_type,COUNT(DISTINCT dispatch_key) total FROM sales_email_receipts
   WHERE company_id=? AND occurred_at_ms>=? AND occurred_at_ms<? GROUP BY event_type`,[company,start,end]);
 return Object.fromEntries(rows.map((row:{event_type:string;total:number|string})=>{
  const total=Number(row.total);
  if(!Number.isSafeInteger(total)||total<0)throw new Error('EMAIL_RECEIPT_COUNT_INVALID');
  return [emailReceiptState.parse(row.event_type),total];
 }));
}

/** Shared bounded page projection for the Sales inbox and private CRM conversations. */
export async function projectInboxEmailEvidence(sql:ReadOnlySql,company:string,page:any[]){
 const keys:string[]=page.filter(row=>row.channel==='EMAIL'&&row.direction==='OUTBOUND'&&typeof row.dispatch_key==='string').map(row=>row.dispatch_key);
 const evidence=await readSalesEmailReceipts(sql,company,[...new Set(keys)]);
 return page.map(({dispatch_key,metadata_json,...row})=>{
  const decoded=typeof metadata_json==='string'?JSON.parse(metadata_json):metadata_json;
  const metadata=row.channel==='EMAIL'&&decoded?Object.fromEntries(Object.entries(decoded).filter(([key])=>!['emailSenderHash','emailReplyAddressHash','emailReplyInputHash'].includes(key))):decoded;
  const emailDelivery=row.channel==='EMAIL'&&row.direction==='OUTBOUND'?evidence.get(dispatch_key):undefined;
  return {...row,metadata,createdAtMs:Number(row.createdAtMs),...(emailDelivery?{emailDelivery}:{})};
 });
}
