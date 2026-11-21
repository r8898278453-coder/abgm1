// Fixed V6 coverage independent of the live reporting registry.
import {canonicalSnapshotReportV5,SNAPSHOT_ACTIVITY_V5,SNAPSHOT_BACKLOG_V5} from './reportSnapshotSchemaV5';

export const SNAPSHOT_ACTIVITY_V6={...SNAPSHOT_ACTIVITY_V5,
 emailSent:'Emails reported sent',
 emailDelayed:'Emails with delivery delays',
 emailDelivered:'Emails reported delivered',
 emailFailed:'Emails reported failed',
 emailBounced:'Emails reported bounced',
 emailSuppressed:'Emails reported suppressed',
 emailComplained:'Emails with spam complaints',
 emailRepliesLinked:'Linked email replies',
 emailReplyOptOuts:'Opt-outs from linked email replies',
 emailIntakesQueued:'Email replies admitted for recovery',
 emailIntakesRecorded:'Email reply intakes recorded',
 emailIntakesIgnored:'Email reply intakes ignored',
 emailIntakesFailed:'Email reply intakes failed',
 emailIntakesExpired:'Email reply intakes expired',
} as const;

export const SNAPSHOT_BACKLOG_V6={...SNAPSHOT_BACKLOG_V5,
 emailIntakesPending:'Email reply intakes pending',
 emailIntakesRunning:'Email reply intakes running',
} as const;
export const SNAPSHOT_METRICS_V6={activity:Object.keys(SNAPSHOT_ACTIVITY_V6),backlog:Object.keys(SNAPSHOT_BACKLOG_V6)} as const;

export function canonicalSnapshotReportV6(input:any){
 const base=canonicalSnapshotReportV5(input);
 const read=(section:'activity'|'backlog',key:string)=>{
  const count=input[section]?.[key];
  if(!Number.isSafeInteger(count)||count<0)throw new Error('SNAPSHOT_REPORT_V6_COUNT_INVALID');
  return count;
 };
 const activity=Object.fromEntries(SNAPSHOT_METRICS_V6.activity.map(key=>[key,read('activity',key)]));
 const backlog=Object.fromEntries(SNAPSHOT_METRICS_V6.backlog.map(key=>[key,read('backlog',key)]));
 return {...base,activity,backlog};
}
