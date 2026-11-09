import React,{useEffect,useRef,useState} from 'react';
import {apiRequest,ApiRequestError} from '../services/authService';
import {dailyWorkReportCsv,platformDateKey,type DailyWorkReport as Report} from '../../shared/dailyWorkReport';
import {formatPlatformDateTime} from '../../shared/platformTime';
export const DailyWorkReport:React.FC<{companyId:string}>=({companyId})=>{
 const [date,setDate]=useState(platformDateKey()),[report,setReport]=useState<Report|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const request=useRef<AbortController|null>(null);
 async function load(){
  request.current?.abort();setReport(null);setError('');if(!date)return;
  const controller=new AbortController();request.current=controller;setLoading(true);
  try{
   const result=await apiRequest<{success:boolean;report:Report}>(`/api/companies/${encodeURIComponent(companyId)}/daily-work-report?date=${encodeURIComponent(date)}`,{signal:controller.signal});
   if(controller.signal.aborted)return;
   if(!result.success || result.report?.date!==date || result.report.timeZone!=='Asia/Kolkata' || !result.report.activity || !result.report.backlog || !Number.isFinite(Date.parse(result.report.generatedAt)) || !Object.keys(dayLabels).every(key=>Number.isSafeInteger(result.report.activity[key as keyof Report['activity']]) && result.report.activity[key as keyof Report['activity']]>=0) || !Object.keys(backlogLabels).every(key=>Number.isSafeInteger(result.report.backlog[key as keyof Report['backlog']]) && result.report.backlog[key as keyof Report['backlog']]>=0))throw new Error('Invalid report');
   setReport(result.report);
  }catch(cause){if(!controller.signal.aborted)setError(cause instanceof ApiRequestError && [401,403,404].includes(cause.status)?'This workspace report is unavailable.':'Recorded work report unavailable. Retry after the connection recovers.');}
  finally{if(!controller.signal.aborted)setLoading(false);}
 }
 useEffect(()=>{void load();return()=>request.current?.abort();},[companyId,date]);
 const dayLabels:Record<keyof Report['activity'],string>={completedJobs:'Completed jobs',failedJobs:'Jobs with failure records',pausedJobs:'Jobs paused',approvedPosts:'Recorded scheduling approvals',rescheduledPosts:'Posts rescheduled for approval',admittedPosts:'Posts admitted for publishing',controlChanges:'Publishing control changes',messageRequests:'Recorded message requests',apiAcceptedMessages:'Message requests API-accepted',websiteInquiries:'Website inquiries received',inquiryAlertsAccepted:'Inquiry alerts API-accepted'};
 const backlogLabels:Record<keyof Report['backlog'],string>={waitingJobs:'Queued or waiting jobs',runningJobs:'Jobs marked running',failedJobs:'Jobs currently failed',pendingApprovals:'Posts marked pending approval',uncertainPublications:'Uncertain publishing claims',unconfirmedMessages:'In-progress or unknown message requests',inquiryAlertsNotAttempted:'Inquiry alerts not attempted',inquiryAlertsUnconfirmed:'Inquiry alerts without confirmed API acceptance'};
 return <section aria-label="Daily recorded work" className="bg-white border border-slate-200 rounded-3xl p-6 mt-6 space-y-4">
  <h2 className="font-bold text-lg">Daily recorded work</h2>
  <div className="flex gap-3"><label>Report date (IST) <input type="date" aria-label="Recorded work date" value={date} onChange={event=>{request.current?.abort();setReport(null);setError('');setLoading(false);setDate(event.target.value);}}/></label><button disabled={loading || !date} onClick={()=>void load()} className="text-indigo-600 text-sm">Refresh work report</button></div>
  <p className="text-sm text-slate-500">Coverage: saved queue transitions, approval changes, publishing admissions control changes direct WhatsApp requests and durable website inquiries for the selected IST day. A job or post can appear in more than one activity count.</p>
  {loading && <p role="status">Loading recorded work…</p>}{error && <p role="alert">{error}</p>}
  {report && <><button className="text-indigo-600 text-sm" onClick={()=>{
   const url=URL.createObjectURL(new Blob([dailyWorkReportCsv(report)],{type:'text/csv;charset=utf-8'}));
   const link=document.createElement('a');link.href=url;link.download=`recorded-work-${report.date}-IST.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }}>Download work report CSV</button><p className="text-sm text-slate-500">Admissions count reserved post starts for this IST day, including failed or uncertain outcomes; they do not confirm delivery. Control changes count saved revisions, not individual switches. Message request counts use initial record date; API acceptance counts use the terminal acceptance date and do not prove delivery. Inquiry counts use receipt creation time; staff alert acceptance uses its settlement date and proves no recipient delivery. Unattempted/unconfirmed alert states include work interrupted or blocked before API acceptance. CSV includes this report snapshot and current backlog.</p><h3 className="font-semibold">Recorded on {report.date} IST</h3><dl className="grid grid-cols-2 gap-2 text-sm">{Object.entries(dayLabels).map(([key,label])=><div key={key}><dt>{label}</dt><dd aria-label={label} className="font-bold">{report.activity[key as keyof Report['activity']]}</dd></div>)}</dl>
   <h3 className="font-semibold">Current backlog</h3><p className="text-sm text-slate-500">Current saved states across all dates, read at {formatPlatformDateTime(report.generatedAt)}.</p><dl className="grid grid-cols-2 gap-2 text-sm">{Object.entries(backlogLabels).map(([key,label])=><div key={key}><dt>{label}</dt><dd aria-label={label} className="font-bold">{report.backlog[key as keyof Report['backlog']]}</dd></div>)}</dl>
   <p className="text-sm text-slate-500">Recorded job completion is not proof of new clients or revenue. Check the action and publishing histories for outcomes needing review.</p>
  </>}
 </section>;
};
