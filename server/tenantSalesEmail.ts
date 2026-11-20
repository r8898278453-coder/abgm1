import {tenantEmailRepliesEnabled} from './salesEmailReplies';
import {hasSalesEmailSuppression} from './salesEmailReceipts';
import type {Pool} from 'mysql2/promise';
import {salesEmailCommand,salesEmailReadiness} from '../shared/tenantSalesEmail';
import {contactAddress,salesContactEligibility} from '../shared/salesWorkspace';
import {platformDateKey,platformDayBounds} from '../shared/dailyWorkReport';
import {agencyClientAccess} from './agencyPolicy';
import {contactHash,leadCandidates,readSalesPolicy,SalesError,salesHash,withSalesLock} from './salesWorkspace';
import {readVerifiedTenantEmailSender} from './tenantEmailDomain';
import {withReadOnlySqlDeadline,type ReadOnlySql} from './readOnlySqlDeadline';
import {isGlobalEmergencyStopActive} from './executionStop';
import {dispatchMessageIntent,DispatchIntentError,type DispatchResult} from './messageDispatchIntents';
import {canonicalJson} from '../shared/canonicalJson';
import {localProviderJson} from './localProviderJson';

type Actor={id:string;is_platform_admin?:boolean};
const enabled=()=>process.env.ENABLE_TENANT_SALES_EMAIL==='true';

async function context(sql:ReadOnlySql,user:Actor,company:string,lead:string,claimed=false){
 const [[actor]]=await sql.query('SELECT id,is_platform_admin FROM users WHERE id=?',[user.id]);
 if(actor?.id!==user.id)throw new SalesError(403,'SALES_EMAIL_ACCESS_DENIED');
 const current={id:actor.id,is_platform_admin:Number(actor.is_platform_admin)===1};
 const access=await agencyClientAccess(sql,current,company,'read');
 if(!access.authorized)throw new SalesError(access.status,'SALES_EMAIL_ACCESS_DENIED');
 const [[target]]=await sql.query('SELECT id,company_id,email FROM leads WHERE company_id=? AND id=?',[company,lead]);
 if(target?.id!==lead||target.company_id!==company)throw new SalesError(404,'LEAD_NOT_FOUND');

 let recipient:string|null=null;
 try{const address=contactAddress('EMAIL',target.email);if(salesEmailReadiness.shape.recipient.safeParse(address).success)recipient=address;}catch{ /* No usable saved address. */ }
 const result={recipient,verified:null as Awaited<ReturnType<typeof readVerifiedTenantEmailSender>>,blocked:null as string|null};
 if(!enabled())return {...result,blocked:'SALES_EMAIL_DISABLED'};
 if(!(await agencyClientAccess(sql,current,company,'execute')).authorized||
    !(await agencyClientAccess(sql,current,company,'approve')).authorized)return {...result,blocked:'SALES_EMAIL_ACCESS_DENIED'};
 if(isGlobalEmergencyStopActive())return {...result,blocked:'GLOBAL_EMERGENCY_STOP'};
 if(!recipient)return {...result,recipient:null,blocked:'SALES_EMAIL_RECIPIENT_REQUIRED'};

 const candidates=await leadCandidates(sql,company,'',recipient);
 if(candidates.length!==1||candidates[0].id!==lead)return {...result,blocked:'SALES_EMAIL_IDENTITY_REVIEW_REQUIRED'};
 const hash=contactHash('EMAIL',recipient);
 if(await hasSalesEmailSuppression(sql,company,hash))return {...result,blocked:'SALES_EMAIL_SUPPRESSED'};
 const [[permission]]=await sql.query("SELECT state FROM sales_contact_permissions WHERE company_id=? AND channel='EMAIL' AND contact_hash=?",[company,hash]);
 const {policy}=await readSalesPolicy(sql,company);
 const [[clock]]=await sql.query('SELECT UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000 nowMs');
 const nowMs=Number(clock.nowMs);
 if(!Number.isSafeInteger(nowMs)||nowMs<=0)throw new Error('SALES_EMAIL_CLOCK_INVALID');
 const {start,end}=platformDayBounds(platformDateKey(nowMs));
 const [[usage]]=await sql.query(`SELECT COUNT(*) total FROM message_dispatch_intents WHERE company_id=?
   AND status IN ('IN_PROGRESS','UNKNOWN','API_ACCEPTED') AND created_at>=FROM_UNIXTIME(?) AND created_at<FROM_UNIXTIME(?)`,[company,start/1000,end/1000]);
 const used=Number(usage.total);
 if(!Number.isSafeInteger(used)||used<0)throw new Error('SALES_EMAIL_CAP_INVALID');
 const blocked=salesContactEligibility({state:permission?.state,paused:policy.paused,quietStart:policy.quietStart,
  quietEnd:policy.quietEnd,nowMs,dailyUsed:used+(claimed?0:1),dailyCap:policy.dailyMessageCap});
 if(blocked)return {...result,blocked};
 const verified=await readVerifiedTenantEmailSender(sql,company);
 return {...result,verified,blocked:verified?null:'SALES_EMAIL_VERIFICATION_REQUIRED'};
}

