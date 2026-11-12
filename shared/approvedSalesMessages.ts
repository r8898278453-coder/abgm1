import {z} from 'zod';
import {salesRevision} from './salesWorkspace';
export const approveSalesMessageInput=z.object({expectedVersion:salesRevision,enrollmentVersion:salesRevision,expectedSenderId:z.string().regex(/^\d{1,64}$/),expectedRecipient:z.string().regex(/^[1-9]\d{5,14}$/),requestKey:z.string().regex(/^[a-f0-9]{64}$/),message:z.string().trim().min(1).max(4096),note:z.string().trim().min(10).max(500)}).strict();
export interface SalesSendPermit{approvalId:string;claimToken:string;}
