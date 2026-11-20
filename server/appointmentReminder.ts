import type { z } from 'zod';
import type { ReadOnlySql } from './readOnlySqlDeadline';
import { latestBookingEvidence } from './bookingEvidence';
import { appointmentReminderInput, appointmentReminderSnapshot } from '../shared/salesWorkflows';
import { SalesError } from './salesWorkspace';

export async function checkAppointmentReminderBooking(
  sql: ReadOnlySql, company: string, lead: string, version: string, nowMs: number,
) {
  const booking = await latestBookingEvidence(sql, company, lead);
  const startsAtMs = Number(booking?.start_at_ms);
  if (booking?.version !== version || booking.state !== 'CONFIRMED' ||
      !Number.isSafeInteger(startsAtMs) || startsAtMs <= nowMs) {
    throw new SalesError(409, 'APPOINTMENT_CHANGED');
  }
  const [pending] = await sql.query(
    `SELECT id FROM sales_calendar_intents WHERE company_id=? AND lead_id=?
      AND operation IN ('RESCHEDULE','CANCEL') AND expected_revision=?
      AND state='PENDING_REVIEW' AND COALESCE(hold_until_ms,end_at_ms)>? LIMIT 1`,
    [company, lead, version, nowMs],
  );
  if (pending.length) throw new SalesError(409, 'APPOINTMENT_CHANGE_PENDING');
  return startsAtMs;
}

export async function prepareAppointmentReminder(
  sql: ReadOnlySql, company: string, lead: string, input: z.infer<typeof appointmentReminderInput>,
) {
  const [[clock]] = await sql.query('SELECT UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000 nowMs');
  const nowMs = Number(clock.nowMs);
  const startsAtMs = await checkAppointmentReminderBooking(sql, company, lead, input.bookingVersion, nowMs);
  const dueAtMs = Math.ceil(startsAtMs / 1000) * 1000 - input.minutesBefore * 60000;
  const [prior] = await sql.query(
    `SELECT e.id FROM sales_workflow_enrollments e WHERE e.company_id=? AND e.lead_id=?
      AND BINARY JSON_UNQUOTE(JSON_EXTRACT(e.snapshot_json,'$.appointmentReminder.bookingVersion'))=?
      AND (e.state<>'EXITED' OR EXISTS (
        SELECT 1 FROM sales_message_approvals a WHERE a.company_id=e.company_id AND a.enrollment_id=e.id
        AND a.state IN ('DISPATCHING','UNKNOWN','API_ACCEPTED')
      )) LIMIT 1`, [company, lead, input.bookingVersion],
  );
  if (prior.length) throw new SalesError(409, 'APPOINTMENT_REMINDER_ALREADY_SCHEDULED');
  if (dueAtMs <= nowMs || startsAtMs > nowMs + 60 * 86400000) throw new SalesError(409, 'APPOINTMENT_REMINDER_WINDOW_INVALID');
  return appointmentReminderSnapshot.parse({ bookingVersion: input.bookingVersion, startsAtMs, dueAtMs });
}
