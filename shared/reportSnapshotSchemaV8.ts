// Fixed V8 coverage independent of the live reporting registry.
import {canonicalSnapshotReportV7,SNAPSHOT_ACTIVITY_V7,SNAPSHOT_BACKLOG_V7} from './reportSnapshotSchemaV7';

export const SNAPSHOT_ACTIVITY_V8={...SNAPSHOT_ACTIVITY_V7,
 queueAdmitted:'Queue jobs admitted',
 queueClaimed:'Queue jobs claimed',
 queueRetryFailed:'Queue jobs with retryable failures',
 queueTerminalFailed:'Queue jobs with terminal failures',
 queueExhausted:'Queue jobs with exhausted attempts',
 queueCancelled:'Queue jobs cancelled',
} as const;

export const SNAPSHOT_BACKLOG_V8={...SNAPSHOT_BACKLOG_V7,
 queueDue:'Queued jobs due',
 queueScheduled:'Queued jobs scheduled for later',
 queueRetryDue:'Retries due',
 queueRetryScheduled:'Retries scheduled for later',
 queueStaleLease:'Running jobs with expired leases',
 queueMissingLease:'Running jobs missing lease timestamps',
} as const;
export const SNAPSHOT_METRICS_V8={activity:Object.keys(SNAPSHOT_ACTIVITY_V8),backlog:Object.keys(SNAPSHOT_BACKLOG_V8)} as const;

export function canonicalSnapshotReportV8(input:any){
 const base=canonicalSnapshotReportV7(input);
 const read=(section:'activity'|'backlog',key:string)=>{
  const count=input[section]?.[key];
  if(!Number.isSafeInteger(count)||count<0)throw new Error('SNAPSHOT_REPORT_V8_COUNT_INVALID');
  return count;
 };
 const activity=Object.fromEntries(SNAPSHOT_METRICS_V8.activity.map(key=>[key,read('activity',key)]));
 const backlog=Object.fromEntries(SNAPSHOT_METRICS_V8.backlog.map(key=>[key,read('backlog',key)]));
 return {...base,activity,backlog};
}
