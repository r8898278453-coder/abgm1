// Fixed V17 coverage independent of the live reporting registry.
import {canonicalSnapshotReportV16,SNAPSHOT_ACTIVITY_V16,SNAPSHOT_BACKLOG_V16} from './reportSnapshotSchemaV16';

export const SNAPSHOT_ACTIVITY_V17={...SNAPSHOT_ACTIVITY_V16,
 digestSelected:'Daily digest selected by scheduler',
 reviewSelected:'Review reminder selected by scheduler',
 criticalSelected:'Critical alert selected by scheduler',
} as const;

export const SNAPSHOT_BACKLOG_V17={...SNAPSHOT_BACKLOG_V16,
 notificationWorkspaceActive:'Notification workspace active',
 notificationWorkspaceArchived:'Notification workspace archived',
 notificationWorkspaceOperationsMissing:'Notification workspace operations missing',
 notificationWorkspaceOtherStatus:'Notification workspace has another operations status',
 notificationTelegramConnected:'Telegram connection recorded as connected',
 notificationTelegramDisconnected:'Telegram connection exists without connected status',
 notificationTelegramMissing:'Telegram connection missing',
 digestPolicyMissing:'Daily digest policy missing',
 digestPolicyDisabled:'Daily digest policy disabled',
 digestPolicyEnabled:'Daily digest policy enabled',
 digestSelectionEligible:'Daily digest currently eligible for scheduler selection',
 digestRotationHead:'Daily digest stored scheduler rotation head',
 digestFirstDuePending:'Daily digest enabled policy first due time pending',
 digestFirstDueReached:'Daily digest enabled policy first due time reached',
 digestFirstDueMissing:'Daily digest enabled policy first due time missing',
 reviewPolicyMissing:'Review reminder policy missing',
 reviewPolicyDisabled:'Review reminder policy disabled',
 reviewPolicyEnabled:'Review reminder policy enabled',
 reviewSelectionEligible:'Review reminder currently eligible for scheduler selection',
 reviewRotationHead:'Review reminder stored scheduler rotation head',
 reviewFirstDuePending:'Review reminder enabled policy first due time pending',
 reviewFirstDueReached:'Review reminder enabled policy first due time reached',
 reviewFirstDueMissing:'Review reminder enabled policy first due time missing',
 criticalPolicyMissing:'Critical alert policy missing',
 criticalPolicyDisabled:'Critical alert policy disabled',
 criticalPolicyEnabled:'Critical alert policy enabled',
 criticalSelectionEligible:'Critical alert currently eligible for scheduler selection',
 criticalRotationHead:'Critical alert stored scheduler rotation head',
 criticalFirstDuePending:'Critical alert enabled policy first due time pending',
 criticalFirstDueReached:'Critical alert enabled policy first due time reached',
 criticalFirstDueMissing:'Critical alert enabled policy first due time missing',
} as const;
export const SNAPSHOT_METRICS_V17={activity:Object.keys(SNAPSHOT_ACTIVITY_V17),backlog:Object.keys(SNAPSHOT_BACKLOG_V17)} as const;

export function canonicalSnapshotReportV17(input:any){
 const base=canonicalSnapshotReportV16(input);
 const read=(section:'activity'|'backlog',key:string)=>{
  const count=input[section]?.[key];
  if(!Number.isSafeInteger(count)||count<0)throw new Error('SNAPSHOT_REPORT_V17_COUNT_INVALID');
  return count;
 };
 const activity=Object.fromEntries(SNAPSHOT_METRICS_V17.activity.map(key=>[key,read('activity',key)]));
 const backlog=Object.fromEntries(SNAPSHOT_METRICS_V17.backlog.map(key=>[key,read('backlog',key)]));
 return {...base,activity,backlog};
}
