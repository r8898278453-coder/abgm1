import {createHash} from 'node:crypto';
import {z} from 'zod';
import type {Pool} from 'mysql2/promise';
import type {ReadOnlySql} from './readOnlySqlDeadline';
export const receiptInput=z.object({phoneNumberId:z.string().regex(/^\d{1,64}$/),providerId:z.string().regex(/^[\x21-\x7e]{1,255}$/),status:z.enum(['sent','delivered','read','failed']),occurredAtMs:z.number().int().nonnegative().max(8640000000000000),errorCode:z.number().int().nonnegative().max(4294967295).optional()}).strict();
export type MessageReceipt=z.infer<typeof receiptInput>;
export async function recordMessageReceipt(pool:Pool,company:string,input:MessageReceipt){
 const value=receiptInput.parse(input);const key=createHash('sha256').update(JSON.stringify([value.phoneNumberId,value.providerId,value.status,value.occurredAtMs,value.errorCode??null])).digest('hex');
 await pool.query(`INSERT INTO message_delivery_receipts(company_id,event_key,phone_number_id,provider_id,status,occurred_at_ms,error_code) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE event_key=VALUES(event_key)`,[company,key,value.phoneNumberId,value.providerId,value.status,value.occurredAtMs,value.errorCode??null]);
}
export async function readMessageDelivery(sql:ReadOnlySql,company:string,provider:string|null,sender:string|null){
 if(!provider||!sender)return {delivery:'UNOBSERVED',receiptCount:0,conflicting:false,lastReceiptAtMs:null};
 const [rows]:any=await sql.query('SELECT status,COUNT(*) AS count,MAX(UNIX_TIMESTAMP(received_at)*1000) AS lastAt FROM message_delivery_receipts WHERE company_id=? AND provider_id=? AND phone_number_id=? GROUP BY status',[company,provider,sender]);
 const statuses=new Set(rows.map((row:any)=>row.status));if(rows.some((row:any)=>!['sent','delivered','read','failed'].includes(row.status)))throw new Error('Invalid receipt state');
 const delivery=statuses.has('read')?'READ':statuses.has('delivered')?'DELIVERED':statuses.has('failed')?'FAILED':statuses.has('sent')?'SENT':'UNOBSERVED';
 return {delivery,receiptCount:rows.reduce((total:number,row:any)=>total+Number(row.count),0),conflicting:statuses.has('failed')&&(statuses.has('read')||statuses.has('delivered')),lastReceiptAtMs:rows.length?Math.max(...rows.map((row:any)=>Number(row.lastAt))):null};
}
