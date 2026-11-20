import express,{type Express,type Request,type RequestHandler} from 'express';
import {createHmac,timingSafeEqual} from 'node:crypto';
import type {Pool} from 'mysql2/promise';
import {EmailReceiptError,parseSalesEmailReceipt,readEmailWebhookSecret,recordSalesEmailReceipt,salesEmailWebhooksEnabled} from './salesEmailReceipts';

const rawJson=express.raw({type:'application/json',limit:'64kb',inflate:false});
const path='/api/webhooks/resend/:companyId';
export const salesEmailWebhookBodyParser:RequestHandler=(req,res,next)=>{
 if(req.method!=='POST'){next();return;}
 rawJson(req,res,error=>{
  if(error){res.status(error.type==='entity.too.large'?413:400).json({error:'EMAIL_WEBHOOK_INPUT_INVALID'});return;}
  next();
 });
};

function signedRequest(req:Request,now:number){
 const id=req.headers['svix-id'],stamp=req.headers['svix-timestamp'],signatures=req.headers['svix-signature'];
 if(!Buffer.isBuffer(req.body)||!req.body.length||req.body.length>65536||
    typeof id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(id)||
    typeof stamp!=='string'||!/^\d{10}$/.test(stamp)||Math.abs(now-Number(stamp)*1000)>300000||
    typeof signatures!=='string'||signatures.length>512){
  throw new EmailReceiptError(403,'EMAIL_WEBHOOK_SIGNATURE_INVALID');
 }
 return {id,stamp,signatures,raw:req.body as Buffer};
}

function verifySignature(request:ReturnType<typeof signedRequest>,secret:string){
 if(!/^whsec_[A-Za-z0-9+/]{22,128}={0,2}$/.test(secret))throw new EmailReceiptError(503,'EMAIL_WEBHOOK_UNAVAILABLE');
 const key=Buffer.from(secret.slice(6),'base64');
 if(key.length<16||key.length>64)throw new EmailReceiptError(503,'EMAIL_WEBHOOK_UNAVAILABLE');
 const expected=createHmac('sha256',key).update(request.id+'.'+request.stamp+'.').update(request.raw).digest();
 const match=request.signatures.split(/ +/).some(entry=>{
  if(!/^v1,[A-Za-z0-9+/]{43}=$/.test(entry))return false;
  const value=Buffer.from(entry.slice(3),'base64');
  return value.length===expected.length&&timingSafeEqual(value,expected);
 });
 if(!match)throw new EmailReceiptError(403,'EMAIL_WEBHOOK_SIGNATURE_INVALID');
}

export function registerSalesEmailWebhook(app:Express,deps:{pool:()=>Promise<Pool|null>;enabled?:()=>boolean;clock?:()=>number}){
 app.post(path,async(req,res)=>{
  res.set('Cache-Control','no-store');
  try{
   if(!(deps.enabled||salesEmailWebhooksEnabled)())throw new EmailReceiptError(503,'EMAIL_WEBHOOK_UNAVAILABLE');
   const company=req.params.companyId;
   if(!/^[A-Za-z0-9_-]{1,64}$/.test(company)||Object.keys(req.query).length)throw new EmailReceiptError(400,'EMAIL_WEBHOOK_INPUT_INVALID');
   const now=(deps.clock||Date.now)(),request=signedRequest(req,now);
   const pool=await deps.pool();
   if(!pool)throw new EmailReceiptError(503,'EMAIL_WEBHOOK_UNAVAILABLE');
   const secret=await readEmailWebhookSecret(pool,company);
   if(!secret)throw new EmailReceiptError(403,'EMAIL_WEBHOOK_SIGNATURE_INVALID');
   verifySignature(request,secret);
   let payload:unknown;
   try{payload=JSON.parse(request.raw.toString('utf8'));}catch{throw new EmailReceiptError(400,'EMAIL_WEBHOOK_INPUT_INVALID');}
   const receipt=parseSalesEmailReceipt(payload,now);
   const status=receipt?await recordSalesEmailReceipt(pool,company,request.id,receipt,secret):'ignored';
   res.json({status});
  }catch(error){
   res.status(error instanceof EmailReceiptError?error.status:503).json({error:error instanceof EmailReceiptError?error.code:'EMAIL_WEBHOOK_UNAVAILABLE'});
  }
 });
}
