import crypto from 'node:crypto';
import type {Pool} from 'mysql2/promise';
import type {DbJobQueue} from './db';
import type {JobExecutionResult} from './jobQueueService';
import type {WebsiteImportRun,WebsiteImportOutcome} from '../shared/knowledge';
import {KnowledgeError,storeKnowledgeSourceInTransaction} from './knowledgeStore';
import {enqueueKnowledgeExtractionInTransaction} from './knowledgeIngestion';
import {appendQueueEvent} from './queueEvents';
import {completeSqlJob,failSqlJob} from './queueSql';
import {previewWebsiteImport} from './websiteImportService';
import {WebsiteImportError,websiteImportUrl} from './websiteImportPolicy';
import {withReadOnlySqlDeadline} from './readOnlySqlDeadline';

const type='website_import';
function matchesRegisteredWebsite(value:unknown,root:URL){try{return typeof value==='string'&&websiteImportUrl(value).href===root.href;}catch{return false;}}
const columns='id,company_id,status,attempts,payload,result,error_message,UNIX_TIMESTAMP(created_at)*1000 created_ms,UNIX_TIMESTAMP(updated_at)*1000 updated_ms';
const errorCodes=new Set(['ATTEMPTS_EXHAUSTED','GLOBAL_EMERGENCY_STOP','WEBSITE_IMPORT_UNCONFIRMED','WEBSITE_IMPORT_UNAVAILABLE','WEBSITE_IMPORT_CAPACITY','WEBSITE_REGISTERED_URL_CHANGED','WEBSITE_JOB_PAYLOAD_INVALID','WEBSITE_SNAPSHOT_INVALID','SOURCE_STORAGE_LIMIT','WORKSPACE_NOT_FOUND']);
const decode=(value:any)=>typeof value==='string'?JSON.parse(value):value;
function dto(row:any):WebsiteImportRun{
 const payload=decode(row.payload),outcome=decode(row.result);
 return{id:row.id,companyId:row.company_id,status:row.status,attempts:Number(row.attempts),websiteUrl:payload.websiteUrl,createdAtMs:Number(row.created_ms),updatedAtMs:Number(row.updated_ms),errorCode:row.error_message?(errorCodes.has(row.error_message)?row.error_message:'WEBSITE_IMPORT_UNCONFIRMED'):null,outcome:outcome||null};
}
export function validWebsiteRunId(id:unknown):id is string{return typeof id==='string'&&/^wi_[a-f0-9]{32}$/.test(id);}

/** Company lock serializes repeated clicks/reconnects into one active import; no network here. */
export async function enqueueWebsiteImport(pool:Pool,company:string,registered:string,actor:string){
 const root=websiteImportUrl(registered),connection=await pool.getConnection();try{
  await connection.beginTransaction();
  const [owners]:any=await connection.query('SELECT website FROM companies WHERE id=? FOR UPDATE',[company]);
  if(owners.length!==1)throw new KnowledgeError(404,'WORKSPACE_NOT_FOUND');
  let current:URL;try{current=websiteImportUrl(owners[0].website);}catch{throw new KnowledgeError(409,'REGISTERED_WEBSITE_UNSUPPORTED');}
  if(current.href!==root.href)throw new KnowledgeError(409,'WEBSITE_REGISTERED_URL_CHANGED');
  const [existing]:any=await connection.query(`SELECT ${columns} FROM job_queue WHERE company_id=? AND job_type=? AND status IN ('QUEUED','RUNNING','RETRY_WAIT') ORDER BY created_at,id LIMIT 1`,[company,type]);
  if(existing.length){if(decode(existing[0].payload)?.websiteUrl!==root.href)throw new KnowledgeError(409,'WEBSITE_IMPORT_IN_PROGRESS');await connection.commit();return{run:dto(existing[0]),reused:true};}
  const id='wi_'+crypto.randomUUID().replaceAll('-','');
  await connection.query("INSERT INTO job_queue(id,company_id,job_type,payload,status,attempts,max_attempts,idempotency_key,scheduled_for) VALUES (?,?,?,?,'QUEUED',0,3,?,NOW())",[id,company,type,JSON.stringify({websiteUrl:root.href}),id]);
  await appendQueueEvent(connection,id,'JOB_QUEUED',{userId:actor});
  const [rows]:any=await connection.query(`SELECT ${columns} FROM job_queue WHERE id=? AND company_id=?`,[id,company]);
  await connection.commit();return{run:dto(rows[0]),reused:false};
 }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}

