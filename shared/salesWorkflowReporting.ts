export const WORKFLOW_REPORT_ACTIVITY = {
 SALES_WORKFLOW_SAVED: 'Workflow drafts saved',
 SALES_WORKFLOW_APPROVED: 'Workflow revisions approved',
 SALES_WORKFLOW_RETIRED: 'Workflows retired',
 SALES_WORKFLOW_ENROLLED: 'Sales enrollments recorded',
 SALES_APPOINTMENT_REMINDER_SCHEDULED: 'Appointment reminders scheduled',
 SALES_WORKFLOW_REVIEW_CREATED: 'Sales reviews created',
 SALES_APPOINTMENT_REMINDER_REVIEW_READY: 'Appointment reminder reviews ready',
 SALES_WORKFLOW_REVIEW_COMPLETED: 'Manual reviews completed',
 SALES_WORKFLOW_MESSAGE_ACCEPTED: 'Workflow messages accepted by provider API',
 SALES_WORKFLOW_EXITED: 'Enrollments exited',
 SALES_WORKFLOW_OPERATOR_EXIT: 'Operator exit decisions recorded',
 SALES_WORKFLOW_REVIEW_EXIT: 'Reviewer exit decisions recorded',
 SALES_APPOINTMENT_REMINDER_EXITED: 'Appointment reminder enrollments exited',
} as const;

export const WORKFLOW_REPORT_BACKLOG = {
 drafts: 'Draft definitions',
 approved: 'Approved definitions',
 retired: 'Retired definitions',
 active: 'Active enrollments',
 waitingReview: 'Enrollments waiting for review',
 waitingSend: 'Enrollments waiting for send settlement',
 expiredOpen: 'Expired enrollments awaiting cleanup',
} as const;

export function workflowReportCounts<K extends string>(keys: Record<K,string>, counts: Record<string,unknown>) {
 return Object.fromEntries((Object.keys(keys) as K[]).map(key=>{
  const count=counts[key];
  if(typeof count!=='number'||!Number.isSafeInteger(count)||count<0)throw new Error('INVALID_WORKFLOW_REPORT_COUNT');
  return [key,count];
 })) as Record<K,number>;
}
