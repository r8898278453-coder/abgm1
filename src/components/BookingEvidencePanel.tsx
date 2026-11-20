import React, { useEffect, useRef, useState } from 'react';
import { apiRequest, ApiRequestError, getStoredToken } from '../services/authService';
import { calendarCheckResult } from '../../shared/bookingCalendar';
import { formatPlatformDateTime } from '../../shared/platformTime';

const istToIso = (value: string) => value + (value.length === 16 ? ':00' : '') + '+05:30';
const toIstInput = (value: number) => new Date(value + 19800000).toISOString().slice(0,23).replace(/\.000$/, '');

const newRequestKey = () => Array.from(crypto.getRandomValues(new Uint8Array(32)),
  value => value.toString(16).padStart(2,'0')).join('');

type Booking = {
  version: string;
  state: 'CONFIRMED' | 'CANCELLED';
  externalEventId: string;
  startAtMs: number;
  endAtMs: number;
  source: 'OPERATOR_RECORDED' | 'GOOGLE_CALENDAR_VERIFIED';
};
type Command = {
  operation: 'CONFIRM' | 'RESCHEDULE' | 'CANCEL';
  requestKey: string;
  expectedVersion: string;
  externalEventId?: string;
  startAt?: string;
  endAt?: string;
};

export const BookingEvidencePanel: React.FC<{ companyId: string; leadId: string; canWrite: boolean }> = ({ companyId, leadId, canWrite }) => {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [eventId, setEventId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [pending, setPending] = useState<Command | null>(null);
  const [calendar, setCalendar] = useState<ReturnType<typeof calendarCheckResult.parse> | null>(null);
  const [calendarBusy, setCalendarBusy] = useState(false);
  const [calendarNotice, setCalendarNotice] = useState('');
  const [calendarError, setCalendarError] = useState('');
  const [createEnabled, setCreateEnabled] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState('');
  const [confirmCalendarCancel, setConfirmCalendarCancel] = useState(false);
  const [calendarIntent, setCalendarIntent] = useState<string | null>(null);
  const calendarRequest = useRef<AbortController | null>(null);
  const request = useRef<AbortController | null>(null);
  const acceptedSession = useRef<string | null | undefined>(undefined);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    setCalendar(null);
    setCalendarBusy(false);
    setCalendarError('');
    return () => calendarRequest.current?.abort();
  }, [start, end, eventId, booking?.version]);

  const base = `/api/companies/${encodeURIComponent(companyId)}/sales/leads/${encodeURIComponent(leadId)}/booking-evidence`;
  function show(value: Booking | null, session: string | null) {
    acceptedSession.current = session;
    setBooking(value);
    setEventId(value?.externalEventId || '');
    setStart('');
    setEnd('');
    setPending(null);
    setReminderMinutes('');
    setConfirmCalendarCancel(false);
    setLoaded(true);
  }

  async function call(command?: Command, notice = '') {
    const session = getStoredToken();
    if (command && (!canWrite || acceptedSession.current !== session)) {
      setLoaded(false);
      setPending(null);
      setError('Reload the appointment record before making changes.');
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setError('');
    setCalendarNotice('');
    setBusy(true);
    if (command) setPending(command);
    else setLoaded(false);
    const current = () => !controller.signal.aborted && session === getStoredToken();
    try {
      const response = await apiRequest<{success: boolean; companyId: string; booking: Booking | null;
        calendarCreateEnabled?: boolean; pendingCalendarRequestId?: string | null}>(
        base, { signal: controller.signal, ...(command ? {method:'POST',body:JSON.stringify(command)} : {}) },
      );
      if (!current()) return;
      if (!response.success || response.companyId !== companyId || response.booking === undefined) throw Error();
      show(response.booking, session);
      setCalendarNotice(notice);
      if (!command) {
        setCreateEnabled(response.calendarCreateEnabled === true);
        setCalendarIntent(response.pendingCalendarRequestId ?? null);
      }
      if (command) {
        // An exact retry may return the original receipt after a newer revision was committed.
        setLoaded(false);
        setBooking(null);
        await call();
      }
    } catch (cause) {
      if (!current()) return;
      if (cause instanceof ApiRequestError && cause.status < 500) {
        setLoaded(false);
        setPending(null);
        setError('Appointment record changed or access was denied. Reload to check the saved state.');
      } else {
        setError(command ? 'Save unconfirmed. Retry the exact request or reload the record.' : 'Appointment record unavailable.');
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  async function checkCalendar(kind: 'AVAILABILITY' | 'EVENT') {
    const session = getStoredToken();
    if (session !== acceptedSession.current || !canWrite) return;
    calendarRequest.current?.abort();
    const controller = new AbortController();
    calendarRequest.current = controller;
    setCalendar(null);
    setCalendarError('');
    setCalendarBusy(true);
    const current = () => !controller.signal.aborted && getStoredToken() === session;
    try {
      const input = kind === 'AVAILABILITY'
        ? { kind, startAt: istToIso(start), endAt: istToIso(end) }
        : { kind, eventId: eventId.trim() };
      const result = await apiRequest<{ success: boolean; companyId: string; calendar: unknown }>(
        base.replace(/booking-evidence$/, 'calendar-check'),
        { method:'POST', body: JSON.stringify(input), signal:controller.signal },
      );
      if (!current()) return;
      const observed = calendarCheckResult.parse(result.calendar);
      if (!result.success || result.companyId !== companyId || observed.kind !== kind) throw Error();
      setCalendar(observed);
    } catch (cause) {
      if (!current()) return;
      setCalendarError(cause instanceof ApiRequestError && cause.message === 'CALENDAR_CONNECTION_REQUIRED'
        ? 'Save a current Google Calendar connection in Integrations.'
        : 'Calendar evidence unavailable for this request.');
    } finally {
      if (current()) setCalendarBusy(false);
    }
  }

  async function refreshGoogleBooking() {
    const session = getStoredToken();
    if (!booking || !canWrite || busy || session !== acceptedSession.current) return;
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    setBusy(true);
    setError('');
    setCalendarNotice('');
    try {
      const response = await apiRequest<{success: boolean; companyId: string; calendarRefresh: {state: string}}>(
        base.replace(/booking-evidence$/, 'calendar-refresh'),
        {method:'POST', body:JSON.stringify({expectedVersion:booking.version}), signal:controller.signal},
      );
      if (controller.signal.aborted || session !== getStoredToken()) return;
      if (!response.success || response.companyId !== companyId) throw Error();
      const state = response.calendarRefresh?.state;
      if (state === 'UNCHANGED') {
        setCalendarNotice('Google Calendar matches this appointment.');
      } else if (state === 'RESCHEDULED' || state === 'CANCELLED') {
        await call(undefined, state === 'CANCELLED' ? 'Recorded the Google Calendar cancellation.' : 'Updated the appointment from Google Calendar.');
      } else {
        throw Error();
      }
    } catch {
      if (!controller.signal.aborted && session === getStoredToken()) {
        setError('Google Calendar status could not be verified. Load the appointment record before retrying.');
        setLoaded(false);
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  async function writeCalendar(operation: 'CREATE' | 'RESCHEDULE' | 'CANCEL' | 'VERIFY') {
    const session = getStoredToken();
    if (busy || session !== acceptedSession.current || !canWrite) return;
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    setBusy(true);
    setError('');
    setCalendar(null);
    const current = () => !controller.signal.aborted && session === getStoredToken();
    const action = operation === 'VERIFY'
      ? 'calendar-intents/' + encodeURIComponent(calendarIntent || '') + '/reconcile'
      : operation === 'CREATE' ? 'calendar-create' : 'calendar-change';
    setConfirmCalendarCancel(false);
    try {
      const body = operation === 'VERIFY' ? undefined : JSON.stringify({
        requestKey: newRequestKey(), expectedVersion: booking?.version || '0',
        ...(operation !== 'CREATE' ? { operation } : {}),
        ...(operation !== 'CANCEL' ? { startAt: istToIso(start), endAt: istToIso(end),
          ...(reminderMinutes !== '' ? { reminderMinutes: Number(reminderMinutes) } : {}) } : {}),
      });
      const result = await apiRequest<{
        success: boolean; companyId: string; calendarIntent: { requestId: string; state: string };
      }>(base.replace(/booking-evidence$/, action), {method:'POST',body,signal:controller.signal});
      if (!current()) return;
      if (!result.success || result.companyId !== companyId) throw Error();
      if (result.calendarIntent.state === 'PENDING_REVIEW') {
        setCalendarIntent(result.calendarIntent.requestId);
      } else {
        await call();
        if (result.calendarIntent.state === 'REJECTED') setError('Google Calendar did not accept the request.');
      }
    } catch (cause) {
      if (!current()) return;
      setLoaded(false);
      const code = cause instanceof ApiRequestError ? cause.message : '';
      setError(code === 'CALENDAR_SLOT_BUSY' ? 'Calendar reported a conflict. Load the appointment record to choose another window.'
        : code === 'CALENDAR_RESCHEDULE_OVERLAPS_CURRENT' ? 'Choose a time outside the current appointment window.'
        : code === 'CALENDAR_EVENT_CHANGED' ? 'The event changed in Google Calendar. Load the appointment record and verify it.'
        : 'Calendar result unavailable. Load the appointment record to check the saved status.');
    } finally {
      if (current()) setBusy(false);
    }
  }

  function save(operation: Command['operation']) {
    if (busy || pending || !canWrite) return;
    const requestKey = newRequestKey();
    const command: Command = { operation, requestKey, expectedVersion: booking?.version || '0' };
    if (operation !== 'CANCEL') {
      command.externalEventId = operation === 'RESCHEDULE' ? booking?.externalEventId : eventId.trim();
      command.startAt = istToIso(start);
      command.endAt = istToIso(end);
    }
    void call(command);
  }

  const visible = loaded && acceptedSession.current === getStoredToken();
  const active = booking?.state === 'CONFIRMED' && booking.endAtMs > Date.now();
  const providerChangeEnabled = createEnabled && active && booking?.source === 'GOOGLE_CALENDAR_VERIFIED';
  return <section aria-label="Appointment evidence" className="min-w-0 space-y-2 rounded-xl border p-3 break-words">
    <h3>Appointment evidence</h3>
    <p>Confirmed appointments stop active inquiry follow-ups for this lead.</p>
    <button disabled={busy} onClick={() => void call()}>Load appointment record</button>
    {error && <p role="alert">{error}</p>}
    {calendarNotice && <p role="status">{calendarNotice}</p>}
    {visible && <>
      {booking
        ? <p>{active ? (booking.source === 'GOOGLE_CALENDAR_VERIFIED' ? 'Verified on Google Calendar' : 'Confirmed externally') : booking.state === 'CANCELLED' ? 'Cancelled' : 'Past'} · {booking.externalEventId} · {formatPlatformDateTime(booking.startAtMs)} to {formatPlatformDateTime(booking.endAtMs)} IST</p>
        : <p>No appointment recorded.</p>}
      {canWrite && booking?.source === 'GOOGLE_CALENDAR_VERIFIED' && booking.state === 'CONFIRMED' && !calendarIntent &&
        <button disabled={busy || Boolean(pending)} onClick={() => void refreshGoogleBooking()}>Refresh from Google Calendar</button>}
      {calendarIntent && <div role="status">
        <p>Google Calendar request is awaiting verification.</p>
        {canWrite && <button disabled={busy} onClick={() => void writeCalendar('VERIFY')}>Verify calendar request</button>}
      </div>}
      {canWrite && <fieldset disabled={busy || Boolean(pending) || Boolean(calendarIntent)} className="min-w-0 space-y-2">
        <legend>{active ? 'Record an external appointment change' : 'Record external confirmation'}</legend>
        {!active && <label className="block">External appointment reference
          <input className="block w-full" value={eventId} maxLength={255} onChange={e => setEventId(e.target.value)}/>
        </label>}
        <label className="block">Appointment start (IST)
          <input className="block max-w-full" type="datetime-local" step="0.001" value={start} onChange={e => setStart(e.target.value)}/>
        </label>
        <label className="block">Appointment end (IST)
          <input className="block max-w-full" type="datetime-local" step="0.001" value={end} onChange={e => setEnd(e.target.value)}/>
        </label>
        <div className="flex flex-wrap gap-2">
          <button disabled={calendarBusy || !start || !end} onClick={() => void checkCalendar('AVAILABILITY')}>Check calendar availability</button>
          <button disabled={calendarBusy || !eventId.trim()} onClick={() => void checkCalendar('EVENT')}>Check calendar event</button>
        </div>
        {calendarError && <p role="alert">{calendarError}</p>}
        {calendar && <div role="status">
          {calendar.kind === 'AVAILABILITY' ? (
            <p>{calendar.status === 'FREE' ? 'Calendar reported this window free' : 'Calendar reported a conflict'} · {formatPlatformDateTime(calendar.observedAtMs)} IST. Availability can change before booking.</p>
          ) : <>
            <p>Calendar confirmed this event · {formatPlatformDateTime(calendar.startAtMs)} to {formatPlatformDateTime(calendar.endAtMs)} IST.</p>
            <button onClick={() => {setStart(toIstInput(calendar.startAtMs));setEnd(toIstInput(calendar.endAtMs));}}>Use calendar event times</button>
          </>}
        </div>}
        {createEnabled && (!active || providerChangeEnabled) && <label className="block">
          Google Calendar popup reminder
          <select className="block" value={reminderMinutes} onChange={e => setReminderMinutes(e.target.value)}>
            <option value="">{active ? 'Keep current setting' : 'No reminder'}</option>
            {active && <option value="0">Turn off reminder</option>}
            {[5, 15, 30, 60, 120].map(minutes => <option key={minutes} value={minutes}>{minutes} minutes before</option>)}
          </select>
        </label>}
        {createEnabled && (!active || providerChangeEnabled) && calendar?.kind === 'AVAILABILITY' && calendar.status === 'FREE' && start && end &&
          <button onClick={() => void writeCalendar(active ? 'RESCHEDULE' : 'CREATE')}>
            {active ? 'Reschedule on Google Calendar' : 'Create appointment on Google Calendar'}
          </button>}
        {providerChangeEnabled && (confirmCalendarCancel ? <div>
          <p>Remove this appointment from Google Calendar and update the CRM record?</p>
          <button onClick={() => void writeCalendar('CANCEL')}>Confirm Google Calendar cancellation</button>
          <button onClick={() => setConfirmCalendarCancel(false)}>Keep appointment</button>
        </div> : <button onClick={() => setConfirmCalendarCancel(true)}>Cancel on Google Calendar</button>)}
        <button disabled={!start || !end || (!active && !eventId.trim())} onClick={() => save(active ? 'RESCHEDULE' : 'CONFIRM')}>
          {active ? 'Record external reschedule' : 'Record confirmed appointment'}
        </button>
        {active && <button onClick={() => save('CANCEL')}>Record external cancellation</button>}
      </fieldset>}
    </>}
    {pending && !busy && <button onClick={() => void call(pending)}>Retry exact appointment update</button>}
  </section>;
};
