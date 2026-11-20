import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { z } from 'zod';
import { calendarChangeCommand, calendarCreateCommand } from '../shared/bookingCalendar';
import { canonicalJson } from '../shared/canonicalJson';
import { crmId, crmHash } from '../shared/crmIdentity';
import { SalesError, salesHash, withSalesLock } from './salesWorkspace';
import { CALENDAR_API, calendarProviderJson, observeCalendar, readBookingCalendarBinding } from './bookingCalendar';
import { hasCurrentBooking, latestBookingEvidence, saveBookingEvidence } from './bookingEvidence';
import { withReadOnlySqlDeadline, type ReadOnlySql } from './readOnlySqlDeadline';
import { isGlobalEmergencyStopActive } from './executionStop';

const dayMs = 86400000;
export const calendarCreateEnabled = () => process.env.ENABLE_CALENDAR_CREATE === 'true';
const calendarHash = (id: string) => salesHash('google-calendar:' + id);
const bookingKey = (id: string) => salesHash('calendar-created-booking:' + id);
type Command = z.infer<typeof calendarCreateCommand> | z.infer<typeof calendarChangeCommand>;
type Binding = Awaited<ReturnType<typeof readBookingCalendarBinding>>;
type Intent = {
  id: string; lead_id: string; calendar_hash: string; external_event_id: string; expectedVersion: string;
  operation: 'CREATE' | 'RESCHEDULE' | 'CANCEL'; state: string; start_at_ms: number; end_at_ms: number;
  reminder_minutes: number | null;
};

function dto(intent: Intent, state: 'PENDING_REVIEW' | 'CONFIRMED' | 'REJECTED') {
  return { requestId: intent.id, state, eventId: intent.external_event_id };
}
function checkScope(company: string, lead: string) {
  if (!crmId.safeParse(company).success || !crmId.safeParse(lead).success) {
    throw new SalesError(400, 'CALENDAR_SCOPE_INVALID');
  }
}
const intentColumns = '*,CAST(expected_revision AS CHAR) expectedVersion';
function eventUrl(connection: Binding, eventId?: string) {
  return new URL(CALENDAR_API + '/calendars/' + encodeURIComponent(connection.binding.calendarId) +
    '/events' + (eventId ? '/' + encodeURIComponent(eventId) : ''));
}
function providerOptions(connection: Binding): RequestInit {
  return { headers: { Authorization: 'Bearer ' + connection.binding.token },
    signal: AbortSignal.timeout(6000), redirect: 'error' };
}
async function readEvent(connection: Binding, eventId: string, transport: typeof fetch) {
  const url = eventUrl(connection, eventId);
  url.searchParams.set('fields','id,etag,status,start(dateTime),end(dateTime),extendedProperties(private),reminders,attendees(self),recurringEventId,recurrence');
  return calendarProviderJson(await transport(url, providerOptions(connection)));
}
function matchesTimes(event: any, start: number, end: number) {
  return event?.status === 'confirmed' && Date.parse(event.start?.dateTime) === start && Date.parse(event.end?.dateTime) === end;
}
function reminderSettings(minutes: number) {
  return { useDefault: false, overrides: minutes === 0 ? [] : [{ method: 'popup', minutes }] };
}
function matchesReminder(event: any, minutes: number | null) {
  if (minutes === null) return true;
  const overrides = event?.reminders?.overrides ?? [];
  return event?.reminders?.useDefault === false && Array.isArray(overrides) &&
    (minutes === 0 ? overrides.length === 0 :
      overrides.length === 1 && overrides[0]?.method === 'popup' && overrides[0]?.minutes === minutes);
}

async function settle(pool: Pool, user: any, company: string, intent: Intent, connection: Binding) {
  const operation = intent.operation === 'CREATE' ? 'CONFIRM' : intent.operation;
  const times = operation === 'CANCEL' ? {} : {
    externalEventId: intent.external_event_id, startAt: new Date(Number(intent.start_at_ms)).toISOString(),
    endAt: new Date(Number(intent.end_at_ms)).toISOString(),
  };
  try {
    await saveBookingEvidence(pool, user, company, intent.lead_id, {
      operation, requestKey: bookingKey(intent.id), expectedVersion: intent.expectedVersion, ...times,
    }, { intentId: intent.id, bindingFingerprint: connection.fingerprint });
  } catch {
    return dto(intent, 'PENDING_REVIEW');
  }
  return dto(intent, 'CONFIRMED');
}

