import type { ReadOnlySql } from './readOnlySqlDeadline';
import { bookingSlot,type BookingPolicy } from '../shared/bookingPolicy';
import { readSalesPolicy,SalesError } from './salesWorkspace';

type TestedSlot=Extract<ReturnType<typeof bookingSlot>,{ok:true}>;
export async function readCalendarSlotPolicy(sql:ReadOnlySql,company:string,start:number,end:number) {
  const {policy}=await readSalesPolicy(sql,company);
  const [[clock]]=await sql.query('SELECT UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000 nowMs');
  const now=Number(clock.nowMs);
  return {now,policy:policy.booking,slot:checkedCalendarSlot(policy.booking,start,end,now)};
}

export function checkedCalendarSlot(policy:BookingPolicy,start:number,end:number,now:number):TestedSlot {
  const slot=bookingSlot(policy,start,end,now);
  if(!slot.ok)throw new SalesError(400,slot.reason);
  return slot;
}

export async function calendarSlotConflicts(
  sql:ReadOnlySql,company:string,lead:string,calendarHash:string,skipEventId:string,now:number,slot:TestedSlot|null,skipIntentId='',
) {
  const [rows]=await sql.query(`SELECT i.id FROM sales_calendar_intents i
    WHERE i.company_id=? AND i.id<>? AND (
      (i.state='PENDING_REVIEW' AND COALESCE(i.hold_until_ms,i.end_at_ms)>? AND i.lead_id=?)
      OR (? AND i.calendar_hash=? AND i.external_event_id<>? AND i.operation<>'CANCEL'
        AND i.start_at_ms<? AND i.end_at_ms>? AND (
          (i.state='PENDING_REVIEW' AND i.end_at_ms>?) OR
          (i.state='CONFIRMED' AND NOT EXISTS (SELECT 1 FROM sales_calendar_intents newer
            WHERE newer.company_id=i.company_id AND newer.lead_id=i.lead_id AND newer.external_event_id=i.external_event_id
              AND newer.state='CONFIRMED' AND newer.expected_revision>i.expected_revision))
        )
      )
    ) LIMIT 1`,[company,skipIntentId,now,lead,Boolean(slot),calendarHash,skipEventId,
    slot?slot.checkEnd+slot.beforeMs:0,slot?slot.checkStart-slot.afterMs:0,slot?now-slot.afterMs:now]);
  return rows.length>0;
}
