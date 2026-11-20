import type { Pool, RowDataPacket } from 'mysql2/promise';
import { calendarCreateCommand } from '../shared/bookingCalendar';
import { canonicalJson } from '../shared/canonicalJson';
import { crmId, crmHash, crmRevision } from '../shared/crmIdentity';
import { SalesError, salesHash, withSalesLock } from './salesWorkspace';
import { CALENDAR_API, calendarProviderJson, observeCalendar, readBookingCalendarBinding } from './bookingCalendar';
import { hasCurrentBooking, saveBookingEvidence } from './bookingEvidence';
import { withReadOnlySqlDeadline } from './readOnlySqlDeadline';
import { isGlobalEmergencyStopActive } from './executionStop';

const dayMs = 86400000;
export const calendarCreateEnabled = () => process.env.ENABLE_CALENDAR_CREATE === 'true';
const calendarHash = (id: string) => salesHash('google-calendar:' + id);
const bookingKey = (id: string) => salesHash('calendar-created-booking:' + id);

type Intent = {
  id: string; lead_id: string; actor_id: string; input_hash: string; calendar_hash: string;
  external_event_id: string; expectedVersion: string; state: string; start_at_ms: number; end_at_ms: number;
};
function dto(intent: Intent, state: 'PENDING_REVIEW' | 'CONFIRMED' | 'REJECTED') {
  return { requestId:intent.id, state, eventId:intent.external_event_id };
}
function checkScope(company: string, lead: string) {
  if (!crmId.safeParse(company).success || !crmId.safeParse(lead).success) {
    throw new SalesError(400, 'CALENDAR_SCOPE_INVALID');
  }
}
const intentColumns = '*,CAST(expected_revision AS CHAR) expectedVersion';

async function reconcile(
  pool: Pool, user: any, company: string, intent: Intent, transport: typeof fetch,
) {
  if (intent.state === 'CONFIRMED' || intent.state === 'REJECTED') return dto(intent, intent.state);
  const readBinding = () => withReadOnlySqlDeadline(pool,
    sql => readBookingCalendarBinding(sql, user.id, company, intent.lead_id));
  const initial = await readBinding();
  if (calendarHash(initial.binding.calendarId) !== intent.calendar_hash) {
    throw new SalesError(409, 'CALENDAR_CONNECTION_CHANGED');
  }
  const target = new URL(CALENDAR_API + '/calendars/' + encodeURIComponent(initial.binding.calendarId) +
    '/events/' + intent.external_event_id);
  target.searchParams.set('fields','id,status,start(dateTime),end(dateTime),extendedProperties(private)');
  let observed;
  try {
    observed = await calendarProviderJson(await transport(target, {
      headers:{Authorization:'Bearer ' + initial.binding.token},
      signal:AbortSignal.timeout(6000), redirect:'error',
    }));
  } catch {
    return dto(intent, 'PENDING_REVIEW');
  }
  if (observed?.id !== intent.external_event_id || observed.status !== 'confirmed' ||
      observed.extendedProperties?.private?.abgmBookingIntent !== intent.id ||
      Date.parse(observed.start?.dateTime) !== Number(intent.start_at_ms) ||
      Date.parse(observed.end?.dateTime) !== Number(intent.end_at_ms)) {
    return dto(intent, 'PENDING_REVIEW');
  }
  if ((await readBinding()).fingerprint !== initial.fingerprint) throw new SalesError(409, 'CALENDAR_CONNECTION_CHANGED');

  try {
    await saveBookingEvidence(pool, user, company, intent.lead_id, {
      operation:'CONFIRM', requestKey:bookingKey(intent.id), expectedVersion:intent.expectedVersion,
      externalEventId:intent.external_event_id, startAt:new Date(Number(intent.start_at_ms)).toISOString(),
      endAt:new Date(Number(intent.end_at_ms)).toISOString(),
    }, {intentId:intent.id, bindingFingerprint:initial.fingerprint});
  } catch {
    return dto(intent, 'PENDING_REVIEW');
  }
  return dto(intent,'CONFIRMED');
}