/** Bounded authenticated metadata, including failed runs which never created a source. */
export async function readWebsiteImports(pool:Pool,company:string,before?:string){
 if(before!==undefined&&!validWebsiteRunId(before))throw new KnowledgeError(400,'WEBSITE_RUN_CURSOR_INVALID');
 return withReadOnlySqlDeadline(pool,async sql=>{
  let cursor:any;
  if(before){const [rows]:any=await sql.query('SELECT created_at,id FROM job_queue WHERE company_id=? AND job_type=? AND id=?',[company,type,before]);if(rows.length!==1)throw new KnowledgeError(409,'WEBSITE_RUN_CURSOR_UNAVAILABLE');cursor=rows[0];}
  const [rows]:any=await sql.query(`SELECT ${columns} FROM job_queue WHERE company_id=? AND job_type=? ${cursor?'AND (created_at<? OR (created_at=? AND id<?))':''} ORDER BY created_at DESC,id DESC LIMIT 11`,[company,type,...(cursor?[cursor.created_at,cursor.created_at,cursor.id]:[])]);
  const runs=rows.slice(0,10).map(dto);return{runs,nextBefore:rows.length>10?runs.at(-1)!.id:null};
 });
}

/** Cancelling a running fetch fences persistence; it cannot recall an already-open HTTP request. */
export async function cancelWebsiteImport(pool:Pool,company:string,id:string,actor:string){
 if(!validWebsiteRunId(id))throw new KnowledgeError(400,'WEBSITE_RUN_ID_INVALID');
 const connection=await pool.getConnection();try{
  await connection.beginTransaction();const [write]:any=await connection.query("UPDATE job_queue SET status='CANCELLED',locked_at=NULL,locked_by=NULL,updated_at=NOW() WHERE id=? AND company_id=? AND job_type=? AND status IN ('QUEUED','RUNNING','RETRY_WAIT')",[id,company,type]);
  if(write.affectedRows!==1)throw new KnowledgeError(409,'WEBSITE_RUN_CHANGED');
  await appendQueueEvent(connection,id,'JOB_CANCELLED',{userId:actor});await connection.commit();
 }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}

