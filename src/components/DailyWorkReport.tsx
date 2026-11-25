import {PUBLICATION_ADMISSION_OUTCOMES} from '../../shared/publicationDailyReporting';
import {CALENDAR_PLAN_DAILY_ACTIVITY} from '../../shared/calendarPlanDailyReporting';
import {CRITICAL_ALERT_DAILY_ACTIVITY,CRITICAL_ALERT_DAILY_BACKLOG} from '../../shared/criticalAlertDailyReporting';
import {OperationalCapacityPanel} from './OperationalCapacityPanel';
import {DAILY_ACTIVITY_LABELS as dayLabels,DAILY_BACKLOG_LABELS as backlogLabels} from '../../shared/dailyWorkReportLabels';
import {ReportSnapshotPanel} from './ReportSnapshotPanel';
import React,{useEffect,useRef,useState} from 'react';
import {apiRequest,ApiRequestError,getStoredToken} from '../services/authService';
import {dailyWorkReportCsv,platformDateKey,type DailyWorkReport as Report} from '../../shared/dailyWorkReport';
import {formatPlatformDateTime} from '../../shared/platformTime';
export const DailyWorkReport:React.FC<{companyId:string}>=p=><ClientWorkReport key={p.companyId} {...p}/>;
const ClientWorkReport:React.FC<{companyId:string}>=({companyId})=>{
 const [date,setDate]=useState(platformDateKey()),[report,setReport]=useState<Report|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const request=useRef<AbortController|null>(null),acceptedToken=useRef<string|null|undefined>(undefined);
 async function load(){
  request.current?.abort();setReport(null);acceptedToken.current=undefined;setError('');if(!date)return;
  const token=getStoredToken(),controller=new AbortController();request.current=controller;setLoading(true);
  try{
   const result=await apiRequest<{success:boolean;companyId:string;report:Report}>(`/api/companies/${encodeURIComponent(companyId)}/daily-work-report?date=${encodeURIComponent(date)}`,{signal:controller.signal});
   if(controller.signal.aborted)return;
   if(token!==getStoredToken())throw new Error('Session changed');
   if(result.success!==true || result.companyId!==companyId || result.report?.date!==date || result.report.timeZone!=='Asia/Kolkata' || !result.report.activity || !result.report.backlog || !Number.isFinite(Date.parse(result.report.generatedAt)) || !Object.keys(dayLabels).every(key=>Number.isSafeInteger(result.report.activity[key as keyof Report['activity']]) && result.report.activity[key as keyof Report['activity']]>=0) || !Object.keys(backlogLabels).every(key=>Number.isSafeInteger(result.report.backlog[key as keyof Report['backlog']]) && result.report.backlog[key as keyof Report['backlog']]>=0))throw new Error('Invalid report');
   acceptedToken.current=token;setReport(result.report);
  }catch(cause){if(!controller.signal.aborted)setError(cause instanceof ApiRequestError && [401,403,404].includes(cause.status)?'This workspace report is unavailable.':'Recorded work report unavailable. Retry after the connection recovers.');}
  finally{if(!controller.signal.aborted)setLoading(false);}
 }
 useEffect(()=>{void load();return()=>request.current?.abort();},[companyId,date]);
 return <section aria-label="Daily recorded work" className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 mt-6 space-y-4 min-w-0 break-words">
  <h2 className="font-bold text-lg">Daily recorded work</h2>
  <div className="flex flex-wrap items-end gap-3"><label>Report date (IST) <input type="date" aria-label="Recorded work date" value={date} onChange={event=>{request.current?.abort();setReport(null);setError('');setLoading(false);setDate(event.target.value);}}/></label><button disabled={loading || !date} onClick={()=>void load()} className="text-indigo-600 text-sm">Refresh work report</button></div>
  <p className="text-sm text-slate-500">Coverage: saved queue transitions, approval changes, publishing admissions control changes direct WhatsApp requests and durable website inquiries and durable knowledge lifecycle and website-import run events plus audited sales/import, report capture and manual Telegram transitions for the selected IST day. A job or post can appear in more than one activity count.</p>
  {loading && <p role="status">Loading recorded work…</p>}{error && <p role="alert">{error}</p>}
  {report && acceptedToken.current===getStoredToken() && <><button className="text-indigo-600 text-sm" onClick={()=>{
   if(acceptedToken.current!==getStoredToken()){setReport(null);setError('Session changed. Reload the work report.');return;}
   const url=URL.createObjectURL(new Blob([dailyWorkReportCsv(report)],{type:'text/csv;charset=utf-8'}));
   const link=document.createElement('a');link.href=url;link.download=`recorded-work-${report.date}-IST.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }}>Download work report CSV</button><p className="text-sm text-slate-500">Admissions count reserved post starts for this IST day, including failed or uncertain outcomes; they do not confirm delivery. Control changes count saved revisions, not individual switches. Message request counts use initial record date; API acceptance counts use the terminal acceptance date and do not prove delivery. Inquiry counts use receipt creation time; staff alert acceptance uses its settlement date and proves no recipient delivery. Unattempted/unconfirmed alert states include work interrupted or blocked before API acceptance. Knowledge counts are recorded transitions, so a source can be counted repeatedly for separate attempts/approvals. Settled ingestion outcomes include failed/unsupported/OCR results and reconciled cancelled/interrupted runs. Website-import activity counts distinct runs with each transition during the selected day, including retries that later succeeded. Committed snapshot groups are not extraction, approval, complete site coverage or marketing results. Import backlog is a subset of all jobs. Manual Telegram activity uses committed audit timestamps, including configuration-only pauses recorded at admission. Boundaries are not proof of network I/O; API acceptance is not recipient delivery. Overlapping transitions cannot be added into a unique request total. Interrupted or unconfirmed settlements remain in the current prepared/sending/unknown backlog instead of fabricating an outcome. Older unlogged work is not backfilled; deletion retains minimal audit evidence. Capture activity uses committed audit records; amendments are a subset of stored revisions, while worker skips and policy cancellations are separate. Pending/running/reconciliation counts overlap; failed capture backlog is retained across dates. These counts do not prove report delivery. Frozen V1 copies omit the newer capture-operation metrics. Sales activity counts committed audit revisions, including repeated updates to one lead. Ambiguity/opt-out and human-review counts are subsets; not-imported rows include invalid, excluded, existing, ambiguous and suppressed outcomes. Preview and request replay add no import activity. Imported leads grant no consent, and opportunity revisions do not establish revenue or sales. Frozen V1/V2 copies omit these newer sales metrics. Growth counts are committed ledger transitions, not verified signals, contacts or spend. Experiment drafts/edits/approval/start/observation/stop/completion can overlap; cost voids retain original audit evidence. Growth backlog is current across all dates, including stale retained declarations. V1/V2/V3 copies omit these newer growth metrics. Appointment activity is counted on the day each booking or outcome revision was recorded. The current backlog includes ended appointments still awaiting an outcome. Frozen reports include appointment counts from V5 onward.</p><p className="text-sm text-slate-500">Email delivery counts distinct emails per signed event type. Reply and opt-out activity uses provider occurrence time. Recovery activity uses saved admission or settlement time. The same email can appear in several counts. Email metrics are available in frozen reports from V6 onward. Workflow activity uses committed audit events. Workflow inventory is current across dates. V7 captures include workflow counts. Queue failures distinguish retries from terminal outcomes. V8 adds queue counts. Publishing admissions show the current claim for each post reserved on the selected IST day. A changed claim leaves the original outcome unconfirmed. Frozen V9 includes these counts. V10 adds platform outcomes recorded at claim settlement. Provider API success is separate from recipient delivery. V11 adds read-back checks, operator reviews and posts currently saved with the selected date. The saved-date counts can change when posts are edited. V12 adds timestamp-form schedules and recorded revision history. Some posts appear in both the saved-date and timestamp-form counts. V13 adds recorded calendar plan revisions and current slot outcomes for the selected day. A saved draft can still be awaiting publishing. V14 adds notification outcomes by scheduled IST day and current unresolved claims across dates. API acceptance records the provider acknowledgment. V15 records whether each pre-claim decision occurred for a notification kind on the selected day. Repeated decisions share a single daily entry. V16 adds preparation outcomes before the claim stage, including empty work, rejected messages and compact digests. V17 adds recorded scheduler selection and current selection eligibility. Eligibility uses saved workspace, connection and policy records. The actual claim checks additional conditions. V18 records eligibility reasons observed in a rotating sample. Several reasons can be recorded for one client on the same day. The recovery backlog includes pending and running intakes that have yet to expire.</p><h3 className="font-semibold">Recorded on {report.date} IST</h3><dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">{Object.entries(dayLabels).filter(([key])=>!Object.hasOwn(CRITICAL_ALERT_DAILY_ACTIVITY,key)&&!key.startsWith('calendarSlot')&&key!=='admittedPosts'&&!Object.hasOwn(PUBLICATION_ADMISSION_OUTCOMES,key)).map(([key,label])=><div key={key}><dt>{label}</dt><dd aria-label={label} className="font-bold">{report.activity[key as keyof Report['activity']]}</dd></div>)}</dl>
   <section aria-label="Publishing admission reconciliation" className="rounded border p-3">
    <h3 className="font-semibold">Publishing admissions for {report.date} IST</h3>
    <p className="text-sm">Each admission contributes one outcome based on the claim retained when this report loaded. A later claim may have replaced the original.</p>
    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
     <div><dt>{dayLabels.admittedPosts}</dt><dd aria-label={dayLabels.admittedPosts} className="font-bold">{report.activity.admittedPosts}</dd></div>
     {Object.entries(PUBLICATION_ADMISSION_OUTCOMES).map(([key,label])=>
      <div key={key}><dt>{label}</dt><dd aria-label={label} className="font-bold">{report.activity[key as keyof typeof PUBLICATION_ADMISSION_OUTCOMES]}</dd></div>
     )}
    </dl>
   </section>
   <section aria-label="Calendar slot reconciliation" className="rounded border p-3">
    <h3 className="font-semibold">Calendar slots for {report.date} IST</h3>
    <p className="text-sm">Current plan records and publishing evidence observed at {formatPlatformDateTime(report.generatedAt)}.</p>
    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
     <div><dt>Retained planned slots</dt><dd className="font-bold">{
      report.activity.calendarSlotPending + report.activity.calendarSlotGenerating +
      report.activity.calendarSlotFailed + report.activity.calendarSlotCancelled + report.activity.calendarSlotSaved
     }</dd></div>
     {(['calendarSlotPending','calendarSlotGenerating','calendarSlotFailed','calendarSlotCancelled','calendarSlotSaved'] as const).map(key=>
      <div key={key}><dt>{CALENDAR_PLAN_DAILY_ACTIVITY[key]}</dt><dd aria-label={CALENDAR_PLAN_DAILY_ACTIVITY[key]} className="font-bold">{report.activity[key]}</dd></div>
     )}
    </dl>
    <h4 className="mt-3 font-semibold">Publishing evidence for saved draft slots</h4>
    <p className="text-sm">A saved slot can have both admission and publication evidence. An admission can come from another day.</p>
    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
     {(['calendarSlotMissingPost','calendarSlotAdmittedPost','calendarSlotPublishedPost'] as const).map(key=>
      <div key={key}><dt>{CALENDAR_PLAN_DAILY_ACTIVITY[key]}</dt><dd aria-label={CALENDAR_PLAN_DAILY_ACTIVITY[key]} className="font-bold">{report.activity[key]}</dd></div>
     )}
    </dl>
   </section>
   <h3 className="font-semibold">Current backlog</h3><p className="text-sm text-slate-500">Current saved states across all dates, read at {formatPlatformDateTime(report.generatedAt)}.</p><dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">{Object.entries(backlogLabels).filter(([key])=>!Object.hasOwn(CRITICAL_ALERT_DAILY_BACKLOG,key)).map(([key,label])=><div key={key}><dt>{label}</dt><dd aria-label={label} className="font-bold">{report.backlog[key as keyof Report['backlog']]}</dd></div>)}</dl>
   <details className="rounded border p-3">
    <summary className="cursor-pointer font-semibold">Critical alert outcomes</summary>
    <p className="text-sm text-slate-500">Reservations are grouped by their recorded IST day and the current state of their notification. Multiple reservations can share one notification. API acceptance records provider acknowledgment. Incident counts reflect the latest saved observation.</p>
    <h4 className="font-semibold">Reservations on {report.date} IST</h4>
    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
     {Object.entries(CRITICAL_ALERT_DAILY_ACTIVITY).map(([key,label])=><div key={key}><dt>{label}</dt><dd aria-label={label} className="font-bold">{report.activity[key as keyof typeof CRITICAL_ALERT_DAILY_ACTIVITY]}</dd></div>)}
    </dl>
    <h4 className="font-semibold">Current incident evidence</h4>
    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
     {Object.entries(CRITICAL_ALERT_DAILY_BACKLOG).map(([key,label])=><div key={key}><dt>{label}</dt><dd aria-label={label} className="font-bold">{report.backlog[key as keyof typeof CRITICAL_ALERT_DAILY_BACKLOG]}</dd></div>)}
    </dl>
   </details>
   <p className="text-sm text-slate-500">Recorded job completion is not proof of new clients or revenue. Check the action and publishing histories for outcomes needing review.</p>
  </>}
  <OperationalCapacityPanel companyId={companyId}/>
  <ReportSnapshotPanel companyId={companyId}/>
 </section>;
};
