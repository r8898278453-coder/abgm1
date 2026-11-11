import {apiRequest} from './authService';
import {validWorkspaceRevision} from '../../shared/workspaceRevision';
import type {KnowledgeFact} from '../../shared/knowledgeFacts';
const base=(company:string)=>`/api/companies/${encodeURIComponent(company)}/knowledge/facts`;
function collection(data:any,company:string):KnowledgeFact[]{if(data?.success!==true||data.companyId!==company||!Array.isArray(data.facts)||data.facts.length>200||data.facts.some((row:any)=>row.companyId!==company||!/^kf_[a-f0-9]{32}$/.test(row.id)||!validWorkspaceRevision(row.version)||typeof row.key!=='string'||typeof row.value!=='string'||!['MANUAL','SOURCE'].includes(row.origin)||!['DRAFT','APPROVED','WITHDRAWN','REJECTED'].includes(row.status)||typeof row.eligible!=='boolean'))throw new Error('Fact acknowledgement unavailable');return data.facts;}
export async function listFacts(company:string){return collection(await apiRequest(base(company)),company);}
export async function createFact(company:string,input:unknown){return collection(await apiRequest(base(company),{method:'POST',body:JSON.stringify(input)}),company);}
export async function factCommand(company:string,fact:KnowledgeFact,command:'approve'|'withdraw'|'reject'|'delete',replace?:Array<{id:string;version:string}>){return collection(await apiRequest(base(company)+'/'+encodeURIComponent(fact.id)+'/'+command,{method:'POST',body:JSON.stringify({expectedVersion:fact.version,...(replace?{replace}:{})})}),company);}
