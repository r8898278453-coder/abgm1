import {z} from 'zod';

export const tenantEmailDomainName=z.string().max(253)
 .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/);

export const tenantEmailDomainProof=z.object({
 provider:z.literal('resend'),
 domain:tenantEmailDomainName,
 state:z.literal('VERIFIED_DOMAIN'),
 checkedAtMs:z.number().int().min(1).max(8640000000000000),
}).strict();

export const TENANT_EMAIL_DOMAIN_EVIDENCE_TTL_MS=15*60*1000;
export const tenantEmailDomainStatus=z.discriminatedUnion('state',[
 z.object({state:z.literal('VERIFIED_DOMAIN'),proof:tenantEmailDomainProof,expiresAtMs:z.number().int().min(1).max(8640000000000000)}).strict(),
 z.object({state:z.enum(['NOT_CONFIGURED','UNCHECKED','CHECKING','UNVERIFIED','UNCONFIRMED','RECHECK_REQUIRED'])}).strict(),
]).refine(value=>value.state!=='VERIFIED_DOMAIN'||(
 value.expiresAtMs>value.proof.checkedAtMs&&value.expiresAtMs-value.proof.checkedAtMs<=TENANT_EMAIL_DOMAIN_EVIDENCE_TTL_MS
));