async function reconcile(pool: Pool, user: any, company: string, intent: Intent, transport: typeof fetch) {
  if (intent.state === 'CONFIRMED' || intent.state === 'REJECTED') return dto(intent, intent.state);
  const connection = await withReadOnlySqlDeadline(pool,
    sql => readBookingCalendarBinding(sql, user.id, company, intent.lead_id));
  if (calendarHash(connection.binding.calendarId) !== intent.calendar_hash) {
    throw new SalesError(409, 'CALENDAR_CONNECTION_CHANGED');
  }
  let observed;
  try {
    observed = await readEvent(connection, intent.external_event_id, transport);
  } catch {
    return dto(intent, 'PENDING_REVIEW');
  }
  const marker = intent.operation === 'CREATE' ? 'abgmBookingIntent' : 'abgmBookingChange';
  const verified = intent.operation === 'CANCEL' ? observed?.status === 'cancelled' :
    observed?.extendedProperties?.private?.[marker] === intent.id &&
    matchesTimes(observed, Number(intent.start_at_ms), Number(intent.end_at_ms)) &&
    matchesReminder(observed, intent.reminder_minutes);
  if (observed?.id !== intent.external_event_id || !verified) return dto(intent, 'PENDING_REVIEW');
  return settle(pool, user, company, intent, connection);
}

async function assertCanonicalLead(sql: ReadOnlySql, company: string, lead: string) {
  const [aliases] = await sql.query(
    "SELECT id FROM crm_identity_links WHERE company_id=? AND alias_lead_id=? AND state='ACTIVE'", [company, lead]);
  if (aliases.length) throw new SalesError(409, 'BOOKING_CANONICAL_CONTACT_REQUIRED');
}

