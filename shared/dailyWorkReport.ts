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
 activity:{completedJobs:number;failedJobs:number;pausedJobs:number;approvedPosts:number;rescheduledPosts:number;admittedPosts:number;controlChanges:number;messageRequests:number;apiAcceptedMessages:number;websiteInquiries:number;inquiryAlertsAccepted:number};
 backlog:{waitingJobs:number;runningJobs:number;failedJobs:number;pendingApprovals:number;uncertainPublications:number;unconfirmedMessages:number;inquiryAlertsNotAttempted:number;inquiryAlertsUnconfirmed:number;knowledgeAwaitingApproval:number;knowledgeExtractionRunning:number;knowledgeExtractionBlocked:number};
}

/** Fixed labels and numeric values only: no provider payloads, captions, actor names or spreadsheet formulas. */
export function dailyWorkReportCsv(report:DailyWorkReport):string{
 platformDayBounds(report.date);
 if(report.timeZone!=='Asia/Kolkata'||!Number.isFinite(Date.parse(report.generatedAt)))throw new Error('INVALID_REPORT_METADATA');
 const metrics={activity:['completedJobs','failedJobs','pausedJobs','approvedPosts','rescheduledPosts','admittedPosts','controlChanges','messageRequests','apiAcceptedMessages','websiteInquiries','inquiryAlertsAccepted'],backlog:['waitingJobs','runningJobs','failedJobs','pendingApprovals','uncertainPublications','unconfirmedMessages','inquiryAlertsNotAttempted','inquiryAlertsUnconfirmed','knowledgeAwaitingApproval','knowledgeExtractionRunning','knowledgeExtractionBlocked']} as const;
 const values=(section:keyof typeof metrics)=>metrics[section].map(metric=>{
  const count=(report[section] as unknown as Record<string,number>)[metric];if(!Number.isSafeInteger(count)||count<0)throw new Error('INVALID_REPORT_COUNT');
  return [report.date,report.timeZone,new Date(report.generatedAt).toISOString(),section==='backlog'?'current_backlog':'activity',metric,String(count)];
 });
 const rows=[['date','timezone','generated_at','section','metric','count'],
  ...values('activity'),...values('backlog')];
 return rows.map(row=>row.map(value=>'"'+value.replace(/"/g,'""')+'"').join(',')).join('\r\n')+'\r\n';
}
