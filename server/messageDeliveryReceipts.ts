import {exitSalesWorkflows} from './salesWorkflowLifecycle';
import {messageReceiptInput} from '../shared/dispatchCorrelation';
import {reconcileDispatchReceipt} from './dispatchCorrelation';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import type {Pool} from 'mysql2/promise';
import type {ReadOnlySql} from './readOnlySqlDeadline';
export const receiptInput=messageReceiptInput;
export type MessageReceipt=z.infer<typeof receiptInput>;
export async function recordMessageReceipt(pool:Pick<Pool,'query'>,company:string,input:MessageReceipt){
 const value=receiptInput.parse(input);const store=async(sql:Pick<Pool,'query'>)=>{const key=createHash('sha256').update(JSON.stringify([value.phoneNumberId,value.providerId,value.status,value.occurredAtMs,value.errorCode??null])).digest('hex');await sql.query(`INSERT INTO message_delivery_receipts(company_id,event_key,phone_number_id,provider_id,status,occurred_at_ms,error_code) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE event_key=VALUES(event_key)`,[company,key,value.phoneNumberId,value.providerId,value.status,value.occurredAtMs,value.errorCode??null]);if(value.correlation)await reconcileDispatchReceipt(sql,company,value);if(value.status==='failed'){const [linked]:any=await sql.query("SELECT DISTINCT a.enrollment_id FROM sales_message_approvals a JOIN message_dispatch_intents i ON i.company_id=a.company_id AND i.request_key=a.dispatch_key WHERE a.company_id=? AND i.status='API_ACCEPTED' AND i.sender_id=? AND BINARY i.provider_id=BINARY ? AND a.state IN ('DISPATCHING','UNKNOWN','API_ACCEPTED')",[company,value.phoneNumberId,value.providerId]);for(const row of linked)await exitSalesWorkflows(sql as any,company,'OUTBOUND_DELIVERY_FAILED','provider-receipt',{enrollmentId:row.enrollment_id});}};
 if((value.correlation||value.status==='failed')&&typeof (pool as any).getConnection==='function'){const c=await (pool as Pool).getConnection();try{await c.beginTransaction();const[rows]:any=await c.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[company]);if(rows.length!==1&&value.correlation)throw Error('RECEIPT_COMPANY_UNAVAILABLE');await store(c);await c.commit();}catch(error){await c.rollback();throw error;}finally{c.release();}}else await store(pool);
}

export function deliveryFromStatuses(statuses:Set<string>){if([...statuses].some(s=>!['sent','delivered','read','failed'].includes(s)))throw new Error('Invalid receipt state');return statuses.has('read')?'READ':statuses.has('delivered')?'DELIVERED':statuses.has('failed')?'FAILED':statuses.has('sent')?'SENT':'UNOBSERVED';}
export async function readMessageDelivery(sql:ReadOnlySql,company:string,provider:string|null,sender:string|null){
 if(!provider||!sender)return {delivery:'UNOBSERVED',receiptCount:0,conflicting:false,lastReceiptAtMs:null};
 const [rows]:any=await sql.query('SELECT status,COUNT(*) AS count,MAX(UNIX_TIMESTAMP(received_at)*1000) AS lastAt FROM message_delivery_receipts WHERE company_id=? AND provider_id=? AND phone_number_id=? GROUP BY status',[company,provider,sender]);
 const statuses=new Set<string>(rows.map((row:any)=>row.status));if(rows.some((row:any)=>!['sent','delivered','read','failed'].includes(row.status)))throw new Error('Invalid receipt state');
 const delivery=deliveryFromStatuses(statuses);
 return {delivery,receiptCount:rows.reduce((total:number,row:any)=>total+Number(row.count),0),conflicting:statuses.has('failed')&&(statuses.has('read')||statuses.has('delivered')),lastReceiptAtMs:rows.length?Math.max(...rows.map((row:any)=>Number(row.lastAt))):null};
}
