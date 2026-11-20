import crypto from 'node:crypto';
import type {Pool,RowDataPacket} from 'mysql2/promise';
import {appointmentOutcomeCommand,appointmentOutcomeState} from '../shared/appointmentOutcome';
import {declaredAttributionSource,ATTRIBUTION_SOURCES,type AttributionSource} from '../shared/attributionSources';
import {canonicalJson} from '../shared/canonicalJson';
import {crmId} from '../shared/crmIdentity';
import {agencyClientAccess} from './agencyPolicy';
import {agencyAudit} from './agencyRoutes';
import {SalesError,salesHash,withSalesLock} from './salesWorkspace';
import {withReadOnlySqlDeadline,type ReadOnlySql} from './readOnlySqlDeadline';

const nowSql='UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000';
const endedAppointment=`b.state='CONFIRMED' AND b.end_at_ms<=${nowSql}`;
const unsuperseded=`NOT EXISTS(SELECT 1 FROM sales_booking_evidence newer
  WHERE newer.company_id=b.company_id AND newer.lead_id=b.lead_id AND BINARY newer.external_event_id=BINARY b.external_event_id
    AND newer.revision>b.revision)`;
export const latestAppointmentOutcomeJoin=`LEFT JOIN sales_appointment_outcomes o ON o.company_id=b.company_id AND o.booking_id=b.id
  AND o.revision=(SELECT MAX(history.revision) FROM sales_appointment_outcomes history
    WHERE history.company_id=b.company_id AND history.booking_id=b.id)`;
const eligible=`(${unsuperseded} OR o.id IS NOT NULL)`;

export async function readAppointmentOutcomes(pool:Pool,user:any,company:string,lead:string) {
  if(!crmId.safeParse(lead).success)throw new SalesError(400,'APPOINTMENT_OUTCOME_SCOPE_INVALID');
  return withReadOnlySqlDeadline(pool,async sql=>{
    const access=await agencyClientAccess(sql,user,company,'read');
    if(!access.authorized)throw new SalesError(access.status,'SALES_ACCESS_DENIED');
    const [leads]=await sql.query('SELECT id FROM leads WHERE company_id=? AND id=?',[company,lead]);
    if(leads[0]?.id!==lead)throw new SalesError(404,'LEAD_NOT_FOUND');
    const [rows]=await sql.query(`SELECT CAST(b.revision AS CHAR) bookingVersion,b.start_at_ms,b.end_at_ms,
      CAST(o.revision AS CHAR) version,o.outcome,o.evidence,o.declared_source,o.recorded_at_ms,
      ${unsuperseded} unsuperseded FROM sales_booking_evidence b ${latestAppointmentOutcomeJoin}
      WHERE b.company_id=? AND b.lead_id=? AND ${endedAppointment} AND ${eligible}
      ORDER BY b.end_at_ms DESC,b.revision DESC LIMIT 21`,[company,lead]);
    return {appointments:rows.slice(0,20).map((row:any)=>({
      bookingVersion:row.bookingVersion,startAtMs:Number(row.start_at_ms),endAtMs:Number(row.end_at_ms),
      outcome:row.outcome,version:row.version??'0',declaredSource:row.declared_source,
      evidence:row.evidence,recordedAtMs:row.recorded_at_ms===null?null:Number(row.recorded_at_ms),
      superseded:Number(row.unsuperseded)!==1,
    })),truncated:rows.length>20};
  });
}

