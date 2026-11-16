import type {Pool} from 'mysql2/promise';
import {z} from 'zod';
import {withReadOnlySqlDeadline} from './readOnlySqlDeadline';
import {CaptureScheduleError} from './reportCaptureSchedule';
import {CAPTURE_STATES,validateCaptureHistory} from '../shared/reportCaptureHistory';
const querySchema=z.object({state:z.enum(['ALL',...CAPTURE_STATES]).default('ALL'),before:z.string().regex(/^[A-Za-z0-9_-]{1,512}$/).optional()}).strict();
export function captureHistoryQuery(input:unknown){const r=querySchema.safeParse(input);if(!r.success)throw new CaptureScheduleError(400,'REPORT_CAPTURE_HISTORY_QUERY_INVALID');return r.data;}
export async function readCaptureHistory(pool:Pool,company:string,input:unknown){
 const q=captureHistoryQuery(input);let cursor:any;
 if(q.before)try{cursor=JSON.parse(Buffer.from(q.before,'base64url').toString('utf8'));if(Buffer.from(JSON.stringify(cursor)).toString('base64url')!==q.before||Object.keys(cursor).sort().join(',')!=='company,id,state,time,v'||cursor.v!==1||cursor.company!==company||cursor.state!==q.state||!/^rcr_[a-f0-9]{32}$/.test(cursor.id)||!Number.isSafeInteger(cursor.time)||cursor.time<0||cursor.time>8640000000000000)throw new Error();}catch{throw new CaptureScheduleError(400,'REPORT_CAPTURE_HISTORY_CURSOR_INVALID');}
 return withReadOnlySqlDeadline(pool,async sql=>{
  if(cursor){const [anchor]:any=await sql.query('SELECT id FROM report_capture_runs WHERE company_id=? AND id=? AND created_at=FROM_UNIXTIME(?/1000)',[company,cursor.id,cursor.time]);if(anchor.length!==1)throw new CaptureScheduleError(400,'REPORT_CAPTURE_HISTORY_CURSOR_INVALID');}
  const args:any[]=[company];let where='r.company_id=?';if(q.state!=='ALL'){where+=' AND r.state=?';args.push(q.state);}if(cursor){where+=' AND (r.created_at<FROM_UNIXTIME(?/1000) OR (r.created_at=FROM_UNIXTIME(?/1000) AND r.id<?))';args.push(cursor.time,cursor.time,cursor.id);}
  const [rows]:any=await sql.query(`SELECT r.id,r.report_date date,r.state,r.snapshot_id snapshotId,r.reason_code reason,j.status jobStatus,UNIX_TIMESTAMP(r.created_at)*1000 createdAtMs FROM report_capture_runs r LEFT JOIN job_queue j ON j.id=r.job_id AND j.company_id=r.company_id AND j.job_type='report_snapshot_capture' WHERE ${where} ORDER BY r.created_at DESC,r.id DESC LIMIT 26`,args);
  const runs=rows.slice(0,25).map((r:any)=>({...r,createdAtMs:Number(r.createdAtMs)})),last=runs.at(-1);const nextCursor=rows.length>25?Buffer.from(JSON.stringify({v:1,company,state:q.state,time:last.createdAtMs,id:last.id})).toString('base64url'):null;
  return validateCaptureHistory({companyId:company,state:q.state,runs,nextCursor},company,q.state);
 });
}
