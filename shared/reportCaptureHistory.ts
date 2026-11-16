import {platformDayBounds} from './dailyWorkReport';
import {formatPlatformDateTime} from './platformTime';
export const CAPTURE_STATES=['QUEUED','SUCCEEDED','SKIPPED','FAILED'] as const;
export type CaptureHistoryState='ALL'|typeof CAPTURE_STATES[number];
export function validateCaptureHistory(v:any,company:string,state:CaptureHistoryState){
 if(v?.companyId!==company||v.state!==state||!Array.isArray(v.runs)||v.runs.length>25||!(v.nextCursor===null||typeof v.nextCursor==='string'&&/^[A-Za-z0-9_-]{1,512}$/.test(v.nextCursor)))throw new Error('CAPTURE_HISTORY_INVALID');
 const ids=new Set<string>();let last:any;
 for(const r of v.runs){if(!/^rcr_[a-f0-9]{32}$/.test(r.id)||ids.has(r.id)||!CAPTURE_STATES.includes(r.state)||state!=='ALL'&&r.state!==state||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!Number.isSafeInteger(r.createdAtMs)||r.createdAtMs<0||r.createdAtMs>8640000000000000||r.snapshotId!==null&&!/^rps_[a-f0-9]{32}$/.test(r.snapshotId)||r.reason!==null&&!(typeof r.reason==='string'&&/^[A-Z_]{1,64}$/.test(r.reason))||r.jobStatus!==null&&!['QUEUED','RUNNING','RETRY_WAIT','SUCCEEDED','FAILED','CANCELLED'].includes(r.jobStatus)||last&&(last.createdAtMs<r.createdAtMs||last.createdAtMs===r.createdAtMs&&last.id<=r.id))throw new Error('CAPTURE_HISTORY_ROW_INVALID');platformDayBounds(r.date);ids.add(r.id);last=r;}
 if(v.nextCursor&&v.runs.length!==25)throw new Error('CAPTURE_HISTORY_CURSOR_INVALID');return v;
}
export function captureHistoryCsv(v:any,company:string,state:CaptureHistoryState){validateCaptureHistory(v,company,state);const cell=(x:unknown)=>'"'+String(x??'').replace(/^(?=[\s]*[=+@-]|[\t\r\n])/,"'").replace(/"/g,'""')+'"';return [['client','filter','run','report_date_IST','capture_state','queue_state','reason','snapshot','recorded_IST'],...v.runs.map((r:any)=>[company,state,r.id,r.date,r.state,r.jobStatus,r.reason,r.snapshotId,formatPlatformDateTime(r.createdAtMs)])].map(row=>row.map(cell).join(',')).join('\r\n');}
