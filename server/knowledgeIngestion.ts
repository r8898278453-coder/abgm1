import type {JobExecutionResult} from './jobQueueService';
import crypto from 'node:crypto';
import type {Pool,PoolConnection} from 'mysql2/promise';
import type {DbJobQueue} from './db';
import {appendQueueEvent} from './queueEvents';
import {completeSqlJob,failSqlJob,type QueueLease} from './queueSql';
import {appendKnowledgeHistory} from './knowledgeHistory';
import {KnowledgeError,originalKnowledgeBytes} from './knowledgeStore';
import {extractKnowledge} from './knowledgeExtraction';
import {validWorkspaceRevision} from '../shared/workspaceRevision';
import {withReadOnlySqlDeadline} from './readOnlySqlDeadline';
const activeJobs=new Set(['QUEUED','RUNNING','RETRY_WAIT']);
const maxRevision=18446744073709551615n;

async function reconcileInterrupted(connection:PoolConnection,source:any,job:any){
 if(BigInt(source.version)>=maxRevision)throw new KnowledgeError(409,'SOURCE_REVISION_EXHAUSTED');
 const version=String(BigInt(source.version)+1n),code=job.error_message==='SOURCE_CONTENT_CHANGED'?'SOURCE_CONTENT_CHANGED':job.status==='CANCELLED'?'INGESTION_CANCELLED':'INGESTION_INTERRUPTED';
 const [write]:any=await connection.query("UPDATE knowledge_sources SET extraction_state='FAILED',extraction_code=?,revision=?,claimed_at=NULL WHERE id=? AND company_id=? AND extraction_job_id=? AND revision=CAST(? AS UNSIGNED)",[code,version,source.id,source.company_id,source.extraction_job_id,source.version]);
 if(write.affectedRows!==1)throw new KnowledgeError(409,'SOURCE_EXTRACTION_CHANGED');
 await appendKnowledgeHistory(connection,source.company_id,source.id,'KNOWLEDGE_EXTRACTION_SETTLED',version,'FAILED','system',{jobId:source.extraction_job_id,attempt:Number(job.attempts)});return version;
}

/** Source admission, queue intent, source history and queue outbox commit together. */
export async function enqueueKnowledgeExtraction(company:string,id:string,pool:Pool,expectedVersion?:string,actor='system'):Promise<void>{
 const connection=await pool.getConnection();try{
  await connection.beginTransaction();const [rows]:any=await connection.query("SELECT *,CAST(revision AS CHAR) version,claimed_at<DATE_SUB(NOW(),INTERVAL 10 MINUTE) stale FROM knowledge_sources WHERE company_id=? AND id=? FOR UPDATE",[company,id]);
  if(rows.length!==1)throw new KnowledgeError(404,'SOURCE_NOT_FOUND');const source=rows[0];
  if(expectedVersion===undefined&&(source.extraction_state!=='STORED'||source.extraction_job_id)){await connection.commit();return;}
  if(expectedVersion!==undefined&&expectedVersion!==source.version)throw new KnowledgeError(409,'SOURCE_RETRY_CHANGED');
  if(source.extraction_job_id){const [jobs]:any=await connection.query('SELECT status,attempts,error_message FROM job_queue WHERE id=? AND company_id=?',[source.extraction_job_id,company]);if(jobs.length&&activeJobs.has(jobs[0].status))throw new KnowledgeError(409,'EXTRACTION_IN_PROGRESS');if(jobs.length&&['FAILED','CANCELLED'].includes(jobs[0].status)&&['QUEUED','PROCESSING'].includes(source.extraction_state)){if(BigInt(source.version)>maxRevision-4n)throw new KnowledgeError(409,'SOURCE_REVISION_EXHAUSTED');source.version=await reconcileInterrupted(connection,source,jobs[0]);source.extraction_state='FAILED';}}
  else if(source.extraction_state==='PROCESSING'&&Number(source.stale)!==1)throw new KnowledgeError(409,'EXTRACTION_IN_PROGRESS');
  if(BigInt(source.version)>maxRevision-3n)throw new KnowledgeError(409,'SOURCE_REVISION_EXHAUSTED');
  const version=String(BigInt(source.version)+1n),jobId='kq_'+crypto.randomUUID().replaceAll('-','');
  await connection.query("INSERT INTO job_queue(id,company_id,job_type,payload,status,attempts,max_attempts,idempotency_key,scheduled_for) VALUES (?,?,'knowledge_extract',?,'QUEUED',0,3,?,NOW())",[jobId,company,JSON.stringify({sourceId:id,sourceVersion:version}),'knowledge:'+id+':'+version]);
  await connection.query("UPDATE knowledge_sources SET extraction_state='QUEUED',extraction_code=NULL,extracted_text=NULL,chunks_json=NULL,approved_by=NULL,approved_at=NULL,claimed_at=NULL,revision=?,extraction_job_id=?,extraction_attempt=NULL WHERE company_id=? AND id=?",[version,jobId,company,id]);
  await appendKnowledgeHistory(connection,company,id,'KNOWLEDGE_EXTRACTION_QUEUED',version,'QUEUED',actor,{jobId,attempt:0});
  await appendQueueEvent(connection,jobId,'JOB_QUEUED',{userId:actor});await connection.commit();
 }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}

