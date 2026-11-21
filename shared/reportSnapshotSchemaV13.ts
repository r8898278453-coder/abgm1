// Fixed V13 coverage independent of the live reporting registry.
import {canonicalSnapshotReportV12,SNAPSHOT_ACTIVITY_V12,SNAPSHOT_BACKLOG_V12} from './reportSnapshotSchemaV12';

export const SNAPSHOT_ACTIVITY_V13={...SNAPSHOT_ACTIVITY_V12,
 calendarPlanCreated:'Plans created',
 calendarPlanClosed:'Plans closed',
 calendarRequestSealed:'Plan requests sealed',
 calendarGenerationAdmitted:'Plan item generation admissions',
 calendarItemSaved:'Plan item drafts saved',
 calendarItemFailed:'Plan item generation failures',
 calendarItemCancelled:'Plan items cancelled',
 calendarPhotoAttached:'Plan item photos attached',
 calendarPhotoDetached:'Plan item photos detached',
 calendarSlotPending:'Selected-day slots pending',
 calendarSlotGenerating:'Selected-day slots generating',
 calendarSlotFailed:'Selected-day slots with failed generation',
 calendarSlotCancelled:'Selected-day slots cancelled',
 calendarSlotSaved:'Selected-day slots with a saved draft',
 calendarSlotMissingPost:'Saved selected-day slots missing their linked post',
 calendarSlotAdmittedPost:'Saved selected-day slots with retained publishing admission',
 calendarSlotPublishedPost:'Saved selected-day slots with a recorded published claim',
} as const;

export const SNAPSHOT_BACKLOG_V13=SNAPSHOT_BACKLOG_V12;
export const SNAPSHOT_METRICS_V13={activity:Object.keys(SNAPSHOT_ACTIVITY_V13),backlog:Object.keys(SNAPSHOT_BACKLOG_V13)} as const;

export function canonicalSnapshotReportV13(input:any){
 const base=canonicalSnapshotReportV12(input);
 const read=(section:'activity'|'backlog',key:string)=>{
  const count=input[section]?.[key];
  if(!Number.isSafeInteger(count)||count<0)throw new Error('SNAPSHOT_REPORT_V13_COUNT_INVALID');
  return count;
 };
 const activity=Object.fromEntries(SNAPSHOT_METRICS_V13.activity.map(key=>[key,read('activity',key)]));
 const backlog=Object.fromEntries(SNAPSHOT_METRICS_V13.backlog.map(key=>[key,read('backlog',key)]));
 return {...base,activity,backlog};
}
