import { z } from 'zod';
import { crmHash, crmRevision } from './crmIdentity';

const base = { requestKey: crmHash, expectedVersion: crmRevision };
const event = {
  externalEventId: z.string().trim().regex(/^[A-Za-z0-9_.@:+/=-]{1,255}$/),
  startAt: z.iso.datetime({ offset: true }),
  endAt: z.iso.datetime({ offset: true }),
};
export const bookingEvidenceCommand = z.discriminatedUnion('operation', [
  z.object({ ...base, ...event, operation: z.literal('CONFIRM') }).strict(),
  z.object({ ...base, ...event, operation: z.literal('RESCHEDULE') }).strict(),
  z.object({ ...base, operation: z.literal('CANCEL') }).strict(),
]);

const instant = z.number().int().nonnegative().max(8640000000000000);
export const bookingRecord = z.object({
  version: crmRevision.refine(value => value !== '0'),
  state: z.enum(['CONFIRMED', 'CANCELLED']),
  externalEventId: event.externalEventId,
  startAtMs: instant,
  endAtMs: instant,
  recordedAtMs: instant.optional(),
  source: z.enum(['OPERATOR_RECORDED', 'GOOGLE_CALENDAR_VERIFIED']),
}).refine(row => row.endAtMs > row.startAtMs);

export type BookingRecord = z.infer<typeof bookingRecord>;

export const bookingRead = z.object({
  booking: bookingRecord.nullable(),
  calendarCreateEnabled: z.boolean().optional(),
  pendingCalendarRequestId: crmHash.nullable().optional(),
});

export const calendarWriteReceipt = z.object({
  requestId: crmHash,
  state: z.enum(['PENDING_REVIEW', 'CONFIRMED', 'REJECTED']),
  eventId: event.externalEventId,
});
