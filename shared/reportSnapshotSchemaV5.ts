// Fixed V5 coverage. Keep these definitions independent of the live report registry.
import {canonicalSnapshotReportV4,SNAPSHOT_ACTIVITY_V4,SNAPSHOT_BACKLOG_V4} from './reportSnapshotSchemaV4';

export const SNAPSHOT_ACTIVITY_V5={...SNAPSHOT_ACTIVITY_V4,
 appointmentBookingRevisions:'Booking confirmations or changes recorded',
 appointmentCancellations:'Appointment cancellations recorded',
 appointmentOutcomesRecorded:'First appointment outcomes recorded',
 appointmentOutcomesCorrected:'Appointment outcome corrections recorded',
} as const;
export const SNAPSHOT_BACKLOG_V5={...SNAPSHOT_BACKLOG_V4,
 appointmentOutcomesAwaiting:'Ended appointments awaiting a recorded outcome',
} as const;
export const SNAPSHOT_METRICS_V5={activity:Object.keys(SNAPSHOT_ACTIVITY_V5),backlog:Object.keys(SNAPSHOT_BACKLOG_V5)} as const;

export function canonicalSnapshotReportV5(input:any){
 const base=canonicalSnapshotReportV4(input);
 const read=(section:'activity'|'backlog',key:string)=>{
  const count=input[section]?.[key];
  if(!Number.isSafeInteger(count)||count<0)throw new Error('SNAPSHOT_REPORT_V5_COUNT_INVALID');
  return count;
 };
 const activity=Object.fromEntries(SNAPSHOT_METRICS_V5.activity.map(key=>[key,read('activity',key)]));
 const backlog=Object.fromEntries(SNAPSHOT_METRICS_V5.backlog.map(key=>[key,read('backlog',key)]));
 return {...base,activity,backlog};
}
