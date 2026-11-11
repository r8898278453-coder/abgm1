import {OPERATION_STATES} from '../shared/operationStates';
import {readMessageDelivery} from './messageDeliveryReceipts';
import type {Pool} from 'mysql2/promise';
import type {Express,Request} from 'express';
import type {DbUser} from './db';
import {withReadOnlySqlDeadline} from './readOnlySqlDeadline';
export async function readMessageDispatchStatus(pool:Pool,company:string,key:string){
 return withReadOnlySqlDeadline(pool,async sql=>{
  const [rows]:any=await sql.query('SELECT status,provider_id,sender_id,UNIX_TIMESTAMP(created_at)*1000 AS createdAtMs,UNIX_TIMESTAMP(updated_at)*1000 AS updatedAtMs FROM message_dispatch_intents WHERE company_id=? AND request_key=?',[company,key]);
  if(!rows.length)return null;const row=rows[0];
  if(!Object.hasOwn(OPERATION_STATES.message,row.status))throw new Error('Invalid dispatch state');
  if(row.status==='API_ACCEPTED'&&(typeof row.provider_id!=='string'||!row.provider_id.trim()))throw new Error('Invalid accepted dispatch');
  const delivery=await readMessageDelivery(sql,company,row.provider_id,row.sender_id);
  return {...delivery,status:row.status,providerId:row.status==='API_ACCEPTED'?row.provider_id:null,createdAtMs:row.createdAtMs===null?null:Number(row.createdAtMs),updatedAtMs:row.updatedAtMs===null?null:Number(row.updatedAtMs),needsReview:['IN_PROGRESS','UNKNOWN'].includes(row.status)};
 });
}
export function registerMessageDispatchStatus(app:Express,deps:{auth:(req:Request)=>Promise<DbUser|null>;access:(user:DbUser,company:string)=>Promise<{authorized:boolean;status:number}>;read:(company:string,key:string)=>Promise<unknown|null>}){
 app.get('/api/companies/:companyId/message-dispatch/:key',async(req,res)=>{
  try{
   const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
   if(req.params.companyId.length>64||!/^[a-f0-9]{64}$/.test(req.params.key)||Object.keys(req.query).length){res.status(400).json({success:false,error:'Invalid dispatch lookup'});return;}
   const access=await deps.access(user,req.params.companyId);if(!access.authorized){res.status(access.status).json({success:false,error:'Dispatch access denied'});return;}
   const dispatch=await deps.read(req.params.companyId,req.params.key);if(!dispatch){res.status(404).json({success:false,error:'Dispatch request not found'});return;}
   res.set('Cache-Control','no-store').json({success:true,companyId:req.params.companyId,dispatch});
  }catch{res.status(503).json({success:false,error:'Dispatch state unavailable'});}
 });
}
