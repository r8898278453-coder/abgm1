import {inboundSalesMessage} from './salesWorkspace';
import {insertLeadRow} from './leadWriter';
import {createHash} from 'node:crypto';
import type {Pool} from 'mysql2/promise';
export function describeWhatsAppInbound(message:any,contact:any){
 if(typeof message?.id!=='string'||!/^[\x21-\x7e]{1,255}$/.test(message.id)||typeof message.from!=='string'||!/^\d{6,20}$/.test(message.from)||typeof message.type!=='string'||! /^[a-z_]{1,50}$/.test(message.type))throw new Error('Invalid inbound message');
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
export async function recordWhatsAppInboundLead(pool:Pool,company:string,providerId:string,lead:{name:string;company:string;phone:string;service:string;budget:string;stage:string;intent_score:number|null;source:string;notes:string;ai_suggested_reply:string},message?:{body:string;kind:string;mediaId?:string}){
 let key=createHash('sha256').update(`whatsapp-inbound:${company}:${providerId}`).digest('hex');
 const connection=await pool.getConnection();
 try{
  await connection.beginTransaction();
  const [owner]:any=await connection.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[company]);
  if(owner.length!==1)throw new Error('Inbound company unavailable');
  company=owner[0].id;key=createHash('sha256').update(`whatsapp-inbound:${company}:${providerId}`).digest('hex');
  // Respect old markers only when their original tenant matches this exact sender mapping.
  const [legacy]:any=await connection.query('SELECT id FROM processed_webhook_events WHERE id=? AND company_id=? LIMIT 1',[providerId,company]);
  if(legacy.length){await connection.commit();return false;}
  const [marker]:any=await connection.query("INSERT IGNORE INTO processed_webhook_events(id,event_type,company_id) VALUES (?,'whatsapp_inbound_message',?)",[key,company]);
  if(marker.affectedRows!==1){await connection.commit();return false;}
  await inboundSalesMessage(connection,owner[0].id,providerId,lead,message);
  await connection.commit();return true;
 }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}
