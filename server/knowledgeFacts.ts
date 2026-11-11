import crypto from 'node:crypto';
import type {Pool,PoolConnection} from 'mysql2/promise';
import {createFactInput,factCommandInput,type KnowledgeFact} from '../shared/knowledgeFacts';
import {KnowledgeError,originalKnowledgeBytes} from './knowledgeStore';
import {withReadOnlySqlDeadline} from './readOnlySqlDeadline';
const columns='f.*,CAST(f.revision AS CHAR) version,CAST(f.source_revision AS CHAR) source_version,UNIX_TIMESTAMP(f.created_at)*1000 created_ms,(SELECT content_sha FROM knowledge_sources s WHERE s.company_id=f.company_id AND s.id=f.source_id) content_sha';
const eligible="(f.origin='MANUAL' OR EXISTS(SELECT 1 FROM knowledge_sources s WHERE s.id=f.source_id AND s.company_id=f.company_id AND s.revision=f.source_revision AND s.extraction_state='EXTRACTED' AND s.approved_at IS NOT NULL))";
function dto(row:any):KnowledgeFact{if(!['MANUAL','SOURCE'].includes(row.origin)||!['DRAFT','APPROVED','WITHDRAWN','REJECTED'].includes(row.status)||typeof row.value_text!=='string'||Number(row.excerpt_end)-Number(row.excerpt_start)!==row.value_text.length)throw new Error('FACT_RECORD_INVALID');return{id:row.id,companyId:row.company_id,key:row.fact_key,value:row.value_text,origin:row.origin,status:row.status,version:row.version,sourceId:row.source_id,sourceVersion:row.source_version,chunkIndex:row.chunk_index,page:row.page_number,excerptStart:Number(row.excerpt_start),excerptEnd:Number(row.excerpt_end),contentSha:row.content_sha||null,eligible:Number(row.eligible)===1,createdAtMs:Number(row.created_ms)};}
async function audit(connection:PoolConnection,company:string,id:string,event:string,version:string,status:string,actor:string){await connection.query('INSERT INTO autonomous_audit_logs(id,company_id,action_id,actor,event_type,details) VALUES (?,?,?,?,?,?)',[crypto.randomUUID(),company,id,actor,'KNOWLEDGE_FACT_'+event,JSON.stringify({factVersion:version,status})]);}
export async function readKnowledgeFacts(pool:Pool,company:string){return withReadOnlySqlDeadline(pool,async sql=>{const [rows]:any=await sql.query(`SELECT ${columns},${eligible} eligible FROM knowledge_facts f WHERE f.company_id=? ORDER BY f.created_at DESC,f.id DESC LIMIT 201`,[company]);if(rows.length>200)throw new KnowledgeError(409,'FACT_STORAGE_LIMIT');return rows.map(dto);});}
async function transaction<T>(pool:Pool,company:string,work:(connection:PoolConnection)=>Promise<T>){const connection=await pool.getConnection();try{await connection.beginTransaction();const [owners]:any=await connection.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[company]);if(owners.length!==1)throw new KnowledgeError(404,'WORKSPACE_NOT_FOUND');const result=await work(connection);await connection.commit();return result;}catch(error){await connection.rollback();throw error;}finally{connection.release();}}
export async function createKnowledgeFact(pool:Pool,company:string,input:unknown,actor:string){
 const parsed=createFactInput.safeParse(input);if(!parsed.success)throw new KnowledgeError(400,'FACT_INPUT_INVALID');const data=parsed.data;
 return transaction(pool,company,async connection=>{
  let chunk:any=null;if(data.source){const [sources]:any=await connection.query("SELECT *,CAST(revision AS CHAR) version FROM knowledge_sources WHERE company_id=? AND id=? AND extraction_state='EXTRACTED' AND approved_at IS NOT NULL FOR UPDATE",[company,data.source.id]);if(sources.length!==1||sources[0].version!==data.source.version)throw new KnowledgeError(409,'FACT_SOURCE_CHANGED');originalKnowledgeBytes(sources[0]);const chunks=JSON.parse(sources[0].chunks_json||'[]');chunk=chunks.find((row:any)=>typeof row.text==='string'&&row.text.includes(data.value));if(!chunk)throw new KnowledgeError(400,'FACT_VALUE_NOT_IN_SOURCE');}
  const [same]:any=await connection.query("SELECT id FROM knowledge_facts WHERE company_id=? AND fact_key=? AND CAST(value_text AS BINARY)=CAST(? AS BINARY) AND origin=? AND source_id<=>? AND source_revision<=>CAST(? AS UNSIGNED) AND status IN ('DRAFT','APPROVED') LIMIT 1",[company,data.key,data.value,data.source?'SOURCE':'MANUAL',data.source?.id||null,data.source?.version||null]);if(same.length)return{id:same[0].id,reused:true};
  const [budget]:any=await connection.query('SELECT COUNT(*) count FROM knowledge_facts WHERE company_id=?',[company]);if(Number(budget[0].count)>=200)throw new KnowledgeError(409,'FACT_STORAGE_LIMIT');
  const id='kf_'+crypto.randomUUID().replaceAll('-','');await connection.query('INSERT INTO knowledge_facts(id,company_id,fact_key,value_text,origin,source_id,source_revision,chunk_index,page_number,excerpt_start,excerpt_end) VALUES (?,?,?,?,?,?,?,?,?,?,?)',[id,company,data.key,data.value,data.source?'SOURCE':'MANUAL',data.source?.id||null,data.source?.version||null,chunk?.index??null,chunk?.page??null,chunk?.text.indexOf(data.value)??0,(chunk?.text.indexOf(data.value)??0)+data.value.length]);await audit(connection,company,id,'CREATED','0','DRAFT',actor);return{id,reused:false};
 });
}
export async function changeKnowledgeFact(pool:Pool,company:string,id:string,kind:'approve'|'withdraw'|'reject'|'delete',input:unknown,actor:string){
 const parsed=factCommandInput.safeParse(input);if(!/^kf_[a-f0-9]{32}$/.test(id)||!parsed.success||kind!=='approve'&&parsed.data.replace!==undefined)throw new KnowledgeError(400,'FACT_COMMAND_INVALID');const command=parsed.data;
 return transaction(pool,company,async connection=>{
  const [rows]:any=await connection.query(`SELECT ${columns},${eligible} eligible FROM knowledge_facts f WHERE f.company_id=? AND f.id=? FOR UPDATE`,[company,id]);
  if(rows.length!==1)throw new KnowledgeError(404,'FACT_NOT_FOUND');const fact=rows[0];if(fact.version!==command.expectedVersion||BigInt(fact.version)>=18446744073709551615n)throw new KnowledgeError(409,'FACT_CHANGED');
  const version=String(BigInt(fact.version)+1n);
  if(kind==='approve'){
   if(fact.status!=='DRAFT'||Number(fact.eligible)!==1)throw new KnowledgeError(409,'FACT_NOT_REVIEWABLE');
   if(fact.origin==='SOURCE'){const [source]:any=await connection.query('SELECT *,CAST(revision AS CHAR) version FROM knowledge_sources WHERE company_id=? AND id=? FOR UPDATE',[company,fact.source_id]);if(source.length!==1||source[0].version!==fact.source_version||!source[0].approved_at||source[0].extraction_state!=='EXTRACTED')throw new KnowledgeError(409,'FACT_SOURCE_CHANGED');originalKnowledgeBytes(source[0]);}
   const [others]:any=await connection.query("SELECT id,origin,value_text,CAST(revision AS CHAR) version FROM knowledge_facts WHERE company_id=? AND fact_key=? AND id<>? AND status='APPROVED' FOR UPDATE",[company,fact.fact_key,id]);
   const conflicts=others.filter((row:any)=>row.value_text!==fact.value_text);
   if(fact.origin==='SOURCE'&&conflicts.some((row:any)=>row.origin==='MANUAL'))throw new KnowledgeError(409,'MANUAL_FACT_PRECEDENCE');
   const replace=command.replace||[];
   if(new Set(replace.map(row=>row.id)).size!==replace.length||replace.length!==conflicts.length||conflicts.some((row:any)=>!replace.some(item=>item.id===row.id&&item.version===row.version)))throw new KnowledgeError(409,'FACT_CONFLICT_REVIEW_REQUIRED');
   for(const conflict of conflicts){if(BigInt(conflict.version)>=18446744073709551615n)throw new KnowledgeError(409,'FACT_CHANGED');await connection.query("UPDATE knowledge_facts SET status='WITHDRAWN',revision=revision+1 WHERE company_id=? AND id=?",[company,conflict.id]);await audit(connection,company,conflict.id,'WITHDRAWN',String(BigInt(conflict.version)+1n),'WITHDRAWN',actor);}
  }else if(kind==='withdraw'&&fact.status!=='APPROVED'||kind==='reject'&&fact.status!=='DRAFT')throw new KnowledgeError(409,'FACT_CHANGED');
  const status=kind==='approve'?'APPROVED':kind==='withdraw'?'WITHDRAWN':kind==='reject'?'REJECTED':'DELETED';
  if(kind==='delete')await connection.query('DELETE FROM knowledge_facts WHERE company_id=? AND id=?',[company,id]);else await connection.query('UPDATE knowledge_facts SET status=?,revision=? WHERE company_id=? AND id=?',[status,version,company,id]);
  await audit(connection,company,id,status,version,status,actor);return{version};
 });
}
