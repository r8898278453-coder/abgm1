import {z} from 'zod';

export const tenantEmailDomainName=z.string().max(253)
 .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/);

export const tenantEmailDomainProof=z.object({
 provider:z.literal('resend'),
 domain:tenantEmailDomainName,
 state:z.literal('VERIFIED_DOMAIN'),
 checkedAtMs:z.number().int().min(1).max(8640000000000000),
}).strict();
