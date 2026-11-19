import {z} from 'zod';
import {crmId,crmHash,crmRevision} from './crmIdentity';
export const DEVELOPER_SCOPES=['contacts:read','sales:read','events:read'] as const;
export const developerKeyInput=z.object({requestKey:crmHash,label:z.string().trim().min(3).max(80),scopes:z.array(z.enum(DEVELOPER_SCOPES)).min(1).max(3).refine(v=>new Set(v).size===v.length),expiresInDays:z.number().int().min(1).max(90)}).strict();
export const developerVersion=z.object({expectedVersion:crmRevision}).strict();
export const developerReplay=z.object({eventId:crmId}).strict();
export const developerSubscription=z.object({requestKey:crmHash,label:z.string().trim().min(3).max(80),url:z.string().min(12).max(2048),topic:z.literal('crm.activity')}).strict();
export const developerSignatureHeaders=z.object({timestamp:z.string().regex(/^[1-9]\d{9,12}$/),deliveryId:crmId,signature:crmHash}).strict();
export const DEVELOPER_EVENT_TYPES=new Set(['CRM_IDENTITY_LINK','CRM_IDENTITY_UNLINK','CRM_IDENTITY_REVIEWED','CRM_ATTACHMENT_STORED','CRM_ATTACHMENT_PROVIDER_STORED']);
