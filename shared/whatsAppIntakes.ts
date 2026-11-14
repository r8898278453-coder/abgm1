import {z} from 'zod';
import {verifiedWhatsAppEvent} from './whatsAppEvents';
import {salesRevision} from './salesWorkspace';
const receipt=z.object({phoneNumberId:z.string().regex(/^\d{1,64}$/),providerId:z.string().regex(/^[\x21-\x7e]{1,255}$/),status:z.enum(['sent','delivered','read','failed']),occurredAtMs:z.number().int().nonnegative().max(8640000000000000),errorCode:z.number().int().nonnegative().max(4294967295).optional()}).strict();
export const intakePayload=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('INBOUND'),source:verifiedWhatsAppEvent,providerId:z.string().regex(/^[\x21-\x7e]{1,255}$/),from:z.string().regex(/^[1-9]\d{5,14}$/),name:z.string().max(255),body:z.string().max(8192),messageKind:z.string().regex(/^[a-z_]{1,50}$/),mediaId:z.string().max(255).nullable()}).strict(),
 z.object({kind:z.literal('RECEIPT'),source:verifiedWhatsAppEvent,receipt}).strict()
]).refine(v=>v.kind!=='RECEIPT'||v.source.phoneNumberId===v.receipt.phoneNumberId&&v.source.occurredAtMs===v.receipt.occurredAtMs);
export type IntakePayload=z.infer<typeof intakePayload>;
export const intakeId=z.string().regex(/^wii_[a-f0-9]{32}$/);
export const intakeReplayInput=z.object({expectedVersion:salesRevision,requestKey:z.string().regex(/^[a-f0-9]{64}$/),evidence:z.string().trim().min(20).max(1000)}).strict();
export const intakeCancelInput=z.object({expectedVersion:salesRevision,evidence:z.string().trim().min(20).max(1000)}).strict();
