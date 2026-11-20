import crypto from 'node:crypto';import type {Pool} from 'mysql2/promise';
import {analyzeSourceOutcomes,validateSourceOutcomeReport,type OutcomeLead,type OutcomeTouch} from '../shared/sourceOutcomeReport';
import {inboundAttributionSource} from '../shared/attributionSources';
import {readDeclaredCostEvidence} from './growthOperations';
import {withReadOnlySqlDeadline,type ReadOnlySql} from './readOnlySqlDeadline';
import {agencyClientAccess} from './agencyPolicy';
import {SalesError} from './salesWorkspace';
import {latestAppointmentOutcomeJoin} from './appointmentOutcomes';
import {APPOINTMENT_SOURCE_CAPACITY,projectAppointmentSources,type AppointmentSourceEvidence} from '../shared/appointmentSourceReport';

type AppointmentHistoryRow={
  lead_id:string;
  state:string;
  end_at_ms:number|string;
  outcome:string|null;
  firstConfirmed:number|string|null;
};

async function readAppointmentEvidence(sql:ReadOnlySql,company:string,now:number) {
  // Group by binary event ID before joining. A correlated MIN can share a
  // collation-insensitive cache key for distinct Google event IDs in MariaDB.
  const [bookings]:[AppointmentHistoryRow[]]=await sql.query(`SELECT
    b.lead_id,b.state,b.end_at_ms,o.outcome,events.firstConfirmed
    FROM (
      SELECT history.lead_id,BINARY history.external_event_id eventId,MAX(history.revision) latestRevision,
        MIN(CASE WHEN history.state='CONFIRMED' THEN history.confirmed_at_ms END) firstConfirmed
      FROM sales_booking_evidence history
      JOIN leads l ON l.company_id=history.company_id AND l.id=history.lead_id
      WHERE history.company_id=?
      GROUP BY history.lead_id,BINARY history.external_event_id
      LIMIT ?
    ) events
    JOIN sales_booking_evidence b ON b.company_id=? AND b.lead_id=events.lead_id AND b.revision=events.latestRevision
      AND BINARY b.external_event_id=events.eventId
    ${latestAppointmentOutcomeJoin}`,[company,APPOINTMENT_SOURCE_CAPACITY+1,company]);
  if(bookings.length>APPOINTMENT_SOURCE_CAPACITY)return null;
  const evidence:AppointmentSourceEvidence[]=[];
  for(const row of bookings){
    if(row.firstConfirmed===null||!Number.isSafeInteger(Number(row.end_at_ms))||
       !['CONFIRMED','CANCELLED'].includes(row.state)){
      throw new Error('Appointment source booking evidence invalid');
    }
    let status:AppointmentSourceEvidence['status'];
    if(row.state==='CANCELLED')status='cancelled';
    else if(Number(row.end_at_ms)>now)status='scheduled';
    else if(row.outcome===null)status='unrecorded';
    else if(row.outcome==='HELD')status='held';
    else if(row.outcome==='NO_SHOW')status='noShow';
    else if(row.outcome==='UNDETERMINED')status='undetermined';
    else throw new Error('Appointment source outcome evidence invalid');
    evidence.push({leadId:row.lead_id,firstConfirmedAtMs:Number(row.firstConfirmed),status});
  }
  return evidence;
}
export async function readSourceOutcomeEvidence(pool:Pool,user:any,company:string){
 if(typeof company!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(company))throw new SalesError(400,'SOURCE_OUTCOME_SCOPE_INVALID');
 return withReadOnlySqlDeadline(pool,async sql=>{
  const [actors]:any=await sql.query('SELECT id,is_platform_admin FROM users WHERE id=?',[user?.id]);if(actors.length!==1||!(await agencyClientAccess(sql as any,{id:actors[0].id,is_platform_admin:Number(actors[0].is_platform_admin)===1},company,'read')).authorized)throw new SalesError(403,'SOURCE_OUTCOME_ACCESS_DENIED');
  const [clock]:any=await sql.query('SELECT UNIX_TIMESTAMP(NOW(3))*1000 nowMs'),now=Number(clock[0]?.nowMs);if(!Number.isSafeInteger(now)||now<0)throw new Error('Source outcome clock invalid');
  const [leads]:any=await sql.query('SELECT l.id,l.source,l.stage,CAST(COALESCE(o.revision,0) AS CHAR) opportunity_version,o.details_json FROM leads l LEFT JOIN sales_opportunities o ON o.company_id=l.company_id AND o.lead_id=l.id WHERE l.company_id=? ORDER BY l.id LIMIT 1001',[company]);if(leads.length>1000)throw new SalesError(429,'SOURCE_OUTCOME_LEAD_CAPACITY');
  const parsed:OutcomeLead[]=leads.map((r:any)=>{let details:any=null;if(r.details_json!==null){if(typeof r.details_json!=='string'||Buffer.byteLength(r.details_json)>16384)throw new Error('Source outcome details invalid');details=JSON.parse(r.details_json);if(!details||details.manualValue!==true||details.manualValueMinor!==null&&(!Number.isSafeInteger(details.manualValueMinor)||details.manualValueMinor<0||typeof details.currency!=='string'||!/^[A-Z]{3}$/.test(details.currency)))throw new Error('Source outcome money invalid');}return{id:r.id,source:r.source,stage:r.stage,opportunityVersion:r.opportunity_version,manualValueMinor:details?.manualValueMinor??null,currency:details?.manualValueMinor!==null&&details?.manualValueMinor!==undefined?details.currency:null};});
  const [messages]:any=await sql.query("SELECT id,lead_id,channel,UNIX_TIMESTAMP(created_at)*1000 at_ms FROM sales_inbox_messages WHERE company_id=? AND BINARY direction='INBOUND' AND(created_at IS NULL OR created_at<=FROM_UNIXTIME(?)) ORDER BY created_at DESC,id DESC LIMIT 5001",[company,now/1000]);
  const [inquiries]:any=await sql.query('SELECT request_key,lead_id,UNIX_TIMESTAMP(created_at)*1000 at_ms FROM public_lead_intakes WHERE company_id=? AND(created_at IS NULL OR created_at<=FROM_UNIXTIME(?)) ORDER BY created_at DESC,request_key DESC LIMIT 5001',[company,now/1000]);
  const id=(kind:string,value:string)=>crypto.createHash('sha256').update(JSON.stringify({company,kind,value})).digest('hex'),at=(v:any)=>v===null?null:Number(v);
  const touches:OutcomeTouch[]=[...messages.slice(0,5000).map((r:any)=>({id:id('inbox',r.id),leadId:r.lead_id,source:inboundAttributionSource(r.channel),atMs:at(r.at_ms),kind:'INBOUND_RECORD' as const})),...inquiries.slice(0,5000).map((r:any)=>({id:id('inquiry',r.request_key),leadId:r.lead_id,source:'Website' as const,atMs:at(r.at_ms),kind:'WEBSITE_INQUIRY' as const}))];
  const report=validateSourceOutcomeReport(analyzeSourceOutcomes({companyId:company,checkedAtMs:now,leads:parsed,touches,costs:await readDeclaredCostEvidence(sql,company),historyComplete:messages.length<=5000&&inquiries.length<=5000}),company);
  const appointments=projectAppointmentSources(report,touches,await readAppointmentEvidence(sql,company,now));
  return {report,appointments};
 });
}
