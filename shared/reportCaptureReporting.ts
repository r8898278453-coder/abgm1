export const CAPTURE_ACTIVITY={
 reportSnapshotsStored:'Frozen report revisions stored',
 reportSnapshotAmendments:'Frozen report amendments stored',
 reportCapturesAdmitted:'Scheduled capture runs admitted',
 reportCapturesCompleted:'Scheduled baselines stored',
 reportCapturesSkipped:'Scheduled runs skipped by worker',
 reportCapturesCancelled:'Pending capture runs stopped by policy changes',
 reportCapturesRecoveryFailed:'Capture runs terminally failed by recovery',
 reportCapturePolicyChanges:'Capture schedule changes recorded',
} as const;
export const CAPTURE_BACKLOG={
 reportCapturesPending:'Capture runs awaiting settlement',
 reportCapturesRunning:'Pending capture runs with running jobs',
 reportCapturesFailed:'Capture runs marked failed',
 reportCapturesRecoveryNeeded:'Pending capture runs needing queue reconciliation',
} as const;