async function claimSource(pool:Pool,job:DbJobQueue,lease:QueueLease){
 const connection=await pool.getConnection();try{
  await connection.beginTransaction();
  const [owned]:any=await connection.query("SELECT id FROM job_queue WHERE id=? AND company_id=? AND job_type='knowledge_extract' AND status='RUNNING' AND locked_by=? AND attempts=? AND locked_at>=DATE_SUB(NOW(),INTERVAL 5 MINUTE) FOR UPDATE",[job.id,job.company_id,lease.workerId,lease.attempt]);
  if(owned.length!==1)throw new KnowledgeError(409,'JOB_LEASE_LOST');
  const input=job.payload;if(typeof input?.sourceId!=='string'||input.sourceId.length>64||!validWorkspaceRevision(input.sourceVersion))throw new KnowledgeError(400,'SOURCE_JOB_PAYLOAD_INVALID');
  const [rows]:any=await connection.query('SELECT *,CAST(revision AS CHAR) version FROM knowledge_sources WHERE company_id=? AND id=? FOR UPDATE',[job.company_id,input.sourceId]);
  if(rows.length!==1)throw new KnowledgeError(404,'SOURCE_NOT_FOUND');const source=rows[0];const bytes=originalKnowledgeBytes(source);
  if(source.extraction_job_id!==job.id)throw new KnowledgeError(409,'SOURCE_JOB_SUPERSEDED');
  if(source.extraction_state==='PROCESSING'&&Number(source.extraction_attempt)>=lease.attempt)throw new KnowledgeError(409,'SOURCE_ATTEMPT_ALREADY_RUNNING');
  if(!['QUEUED','PROCESSING','FAILED','UNSUPPORTED','NEEDS_OCR'].includes(source.extraction_state))throw new KnowledgeError(409,'SOURCE_JOB_NOT_PENDING');
  if(source.extraction_state==='QUEUED'&&source.version!==input.sourceVersion)throw new KnowledgeError(409,'SOURCE_JOB_REVISION_CHANGED');
  if(BigInt(source.version)>=maxRevision-1n)throw new KnowledgeError(409,'SOURCE_REVISION_EXHAUSTED');
  const version=String(BigInt(source.version)+1n);
  await connection.query("UPDATE knowledge_sources SET extraction_state='PROCESSING',extraction_code=NULL,extracted_text=NULL,chunks_json=NULL,approved_by=NULL,approved_at=NULL,revision=?,claimed_at=NOW(),extraction_attempt=? WHERE company_id=? AND id=?",[version,lease.attempt,job.company_id,input.sourceId]);
  await appendKnowledgeHistory(connection,job.company_id,input.sourceId,'KNOWLEDGE_EXTRACTION_STARTED',version,'PROCESSING','system',{jobId:job.id,attempt:lease.attempt});await connection.commit();
  return{version,contentSha:source.content_sha,filename:source.filename,bytes,website:source.source_url?{url:source.source_url,fetchedAtMs:Number(source.fetched_at_ms),contentType:source.media_type}:undefined};
 }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}

