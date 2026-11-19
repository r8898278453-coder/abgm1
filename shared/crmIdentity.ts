import {z} from 'zod';
export const crmId=z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),crmHash=z.string().regex(/^[a-f0-9]{64}$/),crmRevision=z.string().regex(/^(0|[1-9][0-9]{0,19})$/).refine(v=>/^[0-9]{1,20}$/.test(v)&&BigInt(v)<=18446744073709551615n);
export const identityCommand=z.object({requestKey:crmHash,operation:z.enum(['LINK','UNLINK']),aliasLeadId:crmId,targetLeadId:crmId,expectedVersion:crmRevision,aliasFingerprint:crmHash,targetFingerprint:crmHash,note:z.string().trim().min(5).max(500)}).strict().refine(v=>v.aliasLeadId!==v.targetLeadId);
export const identityReviewCommand=z.object({expectedVersion:crmRevision,decision:z.enum(['RESOLVE','DISMISS']),leadId:crmId.optional(),note:z.string().trim().min(5).max(500)}).strict().refine(v=>(v.decision==='RESOLVE')===!!v.leadId);
export const attachmentCommand=z.object({requestKey:crmHash,filename:z.string().trim().min(1).max(128).regex(/^[^\x00-\x1f\x7f\\/<>:"|?*]+$/),mimeType:z.enum(['application/pdf','image/jpeg','image/png','text/plain']),base64:z.string().min(4).max(699052).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/)}).strict();
export const CRM_ATTACHMENT_LIMIT=512*1024;