export async function readSalesEmailReadiness(pool:Pool,user:Actor,company:string,lead:string){
 return withReadOnlySqlDeadline(pool,async sql=>{
  const result=await context(sql,user,company,lead);
  return salesEmailReadiness.parse({enabled:enabled(),recipient:result.recipient,sender:result.verified?.proof??null,blocked:result.blocked});
 });
}

export async function sendApprovedSalesEmail(pool:Pool,user:Actor,company:string,lead:string,body:unknown,transport:typeof fetch=fetch){
 const input=salesEmailCommand.safeParse(body);
 if(!input.success)throw new SalesError(400,'SALES_EMAIL_INPUT_INVALID');
 const command=input.data;
 const relevant={kind:'tenant-sales-email',lead,actor:user.id,...command};
 const digest=salesHash('tenant-sales-email:'+company+':'+command.requestKey);
 const preflight=await withReadOnlySqlDeadline(pool,async sql=>{
  const current=await context(sql,user,company,lead);
  if(current.blocked==='SALES_EMAIL_ACCESS_DENIED')throw new SalesError(403,current.blocked);
  const [[receipt]]=await sql.query('SELECT actor_id,input_hash,status FROM message_dispatch_intents WHERE company_id=? AND request_key=?',[company,digest]);
  if(receipt){
   if(receipt.actor_id!==user.id||receipt.input_hash!==salesHash(canonicalJson(relevant)))throw new SalesError(409,'SALES_EMAIL_REQUEST_CONFLICT');
   if(receipt.status!=='PAUSED')return {replay:receipt.status==='API_ACCEPTED'?'API_ACCEPTED' as const:'UNKNOWN' as const};
  }
  if(current.blocked||!current.recipient||!current.verified)throw new SalesError(409,current.blocked||'SALES_EMAIL_UNAVAILABLE');
  if(current.recipient!==command.recipient||current.verified.proof.checkedAtMs!==command.senderCheckedAtMs)throw new SalesError(409,'SALES_EMAIL_REVIEW_CHANGED');
  return {fingerprint:current.verified.sender.fingerprint};
 });
 if(preflight.replay)return {status:preflight.replay,requestKey:command.requestKey,reused:true};

 try{
  const result=await dispatchMessageIntent(pool,company,digest,relevant,async()=>{
   const ready=await withSalesLock(pool,user,company,'execute',async(sql,canonical)=>{
    if(canonical!==company)throw new SalesError(404,'CLIENT_NOT_FOUND');
    const latest=await context(sql,user,company,lead,true);
    if(latest.blocked||latest.recipient!==command.recipient||latest.verified?.proof.checkedAtMs!==command.senderCheckedAtMs||
       latest.verified.sender.fingerprint!==preflight.fingerprint)return null;
    const id=salesHash('tenant-sales-email:'+company+':'+digest);
    const replyTo=tenantEmailRepliesEnabled()&&latest.verified.sender.replyDomain?digest+'@'+latest.verified.sender.replyDomain:null;
    // Use the shared inbox and intent ledger to bind future provider events to this exact approved message.
    await sql.query(`INSERT INTO sales_inbox_messages
      (id,company_id,lead_id,channel,direction,contact_hash,provider_ref,dispatch_key,body,metadata_json)
      VALUES (?,?,?,'EMAIL','OUTBOUND',?,?,?,?,?) ON DUPLICATE KEY UPDATE metadata_json=VALUES(metadata_json)`,
      [id,company,lead,contactHash('EMAIL',command.recipient),digest,digest,command.text,JSON.stringify({subject:command.subject,emailSenderHash:contactHash('EMAIL',latest.verified.sender.fromEmail),...(replyTo?{emailReplyAddressHash:contactHash('EMAIL',replyTo)}:{})})]);
    return {...latest.verified.sender,replyTo};
   }).catch(()=>null);
   if(!ready||!enabled()||isGlobalEmergencyStopActive())return {success:false,status:'PAUSED'};
   return sendResend(ready,command,digest,transport);
  },user.id);
  const status=result.status==='API_ACCEPTED'||result.status==='PAUSED'?result.status:'UNKNOWN';
  return {status,requestKey:command.requestKey,reused:result.reused};
 }catch(error){
  if(error instanceof DispatchIntentError)throw new SalesError(error.status,'SALES_EMAIL_REQUEST_CONFLICT');
  throw error;
 }
}

async function sendResend(sender:{apiKey:string;fromEmail:string;replyTo:string|null},command:Pick<ReturnType<typeof salesEmailCommand.parse>,'recipient'|'subject'|'text'>,key:string,transport:typeof fetch):Promise<DispatchResult>{
 try{
  const response=await transport('https://api.resend.com/emails',{
   method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(5000),
   headers:{Authorization:'Bearer '+sender.apiKey,'Content-Type':'application/json','Idempotency-Key':key},
   body:JSON.stringify({from:sender.fromEmail,to:[command.recipient],subject:command.subject,text:command.text,...(sender.replyTo?{reply_to:sender.replyTo}:{})}),
  });
  if(!response.ok||response.redirected){await response.body?.cancel().catch(()=>{});return {success:false,status:'UNKNOWN'};}
  const result=await localProviderJson(response,16384);
  if(typeof result?.id!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(result.id))return {success:false,status:'UNKNOWN'};
  return {success:true,messageId:result.id};
 }catch{return {success:false,status:'UNKNOWN'};}
}
