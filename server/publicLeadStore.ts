import {insertLeadRow} from './leadWriter';
import crypto from 'node:crypto';
import type {Pool} from 'mysql2/promise';
import {PublicLeadError,type PublicLeadDetails} from '../shared/publicLead';
const requestKey=(id:string)=>crypto.createHash('sha256').update(id.toLowerCase()).digest('hex');
export async function resolvePublicLeadCompany(pool:Pool,token:string){const [rows]:any=await pool.query('SELECT id,name FROM companies WHERE public_form_token=? AND BINARY public_form_token=BINARY ? LIMIT 2',[token,token]);if(rows.length!==1)throw new PublicLeadError(400,'INVALID_FORM','Inquiry form unavailable');return rows[0] as {id:string;name:string};}
/** Company/token ownership, immutable receipt and canonical lead commit together. No network inside this transaction. */
export async function savePublicLeadIntake(pool:Pool,company:string,token:string,id:string,input:PublicLeadDetails,score:number|null){
 const key=requestKey(id);const hash=crypto.createHash('sha256').update(JSON.stringify(['public-inquiry-v1',...['name','company','phone','email','service','budget','source','notes'].map(field=>input[field])])).digest('hex');
 const conn=await pool.getConnection();try{
  await conn.beginTransaction();const [owner]:any=await conn.query('SELECT id,name FROM companies WHERE id=? AND BINARY public_form_token=BINARY ? FOR UPDATE',[company,token]);if(owner.length!==1)throw new PublicLeadError(400,'INVALID_FORM','Inquiry form unavailable');
  const [existing]:any=await conn.query('SELECT input_hash,lead_id FROM public_lead_intakes WHERE company_id=? AND request_key=?',[company,key]);
  if(existing.length){if(existing[0].input_hash!==hash)throw new PublicLeadError(409,'INQUIRY_CONFLICT','This inquiry reference already belongs to different details. Check its receipt before starting again.');await conn.commit();return {companyId:company,requestId:id,leadId:existing[0].lead_id,created:false};}
  const leadId='lead_'+crypto.createHash('sha256').update(company+'\0public-inquiry\0'+key).digest('hex').slice(0,48);
  await insertLeadRow(conn,{id:leadId,company_id:company,name:input.name,company:input.company||'Direct Client',phone:input.phone,email:input.email,service:input.service||'Inquiry',budget:input.budget||'Custom Proposal',stage:'new',intent_score:score,source:input.source||'Website inquiry',notes:input.notes,ai_suggested_reply:`Hello ${input.name}, thank you for contacting ${owner[0].name}. Your inquiry has been received.`});
  await conn.query('INSERT INTO public_lead_intakes(company_id,request_key,input_hash,lead_id) VALUES (?,?,?,?)',[company,key,hash,leadId]);
  await conn.commit();return {companyId:company,requestId:id,leadId,created:true};
 }catch(error){await conn.rollback();throw error;}finally{conn.release();}
}
export async function readPublicLeadReceipt(pool:Pool,company:string,token:string,id:string){
 const [rows]:any=await pool.query('SELECT i.lead_id FROM public_lead_intakes i JOIN companies c ON c.id=i.company_id WHERE c.id=? AND BINARY c.public_form_token=BINARY ? AND i.request_key=? LIMIT 1',[company,token,requestKey(id)]);
 // NOT_FOUND is an observation at read time. A concurrent first transaction may still commit; retries retain the same key.
 return rows.length?{status:'RECEIVED' as const,leadId:rows[0].lead_id}:{status:'NOT_FOUND' as const};
}
/** One best-effort post-commit notification owner. Replays never authorize a second transport attempt. */
export async function notifyPublicLeadOnce(pool:Pool,company:string,id:string,send:()=>Promise<boolean>){
 const [claim]:any=await pool.query("UPDATE public_lead_intakes SET notification_state='STARTED' WHERE company_id=? AND request_key=? AND notification_state='NOT_ATTEMPTED'",[company,requestKey(id)]);if(claim.affectedRows!==1)return;
 let state='UNCONFIRMED';try{if(await send())state='API_ACCEPTED';}catch{}
 await pool.query("UPDATE public_lead_intakes SET notification_state=? WHERE company_id=? AND request_key=? AND notification_state='STARTED'",[state,company,requestKey(id)]);
}
