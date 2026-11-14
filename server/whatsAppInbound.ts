import {observeWhatsAppConflict} from './whatsAppConflictLifecycle';
import {verifiedWhatsAppEvent,inboundDisposition,isWhatsAppOptOut,type VerifiedWhatsAppEvent} from '../shared/whatsAppEvents';
import {canonicalJson} from '../shared/canonicalJson';
import {salesHash,contactHash} from './salesWorkspace';
import {inboundOccurredSql} from './whatsAppEventTime';
import {inboundSalesMessage} from './salesWorkspace';
import {insertLeadRow} from './leadWriter';
import {createHash} from 'node:crypto';
import type {Pool,PoolConnection} from 'mysql2/promise';
export type InboundTransactionHooks={beforeWrite:(c:PoolConnection)=>Promise<void>;recorded:(c:PoolConnection,inserted:boolean)=>Promise<void>;rejected?:(c:PoolConnection,reason:string)=>Promise<void>};
export function describeWhatsAppInbound(message:any,contact:any){
 if(typeof message?.id!=='string'||!/^[\x21-\x7e]{1,255}$/.test(message.id)||typeof message.from!=='string'||!/^[1-9]\d{5,14}$/.test(message.from)||typeof message.type!=='string'||! /^[a-z_]{1,50}$/.test(message.type))throw new Error('Invalid inbound message');
 const text=(value:unknown,fallback:string)=>{if(value===undefined||value===null)return fallback;if(typeof value!=='string'||value.length>4096)throw new Error('Invalid inbound content');return value||fallback;};
 const name=contact?.profile?.name;if(name!==undefined&&(typeof name!=='string'||name.length>255))throw new Error('Invalid inbound contact');
 let body:string;
 switch(message.type){
  case 'text':body=text(message.text?.body,'');break;
  case 'interactive':body=text(message.interactive?.button_reply?.title??message.interactive?.list_reply?.title,'[Interactive Response]');break;
  case 'button':body=text(message.button?.text,'[Button Click]');break;
  case 'image':body=`[Image Received: ${text(message.image?.caption,'No caption')}]`;break;
  case 'document':body=`[Document: ${text(message.document?.filename,'File')}]`;break;
  default:body=`[${message.type} Message]`;
 }
 return {phone:message.from as string,name:name||`WhatsApp Client (+${message.from})`,body};
}
/** The processed marker and lead commit together. Concurrent webhook retries wait on the same key. */
export async function recordWhatsAppInboundLead(pool:Pool,company:string,providerId:string,lead:{name:string;company:string;phone:string;service:string;budget:string;stage:string;intent_score:number|null;source:string;notes:string;ai_suggested_reply:string},message?:{body:string;kind:string;mediaId?:string},source?:VerifiedWhatsAppEvent,hooks?:InboundTransactionHooks){
 const event=source===undefined?undefined:verifiedWhatsAppEvent.parse(source);if(event&&!/^[\x21-\x7e]{1,255}$/.test(providerId))throw new Error('INVALID_PROVIDER_ID');
 let key=createHash('sha256').update(`whatsapp-inbound:${company}:${providerId}`).digest('hex');
 const connection=await pool.getConnection();
 try{
  await connection.beginTransaction();
  const [owner]:any=await connection.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[company]);
  if(owner.length!==1)throw new Error('Inbound company unavailable');
  company=owner[0].id;await hooks?.beforeWrite(connection);key=createHash('sha256').update(`whatsapp-inbound:${company}:${providerId}`).digest('hex');
  let disposition:any;
  if(event){
   const body=(message?.body||lead.notes||'').slice(0,8192),hash=salesHash(canonicalJson({source:event,contact:contactHash('WHATSAPP',lead.phone),body,kind:message?.kind||'text',mediaId:message?.mediaId||null}));
   const [clock]:any=await connection.query('SELECT UNIX_TIMESTAMP()*1000 now_ms');if(event.occurredAtMs>Number(clock[0].now_ms)+300000)throw new Error('INVALID_PROVIDER_TIMESTAMP');
   const [known]:any=await connection.query('SELECT * FROM whatsapp_inbound_events WHERE company_id=? AND event_key=? FOR UPDATE',[company,key]);
   if(known.length){if(known[0].input_hash!==hash){const state=await observeWhatsAppConflict(connection,company,known[0],hash,{source:event,contact:contactHash('WHATSAPP',lead.phone),body,kind:message?.kind||'text',mediaId:message?.mediaId||null});if(state==='REVIEWED')await hooks?.recorded(connection,false);else await hooks?.rejected?.(connection,'INBOUND_PROVIDER_EVENT_CONFLICT');await connection.commit();if(state==='REVIEWED')return false;throw new Error('INBOUND_PROVIDER_EVENT_CONFLICT');}await hooks?.recorded(connection,false);await connection.commit();return false;}
   const [old]:any=await connection.query('SELECT id FROM processed_webhook_events WHERE company_id=? AND id IN (?,?) LIMIT 1',[company,key,providerId]);if(old.length){await hooks?.recorded(connection,false);await connection.commit();return false;}
   const contact=contactHash('WHATSAPP',lead.phone);const [previous]:any=await connection.query(`SELECT MAX(last_ms) latest_ms FROM (SELECT MAX(occurred_at_ms) last_ms FROM whatsapp_inbound_events WHERE company_id=? AND contact_hash=? UNION ALL SELECT MAX(${inboundOccurredSql}) last_ms FROM sales_inbox_messages WHERE company_id=? AND channel='WHATSAPP' AND direction='INBOUND' AND contact_hash=?) clocks`,[company,contact,company,contact]);
   disposition=inboundDisposition(event.occurredAtMs,previous[0].latest_ms===null?null:Number(previous[0].latest_ms),Number(clock[0].now_ms),isWhatsAppOptOut(body));
   await connection.query('INSERT INTO whatsapp_inbound_events(company_id,event_key,phone_number_id,waba_id,provider_ref,contact_hash,input_hash,occurred_at_ms,disposition) VALUES (?,?,?,?,?,?,?,?,?)',[company,key,event.phoneNumberId,event.wabaId,providerId,contact,hash,event.occurredAtMs,disposition]);
  }
  // Respect old markers only when their original tenant matches this exact sender mapping.
  const [legacy]:any=await connection.query('SELECT id FROM processed_webhook_events WHERE id=? AND company_id=? LIMIT 1',[providerId,company]);
  if(legacy.length){await hooks?.recorded(connection,false);await connection.commit();return false;}
  const [marker]:any=await connection.query("INSERT IGNORE INTO processed_webhook_events(id,event_type,company_id) VALUES (?,'whatsapp_inbound_message',?)",[key,company]);
  if(marker.affectedRows!==1){await hooks?.recorded(connection,false);await connection.commit();return false;}
  await inboundSalesMessage(connection,owner[0].id,providerId,lead,message,event?{...event,disposition}:undefined);
  await hooks?.recorded(connection,true);await connection.commit();return true;
 }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}
