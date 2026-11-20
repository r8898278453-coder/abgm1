import {z} from 'zod';
import {ATTRIBUTION_SOURCES,type AttributionSource} from './attributionSources';
import {recordedSourceBoundary,type OutcomeTouch,type SourceOutcomeReport} from './sourceOutcomeReport';

export const APPOINTMENT_SOURCE_CAPACITY=1000;
const measures=['cancelled','scheduled','held','noShow','undetermined','unrecorded'] as const;
const count=z.number().int().min(0).max(APPOINTMENT_SOURCE_CAPACITY);
const appointmentCounts=z.object({
 booked:count,cancelled:count,scheduled:count,held:count,noShow:count,undetermined:count,unrecorded:count,
}).strict().refine(row=>measures.reduce((sum,key)=>sum+row[key],0)===row.booked);
const bucket=z.object({source:z.enum(ATTRIBUTION_SOURCES),counts:appointmentCounts}).strict();
export const appointmentSourceModels=['currentDeclared','firstBeforeBooking','lastBeforeBooking'] as const;
const ready=z.object({
 status:z.literal('READY'),totals:appointmentCounts,
 currentDeclared:z.array(bucket).length(ATTRIBUTION_SOURCES.length),
 firstBeforeBooking:z.array(bucket).length(ATTRIBUTION_SOURCES.length),
 lastBeforeBooking:z.array(bucket).length(ATTRIBUTION_SOURCES.length),
}).strict();
const schema=z.discriminatedUnion('status',[
 ready,z.object({status:z.literal('CAPACITY_EXCEEDED')}).strict(),
]);
export type AppointmentSourceReport=z.infer<typeof schema>;
export type AppointmentSourceEvidence={
 leadId:string;
 firstConfirmedAtMs:number;
 status:typeof measures[number];
};

export function projectAppointmentSources(
 report:SourceOutcomeReport,touches:OutcomeTouch[],appointments:AppointmentSourceEvidence[]|null,
):AppointmentSourceReport {
 if(!appointments||appointments.length>APPOINTMENT_SOURCE_CAPACITY)return {status:'CAPACITY_EXCEEDED'};
 const leads=new Map(report.rows.map(row=>[row.leadId,row]));
 const byLead=new Map<string,OutcomeTouch[]>();
 for(const touch of touches){
  if(touch.atMs===null||!touch.leadId||!leads.has(touch.leadId))continue;
  const list=byLead.get(touch.leadId)??[];
  list.push(touch);
  byLead.set(touch.leadId,list);
 }
 for(const list of byLead.values())list.sort((a,b)=>a.atMs!-b.atMs!);
 const counts=()=>({booked:0,cancelled:0,scheduled:0,held:0,noShow:0,undetermined:0,unrecorded:0});
 const buckets=()=>ATTRIBUTION_SOURCES.map(source=>({source,counts:counts()}));
 const result={status:'READY' as const,totals:counts(),currentDeclared:buckets(),firstBeforeBooking:buckets(),lastBeforeBooking:buckets()};
 for(const appointment of appointments){
  const lead=leads.get(appointment.leadId);
  if(!lead||!Number.isSafeInteger(appointment.firstConfirmedAtMs)||appointment.firstConfirmedAtMs<=0||
     appointment.firstConfirmedAtMs>report.checkedAtMs||!measures.includes(appointment.status)){
   throw new Error('APPOINTMENT_SOURCE_EVIDENCE_INVALID');
  }
  const history=byLead.get(appointment.leadId)??[];
  const complete=report.historyComplete&&!lead.hasUntimedEvidence;
  // Inbox and inquiry storage can round to seconds. Require a prior second to establish order.
  const cutoff=Math.floor(appointment.firstConfirmedAtMs/1000)*1000-1;
  const partition:Record<typeof appointmentSourceModels[number],AttributionSource>={
   currentDeclared:lead.currentDeclaredSource,
   firstBeforeBooking:recordedSourceBoundary(history,false,complete,cutoff).source,
   lastBeforeBooking:recordedSourceBoundary(history,true,complete,cutoff).source,
  };
  result.totals.booked++;
  result.totals[appointment.status]++;
  for(const model of appointmentSourceModels){
   const entry=result[model][ATTRIBUTION_SOURCES.indexOf(partition[model])].counts;
   entry.booked++;
   entry[appointment.status]++;
  }
 }
 return validateAppointmentSources(result,report.historyComplete);
}

export function validateAppointmentSources(input:unknown,historyComplete:boolean):AppointmentSourceReport{
 const report=schema.parse(input);
 if(report.status==='READY'){
  for(const model of appointmentSourceModels){
   const buckets=report[model];
   if(buckets.some((b,i)=>b.source!==ATTRIBUTION_SOURCES[i]||
      !historyComplete&&model!=='currentDeclared'&&b.source!=='Unknown'&&b.counts.booked)||
      (['booked',...measures] as const).some(key=>buckets.reduce((sum,b)=>sum+b.counts[key],0)!==report.totals[key])){
    throw new Error('APPOINTMENT_SOURCE_RECONCILIATION');
   }
  }
 }
 return report;
}

export function appointmentSourceCsv(input:unknown,leadReport:SourceOutcomeReport){
 const report=validateAppointmentSources(input,leadReport.historyComplete);
 if(report.status!=='READY')throw new Error('APPOINTMENT_SOURCE_UNAVAILABLE');
 const asOf=new Date(leadReport.checkedAtMs).toISOString();
 const rows=[['as_of_utc','timezone','model','source','booked','cancelled','scheduled_or_in_progress','held','no_show','undetermined','ended_without_outcome']];
 for(const model of appointmentSourceModels){
  for(const {source,counts} of report[model]){
   rows.push([asOf,leadReport.timeZone,model,source,...(['booked',...measures] as const).map(key=>String(counts[key]))]);
  }
 }
 return rows.map(row=>row.join(',')).join('\r\n')+'\r\n';
}
