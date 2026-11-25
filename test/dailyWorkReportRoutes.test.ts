import {CRITICAL_ALERT_DAILY_ACTIVITY,CRITICAL_ALERT_DAILY_BACKLOG} from '../shared/criticalAlertDailyReporting';
import {NOTIFICATION_ELIGIBILITY_HISTORY} from '../shared/notificationEligibilityHistory';
import {NOTIFICATION_SELECTION_ACTIVITY,NOTIFICATION_SELECTION_BACKLOG} from '../shared/notificationSelectionReporting';
import {NOTIFICATION_DECISION_ACTIVITY} from '../shared/notificationDecisionReporting';
import {NOTIFICATION_DAILY_ACTIVITY,NOTIFICATION_DAILY_BACKLOG} from '../shared/notificationDailyReporting';
import {CALENDAR_PLAN_DAILY_ACTIVITY} from '../shared/calendarPlanDailyReporting';
import {SCHEDULE_HISTORY_ACTIVITY} from '../shared/scheduleHistoryReporting';
import {PUBLISHING_RECONCILIATION_ACTIVITY} from '../shared/publishingReconciliationReporting';
import {PLATFORM_DAILY_ACTIVITY} from '../shared/platformDailyReporting';
import {PUBLICATION_ADMISSION_OUTCOMES} from '../shared/publicationDailyReporting';
import {QUEUE_DAILY_ACTIVITY,QUEUE_DAILY_BACKLOG} from '../shared/queueDailyReporting';
import {WORKFLOW_DAILY_ACTIVITY,WORKFLOW_DAILY_BACKLOG} from '../shared/workflowDailyReporting';
import {EMAIL_WORK_ACTIVITY,EMAIL_WORK_BACKLOG} from '../shared/emailWorkReporting';
import {APPOINTMENT_ACTIVITY,APPOINTMENT_BACKLOG} from '../shared/appointmentReporting';
import {GROWTH_ACTIVITY,GROWTH_BACKLOG} from '../shared/growthReporting';
import {SALES_ACTIVITY} from '../shared/salesActivityReporting';
import {loadDailyWorkDigest,formatDailyWorkDigest,boundDailyDigestMessage} from '../server/dailyWorkDigest';
import assert from 'node:assert/strict';
import express from 'express';
import {registerDailyWorkReport} from '../server/dailyWorkReportRoutes';
import {dailyWorkReportCsv,platformDateKey,platformDayBounds} from '../shared/dailyWorkReport';
assert.equal(platformDateKey(Date.parse('2026-11-02T20:00:00Z')),'2026-11-03');
assert.deepEqual(platformDayBounds('2026-11-03'),{start:Date.parse('2026-11-02T18:30:00Z'),end:Date.parse('2026-11-03T18:30:00Z')});
for(const day of ['2026-02-30','2026-13-01','bad','2026-11-03T00:00:00Z','0001-01-01'])assert.throws(()=>platformDayBounds(day));
const criticalActivity=Object.fromEntries(Object.keys(CRITICAL_ALERT_DAILY_ACTIVITY).map(k=>[k,0])) as Record<keyof typeof CRITICAL_ALERT_DAILY_ACTIVITY,number>;
const criticalBacklog=Object.fromEntries(Object.keys(CRITICAL_ALERT_DAILY_BACKLOG).map(k=>[k,0])) as Record<keyof typeof CRITICAL_ALERT_DAILY_BACKLOG,number>;
const eligibilityHistory=Object.fromEntries(Object.keys(NOTIFICATION_ELIGIBILITY_HISTORY).map(k=>[k,0])) as Record<keyof typeof NOTIFICATION_ELIGIBILITY_HISTORY,number>;
const selectionActivity=Object.fromEntries(Object.keys(NOTIFICATION_SELECTION_ACTIVITY).map(k=>[k,0])) as Record<keyof typeof NOTIFICATION_SELECTION_ACTIVITY,number>;
const selectionBacklog=Object.fromEntries(Object.keys(NOTIFICATION_SELECTION_BACKLOG).map(k=>[k,0])) as Record<keyof typeof NOTIFICATION_SELECTION_BACKLOG,number>;
const notificationDecisions=Object.fromEntries(Object.keys(NOTIFICATION_DECISION_ACTIVITY).map(k=>[k,0])) as Record<keyof typeof NOTIFICATION_DECISION_ACTIVITY,number>;
const notificationActivity=Object.fromEntries(Object.keys(NOTIFICATION_DAILY_ACTIVITY).map(k=>[k,0])) as Record<keyof typeof NOTIFICATION_DAILY_ACTIVITY,number>;
const notificationBacklog=Object.fromEntries(Object.keys(NOTIFICATION_DAILY_BACKLOG).map(k=>[k,0])) as Record<keyof typeof NOTIFICATION_DAILY_BACKLOG,number>;
const calendarPlans=Object.fromEntries(Object.keys(CALENDAR_PLAN_DAILY_ACTIVITY).map(k=>[k,0])) as Record<keyof typeof CALENDAR_PLAN_DAILY_ACTIVITY,number>;
const history=Object.fromEntries(Object.keys(SCHEDULE_HISTORY_ACTIVITY).map(k=>[k,0])) as Record<keyof typeof SCHEDULE_HISTORY_ACTIVITY,number>;
const reconciliation=Object.fromEntries(Object.keys(PUBLISHING_RECONCILIATION_ACTIVITY).map(k=>[k,0])) as Record<keyof typeof PUBLISHING_RECONCILIATION_ACTIVITY,number>;
const platforms=Object.fromEntries(Object.keys(PLATFORM_DAILY_ACTIVITY).map(k=>[k,0])) as Record<keyof typeof PLATFORM_DAILY_ACTIVITY,number>;
const admissions=Object.fromEntries(Object.keys(PUBLICATION_ADMISSION_OUTCOMES).map(k=>[k,0])) as Record<keyof typeof PUBLICATION_ADMISSION_OUTCOMES,number>;
const queueActivity=Object.fromEntries(Object.keys(QUEUE_DAILY_ACTIVITY).map(k=>[k,0])) as Record<keyof typeof QUEUE_DAILY_ACTIVITY,number>;
const queueBacklog=Object.fromEntries(Object.keys(QUEUE_DAILY_BACKLOG).map(k=>[k,0])) as Record<keyof typeof QUEUE_DAILY_BACKLOG,number>;
const workflowActivity=Object.fromEntries(Object.keys(WORKFLOW_DAILY_ACTIVITY).map(key=>[key,0])) as Record<keyof typeof WORKFLOW_DAILY_ACTIVITY,number>;
const workflowBacklog=Object.fromEntries(Object.keys(WORKFLOW_DAILY_BACKLOG).map(key=>[key,0])) as Record<keyof typeof WORKFLOW_DAILY_BACKLOG,number>;
const emailActivity=Object.fromEntries(Object.keys(EMAIL_WORK_ACTIVITY).map(k=>[k,0])) as Record<keyof typeof EMAIL_WORK_ACTIVITY,number>;
const emailBacklog=Object.fromEntries(Object.keys(EMAIL_WORK_BACKLOG).map(k=>[k,0])) as Record<keyof typeof EMAIL_WORK_BACKLOG,number>;
const digestReport={date:'2026-11-02',timeZone:'Asia/Kolkata' as const,generatedAt:'2026-11-03T02:30:00Z',activity:{...criticalActivity,critical_failedJobs_InitialAccepted:1,...eligibilityHistory,digestObservedArchived:1,...selectionActivity,digestSelected:1,...notificationDecisions,reviewContextUnavailable:1,...notificationActivity,dailyDigestAccepted:2,...calendarPlans,calendarPlanCreated:2,...history,scheduleRevisions:2,...reconciliation,providerCheckMatched:2,...platforms,facebookPublished:2,...admissions,...queueActivity,queueAdmitted:4,...workflowActivity,SALES_WORKFLOW_MESSAGE_ACCEPTED:4,...emailActivity,emailDelivered:2,emailRepliesLinked:1,...Object.fromEntries(Object.keys(APPOINTMENT_ACTIVITY).map(k=>[k,0])) as Record<keyof typeof APPOINTMENT_ACTIVITY,number>,...Object.fromEntries(Object.keys(GROWTH_ACTIVITY).map(k=>[k,0])) as Record<keyof typeof GROWTH_ACTIVITY,number>,...Object.fromEntries(Object.keys(SALES_ACTIVITY).map(k=>[k,0])) as Record<keyof typeof SALES_ACTIVITY,number>,completedJobs:3,failedJobs:1,pausedJobs:2,approvedPosts:1,rescheduledPosts:0,admittedPosts:0,controlChanges:0,messageRequests:0,apiAcceptedMessages:0,websiteInquiries:0,inquiryAlertsAccepted:0,knowledgeStored:0,knowledgeExtractionsSettled:0,knowledgeExtractionsBlocked:0,knowledgeApprovals:0,knowledgeWithdrawals:0,knowledgeDeleted:0,websiteImportsQueued:0,websiteImportsCommitted:0,websiteImportsWithFailures:0,websiteImportsPaused:0,websiteImportsCancelled:0,telegramManualRecorded:0,telegramManualStarted:0,telegramManualAccepted:0,telegramManualUnknown:0,telegramManualPaused:0,telegramManualCancelled:0,reportSnapshotsStored:0,reportSnapshotAmendments:0,reportCapturesAdmitted:0,reportCapturesCompleted:0,reportCapturesSkipped:0,reportCapturesCancelled:0,reportCapturesRecoveryFailed:0,reportCapturePolicyChanges:0},backlog:{...criticalBacklog,critical_failedJobs_Open:1,...selectionBacklog,digestSelectionEligible:1,...notificationBacklog,notificationsUnconfirmed:3,...queueBacklog,queueRetryDue:2,...workflowBacklog,workflowWaitingReview:3,...emailBacklog,emailIntakesPending:3,appointmentOutcomesAwaiting:2,...Object.fromEntries(Object.keys(GROWTH_BACKLOG).map(k=>[k,0])) as Record<keyof typeof GROWTH_BACKLOG,number>,waitingJobs:4,runningJobs:0,failedJobs:1,pendingApprovals:2,uncertainPublications:1,unconfirmedMessages:0,inquiryAlertsNotAttempted:0,inquiryAlertsUnconfirmed:0,knowledgeAwaitingApproval:0,knowledgeExtractionRunning:0,knowledgeExtractionBlocked:0,websiteImportsWaiting:0,websiteImportsRunning:0,websiteImportsFailed:0,telegramManualPrepared:0,telegramManualSending:0,telegramManualUnknown:0,reportCapturesPending:0,reportCapturesRunning:0,reportCapturesFailed:0,reportCapturesRecoveryNeeded:0}};
const csv=dailyWorkReportCsv(digestReport);
assert.ok(!dailyWorkReportCsv({...digestReport,activity:{...digestReport.activity,evil:'=HYPERLINK("bad")'} as any}).includes('HYPERLINK'));
assert.match(csv,/"activity","websiteInquiries","0"/);assert.match(csv,/"current_backlog","inquiryAlertsNotAttempted","0"/);assert.match(csv,/"activity","admittedPosts","0"/);assert.match(csv,/"current_backlog","waitingJobs","4"/);assert.equal(csv.split('\r\n').length,402);
assert.match(csv,/"activity","emailDelivered","2"/);
assert.match(csv,/"current_backlog","emailIntakesPending","3"/);
assert.match(formatDailyWorkDigest(digestReport),/Email .*0\/0\/2\/0\/0\/0\/0.*Linked replies: 1.*pending\/running: 3\/0/);
assert.match(formatDailyWorkDigest(digestReport),/Admitted posts: 0; publishing control changes: 0/);
assert.match(formatDailyWorkDigest(digestReport),/Knowledge: 0 originals stored/);assert.throws(()=>formatDailyWorkDigest({...digestReport,activity:{...digestReport.activity,knowledgeStored:undefined}} as any));
const workDigest=await loadDailyWorkDigest('owned',Date.parse('2026-11-03T02:30:00Z'),async(company,date)=>{assert.equal(company,'owned');assert.equal(date,'2026-11-02');return digestReport;});
assert.ok(workDigest.available);assert.match(workDigest.text,/2026-11-02 IST/);assert.match(workDigest.text,/Completed jobs: 3/);assert.match(formatDailyWorkDigest(digestReport),/Current backlog: 4 waiting/);
const unavailableDigest=await loadDailyWorkDigest('owned',Date.parse('2026-11-03T02:30:00Z'),async()=>{throw new Error('private-secret');});assert.equal(unavailableDigest.available,false);assert.ok(!unavailableDigest.text.includes('private-secret'));assert.ok(!unavailableDigest.text.includes('Completed jobs: 0'));
const deferredDigest=await loadDailyWorkDigest('owned',Date.parse('2026-11-03T02:30:00Z'),async()=>{throw new Error('Must not read after budget');},()=>false);assert.equal(deferredDigest.deferred,true);
await assert.rejects(async()=>formatDailyWorkDigest({...digestReport,activity:{...digestReport.activity,websiteInquiries:undefined}} as any));
const app=express();let calls=0,fail=false;
registerDailyWorkReport(app,{
 getAuthUserFromRequest:async req=>req.headers.authorization?{id:'actor'} as any:null,
 verifyCompanyWorkspaceAccess:async(_,company)=>({authorized:company==='owned',status:403}),
 read:async(company,date)=>{calls++;assert.equal(company,'owned');if(fail)throw new Error('private-database-value');return {date,timeZone:'Asia/Kolkata',generatedAt:new Date().toISOString(),activity:{...criticalActivity,critical_failedJobs_InitialAccepted:1,...eligibilityHistory,digestObservedArchived:1,...selectionActivity,digestSelected:1,...notificationDecisions,reviewContextUnavailable:1,...notificationActivity,dailyDigestAccepted:2,...calendarPlans,calendarPlanCreated:2,...history,scheduleRevisions:2,...reconciliation,providerCheckMatched:2,...platforms,facebookPublished:2,...admissions,...queueActivity,queueAdmitted:4,...workflowActivity,SALES_WORKFLOW_MESSAGE_ACCEPTED:4,...emailActivity,emailDelivered:2,emailRepliesLinked:1,...Object.fromEntries(Object.keys(APPOINTMENT_ACTIVITY).map(k=>[k,0])) as Record<keyof typeof APPOINTMENT_ACTIVITY,number>,...Object.fromEntries(Object.keys(GROWTH_ACTIVITY).map(k=>[k,0])) as Record<keyof typeof GROWTH_ACTIVITY,number>,...Object.fromEntries(Object.keys(SALES_ACTIVITY).map(k=>[k,0])) as Record<keyof typeof SALES_ACTIVITY,number>,completedJobs:1,failedJobs:1,pausedJobs:1,approvedPosts:1,rescheduledPosts:1,admittedPosts:0,controlChanges:0,messageRequests:0,apiAcceptedMessages:0,websiteInquiries:0,inquiryAlertsAccepted:0,knowledgeStored:0,knowledgeExtractionsSettled:0,knowledgeExtractionsBlocked:0,knowledgeApprovals:0,knowledgeWithdrawals:0,knowledgeDeleted:0,websiteImportsQueued:0,websiteImportsCommitted:0,websiteImportsWithFailures:0,websiteImportsPaused:0,websiteImportsCancelled:0,telegramManualRecorded:0,telegramManualStarted:0,telegramManualAccepted:0,telegramManualUnknown:0,telegramManualPaused:0,telegramManualCancelled:0,reportSnapshotsStored:0,reportSnapshotAmendments:0,reportCapturesAdmitted:0,reportCapturesCompleted:0,reportCapturesSkipped:0,reportCapturesCancelled:0,reportCapturesRecoveryFailed:0,reportCapturePolicyChanges:0},backlog:{...criticalBacklog,critical_failedJobs_Open:1,...selectionBacklog,digestSelectionEligible:1,...notificationBacklog,notificationsUnconfirmed:3,...queueBacklog,queueRetryDue:2,...workflowBacklog,workflowWaitingReview:3,...emailBacklog,emailIntakesPending:3,appointmentOutcomesAwaiting:2,...Object.fromEntries(Object.keys(GROWTH_BACKLOG).map(k=>[k,0])) as Record<keyof typeof GROWTH_BACKLOG,number>,waitingJobs:2,runningJobs:0,failedJobs:0,pendingApprovals:1,uncertainPublications:1,unconfirmedMessages:0,inquiryAlertsNotAttempted:0,inquiryAlertsUnconfirmed:0,knowledgeAwaitingApproval:0,knowledgeExtractionRunning:0,knowledgeExtractionBlocked:0,websiteImportsWaiting:0,websiteImportsRunning:0,websiteImportsFailed:0,telegramManualPrepared:0,telegramManualSending:0,telegramManualUnknown:0,reportCapturesPending:0,reportCapturesRunning:0,reportCapturesFailed:0,reportCapturesRecoveryNeeded:0}};},
});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
try{
 const port=(server.address() as any).port;
 async function get(company:string,query:string,status:number,auth=true){const response=await fetch(`http://127.0.0.1:${port}/api/companies/${company}/daily-work-report${query}`,{headers:auth?{Authorization:'fixture'}:{}});assert.equal(response.status,status);return response.json();}
 await get('owned','',401,false);await get('foreign','?date=2026-11-03',403);
 for(const query of ['?date=bad','?date=2026-02-30','?date=2026-11-03&date=2026-11-04','?date=2026-11-03&actor=forged'])await get('owned',query,400);
 assert.equal(calls,0);const scoped=await get('owned','?date=2026-11-03',200);assert.equal(scoped.companyId,'owned');assert.equal(scoped.report.date,'2026-11-03');
 assert.equal((await get('owned','',200)).report.date,platformDateKey());
 fail=true;assert.ok(!JSON.stringify(await get('owned','?date=2026-11-03',503)).includes('private-database-value'));
 console.log('Daily work report: fixed IST boundaries, strict dates, auth/workspace scope, query rejection, default date and redacted unavailability passed.');
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}

