import {WORKFLOW_REPORT_ACTIVITY,WORKFLOW_REPORT_BACKLOG,workflowReportCounts} from '../../shared/salesWorkflowReporting';

export function SalesWorkflowReport({report}:{report:unknown}){
 const read=()=>{
  if(!report||typeof report!=='object'||!('activity' in report)||!('backlog' in report))return null;
  if(!report.activity||typeof report.activity!=='object'||!report.backlog||typeof report.backlog!=='object')return null;
  try{
   return {activity:workflowReportCounts(WORKFLOW_REPORT_ACTIVITY,report.activity as Record<string,unknown>),
    backlog:workflowReportCounts(WORKFLOW_REPORT_BACKLOG,report.backlog as Record<string,unknown>)};
  }catch{return null;}
 };
 const counts=read();
 return <section aria-label="Sales workflow accountability">
  <h4>Sales workflow accountability</h4>
  {counts?<><h5>Recorded on the selected IST day</h5>
   <p>One enrollment can have several recorded transitions. API acceptance is separate from recipient delivery.</p>
   <dl>{Object.entries(counts.activity).map(([key,count])=><div key={key}>
    <dt>{WORKFLOW_REPORT_ACTIVITY[key as keyof typeof WORKFLOW_REPORT_ACTIVITY]}</dt><dd>{count}</dd>
   </div>)}</dl>
   <h5>Current workflow inventory</h5>
   <p>Current states span all dates. Expired open enrollments are counted separately.</p>
   <dl>{Object.entries(counts.backlog).map(([key,count])=><div key={key}>
    <dt>{WORKFLOW_REPORT_BACKLOG[key as keyof typeof WORKFLOW_REPORT_BACKLOG]}</dt><dd>{count}</dd>
   </div>)}</dl></>:<p>Workflow counts unavailable.</p>}
 </section>;
}