export async function executeKnowledgeExtractionJob(pool:Pool,job:DbJobQueue,extract:typeof extractKnowledge=extractKnowledge):Promise<JobExecutionResult>{
 const base={jobId:job.id,jobType:job.job_type};
 if(job.job_type!=='knowledge_extract'||job.status!=='RUNNING'||!job.locked_by||!Number.isSafeInteger(job.attempts)||job.attempts<1)return{...base,status:'FAILED' as const,error:'JOB_LEASE_LOST'};
 const lease={workerId:job.locked_by,attempt:job.attempts};
 try{
  const source=await claimSource(pool,job,lease),outcome=await extract(source.filename,source.bytes,source.website);
  if(!['EXTRACTED','FAILED','UNSUPPORTED','NEEDS_OCR'].includes(outcome.state)||outcome.state==='EXTRACTED'&&(!outcome.text?.trim()||!outcome.chunks.length))throw new KnowledgeError(400,'SOURCE_OUTCOME_INVALID');
  const result={sourceId:job.payload.sourceId,sourceVersion:String(BigInt(source.version)+1n),state:outcome.state,code:outcome.code};
  const project=async(connection:PoolConnection)=>{
   const [write]:any=await connection.query("UPDATE knowledge_sources SET extraction_state=?,extraction_code=?,extracted_text=?,chunks_json=?,revision=revision+1,claimed_at=NULL WHERE company_id=? AND id=? AND revision=CAST(? AS UNSIGNED) AND extraction_state='PROCESSING' AND extraction_job_id=? AND extraction_attempt=? AND content_sha=? AND CAST(content_sha AS BINARY)=CAST(SHA2(content_bytes,256) AS BINARY) AND byte_size=OCTET_LENGTH(content_bytes)",[outcome.state,outcome.code,outcome.text,outcome.chunks.length?JSON.stringify(outcome.chunks):null,job.company_id,job.payload.sourceId,source.version,job.id,lease.attempt,source.contentSha]);
   if(write.affectedRows!==1)throw new KnowledgeError(409,'SOURCE_EXTRACTION_CHANGED');
   await appendKnowledgeHistory(connection,job.company_id,job.payload.sourceId,'KNOWLEDGE_EXTRACTION_SETTLED',result.sourceVersion,outcome.state,'system',{jobId:job.id,attempt:lease.attempt});
  };
  const success=outcome.state==='EXTRACTED';const settled=success?await completeSqlJob(pool,job.id,result,lease,project):await failSqlJob(pool,job.id,'KNOWLEDGE_'+outcome.code,outcome.code==='EXTRACTION_CAPACITY',lease,project);
  if(!settled)throw new KnowledgeError(409,'JOB_LEASE_LOST');return{...base,status:success?'SUCCEEDED' as const:'FAILED' as const,result,...(success?{}:{error:'KNOWLEDGE_'+outcome.code})};
 }catch(error){
  const code=error instanceof KnowledgeError?error.code:'KNOWLEDGE_EXECUTION_UNCONFIRMED';
  if(code==='SOURCE_ATTEMPT_ALREADY_RUNNING')return{...base,status:'SKIPPED' as const,error:code};
  if(code!=='JOB_LEASE_LOST')try{await failSqlJob(pool,job.id,code,code==='KNOWLEDGE_EXECUTION_UNCONFIRMED',lease);}catch{/* No success claim; a lost/failed settlement remains recoverable under the durable lease. */}
  return{...base,status:'FAILED' as const,error:code};
 }
}

/** Bounded dispatcher recovery: stored originals survive a failed admission; terminal queue jobs cannot leave permanent fake PROCESSING. */
export async function recoverKnowledgeIngestion(pool:Pool,canStart:()=>boolean=()=>true){
 if(!canStart())return;
 const [rows]:any=await withReadOnlySqlDeadline(pool,sql=>sql.query("SELECT id,company_id,CAST(revision AS CHAR) version FROM knowledge_sources WHERE extraction_job_id IS NULL AND revision<18446744073709551613 AND (extraction_state='STORED' OR extraction_state='PROCESSING' AND claimed_at<DATE_SUB(NOW(),INTERVAL 10 MINUTE)) ORDER BY created_at,id LIMIT 5"));
 for(const row of rows){if(!canStart())break;try{await enqueueKnowledgeExtraction(row.company_id,row.id,pool,row.version);}catch{/* Concurrent admission is harmless; unchanged originals remain visible for later recovery. */}}
 if(!canStart())return;
 const [interrupted]:any=await withReadOnlySqlDeadline(pool,sql=>sql.query("SELECT s.id,s.company_id,s.extraction_job_id FROM knowledge_sources s JOIN job_queue j ON j.id=s.extraction_job_id AND j.company_id=s.company_id WHERE s.extraction_state IN ('QUEUED','PROCESSING') AND j.status IN ('FAILED','CANCELLED') ORDER BY s.updated_at,s.id LIMIT 5"));
 for(const row of interrupted){if(!canStart())break;const connection=await pool.getConnection();try{
  await connection.beginTransaction();const [jobs]:any=await connection.query("SELECT status,attempts,error_message FROM job_queue WHERE id=? AND company_id=? AND status IN ('FAILED','CANCELLED') FOR UPDATE",[row.extraction_job_id,row.company_id]);
  const [sources]:any=await connection.query("SELECT CAST(revision AS CHAR) version FROM knowledge_sources WHERE id=? AND company_id=? AND extraction_job_id=? AND extraction_state IN ('QUEUED','PROCESSING') FOR UPDATE",[row.id,row.company_id,row.extraction_job_id]);
  if(jobs.length!==1||sources.length!==1||BigInt(sources[0].version)>=maxRevision){await connection.rollback();continue;}
  await reconcileInterrupted(connection,{...row,version:sources[0].version},jobs[0]);await connection.commit();
 }catch{await connection.rollback();}finally{connection.release();}}
}
