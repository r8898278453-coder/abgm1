import {validWorkspaceRevision} from '../../shared/workspaceRevision';
import {KNOWLEDGE_EVENT_TYPES} from '../../shared/knowledge';
import {apiRequest,getStoredToken,ApiRequestError} from './authService';
import {API_BASE_URL} from '../config/apiConfig';
import type {KnowledgeSource,KnowledgeChunk} from '../../shared/knowledge';
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
 const sources=collection(data,company);if(!['STATIC_PREVIEW','PARTIAL','UNAVAILABLE'].includes(data.status))throw new Error('Website import acknowledgement unavailable');return{sources,status:data.status};
}
export async function sourceHistory(company:string,id:string,before?:string){
 const data:any=await apiRequest(base(company)+'/'+encodeURIComponent(id)+'/history'+(before!==undefined?'?beforeVersion='+encodeURIComponent(before):''));
 if(data?.success!==true||data.companyId!==company||data.sourceId!==id||!Array.isArray(data.events)||data.events.length>50||data.nextBeforeVersion!==null&&!validWorkspaceRevision(data.nextBeforeVersion))throw new Error('Source history unavailable');
 const states=new Set(['QUEUED','STORED','PROCESSING','EXTRACTED','NEEDS_OCR','UNSUPPORTED','FAILED','DELETED']);
 for(let index=0;index<data.events.length;index++){const event=data.events[index];if(typeof event?.id!=='string'||typeof event.actor!=='string'||!KNOWLEDGE_EVENT_TYPES.includes(event.event)||!validWorkspaceRevision(event.sourceVersion)||!states.has(event.state)||!Number.isFinite(event.recordedAtMs)||!Number.isFinite(new Date(event.recordedAtMs).getTime())||before!==undefined&&BigInt(event.sourceVersion)>=BigInt(before)||index>0&&BigInt(event.sourceVersion)>=BigInt(data.events[index-1].sourceVersion))throw new Error('Source history unavailable');}
 if(data.nextBeforeVersion!==null&&data.nextBeforeVersion!==data.events.at(-1)?.sourceVersion)throw new Error('Source history cursor unavailable');
 return{events:data.events,nextBeforeVersion:data.nextBeforeVersion as string|null};
}