export async function createCalendarAppointment(
  pool: Pool, user: any, company: string, lead: string, input: unknown, transport: typeof fetch = fetch,
) {
  checkScope(company,lead);
  const parsed = calendarCreateCommand.safeParse(input);
  if (!parsed.success || !crmRevision.safeParse(parsed.data.expectedVersion).success) {
    throw new SalesError(400,'CALENDAR_CREATE_INVALID');
  }
  const command = parsed.data;
  if (command.expectedVersion === '18446744073709551615') throw new SalesError(409,'BOOKING_REVISION_EXHAUSTED');
  const hash = salesHash(canonicalJson({ ...command, company, lead, actorId:user.id }));
  const id = salesHash('calendar-intent:' + company + ':' + command.requestKey);
  const start = Date.parse(command.startAt), end = Date.parse(command.endAt);
  const begin = await withSalesLock(pool,user,company,'write',async (sql,canonical) => {
    if (canonical !== company) throw new SalesError(404,'CLIENT_NOT_FOUND');
    const binding = await readBookingCalendarBinding(sql,user.id,company,lead);
    const [prior] = await sql.query<RowDataPacket[]>('SELECT '+intentColumns+' FROM sales_calendar_intents WHERE company_id=? AND request_key=?',[company,command.requestKey]);
    if (prior.length) {
      if (prior[0].input_hash !== hash) throw new SalesError(409,'CALENDAR_INTENT_CONFLICT');
      return { intent:prior[0] as Intent, owner:false, ...binding };
    }
    if (!calendarCreateEnabled() || isGlobalEmergencyStopActive()) throw new SalesError(409,'CALENDAR_CREATE_DISABLED');
    const [clock] = await sql.query('SELECT UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000 nowMs');
    const now = Number(clock[0].nowMs);
    if (start <= now || end <= start || end-start > dayMs || end > now+60*dayMs) throw new SalesError(400,'CALENDAR_WINDOW_INVALID');
    const [aliases] = await sql.query<RowDataPacket[]>("SELECT id FROM crm_identity_links WHERE company_id=? AND alias_lead_id=? AND state='ACTIVE'", [company, lead]);
    if (aliases.length) throw new SalesError(409,'BOOKING_CANONICAL_CONTACT_REQUIRED');
    const [versions] = await sql.query('SELECT CAST(MAX(revision) AS CHAR) version FROM sales_booking_evidence WHERE company_id=? AND lead_id=?',[company,lead]);
    if ((versions[0]?.version || '0') !== command.expectedVersion || await hasCurrentBooking(sql,company,lead,now)) {
      throw new SalesError(409,'BOOKING_CHANGED');
    }
    const scope = calendarHash(binding.binding.calendarId);
    const [conflicts] = await sql.query<RowDataPacket[]>(`SELECT id FROM sales_calendar_intents
      WHERE company_id=? AND state IN ('PENDING_REVIEW','CONFIRMED') AND end_at_ms>?
      AND ((lead_id=? AND state='PENDING_REVIEW')
        OR (calendar_hash=? AND start_at_ms<? AND end_at_ms>?)) LIMIT 1`,[company,now,lead,scope,end,start]);
    if (conflicts.length) throw new SalesError(409,'CALENDAR_LOCAL_CONFLICT');
    const intent: Intent = {
      id, lead_id:lead, actor_id:user.id, input_hash:hash, calendar_hash:scope,
      external_event_id:salesHash('calendar-event:' + id), expectedVersion:command.expectedVersion,
      state:'PENDING_REVIEW', start_at_ms:start,end_at_ms:end,
    };
    await sql.query(`INSERT INTO sales_calendar_intents
      (id,company_id,lead_id,actor_id,request_key,input_hash,calendar_hash,external_event_id,expected_revision,state,start_at_ms,end_at_ms)
      VALUES (?,?,?,?,?,?,?,?,?,'PENDING_REVIEW',?,?)`,
      [id,company,lead,user.id,command.requestKey,hash,scope,intent.external_event_id,command.expectedVersion,start,end]);
    return { intent, owner:true, ...binding };
  });
  const intent = begin.intent;
  if (!begin.owner) return reconcile(pool,user,company,intent,transport);

  // Only the transaction that inserted the intent can cross the provider write boundary.
  // A process crash leaves a read-only reconciliation path for this exact ID.
  try {
    const available = await observeCalendar(begin.binding,{kind:'AVAILABILITY',startAt:command.startAt,endAt:command.endAt},transport);
    if (available.status !== 'FREE') throw new SalesError(409,'CALENDAR_SLOT_BUSY');
    const current = await withSalesLock(pool,user,company,'write',async sql => {
      const [aliases] = await sql.query<RowDataPacket[]>("SELECT id FROM crm_identity_links WHERE company_id=? AND alias_lead_id=? AND state='ACTIVE'", [company, lead]);
      if (aliases.length) throw new SalesError(409,'BOOKING_CANONICAL_CONTACT_REQUIRED');
      return readBookingCalendarBinding(sql,user.id,company,lead);
    });
    if (current.fingerprint !== begin.fingerprint || !calendarCreateEnabled() || isGlobalEmergencyStopActive()) {
      throw new SalesError(409,'CALENDAR_CONNECTION_CHANGED');
    }
  } catch (error) {
    await withSalesLock(pool,user,company,'write',async sql => {
      await sql.query("UPDATE sales_calendar_intents SET state='REJECTED' WHERE company_id=? AND id=? AND state='PENDING_REVIEW'",[company,id]);
    });
    if (error instanceof SalesError) throw error;
    throw new SalesError(503,'CALENDAR_PROVIDER_UNAVAILABLE');
  }

  try {
    const url = new URL(CALENDAR_API + '/calendars/' + encodeURIComponent(begin.binding.calendarId) + '/events');
    url.searchParams.set('sendUpdates','none');
    const response = await transport(url,{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(6000),
      headers:{Authorization:'Bearer '+begin.binding.token,'Content-Type':'application/json'},
      body:JSON.stringify({
        id:intent.external_event_id, summary:'Appointment',
        start:{dateTime:new Date(start).toISOString()},end:{dateTime:new Date(end).toISOString()},
        extendedProperties:{private:{abgmBookingIntent:id}},
      }),
    });
    await response.body?.cancel();
  } catch { /* Provider acceptance may have happened before the response was lost. */ }
  return reconcile(pool,user,company,intent,transport);
}

export async function reconcileCalendarAppointment(
  pool: Pool, user: any, company: string, lead: string, id: string, transport: typeof fetch = fetch,
) {
  checkScope(company,lead);
  if (!crmHash.safeParse(id).success) throw new SalesError(400,'CALENDAR_INTENT_INVALID');
  const intent = await withReadOnlySqlDeadline(pool,async sql => {
    await readBookingCalendarBinding(sql,user.id,company,lead);
    const [rows] = await sql.query('SELECT '+intentColumns+' FROM sales_calendar_intents WHERE company_id=? AND lead_id=? AND id=?',[company,lead,id]);
    if (!rows.length) throw new SalesError(404,'CALENDAR_INTENT_NOT_FOUND');
    return rows[0] as Intent;
  });
  return reconcile(pool,user,company,intent,transport);
}