async function writeCalendarAppointment(
  pool: Pool, user: any, company: string, lead: string, command: Command, transport: typeof fetch,
) {
  checkScope(company, lead);
  if (command.expectedVersion === '18446744073709551615') throw new SalesError(409, 'BOOKING_REVISION_EXHAUSTED');
  const hash = salesHash(canonicalJson({ ...command, company, lead, actorId: user.id }));
  const id = salesHash('calendar-intent:' + company + ':' + command.requestKey);
  const operation = 'operation' in command ? command.operation : 'CREATE';
  const begin = await withSalesLock(pool, user, company, 'write', async (sql, canonical) => {
    if (canonical !== company) throw new SalesError(404, 'CLIENT_NOT_FOUND');
    const connection = await readBookingCalendarBinding(sql, user.id, company, lead);
    const [prior] = await sql.query<RowDataPacket[]>(
      'SELECT ' + intentColumns + ' FROM sales_calendar_intents WHERE company_id=? AND request_key=?', [company, command.requestKey]);
    if (prior.length) {
      if (prior[0].input_hash !== hash) throw new SalesError(409, 'CALENDAR_INTENT_CONFLICT');
      return { intent: prior[0] as Intent, owner: false as const };
    }
    if (!calendarCreateEnabled() || isGlobalEmergencyStopActive()) throw new SalesError(409, 'CALENDAR_CREATE_DISABLED');
    const [clock] = await sql.query<RowDataPacket[]>('SELECT UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000 nowMs');
    const now = Number(clock[0].nowMs);
    await assertCanonicalLead(sql, company, lead);
    const previous = await latestBookingEvidence(sql, company, lead);
    const active = previous?.state === 'CONFIRMED' && Number(previous.end_at_ms) > now;
    if ((previous?.version || '0') !== command.expectedVersion ||
        (operation === 'CREATE' ? await hasCurrentBooking(sql, company, lead, now) : !active || !previous.calendar_verified)) {
      throw new SalesError(409, 'BOOKING_CHANGED');
    }
    const scope = calendarHash(connection.binding.calendarId);
    const eventId = operation === 'CREATE' ? salesHash('calendar-event:' + id) : previous.external_event_id;
    const [origins] = await sql.query<RowDataPacket[]>(
      "SELECT id,calendar_hash FROM sales_calendar_intents WHERE company_id=? AND lead_id=? AND external_event_id=? AND operation='CREATE' AND state='CONFIRMED' LIMIT 1",
      [company, lead, eventId]);
    if (operation !== 'CREATE' && origins[0]?.calendar_hash !== scope) throw new SalesError(409, 'CALENDAR_CONNECTION_CHANGED');

    const start = 'startAt' in command ? Date.parse(command.startAt) : Number(previous.start_at_ms);
    const end = 'endAt' in command ? Date.parse(command.endAt) : Number(previous.end_at_ms);
    if (operation !== 'CANCEL' && (start <= now || end <= start || end - start > dayMs || end > now + 60 * dayMs)) {
      throw new SalesError(400, 'CALENDAR_WINDOW_INVALID');
    }
    if (operation === 'RESCHEDULE' && start < Number(previous.end_at_ms) && end > Number(previous.start_at_ms)) {
      throw new SalesError(409, 'CALENDAR_RESCHEDULE_OVERLAPS_CURRENT');
    }
    const [conflicts] = await sql.query<RowDataPacket[]>(`SELECT i.id FROM sales_calendar_intents i
      WHERE i.company_id=? AND (
        (i.state='PENDING_REVIEW' AND COALESCE(i.hold_until_ms,i.end_at_ms)>? AND i.lead_id=?)
        OR (?<>'CANCEL' AND i.calendar_hash=? AND i.external_event_id<>? AND i.operation<>'CANCEL'
          AND i.start_at_ms<? AND i.end_at_ms>? AND (
            (i.state='PENDING_REVIEW' AND i.end_at_ms>?) OR
            (i.state='CONFIRMED' AND NOT EXISTS (SELECT 1 FROM sales_calendar_intents newer
              WHERE newer.company_id=i.company_id AND newer.lead_id=i.lead_id AND newer.external_event_id=i.external_event_id
                AND newer.state='CONFIRMED' AND newer.expected_revision>i.expected_revision))
          )
        )
      ) LIMIT 1`, [company, now, lead, operation, scope, eventId, end, start, now]);
    if (conflicts.length) throw new SalesError(409, 'CALENDAR_LOCAL_CONFLICT');
    const intent: Intent = {
      id, lead_id: lead, calendar_hash: scope, external_event_id: eventId, expectedVersion: command.expectedVersion,
      operation, state: 'PENDING_REVIEW', start_at_ms: start, end_at_ms: end,
      reminder_minutes: 'startAt' in command ? command.reminderMinutes ?? (operation === 'CREATE' ? 0 : null) : null,
    };
    const holdUntil = operation === 'RESCHEDULE' ? Math.max(end, Number(previous.end_at_ms)) : end;
    await sql.query(`INSERT INTO sales_calendar_intents
      (id,company_id,lead_id,actor_id,request_key,input_hash,calendar_hash,external_event_id,expected_revision,state,start_at_ms,end_at_ms,operation,reminder_minutes,hold_until_ms)
      VALUES (?,?,?,?,?,?,?,?,?,'PENDING_REVIEW',?,?,?,?,?)`,
      [id, company, lead, user.id, command.requestKey, hash, scope, eventId, command.expectedVersion, start, end, operation, intent.reminder_minutes, holdUntil]);
    return { intent, owner: true as const, connection, previous, originId: origins[0]?.id };
  });
  const { intent } = begin;
  if (!begin.owner) return reconcile(pool, user, company, intent, transport);

  const reject = () => withSalesLock(pool, user, company, 'write', async sql => {
    await sql.query("UPDATE sales_calendar_intents SET state='REJECTED' WHERE company_id=? AND id=? AND state='PENDING_REVIEW'", [company, id]);
  });
  let etag: string | undefined;
  try {
    if (operation !== 'CREATE') {
      const event = await readEvent(begin.connection, intent.external_event_id, transport);
      if (event?.id !== intent.external_event_id || event.extendedProperties?.private?.abgmBookingIntent !== begin.originId ||
          !matchesTimes(event, Number(begin.previous.start_at_ms), Number(begin.previous.end_at_ms)) ||
          typeof event.etag !== 'string' || !/^"[!#-~]{1,256}"$/.test(event.etag) ||
          event.recurringEventId || event.recurrence?.length || event.attendees?.length) {
        throw new SalesError(409, 'CALENDAR_EVENT_CHANGED');
      }
      etag = event.etag;
    }
    if ('startAt' in command) {
      const availability = await observeCalendar(begin.connection.binding,
        { kind: 'AVAILABILITY', startAt: command.startAt, endAt: command.endAt }, transport);
      if (availability.status !== 'FREE') throw new SalesError(409, 'CALENDAR_SLOT_BUSY');
    }
    const current = await withSalesLock(pool, user, company, 'write', async sql => {
      await assertCanonicalLead(sql, company, lead);
      return readBookingCalendarBinding(sql, user.id, company, lead);
    });
    if (current.fingerprint !== begin.connection.fingerprint || !calendarCreateEnabled() || isGlobalEmergencyStopActive()) {
      throw new SalesError(409, 'CALENDAR_CONNECTION_CHANGED');
    }
  } catch (error) {
    await reject();
    if (error instanceof SalesError) throw error;
    throw new SalesError(503, 'CALENDAR_PROVIDER_UNAVAILABLE');
  }

  // The intent's inserting request is the only caller allowed to send a mutation.
  let status: number | undefined;
  try {
    const url = eventUrl(begin.connection, operation === 'CREATE' ? undefined : intent.external_event_id);
    url.searchParams.set('sendUpdates', 'none');
    const options = providerOptions(begin.connection);
    const body = operation === 'CANCEL' ? undefined : JSON.stringify({
      ...(operation === 'CREATE' ? { id: intent.external_event_id, summary: 'Appointment' } : {}),
      start: { dateTime: new Date(intent.start_at_ms).toISOString() },
      end: { dateTime: new Date(intent.end_at_ms).toISOString() },
      extendedProperties: { private: operation === 'CREATE' ? { abgmBookingIntent: id } :
        { abgmBookingIntent: begin.originId, abgmBookingChange: id } },
      ...(intent.reminder_minutes !== null ? { reminders: reminderSettings(intent.reminder_minutes) } : {}),
    });
    const response = await transport(url, {
      ...options, method: operation === 'CREATE' ? 'POST' : operation === 'RESCHEDULE' ? 'PATCH' : 'DELETE', body,
      headers: { ...options.headers, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(etag ? { 'If-Match': etag } : {}) },
    });
    status = response.status;
    await response.body?.cancel();
  } catch { /* An interrupted response may follow an accepted provider mutation. */ }
  if (operation === 'CANCEL' && status === 204) return settle(pool, user, company, intent, begin.connection);
  if (status === 412) {
    await reject();
    throw new SalesError(409, 'CALENDAR_EVENT_CHANGED');
  }
  return reconcile(pool, user, company, intent, transport);
}

