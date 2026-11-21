// Fixed V7 coverage independent of the live reporting registry.
import {canonicalSnapshotReportV6,SNAPSHOT_ACTIVITY_V6,SNAPSHOT_BACKLOG_V6} from './reportSnapshotSchemaV6';

export const SNAPSHOT_ACTIVITY_V7={...SNAPSHOT_ACTIVITY_V6,
 SALES_WORKFLOW_SAVED:'Workflow drafts saved',
 SALES_WORKFLOW_APPROVED:'Workflow revisions approved',
 SALES_WORKFLOW_RETIRED:'Workflows retired',
 SALES_WORKFLOW_ENROLLED:'Sales enrollments recorded',
 SALES_APPOINTMENT_REMINDER_SCHEDULED:'Appointment reminders scheduled',
 SALES_WORKFLOW_REVIEW_CREATED:'Sales reviews created',
 SALES_APPOINTMENT_REMINDER_REVIEW_READY:'Appointment reminder reviews ready',
 SALES_WORKFLOW_REVIEW_COMPLETED:'Manual reviews completed',
 SALES_WORKFLOW_MESSAGE_ACCEPTED:'Workflow messages accepted by provider API',
 SALES_WORKFLOW_EXITED:'Enrollments exited',
 SALES_WORKFLOW_OPERATOR_EXIT:'Operator exit decisions recorded',
 SALES_WORKFLOW_REVIEW_EXIT:'Reviewer exit decisions recorded',
 SALES_APPOINTMENT_REMINDER_EXITED:'Appointment reminder enrollments exited',
} as const;

export const SNAPSHOT_BACKLOG_V7={...SNAPSHOT_BACKLOG_V6,
 workflowDrafts:'Draft definitions',
 workflowApproved:'Approved definitions',
 workflowRetired:'Retired definitions',
 workflowActive:'Active enrollments',
 workflowWaitingReview:'Enrollments waiting for review',
 workflowWaitingSend:'Enrollments waiting for send settlement',
 workflowExpiredOpen:'Expired enrollments awaiting cleanup',
} as const;
export const SNAPSHOT_METRICS_V7={activity:Object.keys(SNAPSHOT_ACTIVITY_V7),backlog:Object.keys(SNAPSHOT_BACKLOG_V7)} as const;

export function canonicalSnapshotReportV7(input:any){
 const base=canonicalSnapshotReportV6(input);
 const read=(section:'activity'|'backlog',key:string)=>{
  const count=input[section]?.[key];
  if(!Number.isSafeInteger(count)||count<0)throw new Error('SNAPSHOT_REPORT_V7_COUNT_INVALID');
  return count;
 };
 const activity=Object.fromEntries(SNAPSHOT_METRICS_V7.activity.map(key=>[key,read('activity',key)]));
 const backlog=Object.fromEntries(SNAPSHOT_METRICS_V7.backlog.map(key=>[key,read('backlog',key)]));
 return {...base,activity,backlog};
}
