import {parseWhatsAppTimestamp,type VerifiedWhatsAppEvent} from '../shared/whatsAppEvents';
import express,{type Express,type Request,type RequestHandler} from 'express';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {receiptInput,type MessageReceipt} from './messageDeliveryReceipts';
import {describeWhatsAppInbound} from './whatsAppInbound';
const webhookJson=express.json({limit:'1mb',verify:(req,_res,body)=>{(req as any).rawBody=Buffer.from(body);}});
/** Mount before the general JSON parser so webhook bodies are capped before JSON decoding. */
export const whatsAppWebhookBodyParser:RequestHandler=(req,res,next)=>{if(req.method!=='POST'){next();return;}webhookJson(req,res,error=>{if(error){res.status(error.type==='entity.too.large'?413:400).json({error:'Invalid or oversized webhook body'});return;}next();});};
export type WhatsAppWebhookItem={phone:string;waba:string;receipt?:MessageReceipt;message?:any;contact?:any;source?:VerifiedWhatsAppEvent};
export function registerWhatsAppWebhook(app:Express,deps:{secret:()=>string|undefined;resolve:(phone:string,waba:string)=>Promise<string|null>}&({intake:(company:string,item:WhatsAppWebhookItem)=>Promise<void>}|{receipt:(company:string,input:MessageReceipt)=>Promise<void>;inbound:(company:string,message:any,contact:any,source:VerifiedWhatsAppEvent)=>Promise<void>})){
 app.post('/api/whatsapp/webhook',async(req:Request,res)=>{
  try{
   const secret=deps.secret();if(!secret){res.status(503).json({error:'Webhook signature configuration unavailable'});return;}
   const raw=(req as any).rawBody;const signature=req.headers['x-hub-signature-256'];
   if(!Buffer.isBuffer(raw)||typeof signature!=='string'||!/^sha256=[a-f0-9]{64}$/.test(signature)){res.status(403).json({error:'Invalid webhook signature'});return;}
   if(raw.length>1024*1024){res.status(413).json({error:'Webhook body too large'});return;}
   const expected=createHmac('sha256',secret).update(raw).digest();if(!timingSafeEqual(Buffer.from(signature.slice(7),'hex'),expected)){res.status(403).json({error:'Invalid webhook signature'});return;}
   let payload:any;try{payload=JSON.parse(raw.toString('utf8'));}catch{res.status(400).json({error:'Invalid webhook body'});return;}
   if(!payload||payload.object!=='whatsapp_business_account'||!Array.isArray(payload.entry)||payload.entry.length>10){res.status(400).json({error:'Unsupported webhook envelope'});return;}
   const work:WhatsAppWebhookItem[]=[];let ignored=0;
   try{
    for(const entry of payload.entry){
     if(typeof entry.id!=='string'||!/^\d{1,64}$/.test(entry.id)||!Array.isArray(entry.changes)||entry.changes.length>20)throw new Error();
     for(const change of entry.changes){
      const value=change?.value;if(!value||typeof value!=='object'||Array.isArray(value)||typeof change.field!=='string'||change.field.length>64)throw new Error();if(change.field!=='messages'){ignored++;if(work.length+ignored>100)throw new Error();continue;}const statuses=value.statuses??[],messages=value.messages??[];
      const contacts=value.contacts??[];if(!Array.isArray(contacts)||contacts.length>100||contacts.some((c:any)=>!c||typeof c.wa_id!=='string'||!/^[1-9]\d{5,14}$/.test(c.wa_id)))throw new Error();
      if(!Array.isArray(statuses)||!Array.isArray(messages)||statuses.length+messages.length>100)throw new Error();
      const phone=value.metadata?.phone_number_id;if((statuses.length||messages.length)&&(typeof phone!=='string'||!/^\d{1,64}$/.test(phone)))throw new Error();
      for(const status of statuses){
       if(!['sent','delivered','read','failed'].includes(status?.status)){ignored++;continue;}
       const input=receiptInput.parse({phoneNumberId:phone,providerId:status.id,status:status.status,occurredAtMs:parseWhatsAppTimestamp(status.timestamp),...(status.errors?.[0]?.code!==undefined?{errorCode:status.errors[0].code}:{})});
       if(input.occurredAtMs>Date.now()+300000)throw new Error();work.push({phone,waba:entry.id,receipt:input});
      }
      for(const message of messages){
       if(typeof message?.id!=='string'||!message.id||message.id.length>255||typeof message.from!=='string'||!/^[1-9]\d{5,14}$/.test(message.from))throw new Error();
       const matches=contacts.filter((contact:any)=>contact.wa_id===message.from),contact=matches.length===1?matches[0]:undefined;const source={phoneNumberId:phone,wabaId:entry.id,occurredAtMs:parseWhatsAppTimestamp(message.timestamp)};
       describeWhatsAppInbound(message,contact);work.push({phone,waba:entry.id,message,contact,source});
      }
      if(work.length+ignored>100)throw new Error();
     }
    }
   }catch{res.status(400).json({error:'Invalid or oversized webhook events'});return;}
   const owners=new Map<string,string|null>();let receipts=0,inbound=0,unmapped=0,failed=0;
   for(const item of work){const scope=`${item.waba}:${item.phone}`;if(!owners.has(scope))owners.set(scope,await deps.resolve(item.phone,item.waba));const company=owners.get(scope);if(!company){unmapped++;continue;}
    if('intake' in deps){try{await deps.intake(company,item);if(item.receipt)receipts++;else inbound++;}catch{failed++;}}else if(item.receipt){await deps.receipt(company,item.receipt);receipts++;}else{await deps.inbound(company,item.message,item.contact,item.source!);inbound++;}
   }
   if(failed){res.status(503).json({error:'Webhook storage unavailable; retry delivery',receipts,inbound,unmapped,ignored,failed});return;}
   if(unmapped){res.status(503).json({error:'Webhook sender mapping unavailable; retry delivery',receipts,inbound,unmapped,ignored});return;}
   res.json({status:'recorded',receipts,inbound,unmapped,ignored});
  }catch{res.status(503).json({error:'Webhook storage unavailable; retry delivery'});}
 });
}
