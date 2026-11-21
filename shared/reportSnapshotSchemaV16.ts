// Fixed V16 coverage independent of the live reporting registry.
import {canonicalSnapshotReportV15,SNAPSHOT_ACTIVITY_V15,SNAPSHOT_BACKLOG_V15} from './reportSnapshotSchemaV15';

export const SNAPSHOT_ACTIVITY_V16={...SNAPSHOT_ACTIVITY_V15,
 digestPreparationFailed:'Daily digest preparation failed before claim',
 digestInvalidMessage:'Daily digest message rejected before claim',
 reviewPreparationFailed:'Review reminder preparation failed before claim',
 reviewInvalidMessage:'Review reminder message rejected before claim',
 criticalPreparationFailed:'Critical alert preparation failed before claim',
 criticalInvalidMessage:'Critical alert message rejected before claim',
 digestCompactSummary:'Daily digest used a compact summary',
 reviewNoEligibleReviews:'Review reminder found no eligible reviews',
 criticalNoCandidates:'Critical alert found no eligible candidates',
 criticalPrecheckUnavailable:'Critical alert context unavailable before claim',
} as const;

export const SNAPSHOT_BACKLOG_V16=SNAPSHOT_BACKLOG_V15;
export const SNAPSHOT_METRICS_V16={activity:Object.keys(SNAPSHOT_ACTIVITY_V16),backlog:Object.keys(SNAPSHOT_BACKLOG_V16)} as const;

export function canonicalSnapshotReportV16(input:any){
 const base=canonicalSnapshotReportV15(input);
 const read=(section:'activity'|'backlog',key:string)=>{
  const count=input[section]?.[key];
  if(!Number.isSafeInteger(count)||count<0)throw new Error('SNAPSHOT_REPORT_V16_COUNT_INVALID');
  return count;
 };
 const activity=Object.fromEntries(SNAPSHOT_METRICS_V16.activity.map(key=>[key,read('activity',key)]));
 const backlog=Object.fromEntries(SNAPSHOT_METRICS_V16.backlog.map(key=>[key,read('backlog',key)]));
 return {...base,activity,backlog};
}
