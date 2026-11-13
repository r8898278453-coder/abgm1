import {z} from 'zod';
import {salesRevision} from './salesWorkspace';
import {workflowId} from './salesWorkflows';
export const inquiryRuleInput=z.object({expectedVersion:salesRevision,enabled:z.boolean(),workflowId:workflowId.nullable(),workflowVersion:salesRevision.nullable(),note:z.string().trim().min(10).max(500)}).strict().refine(v=>!v.enabled||(v.workflowId!==null&&v.workflowVersion!==null),'Enabled rules require an exact approved workflow');
