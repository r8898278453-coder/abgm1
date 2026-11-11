import crypto from 'node:crypto';
import {z} from 'zod';
import type {Pool,PoolConnection} from 'mysql2/promise';
import {classifyLegacyKnowledge,type LegacyKnowledgeRecord} from '../shared/onboarding';
import {validWorkspaceRevision,WorkspaceConflict} from '../shared/workspaceRevision';
import {agencyClientAccess,AgencyError} from './agencyPolicy';
import {readCompanyProfile} from './companyProfileStore';
import {storeKnowledgeSourceInTransaction} from './knowledgeStore';
import {enqueueKnowledgeExtractionInTransaction} from './knowledgeIngestion';
export const legacyRecordId=z.string().regex(/^(document|faq):(?:0|[1-9]\d{0,2})$/);
const batchInput=z.object({expectedVersion:z.string().refine(validWorkspaceRevision),recordIds:z.array(legacyRecordId).min(1).max(20).refine(v=>new Set(v).size===v.length)}).strict();
export function legacyStatementBytes(row:LegacyKnowledgeRecord){if(!row.text)throw new AgencyError(409,'LEGACY_ORIGINAL_REQUIRED');if(Buffer.byteLength(row.text,'utf8')>512*1024)throw new AgencyError(409,'LEGACY_TEXT_TOO_LARGE');const bytes=Buffer.from(`User-entered legacy statement. Original PDF/document extraction is unverified.\nRecord: ${row.name}\n\n${row.text}`,'utf8');if(bytes.length>512*1024)throw new AgencyError(409,'LEGACY_TEXT_TOO_LARGE');return bytes;}
/** Metadata-only content match. No source body is exposed and no legacy record is deleted. */
export async function reconcileLegacyKnowledge(pool:Pick<Pool,'query'>,company:string,rows:LegacyKnowledgeRecord[]){
 const [sources]:any=await pool.query('SELECT id,content_sha,extraction_state FROM knowledge_sources WHERE company_id=? LIMIT 51',[company]);if(sources.length>50)throw new AgencyError(503,'LEGACY_SOURCE_WINDOW_INVALID');
 let hashedBytes=0;return rows.map(({text,...row})=>{let source:any=null,reconciliation:'MATCHED'|'NOT_IMPORTED'|'NEEDS_ORIGINAL'|'TOO_LARGE'|'WINDOW_LIMIT'='NOT_IMPORTED';
  if(!text)reconciliation='NEEDS_ORIGINAL';else{try{const bytes=legacyStatementBytes({...row,text});hashedBytes+=bytes.length;if(hashedBytes>4*1024*1024)reconciliation='WINDOW_LIMIT';else{const hash=crypto.createHash('sha256').update(bytes).digest('hex');source=sources.find((s:any)=>s.content_sha===hash);if(source)reconciliation='MATCHED';}}catch{reconciliation='TOO_LARGE';}}
  return{...row,textBytes:text?Buffer.byteLength(text,'utf8'):0,reconciliation,importedSourceId:source?.id||null,sourceState:source?.extraction_state||null};
 });
}
async function importRow(c:PoolConnection,company:string,user:any,row:LegacyKnowledgeRecord,version:string){
 const bytes=legacyStatementBytes(row),result=await storeKnowledgeSourceInTransaction(c,company,'legacy-user-statement-'+row.id.replace(':','-')+'.txt',bytes,undefined,user.id);
 if(!result.reused)await enqueueKnowledgeExtractionInTransaction(c,company,result.id,undefined,user.id);
 await c.query('INSERT INTO autonomous_audit_logs(id,company_id,action_id,actor,event_type,details) VALUES (?,?,?,?,?,?)',[crypto.randomUUID(),company,result.id,user.id,'LEGACY_KNOWLEDGE_IMPORTED',JSON.stringify({recordId:row.id,profileVersion:version,sourceId:result.id,reused:result.reused})]);return{recordId:row.id,sourceId:result.id,reused:result.reused};
}
export async function importLegacyBatch(pool:Pool,company:string,user:any,input:unknown){
 const p=batchInput.safeParse(input);if(!p.success)throw new AgencyError(400,'LEGACY_INPUT_INVALID');const c=await pool.getConnection();
 try{await c.beginTransaction();await c.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[company]);const access=await agencyClientAccess(c,user,company,'manage');if(!access.authorized)throw new AgencyError(access.status,'ONBOARDING_ACCESS_DENIED');const snapshot=await readCompanyProfile(c,company);if(snapshot.version!==p.data.expectedVersion)throw new WorkspaceConflict();
 const legacy=classifyLegacyKnowledge(snapshot.data),selected=p.data.recordIds.map(id=>{const row=legacy.find(r=>r.id===id);if(!row)throw new AgencyError(404,'LEGACY_RECORD_NOT_FOUND');return row;});let total=0;for(const row of selected)total+=legacyStatementBytes(row).length;if(total>4*1024*1024)throw new AgencyError(409,'LEGACY_BATCH_TOO_LARGE');
 const results=[];for(const row of selected)results.push(await importRow(c,company,user,row,snapshot.version));await c.commit();return{companyId:company,profileVersion:snapshot.version,results};
 }catch(error){await c.rollback();throw error;}finally{c.release();}
}
