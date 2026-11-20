import {z} from 'zod';
import {tenantEmailDomainProof} from './tenantEmailDomain';

const address=z.email().max(191);
const proofTime=z.number().int().positive().max(8640000000000000);
export const salesEmailCommand=z.object({
 requestKey:z.string().regex(/^[a-f0-9]{64}$/),
 recipient:address,
 senderCheckedAtMs:proofTime,
 subject:z.string().trim().min(1).max(160).regex(/^[^\u0000-\u001f\u007f]+$/),
 text:z.string().trim().min(1).max(4000).refine(text=>!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)),
}).strict();

export const salesEmailReadiness=z.object({
 enabled:z.boolean(),
 recipient:address.nullable(),
 sender:tenantEmailDomainProof.nullable(),
 blocked:z.string().regex(/^[A-Z_]+$/).nullable(),
}).strict();

export const salesEmailDispatch=z.object({
 requestKey:z.string().regex(/^[a-f0-9]{64}$/),
 status:z.enum(['API_ACCEPTED','PAUSED','UNKNOWN']),
 reused:z.boolean(),
}).strict();
