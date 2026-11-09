import type {Express,RequestHandler} from 'express';
import crypto from 'node:crypto';
import {publicLeadInput,publicLeadReceiptInput,publicLeadToken,normalizedPublicLead,PublicLeadError} from '../shared/publicLead';
export function registerPublicLeadRoutes(app:Express,deps:{rateLimit:RequestHandler;pool:()=>Promise<any>;resolve:(pool:any,token:string)=>Promise<{id:string;name:string}>;save:(pool:any,company:string,token:string,id:string,input:any,score:number|null)=>Promise<any>;receipt:(pool:any,company:string,token:string,id:string)=>Promise<any>;score:(input:any)=>number|null;notify:(pool:any,company:string,id:string,input:any)=>Promise<void>}){
 for(const mode of ['submit','receipt'] as const)app.post(mode==='submit'?['/api/public/leads','/api/public/lead']:['/api/public/leads/receipt'],deps.rateLimit,async(req,res)=>{
  res.set('Cache-Control','no-store');try{
   if(Object.keys(req.query).length){res.status(400).json({success:false,error:'Inquiry credentials must be in the request body'});return;}
   const parsed=(mode==='submit'?publicLeadInput:publicLeadReceiptInput).safeParse(req.body);if(!parsed.success){res.status(400).json({success:false,error:'Valid inquiry details, form token and request reference are required'});return;}
   const value=parsed.data as any;
   if(mode==='submit'&&(value._hp||value.website_url_hp||value._gotcha)){res.json({success:true,message:'Inquiry received'});return;}
   const pool=await deps.pool();if(!pool)throw new Error('DURABLE_INTAKE_UNAVAILABLE');const token=publicLeadToken(value);const company=await deps.resolve(pool,token);
   if(mode==='receipt'){const receipt=await deps.receipt(pool,company.id,token,value.requestId);if(!['RECEIVED','NOT_FOUND'].includes(receipt?.status)||receipt.status==='RECEIVED'&&typeof receipt.leadId!=='string')throw new Error('INVALID_RECEIPT');res.json({success:true,requestId:value.requestId,receipt:{status:receipt.status,...(receipt.status==='RECEIVED'?{leadId:receipt.leadId}:{})}});return;}
   const id=value.requestId||crypto.randomUUID(),input=normalizedPublicLead(value);const result=await deps.save(pool,company.id,token,id,input,deps.score(input));
   if(result.companyId!==company.id||result.requestId!==id||typeof result.leadId!=='string'||typeof result.created!=='boolean')throw new Error('INVALID_INTAKE_ACK');
   // A failed/uncertain alert cannot turn a confirmed lead commit into a failed public submission.
   if(result.created)try{await deps.notify(pool,company.id,id,input);}catch{}
   res.status(result.created?201:200).json({success:true,lead:{id:result.leadId},requestId:value.requestId||null,idempotent:!!value.requestId,duplicate:!result.created});
  }catch(error){res.status(error instanceof PublicLeadError?error.status:503).json({success:false,error:error instanceof PublicLeadError?error.message:'Inquiry outcome unavailable. Keep the same request reference and check its receipt before retrying.'});}
 });
}
