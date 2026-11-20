import {CURRENT_REPORT_COVERAGE} from './reportSnapshotCoverage';
import {z} from 'zod';
import {validateReportSnapshot} from './reportSnapshots';
export const clientReportId=z.string().regex(/^crp_[a-f0-9]{32}$/);
export const clientLinkId=z.string().regex(/^crl_[a-f0-9]{32}$/);
export const reportHash=z.string().regex(/^[a-f0-9]{64}$/);
export const reportVersion=z.number().int().min(1).max(1000000);
const text=(max:number)=>z.string().trim().max(max).refine(v=>!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v));
export const CLIENT_ACTIVITY={completedJobs:'Completed jobs',failedJobs:'Jobs with failure records',pausedJobs:'Jobs paused',approvedPosts:'Recorded scheduling approvals',admittedPosts:'Posts admitted for publishing',apiAcceptedMessages:'Message requests API-accepted',websiteInquiries:'Website inquiries received',prospectRowsImported:'New prospect rows imported',salesInboundRecorded:'Inbound sales messages recorded',salesQualificationsRecorded:'Sales qualification revisions recorded',salesOpportunitiesUpdated:'Sales opportunity revisions recorded',growthAssessmentsSaved:'Prospect assessments saved',growthExperimentsCompleted:'Measurement windows completed',growthCostsRecorded:'Declared cost entries recorded'} as const;
export const CLIENT_BACKLOG={waitingJobs:'Queued or waiting jobs',runningJobs:'Jobs marked running',failedJobs:'Jobs currently failed',pendingApprovals:'Posts pending approval',uncertainPublications:'Uncertain publishing claims',unconfirmedMessages:'Unconfirmed message requests'} as const;
export const REQUIRED_CLIENT_ACTIVITY=['completedJobs','failedJobs','pausedJobs'] as const;
export const CLIENT_OPTIONAL_ACTIVITY=Object.keys(CLIENT_ACTIVITY).filter(k=>!REQUIRED_CLIENT_ACTIVITY.includes(k as any));
export const CLIENT_REPORT_NOTICE='Counts describe recorded work, not guaranteed business results. API acceptance is not delivery. Backlog was observed at capture, not reconstructed at midnight. Declared sales and growth evidence is not provider verification.';
export const clientReportInput=z.object({snapshotId:z.string().regex(/^rps_[a-f0-9]{32}$/),sourceHash:reportHash,sourceRevision:z.number().int().min(1).max(20),title:text(120).refine(v=>v.length>=3),clientSummary:text(2000),privateNotes:text(2000),optionalMetrics:z.array(z.enum(Object.keys(CLIENT_ACTIVITY) as [string,...string[]])).max(CLIENT_OPTIONAL_ACTIVITY.length).refine(a=>new Set(a).size===a.length&&a.every(k=>CLIENT_OPTIONAL_ACTIVITY.includes(k)))}).strict();
export const createClientReport=clientReportInput.extend({requestKey:reportHash});
export const clientReportTransition=z.discriminatedUnion('action',[
 z.object({action:z.literal('EDIT'),expectedVersion:reportVersion,input:clientReportInput}).strict(),
 z.object({action:z.literal('APPROVE'),expectedVersion:reportVersion,expectedPublicHash:reportHash}).strict(),
 z.object({action:z.literal('REVOKE'),expectedVersion:reportVersion}).strict(),
]);
export const issueClientLink=z.object({expectedVersion:reportVersion,requestKey:reportHash,expiryDays:z.number().int().min(1).max(30)}).strict();
const metric=z.object({key:z.string(),label:z.string(),value:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)}).strict();
export const clientReportPublic=z.object({model:z.literal(1),businessName:text(160).refine(v=>v.length>0),title:text(120).refine(v=>v.length>=3),clientSummary:text(2000),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),timeZone:z.literal('Asia/Kolkata'),coverageVersion:z.number().int().min(1).max(CURRENT_REPORT_COVERAGE),capturedAtMs:z.number().int().nonnegative().max(8640000000000000),sourceGeneratedAtMs:z.number().int().nonnegative().max(8640000000000000),activity:z.array(metric).max(14),backlog:z.array(metric).length(6),notice:z.literal(CLIENT_REPORT_NOTICE)}).strict().superRefine((r,ctx)=>{
 const required=[...REQUIRED_CLIENT_ACTIVITY];if(r.activity.length<3||required.some((k,i)=>r.activity[i]?.key!==k)||r.activity.some(m=>CLIENT_ACTIVITY[m.key as keyof typeof CLIENT_ACTIVITY]!==m.label)||new Set(r.activity.map(m=>m.key)).size!==r.activity.length||r.backlog.some((m,i)=>Object.keys(CLIENT_BACKLOG)[i]!==m.key||CLIENT_BACKLOG[m.key as keyof typeof CLIENT_BACKLOG]!==m.label)||!Number.isFinite(Date.parse(r.date+'T00:00:00Z'))||new Date(r.date+'T00:00:00Z').toISOString().slice(0,10)!==r.date)ctx.addIssue({code:'custom',message:'Client report shape invalid'});
});
export type ClientReportPublic=z.infer<typeof clientReportPublic>;
export function projectClientReport(snapshot:any,company:string,businessName:string,input:unknown):ClientReportPublic{
 const p=clientReportInput.parse(input),s=validateReportSnapshot(snapshot,company);if(s.id!==p.snapshotId||s.contentHash!==p.sourceHash||s.revision!==p.sourceRevision)throw new Error('CLIENT_REPORT_SOURCE_CHANGED');
 const activity=[...REQUIRED_CLIENT_ACTIVITY,...CLIENT_OPTIONAL_ACTIVITY.filter(k=>p.optionalMetrics.includes(k))].map(key=>{const value=(s.report.activity as any)[key];if(!Number.isSafeInteger(value)||value<0)throw new Error('CLIENT_REPORT_METRIC_UNAVAILABLE');return{key,label:CLIENT_ACTIVITY[key as keyof typeof CLIENT_ACTIVITY],value};});
 return clientReportPublic.parse({model:1,businessName,title:p.title,clientSummary:p.clientSummary,date:s.date,timeZone:'Asia/Kolkata',coverageVersion:s.schemaVersion,capturedAtMs:s.capturedAtMs,sourceGeneratedAtMs:s.sourceGeneratedAtMs,activity,backlog:Object.entries(CLIENT_BACKLOG).map(([key,label])=>({key,label,value:(s.report.backlog as any)[key]})),notice:CLIENT_REPORT_NOTICE});
}
export function clientReportCsv(input:unknown){const r=clientReportPublic.parse(input);const rows=[['business','title','date','timezone','coverage_version','captured_at','source_generated_at','section','metric','count','summary','notice']];for(const section of ['activity','backlog'] as const)for(const m of r[section])rows.push([r.businessName,r.title,r.date,r.timeZone,String(r.coverageVersion),new Date(r.capturedAtMs).toISOString(),new Date(r.sourceGeneratedAtMs).toISOString(),section==='backlog'?'backlog_at_capture':section,m.label,String(m.value),r.clientSummary,r.notice]);return rows.map(row=>row.map(value=>'"'+(/^[\s]*[=+@-]/.test(value)?"'":'')+value.replaceAll('"','""')+'"').join(',')).join('\r\n')+'\r\n';}
