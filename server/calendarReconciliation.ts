import crypto from 'node:crypto';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { calendarReconciliationEnabled } from './bookingCalendar';
import { refreshCalendarBooking } from './calendarObservation';
import { isGlobalEmergencyStopActive } from './executionStop';
import { withReadOnlySqlDeadline } from './readOnlySqlDeadline';
import { SalesError } from './salesWorkspace';

type Outcome = 'UNCHANGED' | 'UPDATED' | 'DEFERRED' | 'UNAVAILABLE';
const skipCodes = new Set(['BOOKING_CHANGED','BOOKING_STATE_CHANGED','CALENDAR_RECONCILIATION_REQUIRED','CALENDAR_SYNC_LEASE_LOST']);
const nextDelayMs = (outcome: Outcome, failures: number) =>
  outcome === 'UNAVAILABLE' ? Math.min(3600000, 300000 * 2 ** Math.min(failures, 4)) :
    outcome === 'DEFERRED' ? 300000 : 600000;

/** Admitted by the existing dispatcher; the origin row holds a reusable, bounded observation lease. */
export async function runCalendarReconciliation(
  pool: Pool, canStart = () => true, transport: typeof fetch = fetch,
) {
  const result = { calendarSyncEnabled: calendarReconciliationEnabled(), calendarSyncChecked: 0,
    calendarSyncChanged: 0, calendarSyncDeferred: 0, calendarSyncUnavailable: 0 };
  const enabled = () => calendarReconciliationEnabled() && !isGlobalEmergencyStopActive() && canStart();
  if (!enabled()) return result;

  const candidates = await withReadOnlySqlDeadline(pool, async sql => {
    const [rows] = await sql.query(
      `SELECT i.id,i.company_id,i.lead_id,i.actor_id,i.sync_failures,CAST(b.revision AS CHAR) version
       FROM sales_calendar_intents i
       JOIN client_operations c ON c.company_id=i.company_id AND c.status='ACTIVE'
       JOIN sales_booking_evidence b ON b.company_id=i.company_id AND b.lead_id=i.lead_id
         AND b.external_event_id=i.external_event_id AND b.state='CONFIRMED'
       WHERE i.operation='CREATE' AND i.state='CONFIRMED' AND i.sync_due_ms<=UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000
         AND b.end_at_ms>UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000
         AND NOT EXISTS (SELECT 1 FROM sales_booking_evidence newer
           WHERE newer.company_id=b.company_id AND newer.lead_id=b.lead_id AND newer.revision>b.revision)
       ORDER BY i.sync_due_ms,i.id LIMIT 2`,
    );
    return rows as RowDataPacket[];
  });
  for (const row of candidates) {
    if (!enabled()) break;
    const token = crypto.randomBytes(32).toString('hex');
    const [claim] = await pool.query<ResultSetHeader>(
      `UPDATE sales_calendar_intents SET sync_claim=?,sync_due_ms=UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000+120000
       WHERE company_id=? AND id=? AND operation='CREATE' AND state='CONFIRMED'
         AND sync_due_ms<=UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000`, [token,row.company_id,row.id],
    );
    if (claim.affectedRows !== 1) continue;
    let outcome: Outcome = 'DEFERRED';
    if (enabled()) {
      result.calendarSyncChecked++;
      try {
        const update = await refreshCalendarBooking(pool, {id:row.actor_id}, row.company_id, row.lead_id,
          {expectedVersion:row.version}, transport, token);
        outcome = update.state === 'UNCHANGED' ? 'UNCHANGED' : 'UPDATED';
      } catch (error) {
        outcome = error instanceof SalesError && skipCodes.has(error.code) ? 'DEFERRED' : 'UNAVAILABLE';
      }
    }
    const failures = Number(row.sync_failures);
    const [settled] = await pool.query<ResultSetHeader>(
      `UPDATE sales_calendar_intents SET sync_claim=NULL,sync_status=?,sync_failures=?,
       sync_due_ms=UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000+?
       WHERE company_id=? AND id=? AND sync_claim=? AND sync_due_ms>UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000`,
      [outcome,outcome === 'UNAVAILABLE' ? Math.min(6,failures+1) : 0,nextDelayMs(outcome,failures),row.company_id,row.id,token],
    );
    if (settled.affectedRows === 1) {
      if (outcome === 'UPDATED') result.calendarSyncChanged++;
      if (outcome === 'UNAVAILABLE') result.calendarSyncUnavailable++;
      if (outcome === 'DEFERRED') result.calendarSyncDeferred++;
    }
  }
  return result;
}
