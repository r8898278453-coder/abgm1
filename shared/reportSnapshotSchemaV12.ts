// Fixed V12 coverage independent of the live reporting registry.
import {canonicalSnapshotReportV11,SNAPSHOT_ACTIVITY_V11,SNAPSHOT_BACKLOG_V11} from './reportSnapshotSchemaV11';

export const SNAPSHOT_ACTIVITY_V12={...SNAPSHOT_ACTIVITY_V11,
 legacyPlans:'Timestamp-form posts scheduled for the selected IST day',
 legacySameDayAdmission:'Timestamp-form posts with same-day admission',
 legacyOtherDayAdmission:'Timestamp-form posts admitted only on another day',
 legacyWithoutAdmission:'Timestamp-form posts with no retained admission',
 legacyScheduledWithoutAdmission:'Scheduled timestamp-form posts with no retained admission',
 legacyApprovalWithoutAdmission:'Timestamp-form posts awaiting approval with no retained admission',
 scheduleRevisions:'Recorded schedule revisions',
 scheduleRevisedPosts:'Distinct posts with recorded schedule revisions',
 scheduleRevisionsFromScheduled:'Schedule revisions from scheduled status',
 scheduleRevisionsFromApproval:'Schedule revisions from pending approval',
 scheduleRevisionsToApproval:'Schedule revisions returning to pending approval',
} as const;

export const SNAPSHOT_BACKLOG_V12=SNAPSHOT_BACKLOG_V11;
export const SNAPSHOT_METRICS_V12={activity:Object.keys(SNAPSHOT_ACTIVITY_V12),backlog:Object.keys(SNAPSHOT_BACKLOG_V12)} as const;

export function canonicalSnapshotReportV12(input:any){
 const base=canonicalSnapshotReportV11(input);
 const read=(section:'activity'|'backlog',key:string)=>{
  const count=input[section]?.[key];
  if(!Number.isSafeInteger(count)||count<0)throw new Error('SNAPSHOT_REPORT_V12_COUNT_INVALID');
  return count;
 };
 const activity=Object.fromEntries(SNAPSHOT_METRICS_V12.activity.map(key=>[key,read('activity',key)]));
 const backlog=Object.fromEntries(SNAPSHOT_METRICS_V12.backlog.map(key=>[key,read('backlog',key)]));
 return {...base,activity,backlog};
}
