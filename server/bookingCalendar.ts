import { isGlobalEmergencyStopActive } from './executionStop';
import type { Pool } from 'mysql2/promise';
import { z } from 'zod';
import { calendarCheck, calendarCheckResult } from '../shared/bookingCalendar';
import { crmId } from '../shared/crmIdentity';
import { canonicalJson } from '../shared/canonicalJson';
import { agencyClientAccess } from './agencyPolicy';
import { decryptCredential } from './db';
import { withReadOnlySqlDeadline, type ReadOnlySql } from './readOnlySqlDeadline';
import { SalesError, salesHash } from './salesWorkspace';

export const CALENDAR_PROVIDER = 'google_calendar';
export const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const MAX_BYTES = 256 * 1024;
const DAY_MS = 86400000;

export function calendarBinding(credentials: Record<string, unknown>, now = Date.now()) {
  const calendarId = credentials.calendarId;
  const token = credentials.accessToken;
  const expiresAt = credentials.expiresAt;
  if (typeof calendarId !== 'string' || !/^[A-Za-z0-9_.@+-]{1,255}$/.test(calendarId) ||
      ['.','..','primary'].includes(calendarId) || typeof token !== 'string' || !/^[!-~]{1,8192}$/.test(token) || token.includes('••••')) return null;
  const expiry = z.iso.datetime({ offset: true }).safeParse(expiresAt);
  if (!expiry.success || Date.parse(expiry.data) <= now) return null;
  return { calendarId, token, expiresAt: expiry.data };
}

export type GoogleCalendarBinding = NonNullable<ReturnType<typeof calendarBinding>>;
export const calendarHash = (id: string) => salesHash('google-calendar:' + id);

export function googleCalendarEventUrl(binding: GoogleCalendarBinding, eventId?: string) {
  return new URL(CALENDAR_API + '/calendars/' + encodeURIComponent(binding.calendarId) +
    '/events' + (eventId ? '/' + encodeURIComponent(eventId) : ''));
}
export function googleCalendarRequest(binding: GoogleCalendarBinding): RequestInit {
  return { headers: { Authorization: 'Bearer ' + binding.token },
    signal: AbortSignal.timeout(6000), redirect: 'error' };
}
export async function readGoogleCalendarEvent(binding: GoogleCalendarBinding, eventId: string, transport: typeof fetch) {
  const url = googleCalendarEventUrl(binding, eventId);
  url.searchParams.set('fields','id,etag,status,start(dateTime),end(dateTime),extendedProperties(private),reminders,attendees(self),recurringEventId,recurrence');
  return calendarProviderJson(await transport(url, googleCalendarRequest(binding)));
}
export async function readCreatedCalendarEvent(sql: ReadOnlySql, company: string, lead: string, eventId: string) {
  const [rows] = await sql.query(
    "SELECT id,calendar_hash FROM sales_calendar_intents WHERE company_id=? AND lead_id=? AND external_event_id=? AND operation='CREATE' AND state='CONFIRMED' LIMIT 2",
    [company, lead, eventId],
  );
  return rows.length === 1 ? { id: String(rows[0].id), calendarHash: String(rows[0].calendar_hash) } : null;
}

export const calendarReconciliationEnabled = () => process.env.ENABLE_CALENDAR_RECONCILIATION === 'true';

export async function calendarReconciliationClaimCurrent(
  sql: ReadOnlySql, company: string, originId: string, token: string, lock = false,
) {
  if (!calendarReconciliationEnabled() || isGlobalEmergencyStopActive()) return false;
  const [rows] = await sql.query(
    `SELECT id FROM sales_calendar_intents WHERE company_id=? AND id=? AND operation='CREATE'
      AND state='CONFIRMED' AND sync_claim=? AND sync_due_ms>UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000${lock?' FOR UPDATE':''}`,
    [company, originId, token],
  );
  return rows.length === 1;
}

export async function calendarProviderJson(response: Response) {
  if (!response.ok || !response.body) throw new SalesError(503, 'CALENDAR_PROVIDER_UNAVAILABLE');
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let text = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw new SalesError(503, 'CALENDAR_PROVIDER_UNAVAILABLE');
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    reader.releaseLock();
  }
}

export function calendarProviderDate(value: unknown) {
  const parsed = z.iso.datetime({ offset: true }).safeParse(value);
  return parsed.success ? Date.parse(parsed.data) : NaN;
}

type Check = z.infer<typeof calendarCheck>;

