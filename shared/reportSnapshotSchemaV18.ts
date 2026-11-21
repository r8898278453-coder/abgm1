// Fixed V18 coverage independent of the live reporting registry.
import {canonicalSnapshotReportV17,SNAPSHOT_ACTIVITY_V17,SNAPSHOT_BACKLOG_V17} from './reportSnapshotSchemaV17';

export const SNAPSHOT_ACTIVITY_V18={...SNAPSHOT_ACTIVITY_V17,
 digestObservedEligible:'Daily digest observed eligible for selection',
 digestObservedArchived:'Daily digest observed an archived workspace',
 digestObservedOpsMissing:'Daily digest observed missing workspace operations',
 digestObservedOpsOther:'Daily digest observed an inactive workspace status',
 digestObservedTelegramMissing:'Daily digest observed missing Telegram connection',
 digestObservedTelegramDisconnected:'Daily digest observed a disconnected Telegram connection',
 digestObservedPolicyMissing:'Daily digest observed a missing policy',
 digestObservedPolicyDisabled:'Daily digest observed a disabled policy',
 digestObservedFirstDuePending:'Daily digest observed first due time pending',
 digestObservedFirstDueReached:'Daily digest observed first due time reached',
 digestObservedFirstDueMissing:'Daily digest observed first due time missing',
 reviewObservedEligible:'Review reminder observed eligible for selection',
 reviewObservedArchived:'Review reminder observed an archived workspace',
 reviewObservedOpsMissing:'Review reminder observed missing workspace operations',
 reviewObservedOpsOther:'Review reminder observed an inactive workspace status',
 reviewObservedTelegramMissing:'Review reminder observed missing Telegram connection',
 reviewObservedTelegramDisconnected:'Review reminder observed a disconnected Telegram connection',
 reviewObservedPolicyMissing:'Review reminder observed a missing policy',
 reviewObservedPolicyDisabled:'Review reminder observed a disabled policy',
 reviewObservedFirstDuePending:'Review reminder observed first due time pending',
 reviewObservedFirstDueReached:'Review reminder observed first due time reached',
 reviewObservedFirstDueMissing:'Review reminder observed first due time missing',
 criticalObservedEligible:'Critical alert observed eligible for selection',
 criticalObservedArchived:'Critical alert observed an archived workspace',
 criticalObservedOpsMissing:'Critical alert observed missing workspace operations',
 criticalObservedOpsOther:'Critical alert observed an inactive workspace status',
 criticalObservedTelegramMissing:'Critical alert observed missing Telegram connection',
 criticalObservedTelegramDisconnected:'Critical alert observed a disconnected Telegram connection',
 criticalObservedPolicyMissing:'Critical alert observed a missing policy',
 criticalObservedPolicyDisabled:'Critical alert observed a disabled policy',
 criticalObservedFirstDuePending:'Critical alert observed first due time pending',
 criticalObservedFirstDueReached:'Critical alert observed first due time reached',
 criticalObservedFirstDueMissing:'Critical alert observed first due time missing',
} as const;

export const SNAPSHOT_BACKLOG_V18=SNAPSHOT_BACKLOG_V17;
export const SNAPSHOT_METRICS_V18={activity:Object.keys(SNAPSHOT_ACTIVITY_V18),backlog:Object.keys(SNAPSHOT_BACKLOG_V18)} as const;

export function canonicalSnapshotReportV18(input:any){
 const base=canonicalSnapshotReportV17(input);
 const read=(section:'activity'|'backlog',key:string)=>{
  const count=input[section]?.[key];
  if(!Number.isSafeInteger(count)||count<0)throw new Error('SNAPSHOT_REPORT_V18_COUNT_INVALID');
  return count;
 };
 const activity=Object.fromEntries(SNAPSHOT_METRICS_V18.activity.map(key=>[key,read('activity',key)]));
 const backlog=Object.fromEntries(SNAPSHOT_METRICS_V18.backlog.map(key=>[key,read('backlog',key)]));
 return {...base,activity,backlog};
}