export async function executeWebsiteImportJob(pool:Pool,job:DbJobQueue,preview:typeof previewWebsiteImport=previewWebsiteImport):Promise<JobExecutionResult>{
 const base={jobId:job.id,jobType:job.job_type};
 if(job.job_type!==type||job.status!=='RUNNING'||!job.locked_by||!Number.isSafeInteger(job.attempts)||job.attempts<1)return{...base,status:'FAILED',error:'JOB_LEASE_LOST'};
 const lease={workerId:job.locked_by,attempt:job.attempts};
 try{
  if(typeof job.payload?.websiteUrl!=='string'||Object.keys(job.payload).length!==1)throw new KnowledgeError(400,'WEBSITE_JOB_PAYLOAD_INVALID');
  let root:URL;try{root=websiteImportUrl(job.payload.websiteUrl);}catch{throw new KnowledgeError(400,'WEBSITE_JOB_PAYLOAD_INVALID');}
  const current=await withReadOnlySqlDeadline(pool,async sql=>{
   const [owned]:any=await sql.query("SELECT c.website FROM job_queue j JOIN companies c ON c.id=j.company_id WHERE j.id=? AND j.company_id=? AND j.job_type=? AND j.status='RUNNING' AND j.locked_by=? AND j.attempts=? AND j.locked_at>=DATE_SUB(NOW(),INTERVAL 5 MINUTE)",[job.id,job.company_id,type,lease.workerId,lease.attempt]);
   if(owned.length!==1)throw new KnowledgeError(409,'JOB_LEASE_LOST');return owned[0].website;
  });
  if(!matchesRegisteredWebsite(current,root))throw new KnowledgeError(409,'WEBSITE_REGISTERED_URL_CHANGED');
  const snapshot=await preview(root.href);
  if(!['STATIC_PREVIEW','PARTIAL','UNAVAILABLE'].includes(snapshot.status)||snapshot.pages.length+snapshot.failures.length>3||!snapshot.pages.length&&snapshot.status!=='UNAVAILABLE'||snapshot.pages.length>0&&snapshot.status==='UNAVAILABLE')throw new KnowledgeError(400,'WEBSITE_SNAPSHOT_INVALID');
  const outcome:WebsiteImportOutcome={status:snapshot.status as WebsiteImportOutcome['status'],sourceIds:[],reusedCount:0,failures:snapshot.failures.map(f=>({url:websiteImportUrl(f.url,root.origin).href,code:/^WEBSITE_[A-Z0-9_]{1,70}$/.test(f.code)?f.code:'WEBSITE_IMPORT_UNAVAILABLE'})),truncated:snapshot.truncated};
  // No-page failure is durable and requires a new manual run; it is never a successful import.
  if(!snapshot.pages.length){const settled=await failSqlJob(pool,job.id,'WEBSITE_IMPORT_UNAVAILABLE',false,lease,async connection=>{await connection.query('UPDATE job_queue SET result=? WHERE id=?',[JSON.stringify(outcome),job.id]);});if(!settled)throw new KnowledgeError(409,'JOB_LEASE_LOST');return{...base,status:'FAILED',error:'WEBSITE_IMPORT_UNAVAILABLE',result:outcome};}
  const settled=await completeSqlJob(pool,job.id,undefined,lease,async connection=>{
   const [owners]:any=await connection.query('SELECT website FROM companies WHERE id=? FOR UPDATE',[job.company_id]);
   if(owners.length!==1)throw new KnowledgeError(404,'WORKSPACE_NOT_FOUND');
   if(!matchesRegisteredWebsite(owners[0].website,root))throw new KnowledgeError(409,'WEBSITE_REGISTERED_URL_CHANGED');
   for(const page of snapshot.pages){
    const url=websiteImportUrl(page.url,root.origin).href,name='website-'+crypto.createHash('sha256').update(url).digest('hex').slice(0,20)+'.html';
    const source=await storeKnowledgeSourceInTransaction(connection,job.company_id,name,page.originalBytes,{url,fetchedAtMs:Date.parse(page.fetchedAt),mediaType:page.contentType});
    if(!source.reused)await enqueueKnowledgeExtractionInTransaction(connection,job.company_id,source.id);
    else outcome.reusedCount++;
    if(!outcome.sourceIds.includes(source.id))outcome.sourceIds.push(source.id);
   }
   await connection.query('UPDATE job_queue SET result=? WHERE id=?',[JSON.stringify(outcome),job.id]);
  });
  if(!settled)throw new KnowledgeError(409,'JOB_LEASE_LOST');return{...base,status:'SUCCEEDED',result:outcome};
 }catch(error){
  const raw=error instanceof KnowledgeError||error instanceof WebsiteImportError?error.code:'WEBSITE_IMPORT_UNCONFIRMED',code=errorCodes.has(raw)?raw:raw==='JOB_LEASE_LOST'?raw:'WEBSITE_IMPORT_UNCONFIRMED';
  if(code!=='JOB_LEASE_LOST')try{await failSqlJob(pool,job.id,code,['WEBSITE_IMPORT_UNCONFIRMED','WEBSITE_IMPORT_CAPACITY'].includes(code),lease);}catch{/* Keep the original durable lease for recovery; never report success. */}
  return{...base,status:'FAILED',error:code};
 }
}
