// Frozen coverage V2. These definitions must not follow mutable live report registries.
import {canonicalSnapshotReportV1,SNAPSHOT_ACTIVITY_V1,SNAPSHOT_BACKLOG_V1} from './reportSnapshotSchemaV1';
export const SNAPSHOT_ACTIVITY_V2={...SNAPSHOT_ACTIVITY_V1,
 reportSnapshotsStored:'Frozen report revisions stored',
 reportSnapshotAmendments:'Frozen report amendments stored',
 reportCapturesAdmitted:'Scheduled capture runs admitted',
 reportCapturesCompleted:'Scheduled baselines stored',
 reportCapturesSkipped:'Scheduled runs skipped by worker',
 reportCapturesCancelled:'Pending capture runs stopped by policy changes',
 reportCapturesRecoveryFailed:'Capture runs terminally failed by recovery',
 reportCapturePolicyChanges:'Capture schedule changes recorded',
} as const;
export const SNAPSHOT_BACKLOG_V2={...SNAPSHOT_BACKLOG_V1,
 reportCapturesPending:'Capture runs awaiting settlement',
 reportCapturesRunning:'Pending capture runs with running jobs',
 reportCapturesFailed:'Capture runs marked failed',
 reportCapturesRecoveryNeeded:'Pending capture runs needing queue reconciliation',
} as const;
export const SNAPSHOT_METRICS_V2={activity:Object.keys(SNAPSHOT_ACTIVITY_V2),backlog:Object.keys(SNAPSHOT_BACKLOG_V2)} as const;
export function canonicalSnapshotReportV2(input:any){const base=canonicalSnapshotReportV1(input);const section=(name:'activity'|'backlog')=>Object.fromEntries(SNAPSHOT_METRICS_V2[name].map(key=>{const n=input[name]?.[key];if(!Number.isSafeInteger(n)||n<0)throw new Error('SNAPSHOT_REPORT_V2_COUNT_INVALID');return[key,n];}));return{...base,activity:section('activity'),backlog:section('backlog')};}
