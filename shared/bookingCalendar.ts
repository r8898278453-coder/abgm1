import { z } from 'zod';

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

export const calendarCreateCommand = z.object({
  requestKey: z.string().regex(/^[a-f0-9]{64}$/),
  expectedVersion: z.string().regex(/^(0|[1-9]\d{0,19})$/),
  startAt: zonedTime,
  endAt: zonedTime,
}).strict();