export async function observeCalendar(
  binding: NonNullable<ReturnType<typeof calendarBinding>>, command: Check,
  transport: typeof fetch = fetch, now = Date.now(),
) {
  const headers = { Authorization: 'Bearer ' + binding.token };
  const request: RequestInit = { headers, redirect: 'error', signal: AbortSignal.timeout(6000) };
  try {
    if (command.kind === 'AVAILABILITY') {
      const start = Date.parse(command.startAt);
      const end = Date.parse(command.endAt);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < now ||
        end <= start || end - start > DAY_MS || end > now + 60 * DAY_MS) {
        throw new SalesError(400, 'CALENDAR_WINDOW_INVALID');
      }
      const response = await transport(new URL(CALENDAR_API + '/freeBusy'), {
        ...request, method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeMin: new Date(start).toISOString(), timeMax: new Date(end).toISOString(),
          timeZone: 'UTC', items: [{ id: binding.calendarId }],
        }),
      });
      const body = await calendarProviderJson(response);
      if (calendarProviderDate(body?.timeMin) !== start || calendarProviderDate(body?.timeMax) !== end ||
          !body?.calendars || !Object.hasOwn(body.calendars, binding.calendarId)) {
        throw new SalesError(503, 'CALENDAR_PROVIDER_UNAVAILABLE');
      }
      const result = body.calendars[binding.calendarId];
      if (!result || (result.errors !== undefined && (!Array.isArray(result.errors) || result.errors.length)) ||
        !Array.isArray(result.busy) || result.busy.length > 1000) {
        throw new SalesError(503, 'CALENDAR_PROVIDER_UNAVAILABLE');
      }
      let busy = false;
      for (const interval of result.busy) {
        const from = calendarProviderDate(interval?.start);
        const to = calendarProviderDate(interval?.end);
        if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
          throw new SalesError(503, 'CALENDAR_PROVIDER_UNAVAILABLE');
        }
        if (from < end && to > start) busy = true;
      }
      return calendarCheckResult.parse({
        kind: 'AVAILABILITY', status: busy ? 'BUSY' : 'FREE',
        source: 'GOOGLE_CALENDAR', observedAtMs: Date.now(),
      });
    }

    const url = googleCalendarEventUrl(binding, command.eventId);
    url.searchParams.set('fields', 'id,status,start(dateTime),end(dateTime)');
    const response = await transport(url, request);
    if (response.status === 404 || response.status === 410) throw new SalesError(404, 'CALENDAR_EVENT_NOT_FOUND');
    const body = await calendarProviderJson(response);
    if (body?.id !== command.eventId) throw new SalesError(503, 'CALENDAR_PROVIDER_UNAVAILABLE');
    const startAtMs = calendarProviderDate(body?.start?.dateTime);
    const endAtMs = calendarProviderDate(body?.end?.dateTime);
    if (body.status !== 'confirmed' || !Number.isFinite(startAtMs) || !Number.isFinite(endAtMs) || endAtMs <= startAtMs) {
      throw new SalesError(409, 'CALENDAR_EVENT_UNCONFIRMED');
    }
    return calendarCheckResult.parse({
      kind: 'EVENT', status: 'CONFIRMED', startAtMs, endAtMs,
      source: 'GOOGLE_CALENDAR', observedAtMs: Date.now(),
    });
  } catch (error) {
    if (error instanceof SalesError) throw error;
    throw new SalesError(503, 'CALENDAR_PROVIDER_UNAVAILABLE');
  }
}

export async function readBookingCalendarBinding(sql: ReadOnlySql, actorId: string, company: string, lead?: string) {
  const [actors] = await sql.query('SELECT id,is_platform_admin FROM users WHERE id=?', [actorId]);
  const actor = actors[0];
  if (!actor || actor.id !== actorId || !(await agencyClientAccess(sql, {id: actor.id, is_platform_admin: Number(actor.is_platform_admin) === 1}, company, lead ? 'write' : 'manage')).authorized) {
    throw new SalesError(403, 'SALES_ACCESS_DENIED');
  }
  if (lead) {
    const [leads] = await sql.query('SELECT id FROM leads WHERE company_id=? AND id=?', [company, lead]);
    if (leads[0]?.id !== lead) throw new SalesError(404, 'LEAD_NOT_FOUND');
  }
  const [rows] = await sql.query(
    'SELECT id,status,credentials FROM company_integrations WHERE company_id=? AND provider=?',
    [company, CALENDAR_PROVIDER],
  );
  if (rows.length !== 1 || !['saved','connected','verified'].includes(rows[0].status)) {
    throw new SalesError(409, 'CALENDAR_CONNECTION_REQUIRED');
  }
  const credentials = typeof rows[0].credentials === 'string' ? JSON.parse(rows[0].credentials) : rows[0].credentials;
  const sealed = credentials?.accessToken;
  if (typeof sealed !== 'string' || !sealed.startsWith('enc:v1:')) {
    throw new SalesError(409, 'CALENDAR_CONNECTION_REQUIRED');
  }
  const binding = calendarBinding({ ...credentials, accessToken: decryptCredential(sealed) });
  if (!binding) throw new SalesError(409, 'CALENDAR_CONNECTION_REQUIRED');
  return { binding, fingerprint: canonicalJson({ id: rows[0].id, status: rows[0].status, credentials }) };
}

export async function checkBookingCalendar(
  pool: Pool, actorId: string, company: string, lead: string, input: unknown,
  transport: typeof fetch = fetch,
) {
  const command = calendarCheck.safeParse(input);
  if (!command.success || !crmId.safeParse(company).success || !crmId.safeParse(lead).success) {
    throw new SalesError(400, 'CALENDAR_CHECK_INVALID');
  }
  async function readBinding() {
    return withReadOnlySqlDeadline(pool, sql => readBookingCalendarBinding(sql, actorId, company, lead));
  }

  const { binding, fingerprint } = await readBinding();
  const result = await observeCalendar(binding, command.data, transport);
  if ((await readBinding()).fingerprint !== fingerprint) throw new SalesError(409, 'CALENDAR_CONNECTION_CHANGED');
  return { calendar: result };
}
