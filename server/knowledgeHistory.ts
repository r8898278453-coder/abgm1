import {withReadOnlySqlDeadline} from './readOnlySqlDeadline';
import {KNOWLEDGE_EVENT_TYPES} from '../shared/knowledge';
import crypto from 'node:crypto';
import type {Pool,PoolConnection} from 'mysql2/promise';
import {validWorkspaceRevision} from '../shared/workspaceRevision';
export const KNOWLEDGE_EVENTS=KNOWLEDGE_EVENT_TYPES;
export type KnowledgeEvent=typeof KNOWLEDGE_EVENTS[number];
/** Existing audit ledger, inside the same transaction as the source mutation. Never copy source text/URL/bytes. */
export async function appendKnowledgeHistory(connection:PoolConnection,company:string,source:string,event:KnowledgeEvent,version:string,state:string,actor='system',job?:{jobId:string;attempt?:number}){
 if(!validWorkspaceRevision(version))throw new Error('SOURCE_HISTORY_VERSION_INVALID');
 await connection.query('INSERT INTO autonomous_audit_logs(id,company_id,action_id,actor,event_type,details) VALUES (?,?,?,?,?,?)',['kh_'+crypto.randomUUID().replaceAll('-',''),company,source,actor,event,JSON.stringify({sourceVersion:version,state,...(job?{jobId:job.jobId,...(job.attempt!==undefined?{attempt:job.attempt}:{})}:{})})]);
}
export async function readKnowledgeHistory(pool:Pool,company:string,source:string,before?:string){
 if(before!==undefined&&!validWorkspaceRevision(before))throw new Error('SOURCE_HISTORY_CURSOR_INVALID');
 const revision="CAST(JSON_UNQUOTE(JSON_EXTRACT(details,'$.sourceVersion')) AS UNSIGNED)";
 const [rows]:any=await withReadOnlySqlDeadline(pool,sql=>sql.query(`SELECT id,actor,event_type,details,UNIX_TIMESTAMP(timestamp)*1000 recorded_ms FROM autonomous_audit_logs WHERE company_id=? AND action_id=? AND event_type IN (${KNOWLEDGE_EVENTS.map(()=>'?').join(',')}) ${before!==undefined?'AND '+revision+'<CAST(? AS UNSIGNED)':''} ORDER BY ${revision} DESC,id DESC LIMIT 51`,[company,source,...KNOWLEDGE_EVENTS,...(before!==undefined?[before]:[])]));
 const states=new Set(['QUEUED','STORED','PROCESSING','EXTRACTED','NEEDS_OCR','UNSUPPORTED','FAILED','DELETED']);
 const events=rows.slice(0,50).map((row:any)=>{const details=typeof row.details==='string'?JSON.parse(row.details):row.details;if(!validWorkspaceRevision(details?.sourceVersion)||!states.has(details?.state)||!KNOWLEDGE_EVENTS.includes(row.event_type)||!Number.isFinite(Number(row.recorded_ms)))throw new Error('SOURCE_HISTORY_UNAVAILABLE');return{id:row.id,event:row.event_type,sourceVersion:details.sourceVersion,state:details.state,actor:row.actor,recordedAtMs:Number(row.recorded_ms),...(typeof details.jobId==='string'&&details.jobId.length<=64?{jobId:details.jobId}:{}),...(Number.isSafeInteger(details.attempt)&&details.attempt>=0?{attempt:details.attempt}:{})};});
 return{events,nextBeforeVersion:rows.length>50?events.at(-1)!.sourceVersion:null};
}
