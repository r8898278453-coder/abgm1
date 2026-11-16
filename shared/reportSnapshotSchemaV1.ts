// Frozen coverage V1. Add a new version instead of changing these persisted metric definitions.
import {platformDayBounds} from './dailyWorkReport';
export const SNAPSHOT_ACTIVITY_V1={
  "completedJobs": "Completed jobs",
  "failedJobs": "Jobs with failure records",
  "pausedJobs": "Jobs paused",
  "approvedPosts": "Recorded scheduling approvals",
  "rescheduledPosts": "Posts rescheduled for approval",
  "admittedPosts": "Posts admitted for publishing",
  "controlChanges": "Publishing control changes",
  "messageRequests": "Recorded message requests",
  "apiAcceptedMessages": "Message requests API-accepted",
  "websiteInquiries": "Website inquiries received",
  "inquiryAlertsAccepted": "Inquiry alerts API-accepted",
  "knowledgeStored": "Knowledge originals stored",
  "knowledgeExtractionsSettled": "Knowledge ingestion outcomes settled",
  "knowledgeExtractionsBlocked": "Knowledge ingestion outcomes needing attention",
  "knowledgeApprovals": "Knowledge approvals recorded",
  "knowledgeWithdrawals": "Knowledge approvals withdrawn",
  "knowledgeDeleted": "Knowledge originals deleted",
  "websiteImportsQueued": "Website imports queued",
  "websiteImportsCommitted": "Website snapshot groups committed",
  "websiteImportsWithFailures": "Website imports with failure records",
  "websiteImportsPaused": "Website imports paused",
  "websiteImportsCancelled": "Website imports cancelled",
  "telegramManualRecorded": "Manual Telegram requests recorded",
  "telegramManualStarted": "Manual Telegram provider boundaries recorded",
  "telegramManualAccepted": "Manual Telegram requests API-accepted",
  "telegramManualUnknown": "Manual Telegram uncertain outcomes recorded",
  "telegramManualPaused": "Manual Telegram requests paused before provider I/O",
  "telegramManualCancelled": "Manual Telegram prepared requests cancelled"
} as const;
export const SNAPSHOT_BACKLOG_V1={
  "waitingJobs": "Queued or waiting jobs",
  "runningJobs": "Jobs marked running",
  "failedJobs": "Jobs currently failed",
  "pendingApprovals": "Posts marked pending approval",
  "uncertainPublications": "Uncertain publishing claims",
  "unconfirmedMessages": "In-progress or unknown message requests",
  "inquiryAlertsNotAttempted": "Inquiry alerts not attempted",
  "inquiryAlertsUnconfirmed": "Inquiry alerts without confirmed API acceptance",
  "knowledgeAwaitingApproval": "Knowledge sources awaiting approval",
  "knowledgeExtractionRunning": "Knowledge extractions marked processing",
  "knowledgeExtractionBlocked": "Knowledge sources needing extraction or attention",
  "websiteImportsWaiting": "Website imports waiting",
  "websiteImportsRunning": "Website imports running",
  "websiteImportsFailed": "Website imports currently failed",
  "telegramManualPrepared": "Manual Telegram requests prepared",
  "telegramManualSending": "Manual Telegram requests at provider boundary",
  "telegramManualUnknown": "Manual Telegram requests with unknown outcome"
} as const;
export const SNAPSHOT_METRICS_V1={activity:Object.keys(SNAPSHOT_ACTIVITY_V1),backlog:Object.keys(SNAPSHOT_BACKLOG_V1)} as const;
export interface SnapshotReportV1{date:string;timeZone:'Asia/Kolkata';generatedAt:string;activity:Record<keyof typeof SNAPSHOT_ACTIVITY_V1,number>;backlog:Record<keyof typeof SNAPSHOT_BACKLOG_V1,number>}
export function canonicalSnapshotReportV1(report:any):SnapshotReportV1{if(!report||typeof report.date!=='string'||report.timeZone!=='Asia/Kolkata'||typeof report.generatedAt!=='string'||!Number.isFinite(Date.parse(report.generatedAt)))throw new Error('SNAPSHOT_REPORT_V1_INVALID');platformDayBounds(report.date);const section=(name:'activity'|'backlog')=>Object.fromEntries(SNAPSHOT_METRICS_V1[name].map(key=>{const value=report[name]?.[key];if(!Number.isSafeInteger(value)||value<0)throw new Error('SNAPSHOT_REPORT_V1_COUNT_INVALID');return[key,value];}));return{date:report.date,timeZone:'Asia/Kolkata',generatedAt:new Date(report.generatedAt).toISOString(),activity:section('activity'),backlog:section('backlog')} as SnapshotReportV1;}
