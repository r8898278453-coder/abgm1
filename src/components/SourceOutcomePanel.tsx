import {sourceOutcomeCostsCsv,validateSourceOutcomeCosts,type DeclaredCostEvidence} from '../../shared/sourceOutcomeFinance';
import React,{useEffect,useRef,useState} from 'react';
import {apiRequest,getStoredToken} from '../services/authService';
import {featureSessionRevision,subscribeFeatureSession} from '../services/featureSession';
import {validateSourceOutcomeReport,sourceOutcomeCsv,type SourceOutcomeReport} from '../../shared/sourceOutcomeReport';
import {appointmentSourceCsv,appointmentSourceModels,validateAppointmentSources,type AppointmentSourceReport} from '../../shared/appointmentSourceReport';
import {formatPlatformDateTime} from '../../shared/platformTime';
export function SourceOutcomePanel(p:{companyId:string}){const [session,setSession]=useState(featureSessionRevision);useEffect(()=>subscribeFeatureSession(()=>setSession(featureSessionRevision())),[]);return <Report key={p.companyId+':'+session} {...p}/>;}
const modelLabels={
 currentDeclared:'Current declared source',
 firstBeforeBooking:'First recorded source before booking',
 lastBeforeBooking:'Last recorded source before booking',
};
const countLabels={
 booked:'Booked',
 cancelled:'Cancelled',
 scheduled:'Scheduled or in progress',
 held:'Held',
 noShow:'No-show',
 undetermined:'Undetermined',
 unrecorded:'Ended without an outcome',
} as const;
const countKeys=Object.keys(countLabels) as Array<keyof typeof countLabels>;

function AppointmentSources({report,onExport}:{report:AppointmentSourceReport;onExport:()=>void}){
 const [model,setModel]=useState<typeof appointmentSourceModels[number]>('lastBeforeBooking');
 return <section aria-label="Appointment outcomes by source" className="space-y-2">
  <h4>Appointment outcomes by source</h4>
  {report.status==='CAPACITY_EXCEEDED'?<p role="status">Appointment totals are unavailable because the workspace exceeds the reporting limit.</p>:<>
   <p>Booked counts include cancellations. Recorded sources use interactions from before the first confirmation of each appointment. Attendance reflects the saved operator outcome.</p>
   <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
    {countKeys.map(key=><div key={key}><dt>{countLabels[key]}</dt><dd>{report.totals[key]}</dd></div>)}
   </dl>
   <label className="block">Appointment source model <select className="max-w-full" value={model} onChange={e=>setModel(appointmentSourceModels.find(key=>key===e.target.value)??'lastBeforeBooking')}>
    {appointmentSourceModels.map(key=><option key={key} value={key}>{modelLabels[key]}</option>)}
   </select></label>
   {report.totals.booked===0?<p>No recorded appointments.</p>:<ul className="space-y-1">
    {report[model].filter(bucket=>bucket.counts.booked>0).map(({source,counts})=>
     <li key={source}><strong>{source}</strong> · {countKeys.filter(key=>counts[key]>0).map(key=>countLabels[key]+' '+counts[key]).join(' · ')}</li>)}
   </ul>}
   <button onClick={onExport}>Export appointment source CSV</button>
  </>}
 </section>;
}

