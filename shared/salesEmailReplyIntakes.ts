import {z} from 'zod';

export const EMAIL_INTAKE_STATES=['PENDING','RUNNING','RECORDED','IGNORED','FAILED','EXPIRED'] as const;
export const EMAIL_INTAKE_REASONS=['PROVIDER_UNAVAILABLE','DISPATCH_UNCONFIRMED','CONFIGURATION_CHANGED','PAYLOAD_INVALID','THREAD_CHANGED','STORAGE_UNAVAILABLE','PAUSED','EXPIRED'] as const;
const time=z.number().int().positive().max(8640000000000000);
const identifier=z.string().regex(/^[a-f0-9]{64}$/);
export const emailIntakePage=z.object({
 enabled:z.boolean(),
 items:z.array(z.object({
  id:identifier,state:z.enum(EMAIL_INTAKE_STATES),reason:z.enum(EMAIL_INTAKE_REASONS).nullable(),
  attempts:z.number().int().min(0).max(7),admittedAtMs:time,expiresAtMs:time,settledAtMs:time.nullable(),
 }).strict()).max(20),
 nextBefore:identifier.nullable(),
}).strict();