assert.match(csv,/\"activity\",\"websiteImportsQueued\",\"0\"/);assert.match(csv,/\"current_backlog\",\"websiteImportsWaiting\",\"0\"/);assert.match(formatDailyWorkDigest(digestReport),/Website imports: 0 queued; 0 snapshot groups committed/);
for(const metric of ['websiteImportsQueued', 'websiteImportsCommitted', 'websiteImportsWithFailures', 'websiteImportsPaused', 'websiteImportsCancelled']){assert.throws(()=>dailyWorkReportCsv({...digestReport,activity:{...digestReport.activity,[metric]:undefined}} as any));}

for(const metric of ['websiteImportsWaiting','websiteImportsRunning','websiteImportsFailed'])assert.throws(()=>dailyWorkReportCsv({...digestReport,backlog:{...digestReport.backlog,[metric]:undefined}} as any));

for(const key of ["telegramManualRecorded", "telegramManualStarted", "telegramManualAccepted", "telegramManualUnknown", "telegramManualPaused", "telegramManualCancelled"]){assert.throws(()=>dailyWorkReportCsv({...digestReport,activity:{...digestReport.activity,[key]:undefined}} as any));}
for(const key of ["telegramManualPrepared", "telegramManualSending", "telegramManualUnknown"]){assert.throws(()=>formatDailyWorkDigest({...digestReport,backlog:{...digestReport.backlog,[key]:undefined}} as any));}
assert.match(formatDailyWorkDigest(digestReport),/Manual Telegram: 0 requests recorded/);

assert.match(csv,/"activity","appointmentOutcomesCorrected","0"/);
assert.match(csv,/"current_backlog","appointmentOutcomesAwaiting","2"/);
assert.match(formatDailyWorkDigest(digestReport),/Appointments: 0 booking updates.*Awaiting outcome: 2/);
assert.throws(()=>dailyWorkReportCsv({...digestReport,backlog:{...digestReport.backlog,[Object.keys(APPOINTMENT_BACKLOG)[0]]:undefined}} as any));
const maximumReport={...digestReport,activity:Object.fromEntries(Object.keys(digestReport.activity).map(k=>[k,Number.MAX_SAFE_INTEGER])),backlog:Object.fromEntries(Object.keys(digestReport.backlog).map(k=>[k,Number.MAX_SAFE_INTEGER]))};assert.ok(formatDailyWorkDigest(maximumReport as any).length<=4096);

assert.match(csv,/"activity","SALES_WORKFLOW_MESSAGE_ACCEPTED","4"/);
assert.match(csv,/"current_backlog","workflowWaitingReview","3"/);
assert.match(workDigest.text,/Workflow API accepts 4 and exits 0. Current reviews 3/);

assert.match(csv,/"activity","queueAdmitted","4"/);
assert.match(csv,/"current_backlog","queueRetryDue","2"/);
assert.match(workDigest.text,/Due retries 2. Stale leases 0/);

assert.match(csv,/"activity","admissionDifferentClaim","0"/);
assert.match(formatDailyWorkDigest({...digestReport,activity:{...digestReport.activity,admittedPosts:1,admissionPublished:1}}),/Matched publish successes: 1/);

assert.match(csv,/"activity","facebookPublished","2"/);

assert.match(csv,/"activity","providerCheckMatched","2"/);

assert.match(csv,/"activity","scheduleRevisions","2"/);

assert.match(csv,/"activity","calendarPlanCreated","2"/);

assert.match(csv,/"activity","dailyDigestAccepted","2"/);
assert.match(csv,/"current_backlog","notificationsUnconfirmed","3"/);

assert.match(csv,/"activity","reviewContextUnavailable","1"/);

const dueAt=Date.parse('2026-11-03T02:30:00Z');
assert.deepEqual(boundDailyDigestMessage('x'.repeat(4096),dueAt,2,3),{message:'x'.repeat(4096),compact:false});
const compactDigest=boundDailyDigestMessage('PRIVATE_BODY'+'x'.repeat(4096),dueAt,2,3);
assert.equal(compactDigest.compact,true);
assert.ok(compactDigest.message.length<4096);
assert.match(compactDigest.message,/2026-11-03 IST/);
assert.match(compactDigest.message,/New inbound leads 2/);
assert.match(compactDigest.message,/Newly recorded reviews 3/);
assert.ok(!compactDigest.message.includes('PRIVATE_BODY'));

assert.match(csv,/"activity","digestSelected","1"/);
assert.match(csv,/"current_backlog","digestSelectionEligible","1"/);

assert.match(csv,/"activity","digestObservedArchived","1"/);

assert.match(csv,/"activity","critical_failedJobs_InitialAccepted","1"/);
assert.match(csv,/"current_backlog","critical_failedJobs_Open","1"/);
