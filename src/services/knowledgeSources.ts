import {validWorkspaceRevision} from '../../shared/workspaceRevision';
import {KNOWLEDGE_EVENT_TYPES} from '../../shared/knowledge';
import {apiRequest,getStoredToken,ApiRequestError} from './authService';
import {API_BASE_URL} from '../config/apiConfig';
import type {KnowledgeSource,KnowledgeChunk,WebsiteImportRun} from '../../shared/knowledge';
const base=(company:string)=>`/api/companies/${encodeURIComponent(company)}/knowledge/sources`;
function collection(data:any,company:string):KnowledgeSource[]{if(data?.success!==true||data.companyId!==company||!Array.isArray(data.sources)||data.sources.some((row:any)=>row.companyId!==company))throw new Error('Source acknowledgement unconfirmed. Reload source list.');return data.sources;}
export async function listSources(company:string,signal?:AbortSignal){return collection(await apiRequest(base(company),{signal}),company);}
export async function uploadSource(company:string,file:File){const form=new FormData();form.append('file',file);const token=getStoredToken();const response=await fetch(API_BASE_URL+base(company),{method:'POST',headers:token?{Authorization:'Bearer '+token}:{},body:form,signal:AbortSignal.timeout(15000)});const data=await response.json();if(!response.ok)throw new Error('Upload unavailable or unconfirmed. Reload sources before retrying.');return collection(data,company);}
export async function sourceCommand(company:string,source:KnowledgeSource,command:'approve'|'withdraw'|'retry'|'delete'){
 return collection(await apiRequest(base(company)+'/'+encodeURIComponent(source.id)+(command==='delete'?'':'/'+(command==='withdraw'?'withdraw-approval':command)),{method:command==='delete'?'DELETE':'POST',body:JSON.stringify({expectedVersion:source.version})}),company);
}
export async function previewSource(company:string,id:string):Promise<{source:KnowledgeSource;chunks:KnowledgeChunk[]}>{const data:any=await apiRequest(base(company)+'/'+encodeURIComponent(id)+'/preview');if(data?.success!==true||data.companyId!==company||data.source?.companyId!==company||data.source.id!==id||!Array.isArray(data.chunks))throw new Error('Preview unavailable');return data;}
export async function downloadSource(company:string,source:KnowledgeSource){const token=getStoredToken(),response=await fetch(API_BASE_URL+base(company)+'/'+encodeURIComponent(source.id)+'/download',{headers:token?{Authorization:'Bearer '+token}:{},signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('Download unavailable');const blob=await response.blob(),url=URL.createObjectURL(blob);try{const link=document.createElement('a');link.href=url;link.download=source.filename;link.click();}finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}}

export class WebsiteImportSetupError extends Error{}
export async function importRegisteredWebsite(company:string){
 let data:any;try{data=await apiRequest(`/api/companies/${encodeURIComponent(company)}/knowledge/import-website`,{method:'POST',body:'{}'});}catch(error){if(error instanceof ApiRequestError&&error.status===409){if(error.message==='REGISTERED_WEBSITE_REQUIRED')throw new WebsiteImportSetupError('No saved website for this client. Add an HTTPS website, or upload a document instead.');if(error.message==='REGISTERED_WEBSITE_UNSUPPORTED')throw new WebsiteImportSetupError('The saved website URL is unsupported. Use HTTPS without credentials, query parameters or fragments.');}throw error;}
 if(data?.success!==true||data.companyId!==company||typeof data.reused!=='boolean')throw new Error('Website import acknowledgement unavailable');return checkedWebsiteRun(data.run,company);
}
export async function sourceHistory(company:string,id:string,before?:string){
 const data:any=await apiRequest(base(company)+'/'+encodeURIComponent(id)+'/history'+(before!==undefined?'?beforeVersion='+encodeURIComponent(before):''));
 if(data?.success!==true||data.companyId!==company||data.sourceId!==id||!Array.isArray(data.events)||data.events.length>50||data.nextBeforeVersion!==null&&!validWorkspaceRevision(data.nextBeforeVersion))throw new Error('Source history unavailable');
 const states=new Set(['QUEUED','STORED','PROCESSING','EXTRACTED','NEEDS_OCR','UNSUPPORTED','FAILED','DELETED']);
 for(let index=0;index<data.events.length;index++){const event=data.events[index];if(typeof event?.id!=='string'||typeof event.actor!=='string'||!KNOWLEDGE_EVENT_TYPES.includes(event.event)||!validWorkspaceRevision(event.sourceVersion)||!states.has(event.state)||!Number.isFinite(event.recordedAtMs)||!Number.isFinite(new Date(event.recordedAtMs).getTime())||before!==undefined&&BigInt(event.sourceVersion)>=BigInt(before)||index>0&&BigInt(event.sourceVersion)>=BigInt(data.events[index-1].sourceVersion))throw new Error('Source history unavailable');}
 if(data.nextBeforeVersion!==null&&data.nextBeforeVersion!==data.events.at(-1)?.sourceVersion)throw new Error('Source history cursor unavailable');
 return{events:data.events,nextBeforeVersion:data.nextBeforeVersion as string|null};
}

function checkedWebsiteRun(run:any,company:string):WebsiteImportRun{
 if(!run||!/^wi_[a-f0-9]{32}$/.test(run.id)||run.companyId!==company||typeof run.websiteUrl!=='string'||!['QUEUED','RUNNING','RETRY_WAIT','SUCCEEDED','FAILED','CANCELLED'].includes(run.status)||!Number.isSafeInteger(run.attempts)||run.attempts<0||![run.createdAtMs,run.updatedAtMs].every(value=>Number.isFinite(value)&&Number.isFinite(new Date(value).getTime()))||run.errorCode!==null&&typeof run.errorCode!=='string')throw new Error('Website run unavailable');
 if(run.outcome!==null){const result=run.outcome;if(!result||!['STATIC_PREVIEW','PARTIAL','UNAVAILABLE'].includes(result.status)||!Array.isArray(result.sourceIds)||result.sourceIds.length>3||result.sourceIds.some((id:any)=>typeof id!=='string'||!id.startsWith('ks_'))||!Array.isArray(result.failures)||result.failures.length>3||result.failures.some((failure:any)=>typeof failure?.url!=='string'||typeof failure?.code!=='string')||typeof result.truncated!=='boolean'||!Number.isSafeInteger(result.reusedCount)||result.reusedCount<0||result.reusedCount>3)throw new Error('Website result unavailable');}
 return run;
}
export async function websiteImportHistory(company:string,before?:string){
 const data:any=await apiRequest(`/api/companies/${encodeURIComponent(company)}/knowledge/website-imports`+(before?'?before='+encodeURIComponent(before):''));
 if(data?.success!==true||data.companyId!==company||!Array.isArray(data.runs)||data.runs.length>10||data.nextBefore!==null&&(!/^wi_[a-f0-9]{32}$/.test(data.nextBefore)||data.nextBefore!==data.runs.at(-1)?.id))throw new Error('Website history unavailable');
 return{runs:data.runs.map((run:any)=>checkedWebsiteRun(run,company)) as WebsiteImportRun[],nextBefore:data.nextBefore as string|null};
}
export async function cancelWebsiteRun(company:string,id:string){const data:any=await apiRequest(`/api/companies/${encodeURIComponent(company)}/knowledge/website-imports/${encodeURIComponent(id)}/cancel`,{method:'POST',body:'{}'});if(data?.success!==true||data.companyId!==company)throw new Error('Website cancellation unconfirmed');}
