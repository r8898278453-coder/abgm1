// Fixed V15 coverage independent of the live reporting registry.
import {canonicalSnapshotReportV14,SNAPSHOT_ACTIVITY_V14,SNAPSHOT_BACKLOG_V14} from './reportSnapshotSchemaV14';

export const SNAPSHOT_ACTIVITY_V15={...SNAPSHOT_ACTIVITY_V14,
 digestContextUnavailable:'Daily digest pre-claim decision recorded · context unavailable',
 digestControlChanged:'Daily digest pre-claim decision recorded · controls changed before claim',
 digestRetainedLimit:'Daily digest pre-claim decision recorded · retained occurrence limit reached',
 digestRunningLimit:'Daily digest pre-claim decision recorded · another occurrence still running',
 digestReservationDeclined:'Daily digest pre-claim decision recorded · reservation declined',
 reviewContextUnavailable:'Review reminder pre-claim decision recorded · context unavailable',
 reviewControlChanged:'Review reminder pre-claim decision recorded · controls changed before claim',
 reviewRetainedLimit:'Review reminder pre-claim decision recorded · retained occurrence limit reached',
 reviewRunningLimit:'Review reminder pre-claim decision recorded · another occurrence still running',
 reviewReservationDeclined:'Review reminder pre-claim decision recorded · reservation declined',
 criticalContextUnavailable:'Critical alert pre-claim decision recorded · context unavailable',
 criticalControlChanged:'Critical alert pre-claim decision recorded · controls changed before claim',
 criticalRetainedLimit:'Critical alert pre-claim decision recorded · retained occurrence limit reached',
 criticalRunningLimit:'Critical alert pre-claim decision recorded · another occurrence still running',
 criticalReservationDeclined:'Critical alert pre-claim decision recorded · reservation declined',
} as const;

export const SNAPSHOT_BACKLOG_V15=SNAPSHOT_BACKLOG_V14;
export const SNAPSHOT_METRICS_V15={activity:Object.keys(SNAPSHOT_ACTIVITY_V15),backlog:Object.keys(SNAPSHOT_BACKLOG_V15)} as const;

export function canonicalSnapshotReportV15(input:any){
 const base=canonicalSnapshotReportV14(input);
 const read=(section:'activity'|'backlog',key:string)=>{
  const count=input[section]?.[key];
  if(!Number.isSafeInteger(count)||count<0)throw new Error('SNAPSHOT_REPORT_V15_COUNT_INVALID');
  return count;
 };
 const activity=Object.fromEntries(SNAPSHOT_METRICS_V15.activity.map(key=>[key,read('activity',key)]));
 const backlog=Object.fromEntries(SNAPSHOT_METRICS_V15.backlog.map(key=>[key,read('backlog',key)]));
 return {...base,activity,backlog};
}
