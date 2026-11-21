// Fixed V9 coverage independent of the live reporting registry.
import {canonicalSnapshotReportV8,SNAPSHOT_ACTIVITY_V8,SNAPSHOT_BACKLOG_V8} from './reportSnapshotSchemaV8';

export const SNAPSHOT_ACTIVITY_V9={...SNAPSHOT_ACTIVITY_V8,
 admissionPublished:'Admissions with recorded publish success',
 admissionFailed:'Admissions with recorded publish failure',
 admissionUnconfirmed:'Admissions with unconfirmed publication',
 admissionInProgress:'Admissions with an active claim',
 admissionStale:'Admissions with a stale or undated claim',
 admissionMissingClaim:'Admissions without a current claim',
 admissionDifferentClaim:'Admissions with a different current claim',
 admissionOther:'Admissions with another claim state',
} as const;

export const SNAPSHOT_BACKLOG_V9=SNAPSHOT_BACKLOG_V8;
export const SNAPSHOT_METRICS_V9={activity:Object.keys(SNAPSHOT_ACTIVITY_V9),backlog:Object.keys(SNAPSHOT_BACKLOG_V9)} as const;

export function canonicalSnapshotReportV9(input:any){
 const base=canonicalSnapshotReportV8(input);
 const read=(section:'activity'|'backlog',key:string)=>{
  const count=input[section]?.[key];
  if(!Number.isSafeInteger(count)||count<0)throw new Error('SNAPSHOT_REPORT_V9_COUNT_INVALID');
  return count;
 };
 const activity=Object.fromEntries(SNAPSHOT_METRICS_V9.activity.map(key=>[key,read('activity',key)]));
 const backlog=Object.fromEntries(SNAPSHOT_METRICS_V9.backlog.map(key=>[key,read('backlog',key)]));
 return {...base,activity,backlog};
}
