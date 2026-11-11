import {z} from 'zod';
import {validWorkspaceRevision} from './workspaceRevision';
const revision=z.string().refine(validWorkspaceRevision),id=z.string().regex(/^kf_[a-f0-9]{32}$/);
export const createFactInput=z.object({key:z.string().trim().min(2).max(120).regex(/^[a-z0-9][a-z0-9._ -]*$/),value:z.string().trim().min(1).max(4000),source:z.object({id:z.string().min(1).max(64),version:revision}).strict().optional()}).strict();
export const factCommandInput=z.object({expectedVersion:revision,replace:z.array(z.object({id,version:revision}).strict()).max(200).optional()}).strict();
export interface KnowledgeFact{id:string;companyId:string;key:string;value:string;origin:'MANUAL'|'SOURCE';status:'DRAFT'|'APPROVED'|'WITHDRAWN'|'REJECTED';version:string;sourceId:string|null;sourceVersion:string|null;chunkIndex:number|null;page:number|null;excerptStart:number;excerptEnd:number;contentSha:string|null;eligible:boolean;createdAtMs:number;}
/** Manual approvals retain precedence. Conflicting source proposals block source-derived answers. */
export function governedFactGroups(facts:KnowledgeFact[]){
 const groups=new Map<string,KnowledgeFact[]>();for(const fact of facts)groups.set(fact.key,[...(groups.get(fact.key)||[]),fact]);
 return [...groups].map(([key,rows])=>{const active=rows.filter(f=>f.eligible&&['DRAFT','APPROVED'].includes(f.status));const manual=active.filter(r=>r.origin==='MANUAL'&&r.status==='APPROVED'),approved=manual.length?manual:active.filter(r=>r.status==='APPROVED');const values=new Set((manual.length?manual:active).map(r=>r.value));return{key,conflict:values.size>1,approved:values.size===1?approved:[],candidateIds:rows.map(r=>r.id)};});
}