const Report:React.FC<{companyId:string}>=({companyId})=>{
 const [evidence,setEvidence]=useState<{lead:SourceOutcomeReport;appointments?:AppointmentSourceReport;costs?:DeclaredCostEvidence[]}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');const epoch=useRef(0),controller=useRef<AbortController|null>(null),accepted=useRef<string|null|undefined>(undefined);
 const report=evidence?.lead;
 useEffect(()=>()=>{epoch.current++;controller.current?.abort();},[companyId]);
 const load=async()=>{controller.current?.abort();const c=new AbortController();controller.current=c;const version=++epoch.current,token=getStoredToken(),current=()=>!c.signal.aborted&&version===epoch.current&&token===getStoredToken();accepted.current=undefined;setEvidence(null);setError('');setBusy(true);try{const response=await apiRequest<any>(`/api/companies/${encodeURIComponent(companyId)}/sales/source-outcomes`,{signal:c.signal});if(!current())return;if(!response.success||response.companyId!==companyId)throw new Error();const data=validateSourceOutcomeReport(response.report,companyId);accepted.current=token;setEvidence({lead:data,costs:response.costEvidence===undefined?undefined:validateSourceOutcomeCosts(response.costEvidence,data),appointments:response.appointments===undefined?undefined:validateAppointmentSources(response.appointments,data.historyComplete)});}catch{if(current())setError('Source and outcome evidence is unavailable or inconsistent. No complete attribution or ROI is claimed.');}finally{if(current())setBusy(false);}};
 const exportCsv=(kind:'leads'|'appointments'|'costs'='leads')=>{
  try{
   if(!report||accepted.current!==getStoredToken())throw new Error();
   const csv=kind==='costs'?sourceOutcomeCostsCsv(evidence?.costs,report):
    kind==='appointments'?appointmentSourceCsv(evidence?.appointments,report):sourceOutcomeCsv(report,companyId);
   const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
   const a=document.createElement('a');
   a.href=url;
   a.download=(kind==='costs'?'declared-costs-':kind==='appointments'?'appointment-sources-':'source-outcomes-')+companyId+'.csv';
   a.click();
   URL.revokeObjectURL(url);
  }catch{accepted.current=undefined;setEvidence(null);setError('The account or report changed. Reload before exporting.');}
 };
 const money=(values:Record<string,string>)=>Object.keys(values).length?<ul>{Object.entries(values).map(([cur,minor])=><li key={cur}>{cur}: {minor} minor units</li>)}</ul>:<p>No recorded amounts.</p>;
 return <section aria-label="Source and outcome evidence" className="border rounded-xl p-4 space-y-3"><h3>Source and outcome evidence</h3><p>Primary/contact CRM outcomes with versioned first/last known recorded interactions. Untimed linked records withhold attribution because their chronological position is unknown. Independent additional deals are reported separately in the deal portfolio. This is a saved-evidence view, not a reconstruction of every historical visit or proof that a source caused a sale.</p><button disabled={busy} onClick={()=>void load()}>Load source and outcome evidence</button>{error&&<p role="alert">{error}</p>}{report&&<><p>As observed {formatPlatformDateTime(report.checkedAtMs)} · model V{report.model} · IST.</p>{!report.historyComplete&&<p role="status">History limit reached. First/last source attribution is withheld for every lead.</p>}<dl><dt>Leads</dt><dd>{report.totals.leads}</dd><dt>Won / lost / open / unknown stage</dt><dd>{report.totals.won} / {report.totals.lost} / {report.totals.open} / {report.totals.unknownStage}</dd><dt>Leads with / without timed evidence</dt><dd>{report.totals.withKnownRecordedTouch} / {report.totals.withoutKnownRecordedTouch}</dd><dt>Ambiguous first / last source</dt><dd>{report.totals.ambiguousFirst} / {report.totals.ambiguousLast}</dd><dt>Unlinked / untimed / orphan interactions</dt><dd>{report.totals.unlinkedInteractions} / {report.totals.untimedInteractions} / {report.totals.orphanInteractions}</dd></dl><h4>Manual won values — unverified</h4>{money(report.manualWonMinor)}<h4>Declared active costs — unverified and unallocated to sources</h4>{money(report.declaredCostMinor)}{evidence?.costs&&<button onClick={()=>exportCsv('costs')}>Export declared cost evidence CSV</button>}<p>Verified customer revenue: unavailable. Verified marketing spend: unavailable. ROI: unavailable. Campaign budgets and platform billing are excluded.</p>{(['firstKnownSources','lastKnownSources'] as const).map(section=><section key={section}><h4>{section==='firstKnownSources'?'First known recorded source':'Last known recorded source'}</h4><p>These are alternative models. Do not add their totals together.</p><ul>{report[section].filter(b=>b.leads).map(b=><li key={b.source}>{b.source}: {b.leads} leads, {b.won} won, {b.lost} lost</li>)}</ul></section>)}{evidence?.appointments&&<AppointmentSources report={evidence.appointments} onExport={()=>exportCsv('appointments')}/>}<button onClick={()=>exportCsv()}>Export source outcome CSV</button><ul>{report.rows.map(r=><li key={r.leadId} className="break-words">Lead {r.leadId} · {r.stage} · opportunity revision {r.opportunityVersion} · declared source {r.currentDeclaredSource} · first {r.firstKnown.source} · last {r.lastKnown.source} · {r.attributionState}</li>)}</ul><p>{report.notice}</p></>}</section>;
};