export async function saveAppointmentOutcome(pool:Pool,user:any,company:string,lead:string,input:unknown) {
  const parsed=appointmentOutcomeCommand.safeParse(input);
  if(!parsed.success||!crmId.safeParse(lead).success)throw new SalesError(400,'APPOINTMENT_OUTCOME_INPUT_INVALID');
  const command=parsed.data;
  const hash=salesHash(canonicalJson({lead,actor:user.id,...command}));
  return withSalesLock(pool,user,company,'write',async(sql,canonical)=>{
    const [leads]=await sql.query<RowDataPacket[]>('SELECT id,source FROM leads WHERE company_id=? AND id=?',[canonical,lead]);
    if(leads[0]?.id!==lead)throw new SalesError(404,'LEAD_NOT_FOUND');
    const [receipts]=await sql.query<RowDataPacket[]>(
      'SELECT input_hash,CAST(revision AS CHAR) version,outcome FROM sales_appointment_outcomes WHERE company_id=? AND request_key=?',
      [canonical,command.requestKey]);
    if(receipts.length){
      if(receipts[0].input_hash!==hash)throw new SalesError(409,'APPOINTMENT_OUTCOME_REQUEST_CONFLICT');
      return {version:receipts[0].version,outcome:receipts[0].outcome,reused:true};
    }
    const [bookings]=await sql.query<RowDataPacket[]>(`SELECT b.id,CAST(o.revision AS CHAR) outcomeVersion,
      o.declared_source,${unsuperseded} unsuperseded,b.end_at_ms,${nowSql} nowMs
      FROM sales_booking_evidence b ${latestAppointmentOutcomeJoin}
      WHERE b.company_id=? AND b.lead_id=? AND CAST(b.revision AS CHAR)=? AND b.state='CONFIRMED'`,
      [canonical,lead,command.bookingVersion]);
    const booking=bookings[0];
    if(!booking||Number(booking.end_at_ms)>Number(booking.nowMs)||
       Number(booking.unsuperseded)!==1&&(!booking.outcomeVersion||command.outcome!=='UNDETERMINED')){
      throw new SalesError(409,'APPOINTMENT_OUTCOME_BOOKING_UNAVAILABLE');
    }
    const [changes]=await sql.query<RowDataPacket[]>(`SELECT id FROM sales_calendar_intents
      WHERE company_id=? AND lead_id=? AND state='PENDING_REVIEW' AND CAST(expected_revision AS CHAR)=?
       AND COALESCE(hold_until_ms,end_at_ms)>? LIMIT 1`,[canonical,lead,command.bookingVersion,booking.nowMs]);
    if(changes.length)throw new SalesError(409,'CALENDAR_RECONCILIATION_REQUIRED');
    if((booking.outcomeVersion||'0')!==command.expectedVersion)throw new SalesError(409,'APPOINTMENT_OUTCOME_CHANGED');
    const next=BigInt(command.expectedVersion)+1n;
    if(next>18446744073709551615n)throw new SalesError(409,'APPOINTMENT_OUTCOME_REVISION_EXHAUSTED');
    const version=next.toString();
    const source=booking.declared_source??declaredAttributionSource(leads[0].source);
    await sql.query(`INSERT INTO sales_appointment_outcomes
      (id,company_id,lead_id,booking_id,actor_id,request_key,input_hash,revision,outcome,declared_source,evidence,recorded_at_ms)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [crypto.randomUUID(),canonical,lead,booking.id,user.id,command.requestKey,hash,version,command.outcome,source,command.evidence,booking.nowMs]);
    await agencyAudit(sql,canonical,user.id,booking.outcomeVersion?'SALES_APPOINTMENT_OUTCOME_CORRECTED':'SALES_APPOINTMENT_OUTCOME_RECORDED',
      {leadId:lead,bookingVersion:command.bookingVersion,version,outcome:command.outcome});
    return {version,outcome:command.outcome,reused:false};
  });
}

type OutcomeTotals={held:number;noShow:number;undetermined:number};
const blankTotals=():OutcomeTotals=>({held:0,noShow:0,undetermined:0});
const stateKey={HELD:'held',NO_SHOW:'noShow',UNDETERMINED:'undetermined'} as const;
export async function appointmentOutcomeReport(sql:ReadOnlySql,company:string,start:number,end:number) {
  const [rows]=await sql.query(`SELECT CASE WHEN ${unsuperseded} THEN o.outcome ELSE 'SUPERSEDED' END effectiveOutcome,o.declared_source,COUNT(*) total
    FROM sales_booking_evidence b ${latestAppointmentOutcomeJoin}
    WHERE b.company_id=? AND b.end_at_ms>=? AND b.end_at_ms<? AND ${endedAppointment} AND ${eligible}
    GROUP BY effectiveOutcome,o.declared_source`,[company,start,end]);
  const totals={...blankTotals(),unrecorded:0,superseded:0};
  const byDeclaredSource:Partial<Record<AttributionSource,OutcomeTotals>>={};
  for(const row of rows){
    const count=Number(row.total);
    if(!Number.isSafeInteger(count)||count<0)throw Error('APPOINTMENT_OUTCOME_COUNT_INVALID');
    if(row.effectiveOutcome===null){totals.unrecorded+=count;continue;}
    if(row.effectiveOutcome==='SUPERSEDED'){totals.superseded+=count;continue;}
    const key=stateKey[appointmentOutcomeState.parse(row.effectiveOutcome)];
    const source=(ATTRIBUTION_SOURCES as readonly string[]).includes(row.declared_source)?row.declared_source as AttributionSource:'Unknown';
    totals[key]+=count;
    (byDeclaredSource[source]??=blankTotals())[key]+=count;
  }
  return {totals,byDeclaredSource};
}

/** Activity uses ledger write time. Backlog uses current effective booking and outcome state. */
export async function readAppointmentReporting(sql:ReadOnlySql,company:string,start:number,end:number) {
  const [[bookings]]=await sql.query(`SELECT
    COUNT(CASE WHEN state='CONFIRMED' THEN 1 END) appointmentBookingRevisions,
    COUNT(CASE WHEN state='CANCELLED' THEN 1 END) appointmentCancellations
    FROM sales_booking_evidence
    WHERE company_id=? AND confirmed_at_ms>=? AND confirmed_at_ms<?`,[company,start,end]);
  const [[outcomes]]=await sql.query(`SELECT
    COUNT(CASE WHEN revision=1 THEN 1 END) appointmentOutcomesRecorded,
    COUNT(CASE WHEN revision>1 THEN 1 END) appointmentOutcomesCorrected
    FROM sales_appointment_outcomes
    WHERE company_id=? AND recorded_at_ms>=? AND recorded_at_ms<?`,[company,start,end]);
  const [[backlog]]=await sql.query(`SELECT COUNT(*) appointmentOutcomesAwaiting
    FROM sales_booking_evidence b
    JOIN leads l ON l.company_id=b.company_id AND l.id=b.lead_id
    WHERE b.company_id=? AND ${endedAppointment} AND ${unsuperseded}
      AND NOT EXISTS(SELECT 1 FROM sales_appointment_outcomes o WHERE o.company_id=b.company_id AND o.booking_id=b.id)`,[company]);
  return {
    activity:{
      appointmentBookingRevisions:bookings.appointmentBookingRevisions,
      appointmentCancellations:bookings.appointmentCancellations,
      appointmentOutcomesRecorded:outcomes.appointmentOutcomesRecorded,
      appointmentOutcomesCorrected:outcomes.appointmentOutcomesCorrected,
    },
    backlog:{appointmentOutcomesAwaiting:backlog.appointmentOutcomesAwaiting},
  };
}
