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

export const WAITING_SCHEDULE_KEYS = ['queueDue','queueScheduled','queueRetryDue','queueRetryScheduled'] as const;

export function unclassifiedWaitingJobs(backlog: Record<'waitingJobs' | typeof WAITING_SCHEDULE_KEYS[number], number>) {
 const classified = WAITING_SCHEDULE_KEYS.reduce((total,key)=>total+backlog[key],0);
 if(!Number.isSafeInteger(classified)||classified>backlog.waitingJobs)throw new Error('INVALID_WAITING_QUEUE_BREAKDOWN');
 return backlog.waitingJobs-classified;
}
