import {z} from 'zod';
export const dispatchProof=z.string().regex(/^d1\.[a-f0-9]{64}\.[a-f0-9]{64}\.[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.[a-f0-9]{64}$/);
export const receiptCorrelation=z.object({proof:dispatchProof,recipient:z.string().regex(/^[1-9][0-9]{5,14}$/)}).strict();
export const messageReceiptInput=z.object({phoneNumberId:z.string().regex(/^[0-9]{1,64}$/),providerId:z.string().regex(/^[\x21-\x7e]{1,255}$/),status:z.enum(['sent','delivered','read','failed']),occurredAtMs:z.number().int().nonnegative().max(8640000000000000),errorCode:z.number().int().nonnegative().max(4294967295).optional(),correlation:receiptCorrelation.optional()}).strict();
