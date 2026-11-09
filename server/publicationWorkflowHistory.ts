import type {Pool} from 'mysql2/promise';
import {z} from 'zod';
import {withReadOnlySqlDeadline} from './readOnlySqlDeadline';
import {PublishingReviewError} from './publishingReview';
export const workflowHistoryQuery=z.object({before:z.string().regex(/^[1-9]\d{0,19}$/).refine(v=>BigInt(v)<=18446744073709551615n).optional()}).strict();
export async function readPublicationWorkflowHistory(pool:Pool,company:string,post:string,before?:string){
 workflowHistoryQuery.parse(before===undefined?{}:{before});
 return withReadOnlySqlDeadline(pool,async sql=>{
  const [posts]:any=await sql.query('SELECT id FROM content_posts WHERE id = ? AND company_id = ?',[post,company]);
  if(!posts.length)throw new PublishingReviewError(404,'Stored post not found in this workspace');
  const [rows]:any=await sql.query(`SELECT id,CAST(audit_sequence AS CHAR) AS sequence,actor_id,from_status,to_status,change_kind,schedule_before,schedule_after,
   UNIX_TIMESTAMP(recorded_at)*1000 AS recordedAtMs FROM publication_workflow_audit WHERE company_id = ? AND post_id = ? ${before?'AND audit_sequence < ?':''} ORDER BY audit_sequence DESC LIMIT 21`,before?[company,post,before]:[company,post]);
  const parse=(value:any)=>typeof value==='string'?JSON.parse(value):value;
  return {history:rows.slice(0,20).map((row:any)=>({...row,schedule_before:parse(row.schedule_before),schedule_after:parse(row.schedule_after),recordedAtMs:Number(row.recordedAtMs)})),nextBefore:rows.length>20?rows[19].sequence:null};
 });
}
