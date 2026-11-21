import {QUEUE_DAILY_ACTIVITY,QUEUE_DAILY_BACKLOG} from './queueDailyReporting';
import {WORKFLOW_DAILY_ACTIVITY,WORKFLOW_DAILY_BACKLOG} from './workflowDailyReporting';
import {EMAIL_WORK_ACTIVITY,EMAIL_WORK_BACKLOG} from './emailWorkReporting';
import {APPOINTMENT_ACTIVITY,APPOINTMENT_BACKLOG} from './appointmentReporting';
import {GROWTH_ACTIVITY,GROWTH_BACKLOG} from './growthReporting';
import {SALES_ACTIVITY} from './salesActivityReporting';
import {CAPTURE_ACTIVITY,CAPTURE_BACKLOG} from './reportCaptureReporting';
import {MANUAL_TELEGRAM_ACTIVITY,MANUAL_TELEGRAM_BACKLOG} from './manualTelegramReporting';
import {IST_OFFSET_MS} from './platformTime';
export function platformDateKey(now=Date.now()):string{return new Date(now+IST_OFFSET_MS).toISOString().slice(0,10);}
export function platformDayBounds(date:string):{start:number;end:number}{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('INVALID_REPORT_DATE');
 const [year,month,day]=date.split('-').map(Number);const instant=Date.UTC(year,month-1,day);const check=new Date(instant);
 if(year<1000 || check.getUTCFullYear()!==year || check.getUTCMonth()!==month-1 || check.getUTCDate()!==day)throw new Error('INVALID_REPORT_DATE');
 const start=instant-IST_OFFSET_MS;return {start,end:start+86400000};
}
export interface DailyWorkReport{
 date:string;timeZone:'Asia/Kolkata';generatedAt:string;
 activity:{completedJobs:number;failedJobs:number;pausedJobs:number;approvedPosts:number;rescheduledPosts:number;admittedPosts:number;controlChanges:number;messageRequests:number;apiAcceptedMessages:number;websiteInquiries:number;inquiryAlertsAccepted:number;knowledgeStored:number;knowledgeExtractionsSettled:number;knowledgeExtractionsBlocked:number;knowledgeApprovals:number;knowledgeWithdrawals:number;knowledgeDeleted:number;websiteImportsQueued:number;websiteImportsCommitted:number;websiteImportsWithFailures:number;websiteImportsPaused:number;websiteImportsCancelled:number;}&Record<keyof typeof MANUAL_TELEGRAM_ACTIVITY,number>&Record<keyof typeof CAPTURE_ACTIVITY,number>&Record<keyof typeof SALES_ACTIVITY,number>&Record<keyof typeof GROWTH_ACTIVITY,number>&Record<keyof typeof APPOINTMENT_ACTIVITY,number>&Record<keyof typeof EMAIL_WORK_ACTIVITY,number>&Record<keyof typeof WORKFLOW_DAILY_ACTIVITY,number>&Record<keyof typeof QUEUE_DAILY_ACTIVITY,number>;
 backlog:{waitingJobs:number;runningJobs:number;failedJobs:number;pendingApprovals:number;uncertainPublications:number;unconfirmedMessages:number;inquiryAlertsNotAttempted:number;inquiryAlertsUnconfirmed:number;knowledgeAwaitingApproval:number;knowledgeExtractionRunning:number;knowledgeExtractionBlocked:number;websiteImportsWaiting:number;websiteImportsRunning:number;websiteImportsFailed:number;}&Record<keyof typeof MANUAL_TELEGRAM_BACKLOG,number>&Record<keyof typeof CAPTURE_BACKLOG,number>&Record<keyof typeof GROWTH_BACKLOG,number>&Record<keyof typeof APPOINTMENT_BACKLOG,number>&Record<keyof typeof EMAIL_WORK_BACKLOG,number>&Record<keyof typeof WORKFLOW_DAILY_BACKLOG,number>&Record<keyof typeof QUEUE_DAILY_BACKLOG,number>;
}

export const DAILY_WORK_METRICS={activity:['completedJobs','failedJobs','pausedJobs','approvedPosts','rescheduledPosts','admittedPosts','controlChanges','messageRequests','apiAcceptedMessages','websiteInquiries','inquiryAlertsAccepted','knowledgeStored','knowledgeExtractionsSettled','knowledgeExtractionsBlocked','knowledgeApprovals','knowledgeWithdrawals','knowledgeDeleted','websiteImportsQueued','websiteImportsCommitted','websiteImportsWithFailures','websiteImportsPaused','websiteImportsCancelled',...Object.keys(MANUAL_TELEGRAM_ACTIVITY),...Object.keys(CAPTURE_ACTIVITY),...Object.keys(SALES_ACTIVITY),...Object.keys(GROWTH_ACTIVITY),...Object.keys(APPOINTMENT_ACTIVITY),...Object.keys(EMAIL_WORK_ACTIVITY),...Object.keys(WORKFLOW_DAILY_ACTIVITY),...Object.keys(QUEUE_DAILY_ACTIVITY)],backlog:['waitingJobs','runningJobs','failedJobs','pendingApprovals','uncertainPublications','unconfirmedMessages','inquiryAlertsNotAttempted','inquiryAlertsUnconfirmed','knowledgeAwaitingApproval','knowledgeExtractionRunning','knowledgeExtractionBlocked','websiteImportsWaiting','websiteImportsRunning','websiteImportsFailed',...Object.keys(MANUAL_TELEGRAM_BACKLOG),...Object.keys(CAPTURE_BACKLOG),...Object.keys(GROWTH_BACKLOG),...Object.keys(APPOINTMENT_BACKLOG),...Object.keys(EMAIL_WORK_BACKLOG),...Object.keys(WORKFLOW_DAILY_BACKLOG),...Object.keys(QUEUE_DAILY_BACKLOG)]} as const;

/** Fixed labels and numeric values only: no provider payloads, captions, actor names or spreadsheet formulas. */
export function dailyWorkReportCsv(report:DailyWorkReport):string{
 platformDayBounds(report.date);
 if(report.timeZone!=='Asia/Kolkata'||!Number.isFinite(Date.parse(report.generatedAt)))throw new Error('INVALID_REPORT_METADATA');
 const metrics=DAILY_WORK_METRICS;
 const values=(section:keyof typeof metrics)=>metrics[section].map(metric=>{
  const count=(report[section] as unknown as Record<string,number>)[metric];if(!Number.isSafeInteger(count)||count<0)throw new Error('INVALID_REPORT_COUNT');
  return [report.date,report.timeZone,new Date(report.generatedAt).toISOString(),section==='backlog'?'current_backlog':'activity',metric,String(count)];
 });
 const rows=[['date','timezone','generated_at','section','metric','count'],
  ...values('activity'),...values('backlog')];
 return rows.map(row=>row.map(value=>'"'+value.replace(/"/g,'""')+'"').join(',')).join('\r\n')+'\r\n';
}

/** Copy only the fixed report contract; unknown source fields can never enter frozen evidence. */
export function canonicalDailyWorkReport(report:DailyWorkReport):DailyWorkReport{
 dailyWorkReportCsv(report);
 const section=(name:'activity'|'backlog')=>Object.fromEntries(DAILY_WORK_METRICS[name].map(k=>[k,(report[name] as any)[k]]));
 return{date:report.date,timeZone:'Asia/Kolkata',generatedAt:new Date(report.generatedAt).toISOString(),activity:section('activity'),backlog:section('backlog')} as DailyWorkReport;
}
