import {z} from 'zod';import {validWorkspaceRevision} from './workspaceRevision';
export const objectiveInput=z.object({expectedVersion:z.string().refine(validWorkspaceRevision),goal:z.enum(['LEADS','APPOINTMENTS','QUALIFIED_PIPELINE','REPEAT_PURCHASES']),monthlyTarget:z.number().int().min(1).max(1000000).nullable(),enforceDailyLimit:z.boolean()}).strict();
export type ClientObjective={goal:'LEADS'|'APPOINTMENTS'|'QUALIFIED_PIPELINE'|'REPEAT_PURCHASES';monthlyTarget:number|null;enforceDailyLimit:boolean};
