import {z} from 'zod';
import {salesRevision} from './salesWorkspace';
export const inboundConflictId=z.string().regex(/^[a-f0-9]{64}$/);
export const inboundConflictReviewInput=z.object({expectedVersion:salesRevision,expectedConflictVersion:salesRevision,decision:z.enum(['KEEP_BLOCKED','ACCEPT_ORIGINAL']),requestKey:z.string().regex(/^[a-f0-9]{64}$/),evidence:z.string().trim().min(20).max(1000)}).strict();
