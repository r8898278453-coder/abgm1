import type {SalesSendPermit} from '../shared/approvedSalesMessages';
import {validateApprovedSalesPermit} from './salesSendAuthorization';
import {prepareSalesOutbound,salesSendEligibility,recordSalesBlock} from './salesWorkspace';
import {admitClientAction} from './clientPolicy';
import {canonicalJson} from '../shared/canonicalJson';
import {createHash,randomUUID} from 'node:crypto';
import type {Pool} from 'mysql2/promise';
export class DispatchIntentError extends Error{constructor(public status:number,message:string){super(message);}}
export interface DispatchResult{success:boolean;status?:string;messageId?:string;error?:string}
/** No timeout takeover: a crashed/in-flight request is uncertain until separately reconciled. */
export async function dispatchMessageIntent(pool:Pool,company:string,key:string,input:unknown,send:()=>Promise<DispatchResult>,actor='system',workflowPermit?:SalesSendPermit):Promise<DispatchResult&{reused:boolean;requestKey:string}>{
 if(!actor||actor.length>64||!company||company.length>64||!/^[a-f0-9]{64}$/.test(key))throw new DispatchIntentError(400,'Invalid message request key');
 const sender=typeof (input as any)?.sender==='string'&&/^\d{1,64}$/.test((input as any).sender)?(input as any).sender:null;
 const hash=createHash('sha256').update(canonicalJson(input)).digest('hex'),token=randomUUID();
 const connection=await pool.getConnection();
 try{
  await connection.beginTransaction();
  await connection.query(`INSERT INTO message_dispatch_intents(company_id,request_key,input_hash,status,claim_token,actor_id,sender_id) VALUES (?,?,?,'IN_PROGRESS',?,?,?) ON DUPLICATE KEY UPDATE request_key=VALUES(request_key)`,[company,key,hash,token,actor,sender]);
  const [rows]:any=await connection.query('SELECT input_hash,status,claim_token,provider_id FROM message_dispatch_intents WHERE company_id=? AND request_key=? FOR UPDATE',[company,key]);
  const row=rows[0];if(row.input_hash!==hash)throw new DispatchIntentError(409,'Request key belongs to different message or sender');
  if(row.claim_token!==token){
   if((row.status==='PAUSED'||row.status==='REJECTED')&&row.provider_id===null&&typeof row.claim_token==='string'&&!!row.claim_token)await connection.query("UPDATE message_dispatch_intents SET status='IN_PROGRESS',claim_token=? WHERE company_id=? AND request_key=?",[token,company,key]);
   else{
    await connection.commit();
    if(row.status==='API_ACCEPTED'&&typeof row.provider_id==='string'&&row.provider_id.trim())return {success:true,status:'API_ACCEPTED',messageId:row.provider_id,reused:true,requestKey:key};
    return {success:false,status:row.status==='REJECTED'?'REJECTED':'UNKNOWN',error:'Existing dispatch is terminal or unconfirmed. Review before creating another request.',reused:true,requestKey:key};
   }
  }
  await connection.commit();
 }catch(error){await connection.rollback();throw error;}finally{connection.release();}
 let result:DispatchResult|undefined;try{if(typeof (input as any)?.to==='string'){await prepareSalesOutbound(pool,company,key,input);const permitReason=workflowPermit?await validateApprovedSalesPermit(pool,company,key,input,workflowPermit):null;const reason=permitReason||await salesSendEligibility(pool,company,(input as any).to,Boolean((input as any).templateName),(input as any).mode==='automatic'&&!workflowPermit);if(reason){await recordSalesBlock(pool,company,key,reason,actor);result={success:false,status:'PAUSED'};}}}catch{result={success:false,status:'PAUSED'};}try{if(!result)await admitClientAction(pool,company,'MESSAGE',key);}catch{result={success:false,status:'PAUSED'};}if(!result){try{result=await send();}catch{result={success:false,status:'UNKNOWN'};}}
 const accepted=result.success===true&&typeof result.messageId==='string'&&!!result.messageId.trim()&&result.messageId.length<=255;
 const status=accepted?'API_ACCEPTED':result.status==='PAUSED'?'PAUSED':result.status==='REJECTED'?'REJECTED':'UNKNOWN';
 try{
  const [saved]:any=await pool.query("UPDATE message_dispatch_intents SET status=?,provider_id=? WHERE company_id=? AND request_key=? AND claim_token=? AND status='IN_PROGRESS'",[status,accepted?result.messageId:null,company,key,token]);
  if(saved.affectedRows!==1)throw new Error('Settlement unconfirmed');
 }catch{return {success:false,status:'UNKNOWN',error:'Dispatch settlement unconfirmed. Do not resend blindly.',reused:false,requestKey:key};}
 return {success:accepted,status,...(accepted?{messageId:result.messageId}:{}),...(!accepted?{error:status==='PAUSED'?'Execution paused by client or global policy':'Dispatch not confirmed. Review the stored request.'}:{}),reused:false,requestKey:key};
}
