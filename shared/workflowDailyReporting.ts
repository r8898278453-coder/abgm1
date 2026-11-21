import {WORKFLOW_REPORT_ACTIVITY,WORKFLOW_REPORT_BACKLOG} from './salesWorkflowReporting';

export const WORKFLOW_DAILY_ACTIVITY=WORKFLOW_REPORT_ACTIVITY;
export const WORKFLOW_DAILY_BACKLOG={
 workflowDrafts:WORKFLOW_REPORT_BACKLOG.drafts,
 workflowApproved:WORKFLOW_REPORT_BACKLOG.approved,
 workflowRetired:WORKFLOW_REPORT_BACKLOG.retired,
 workflowActive:WORKFLOW_REPORT_BACKLOG.active,
 workflowWaitingReview:WORKFLOW_REPORT_BACKLOG.waitingReview,
 workflowWaitingSend:WORKFLOW_REPORT_BACKLOG.waitingSend,
 workflowExpiredOpen:WORKFLOW_REPORT_BACKLOG.expiredOpen,
} as const;
