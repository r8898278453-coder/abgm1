import { z } from 'zod';
import { crmHash, crmRevision } from './crmIdentity';

const zonedTime = z.iso.datetime({ offset: true });
export const calendarCheck = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('AVAILABILITY'), startAt: zonedTime, endAt: zonedTime }).strict(),
  z.object({ kind: z.literal('EVENT'), eventId: z.string().trim().regex(/^[A-Za-z0-9_-]{1,255}$/) }).strict(),
]);

const common = { observedAtMs: z.number().int().nonnegative(), source: z.literal('GOOGLE_CALENDAR') };
export const calendarCheckResult = z.discriminatedUnion('kind', [
  z.object({ ...common, kind: z.literal('AVAILABILITY'), status: z.enum(['FREE','BUSY']) }).strict(),
  z.object({
    ...common, kind: z.literal('EVENT'), status: z.literal('CONFIRMED'),
    startAtMs: z.number().int().positive(), endAtMs: z.number().int().positive(),
  }).strict(),
]);

const intent = { requestKey: crmHash, expectedVersion: crmRevision };
const window = { startAt: zonedTime, endAt: zonedTime, reminderMinutes: z.number().int().min(0).max(120).optional() };
export const calendarCreateCommand = z.object({ ...intent, ...window }).strict();
export const calendarChangeCommand = z.discriminatedUnion('operation', [
  z.object({ ...intent, ...window, operation: z.literal('RESCHEDULE') }).strict(),
  z.object({ ...intent, operation: z.literal('CANCEL') }).strict(),
]);

export const calendarRefreshCommand = z.object({ expectedVersion: crmRevision }).strict();
