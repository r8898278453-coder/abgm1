import {z} from 'zod';

export const EMAIL_RECEIPT_TYPES=['SENT','DELAYED','DELIVERED','FAILED','BOUNCED','SUPPRESSED','COMPLAINED'] as const;
export const emailReceiptState=z.enum(EMAIL_RECEIPT_TYPES);
export type EmailReceiptState=z.infer<typeof emailReceiptState>;
export const emailReceiptEvidence=z.object({
 state:emailReceiptState,
 occurredAtMs:z.number().int().positive().max(8640000000000000),
 suppressed:z.boolean(),
}).strict();
export type EmailReceiptEvidence=z.infer<typeof emailReceiptEvidence>;
export const EMAIL_RECEIPT_LABELS:Record<EmailReceiptState,string>={
 SENT:'Sent by Resend',DELAYED:'Delivery delayed',DELIVERED:'Delivered',FAILED:'Failed',
 BOUNCED:'Bounced',SUPPRESSED:'Suppressed',COMPLAINED:'Spam complaint',
};