export async function createCalendarAppointment(
  pool: Pool, user: any, company: string, lead: string, input: unknown, transport: typeof fetch = fetch,
) {
  const parsed = calendarCreateCommand.safeParse(input);
  if (!parsed.success) throw new SalesError(400, 'CALENDAR_CREATE_INVALID');
  return writeCalendarAppointment(pool, user, company, lead, parsed.data, transport);
}

export async function changeCalendarAppointment(
  pool: Pool, user: any, company: string, lead: string, input: unknown, transport: typeof fetch = fetch,
) {
  const parsed = calendarChangeCommand.safeParse(input);
  if (!parsed.success) throw new SalesError(400, 'CALENDAR_CHANGE_INVALID');
  return writeCalendarAppointment(pool, user, company, lead, parsed.data, transport);
}

export async function reconcileCalendarAppointment(
  pool: Pool, user: any, company: string, lead: string, id: string, transport: typeof fetch = fetch,
) {
  checkScope(company, lead);
  if (!crmHash.safeParse(id).success) throw new SalesError(400, 'CALENDAR_INTENT_INVALID');
  const intent = await withReadOnlySqlDeadline(pool, async sql => {
    await readBookingCalendarBinding(sql, user.id, company, lead);
    const [rows] = await sql.query('SELECT ' + intentColumns + ' FROM sales_calendar_intents WHERE company_id=? AND lead_id=? AND id=?', [company, lead, id]);
    if (!rows.length) throw new SalesError(404, 'CALENDAR_INTENT_NOT_FOUND');
    return rows[0] as Intent;
  });
  return reconcile(pool, user, company, intent, transport);
}
