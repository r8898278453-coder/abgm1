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
