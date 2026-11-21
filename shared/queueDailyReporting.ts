export const QUEUE_DAILY_ACTIVITY={
 queueAdmitted:'Queue jobs admitted',
 queueClaimed:'Queue jobs claimed',
 queueRetryFailed:'Queue jobs with retryable failures',
 queueTerminalFailed:'Queue jobs with terminal failures',
 queueExhausted:'Queue jobs with exhausted attempts',
 queueCancelled:'Queue jobs cancelled',
} as const;

export const QUEUE_DAILY_BACKLOG={
 queueDue:'Queued jobs due',
 queueScheduled:'Queued jobs scheduled for later',
 queueRetryDue:'Retries due',
 queueRetryScheduled:'Retries scheduled for later',
 queueStaleLease:'Running jobs with expired leases',
 queueMissingLease:'Running jobs missing lease timestamps',
} as const;
