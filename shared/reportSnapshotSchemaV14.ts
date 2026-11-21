// Fixed V14 coverage independent of the live reporting registry.
import {canonicalSnapshotReportV13,SNAPSHOT_ACTIVITY_V13,SNAPSHOT_BACKLOG_V13} from './reportSnapshotSchemaV13';

export const SNAPSHOT_ACTIVITY_V14={...SNAPSHOT_ACTIVITY_V13,
 dailyDigestAccepted:'Daily digest slots API-accepted',
 dailyDigestUnknown:'Daily digest slots unconfirmed',
 dailyDigestRunning:'Daily digest slots running inside the claim window',
 dailyDigestStale:'Daily digest slots running beyond the claim window',
 reviewReminderAccepted:'Review reminder slots API-accepted',
 reviewReminderUnknown:'Review reminder slots unconfirmed',
 reviewReminderRunning:'Review reminder slots running inside the claim window',
 reviewReminderStale:'Review reminder slots running beyond the claim window',
 criticalAlertAccepted:'Critical alert slots API-accepted',
 criticalAlertUnknown:'Critical alert slots unconfirmed',
 criticalAlertRunning:'Critical alert slots running inside the claim window',
 criticalAlertStale:'Critical alert slots running beyond the claim window',
} as const;

export const SNAPSHOT_BACKLOG_V14={...SNAPSHOT_BACKLOG_V13,
 notificationsRunning:'Current notification claims inside the claim window',
 notificationsStale:'Current notification claims beyond the claim window',
 notificationsUnconfirmed:'Retained unconfirmed notification occurrences',
} as const;
export const SNAPSHOT_METRICS_V14={activity:Object.keys(SNAPSHOT_ACTIVITY_V14),backlog:Object.keys(SNAPSHOT_BACKLOG_V14)} as const;

export function canonicalSnapshotReportV14(input:any){
 const base=canonicalSnapshotReportV13(input);
 const read=(section:'activity'|'backlog',key:string)=>{
  const count=input[section]?.[key];
  if(!Number.isSafeInteger(count)||count<0)throw new Error('SNAPSHOT_REPORT_V14_COUNT_INVALID');
  return count;
 };
 const activity=Object.fromEntries(SNAPSHOT_METRICS_V14.activity.map(key=>[key,read('activity',key)]));
 const backlog=Object.fromEntries(SNAPSHOT_METRICS_V14.backlog.map(key=>[key,read('backlog',key)]));
 return {...base,activity,backlog};
}
