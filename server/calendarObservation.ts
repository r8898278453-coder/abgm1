import type { Pool } from 'mysql2/promise';
import { calendarRefreshCommand } from '../shared/bookingCalendar';
import { crmHash, crmId } from '../shared/crmIdentity';
import { canonicalJson } from '../shared/canonicalJson';
import {
  calendarHash, calendarProviderDate, readBookingCalendarBinding, readCreatedCalendarEvent, readGoogleCalendarEvent,
  type GoogleCalendarBinding,
} from './bookingCalendar';
import { latestBookingEvidence, saveBookingEvidence } from './bookingEvidence';
import { withReadOnlySqlDeadline, type ReadOnlySql } from './readOnlySqlDeadline';
import { SalesError, salesHash } from './salesWorkspace';

type CalendarObservation = { status: 'CANCELLED' } | { status: 'CONFIRMED'; startAtMs: number; endAtMs: number };
async function observeTrackedEvent(
  binding: GoogleCalendarBinding, eventId: string, originId: string, transport: typeof fetch,
): Promise<CalendarObservation> {
  let event;
  try {
    event = await readGoogleCalendarEvent(binding, eventId, transport);
  } catch {
    // Missing resources and permission failures cannot establish cancellation.
    throw new SalesError(503, 'CALENDAR_EVENT_OBSERVATION_UNAVAILABLE');
  }
  if (event?.id !== eventId) throw new SalesError(503, 'CALENDAR_EVENT_OBSERVATION_UNAVAILABLE');
  if (event.status === 'cancelled') return { status: 'CANCELLED' };
  const startAtMs = calendarProviderDate(event.start?.dateTime);
  const endAtMs = calendarProviderDate(event.end?.dateTime);
  if (event.status !== 'confirmed' || event.extendedProperties?.private?.abgmBookingIntent !== originId ||
      !Number.isSafeInteger(startAtMs) || !Number.isSafeInteger(endAtMs) || startAtMs <= 0 || endAtMs <= startAtMs ||
      event.recurringEventId || event.recurrence?.length) {
    throw new SalesError(503, 'CALENDAR_EVENT_OBSERVATION_UNAVAILABLE');
  }
  return { status: 'CONFIRMED', startAtMs, endAtMs };
}

async function readCurrentTracking(sql: ReadOnlySql, company: string, lead: string, version: string) {
  const booking = await latestBookingEvidence(sql, company, lead);
  if (booking?.version !== version || booking.state !== 'CONFIRMED') throw new SalesError(409, 'BOOKING_CHANGED');
  const eventId = booking.external_event_id;
  const origin = crmHash.safeParse(eventId).success ? await readCreatedCalendarEvent(sql, company, lead, eventId) : null;
  return { booking, eventId: String(eventId), origin };
}

export async function refreshCalendarBooking(
  pool: Pool, user: { id: string }, company: string, lead: string, input: unknown, transport: typeof fetch = fetch,
) {
  const command = calendarRefreshCommand.safeParse(input);
  if (!command.success || !crmId.safeParse(company).success || !crmId.safeParse(lead).success) {
    throw new SalesError(400, 'CALENDAR_REFRESH_INVALID');
  }
  const expectedVersion = command.data.expectedVersion;
  const readTracking = () => withReadOnlySqlDeadline(pool, async sql => {
    const connection = await readBookingCalendarBinding(sql, user.id, company, lead);
    const { booking, eventId, origin } = await readCurrentTracking(sql, company, lead, expectedVersion);
    if (!origin || origin.calendarHash !== calendarHash(connection.binding.calendarId)) {
      throw new SalesError(409, 'CALENDAR_EVENT_NOT_TRACKED');
    }
    const [pending] = await sql.query(
      `SELECT id FROM sales_calendar_intents WHERE company_id=? AND lead_id=? AND state='PENDING_REVIEW'
        AND COALESCE(hold_until_ms,end_at_ms)>UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000 LIMIT 1`, [company, lead],
    );
    if (pending.length) throw new SalesError(409, 'CALENDAR_RECONCILIATION_REQUIRED');
    return { booking, eventId, origin, connection };
  });
  const { booking, eventId, origin, connection } = await readTracking();
  const event = await observeTrackedEvent(connection.binding, eventId, origin.id, transport);
  if (event.status === 'CONFIRMED' && event.startAtMs === Number(booking.start_at_ms) && event.endAtMs === Number(booking.end_at_ms)) {
    if ((await readTracking()).connection.fingerprint !== connection.fingerprint) {
      throw new SalesError(409, 'CALENDAR_CONNECTION_CHANGED');
    }
    return { state: 'UNCHANGED' as const, version: expectedVersion };
  }
  const id = salesHash(canonicalJson({ purpose: 'google-calendar-observation', company, lead, origin: origin.id, expectedVersion, event }));
  const instruction = event.status === 'CANCELLED' ? { operation: 'CANCEL' } : {
    operation: 'RESCHEDULE', externalEventId: eventId,
    startAt: new Date(event.startAtMs).toISOString(), endAt: new Date(event.endAtMs).toISOString(),
  };
  const result = await saveBookingEvidence(pool, user, company, lead,
    { ...instruction, expectedVersion, requestKey: id },
    { intentId: id, bindingFingerprint: connection.fingerprint, observedOriginId: origin.id });
  return { state: event.status === 'CANCELLED' ? 'CANCELLED' as const : 'RESCHEDULED' as const, version: result.booking.version };
}

export async function checkReminderCalendarBeforeSend(
  pool: Pool, actor: string, company: string, lead: string, version: string, transport: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const tracking = await withReadOnlySqlDeadline(pool, async sql => {
      const { booking, eventId, origin } = await readCurrentTracking(sql, company, lead, version);
      if (!origin) {
        if (booking.calendar_verified) throw new SalesError(503, 'CALENDAR_EVENT_OBSERVATION_UNAVAILABLE');
        return null;
      }
      const connection = await readBookingCalendarBinding(sql, actor, company, lead);
      if (origin.calendarHash !== calendarHash(connection.binding.calendarId)) {
        throw new SalesError(503, 'CALENDAR_EVENT_OBSERVATION_UNAVAILABLE');
      }
      return { booking, eventId, origin, connection };
    });
    if (!tracking) return null;
    const { booking, eventId, origin, connection } = tracking;
    const event = await observeTrackedEvent(connection.binding, eventId, origin.id, transport);
    if (event.status === 'CANCELLED' || event.startAtMs !== Number(booking.start_at_ms) || event.endAtMs !== Number(booking.end_at_ms)) {
      return 'APPOINTMENT_PROVIDER_CHANGED';
    }
    const current = await withReadOnlySqlDeadline(pool, sql => readBookingCalendarBinding(sql, actor, company, lead));
    return current.fingerprint === connection.fingerprint ? null : 'APPOINTMENT_PROVIDER_UNAVAILABLE';
  } catch (error) {
    return error instanceof SalesError && error.code === 'BOOKING_CHANGED' ? 'APPOINTMENT_CHANGED' : 'APPOINTMENT_PROVIDER_UNAVAILABLE';
  }
}
