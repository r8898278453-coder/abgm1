import type {Pool} from 'mysql2/promise';
import {z} from 'zod';
import {PUBLICATION_CHANNELS} from '../shared/publicationControls';
import {withReadOnlySqlDeadline} from './readOnlySqlDeadline';
import {PublishingReviewError} from './publishingReview';
export const controlHistoryQuery=z.object({before:z.string().regex(/^[1-9]\d{0,19}$/).refine(value=>BigInt(value)<=18446744073709551615n).optional()}).strict();
function state(value:any){
 const parsed=typeof value==='string'?JSON.parse(value):value;
 if(typeof parsed?.paused!=='boolean'||!Array.isArray(parsed.channels)||parsed.channels.length>5||parsed.channels.some((v:any)=>!PUBLICATION_CHANNELS.includes(v)))throw new Error('INVALID_CONTROL_HISTORY');
 if(parsed.dailyPostLimit!==undefined&&parsed.dailyPostLimit!==null&&(!Number.isInteger(parsed.dailyPostLimit)||parsed.dailyPostLimit<1||parsed.dailyPostLimit>100000))throw new Error('INVALID_CONTROL_HISTORY');
 return {paused:parsed.paused,channels:parsed.channels,...(parsed.dailyPostLimit!==undefined?{dailyPostLimit:parsed.dailyPostLimit}:{})};
}
export async function readPublicationControlHistory(pool:Pool,company:string,before?:string){
 controlHistoryQuery.parse(before===undefined?{}:{before});
 return withReadOnlySqlDeadline(pool,async sql=>{
  const [companies]:any=await sql.query('SELECT id FROM companies WHERE id = ?',[company]);if(!companies.length)throw new PublishingReviewError(404,'Workspace not found');
  const [rows]:any=await sql.query(`SELECT id,CAST(revision AS CHAR) AS version,actor_id,before_state,after_state,UNIX_TIMESTAMP(recorded_at)*1000 AS recordedAtMs FROM publication_control_audit
    WHERE company_id = ? ${before?'AND revision < ?':''} ORDER BY revision DESC LIMIT 21`,before?[company,before]:[company]);
  return {history:rows.slice(0,20).map((row:any)=>({...row,before_state:state(row.before_state),after_state:state(row.after_state),recordedAtMs:row.recordedAtMs===null?null:Number(row.recordedAtMs)})),nextBefore:rows.length>20?rows[19].version:null};
 });
}
