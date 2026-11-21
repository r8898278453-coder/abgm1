// Fixed V11 coverage independent of the live reporting registry.
import {canonicalSnapshotReportV10,SNAPSHOT_ACTIVITY_V10,SNAPSHOT_BACKLOG_V10} from './reportSnapshotSchemaV10';

export const SNAPSHOT_ACTIVITY_V11={...SNAPSHOT_ACTIVITY_V10,
 providerCheckMatched:'Provider read-back checks matched',
 providerCheckMismatch:'Provider read-back checks mismatched',
 providerCheckUnavailable:'Provider read-back checks unavailable',
 providerCheckStale:'Provider read-back checks stale',
 operatorObservedPublished:'Operator reviews reporting a publication',
 operatorPublicationNotFound:'Operator reviews reporting no publication found',
 operatorPublicationUnresolved:'Operator reviews with unresolved publication',
 plannedPosts:'Posts with a saved date for the selected day',
 plannedWithSameDayAdmission:'Dated posts with same-day admission',
 plannedWithOtherDayAdmission:'Dated posts admitted only on another day',
 plannedWithoutAdmission:'Dated posts with no retained admission',
 plannedScheduledWithoutAdmission:'Scheduled posts with no retained admission',
 plannedApprovalWithoutAdmission:'Posts awaiting approval with no retained admission',
} as const;

export const SNAPSHOT_BACKLOG_V11=SNAPSHOT_BACKLOG_V10;
export const SNAPSHOT_METRICS_V11={activity:Object.keys(SNAPSHOT_ACTIVITY_V11),backlog:Object.keys(SNAPSHOT_BACKLOG_V11)} as const;

export function canonicalSnapshotReportV11(input:any){
 const base=canonicalSnapshotReportV10(input);
 const read=(section:'activity'|'backlog',key:string)=>{
  const count=input[section]?.[key];
  if(!Number.isSafeInteger(count)||count<0)throw new Error('SNAPSHOT_REPORT_V11_COUNT_INVALID');
  return count;
 };
 const activity=Object.fromEntries(SNAPSHOT_METRICS_V11.activity.map(key=>[key,read('activity',key)]));
 const backlog=Object.fromEntries(SNAPSHOT_METRICS_V11.backlog.map(key=>[key,read('backlog',key)]));
 return {...base,activity,backlog};
}
