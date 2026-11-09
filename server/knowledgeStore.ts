import crypto from 'node:crypto';
import type {Pool} from 'mysql2/promise';
import {SOURCE_MAX_BYTES,type KnowledgeSource} from '../shared/knowledge';
import type {ExtractedSource} from './knowledgeExtraction';
export class KnowledgeError extends Error{constructor(public status:number,public code:string){super(code);}}
const metadata='id,company_id,filename,media_type,byte_size,content_sha,extraction_state,extraction_code,CAST(revision AS CHAR) revision,approved_at,UNIX_TIMESTAMP(created_at)*1000 created_ms';
export const sourceDto=(row:any):KnowledgeSource=>({id:row.id,companyId:row.company_id,filename:row.filename,mediaType:row.media_type,byteSize:Number(row.byte_size),contentSha:row.content_sha,state:row.extraction_state,code:row.extraction_code,version:String(row.revision),approved:row.approved_at!=null,createdAtMs:Number(row.created_ms)});
export async function listKnowledgeSources(pool:Pool,company:string){const [rows]:any=await pool.query(`SELECT ${metadata} FROM knowledge_sources WHERE company_id=? ORDER BY created_at DESC,id DESC LIMIT 50`,[company]);return rows.map(sourceDto);}
export async function storeKnowledgeSource(pool:Pool,company:string,name:string,bytes:Buffer){
 if(!name.trim()||name.length>255||/[\x00-\x1f/\\]/.test(name)||!bytes.length||bytes.length>SOURCE_MAX_BYTES)throw new KnowledgeError(400,'SOURCE_INPUT_INVALID');
 const extension=name.split('.').at(-1)?.toLowerCase(),mime=({pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',txt:'text/plain',md:'text/markdown'} as any)[extension!];
 if(!mime)throw new KnowledgeError(415,'SOURCE_TYPE_UNSUPPORTED');
 const id='ks_'+crypto.randomUUID().replaceAll('-',''),hash=crypto.createHash('sha256').update(bytes).digest('hex'),connection=await pool.getConnection();
 try{await connection.beginTransaction();const [owner]:any=await connection.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[company]);if(owner.length!==1)throw new KnowledgeError(404,'WORKSPACE_NOT_FOUND');
  const [existing]:any=await connection.query('SELECT id,content_bytes FROM knowledge_sources WHERE company_id=? AND content_sha=?',[company,hash]);
  if(existing.length){if(!Buffer.from(existing[0].content_bytes).equals(bytes))throw new KnowledgeError(409,'SOURCE_HASH_CONFLICT');await connection.commit();return {id:existing[0].id as string,reused:true};}
  const [budget]:any=await connection.query('SELECT COUNT(*) count,COALESCE(SUM(byte_size),0) bytes FROM knowledge_sources WHERE company_id=?',[company]);if(Number(budget[0].count)>=50||Number(budget[0].bytes)+bytes.length>32*1024*1024)throw new KnowledgeError(409,'SOURCE_STORAGE_LIMIT');
  await connection.query('INSERT INTO knowledge_sources(id,company_id,filename,media_type,byte_size,content_sha,content_bytes) VALUES (?,?,?,?,?,?,?)',[id,company,name.trim(),mime,bytes.length,hash,bytes]);await connection.commit();return {id,reused:false};
 }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}
export async function claimKnowledgeExtraction(pool:Pool,company:string,id:string){
 const connection=await pool.getConnection();try{await connection.beginTransaction();const [rows]:any=await connection.query(`SELECT *,CAST(revision AS CHAR) version,claimed_at<DATE_SUB(NOW(),INTERVAL 10 MINUTE) stale FROM knowledge_sources WHERE company_id=? AND id=? FOR UPDATE`,[company,id]);
  if(rows.length!==1)throw new KnowledgeError(404,'SOURCE_NOT_FOUND');const row=rows[0];if(row.extraction_state==='PROCESSING'&&Number(row.stale)!==1)throw new KnowledgeError(409,'EXTRACTION_IN_PROGRESS');
  if(BigInt(row.version)>=18446744073709551614n)throw new KnowledgeError(409,'SOURCE_REVISION_EXHAUSTED');
  const version=String(BigInt(row.version)+1n);await connection.query("UPDATE knowledge_sources SET extraction_state='PROCESSING',extraction_code=NULL,extracted_text=NULL,chunks_json=NULL,approved_by=NULL,approved_at=NULL,revision=?,claimed_at=NOW() WHERE company_id=? AND id=?",[version,company,id]);await connection.commit();return {filename:row.filename,bytes:Buffer.from(row.content_bytes),version};
 }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}
export async function settleKnowledgeExtraction(pool:Pool,company:string,id:string,version:string,result:ExtractedSource){
 const [updated]:any=await pool.query("UPDATE knowledge_sources SET extraction_state=?,extraction_code=?,extracted_text=?,chunks_json=?,revision=revision+1,claimed_at=NULL WHERE company_id=? AND id=? AND revision=? AND extraction_state='PROCESSING'",[result.state,result.code,result.text,result.chunks.length?JSON.stringify(result.chunks):null,company,id,version]);
 if(updated.affectedRows!==1)throw new KnowledgeError(409,'SOURCE_EXTRACTION_CHANGED');
}
export async function approveKnowledgeSource(pool:Pool,company:string,id:string,actor:string,version:string){
 const [updated]:any=await pool.query("UPDATE knowledge_sources SET approved_by=?,approved_at=NOW(),revision=revision+1 WHERE company_id=? AND id=? AND revision=? AND extraction_state='EXTRACTED' AND extracted_text IS NOT NULL AND approved_at IS NULL",[actor,company,id,version]);if(updated.affectedRows!==1)throw new KnowledgeError(409,'SOURCE_APPROVAL_CHANGED');
}
export async function withdrawKnowledgeApproval(pool:Pool,company:string,id:string,version:string){const [result]:any=await pool.query("UPDATE knowledge_sources SET approved_by=NULL,approved_at=NULL,revision=revision+1 WHERE company_id=? AND id=? AND revision=? AND approved_at IS NOT NULL",[company,id,version]);if(result.affectedRows!==1)throw new KnowledgeError(409,'SOURCE_APPROVAL_CHANGED');}
export async function deleteKnowledgeSource(pool:Pool,company:string,id:string,version:string){const [result]:any=await pool.query('DELETE FROM knowledge_sources WHERE company_id=? AND id=? AND revision=?',[company,id,version]);if(result.affectedRows!==1)throw new KnowledgeError(409,'SOURCE_DELETE_CHANGED');}
export async function downloadKnowledgeSource(pool:Pool,company:string,id:string){const [rows]:any=await pool.query('SELECT filename,content_bytes,content_sha FROM knowledge_sources WHERE company_id=? AND id=?',[company,id]);if(rows.length!==1)throw new KnowledgeError(404,'SOURCE_NOT_FOUND');return rows[0];}
export async function previewKnowledgeSource(pool:Pool,company:string,id:string){const [rows]:any=await pool.query(`SELECT ${metadata},chunks_json FROM knowledge_sources WHERE company_id=? AND id=?`,[company,id]);if(rows.length!==1)throw new KnowledgeError(404,'SOURCE_NOT_FOUND');return {source:sourceDto(rows[0]),chunks:JSON.parse(rows[0].chunks_json||'[]')};}
export async function readKnowledgeExcerpts(pool:Pool,company:string){const [rows]:any=await pool.query("SELECT id,filename,content_sha,CAST(revision AS CHAR) revision,chunks_json FROM knowledge_sources WHERE company_id=? AND extraction_state='EXTRACTED' AND approved_at IS NOT NULL ORDER BY created_at DESC,id DESC LIMIT 21",[company]);return {truncated:rows.length>20,rows:rows.slice(0,20).map((row:any)=>({...row,chunks:JSON.parse(row.chunks_json||'[]')}))};}
