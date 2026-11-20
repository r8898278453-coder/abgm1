import React, { useEffect, useRef, useState } from 'react';
import { apiRequest, ApiRequestError, getStoredToken } from '../services/authService';
import { formatPlatformDateTime } from '../../shared/platformTime';

type Booking = {
  version: string;
  state: 'CONFIRMED' | 'CANCELLED';
  externalEventId: string;
  startAtMs: number;
  endAtMs: number;
  source: 'OPERATOR_RECORDED';
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
  const request = useRef<AbortController | null>(null);
  const acceptedSession = useRef<string | null | undefined>(undefined);
  useEffect(() => () => request.current?.abort(), []);

  const base = `/api/companies/${encodeURIComponent(companyId)}/sales/leads/${encodeURIComponent(leadId)}/booking-evidence`;
  function show(value: Booking | null, session: string | null) {
    acceptedSession.current = session;
    setBooking(value);
    setEventId(value?.externalEventId || '');
    setStart('');
    setEnd('');
    setPending(null);
    setLoaded(true);
  }

  async function call(command?: Command) {
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
    setBusy(true);
    if (command) setPending(command);
    else setLoaded(false);
    const current = () => !controller.signal.aborted && session === getStoredToken();
    try {
      const response = await apiRequest<{success: boolean; companyId: string; booking: Booking | null}>(
        base, { signal: controller.signal, ...(command ? {method:'POST',body:JSON.stringify(command)} : {}) },
      );
      if (!current()) return;
      if (!response.success || response.companyId !== companyId || response.booking === undefined) throw Error();
      show(response.booking, session);
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

  function save(operation: Command['operation']) {
    if (busy || pending || !canWrite) return;
    const requestKey = Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2,'0')).join('');
    const command: Command = { operation, requestKey, expectedVersion: booking?.version || '0' };
    if (operation !== 'CANCEL') {
      command.externalEventId = operation === 'RESCHEDULE' ? booking?.externalEventId : eventId.trim();
      command.startAt = start + ':00+05:30';
      command.endAt = end + ':00+05:30';
    }
    void call(command);
  }

  const visible = loaded && acceptedSession.current === getStoredToken();
  const active = booking?.state === 'CONFIRMED' && booking.endAtMs > Date.now();
  return <section aria-label="Appointment evidence" className="min-w-0 space-y-2 rounded-xl border p-3 break-words">
    <h3>Appointment evidence</h3>
    <p>Record an appointment already confirmed outside the workspace. This record controls inquiry follow-ups.</p>
    <button disabled={busy} onClick={() => void call()}>Load appointment record</button>
    {error && <p role="alert">{error}</p>}
    {visible && <>
      {booking
        ? <p>{active ? 'Confirmed externally' : booking.state === 'CANCELLED' ? 'Cancelled' : 'Past'} · {booking.externalEventId} · {formatPlatformDateTime(booking.startAtMs)} to {formatPlatformDateTime(booking.endAtMs)} IST</p>
        : <p>No appointment recorded.</p>}
      {canWrite && <fieldset disabled={busy || Boolean(pending)} className="min-w-0 space-y-2">
        <legend>{active ? 'Record an external appointment change' : 'Record external confirmation'}</legend>
        {!active && <label className="block">External appointment reference
          <input className="block w-full" value={eventId} maxLength={255} onChange={e => setEventId(e.target.value)}/>
        </label>}
        <label className="block">Appointment start (IST)
          <input className="block max-w-full" type="datetime-local" value={start} onChange={e => setStart(e.target.value)}/>
        </label>
        <label className="block">Appointment end (IST)
          <input className="block max-w-full" type="datetime-local" value={end} onChange={e => setEnd(e.target.value)}/>
        </label>
        <button disabled={!start || !end || (!active && !eventId.trim())} onClick={() => save(active ? 'RESCHEDULE' : 'CONFIRM')}>
          {active ? 'Record external reschedule' : 'Record confirmed appointment'}
        </button>
        {active && <button onClick={() => save('CANCEL')}>Record external cancellation</button>}
      </fieldset>}
    </>}
    {pending && !busy && <button onClick={() => void call(pending)}>Retry exact appointment update</button>}
  </section>;
};
