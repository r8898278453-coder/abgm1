import {checkReelStorage} from './reelStorage';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import type {Pool,PoolConnection} from 'mysql2/promise';
import {z} from 'zod';
import type {DbJobQueue} from './db';
import type {JobExecutionResult} from './jobQueueService';
import {agencyClientAccess} from './agencyPolicy';
import {appendQueueEvent} from './queueEvents';
import {completeSqlJob,failSqlJob,deferSqlJob,renewSqlJobLease} from './queueSql';
import {approvedRenderAssets,verifyRenderAssetRefs,RenderError,renderHash} from './renderAssets';
import {reelRenderInput} from './renderInputPolicy';
import {isGlobalEmergencyStopActive} from './autonomousEngine';
import {renderReelInProcess} from './reelProcess';

const kind='reel_render';
export const reelJobId=(value:unknown):value is string=>typeof value==='string'&&/^reel_[a-f0-9]{32}$/.test(value);
const sceneSchema=reelRenderInput.shape.reelScript;
const snapshotSchema=z.object({version:z.literal(1),actorId:z.string().min(1).max(64),requestHash:z.string().regex(/^[a-f0-9]{64}$/),businessName:z.string().min(1).max(200),primaryColor:z.string().regex(/^#[a-fA-F0-9]{6}$/),scenes:sceneSchema,assets:z.array(z.object({id:z.string().min(1).max(64),url:z.string().max(2048),asset_type:z.enum(['photo','logo']),revision:z.string().regex(/^[1-9][0-9]{0,14}$/),hash:z.string().regex(/^[a-f0-9]{64}$/)}).strict()).max(4)}).strict();
const decode=(v:any)=>typeof v==='string'?JSON.parse(v):v;
export function reelJobDto(row:any){const result=decode(row.result)||{};return{id:row.id,companyId:row.company_id,status:({QUEUED:'pending',RETRY_WAIT:'pending',RUNNING:'rendering',SUCCEEDED:'completed',FAILED:'failed',CANCELLED:'cancelled'} as any)[row.status]||'failed',progress:row.status==='SUCCEEDED'?100:row.status==='RUNNING'?null:0,createdAt:Number(row.created_ms),updatedAt:Number(row.updated_ms),scenesCount:3,...(row.status==='SUCCEEDED'?{videoUrl:result.videoUrl,filename:result.filename,sizeBytes:result.sizeBytes,durationSeconds:result.durationSeconds}:{}),...(row.error_message?{error:row.status==='FAILED'?'REEL_RENDER_FAILED':row.status==='RETRY_WAIT'?'REEL_WAITING_FOR_CAPACITY':undefined}:{})};}
export async function renderLockName(sql:Pick<Pool,'query'>,purpose:string){const [rows]:any=await sql.query('SELECT DATABASE() db');return 'abgm1:reel:'+purpose+':'+renderHash(rows[0].db).slice(0,24);}
async function activeActor(sql:Pick<Pool,'query'>,company:string,actorId:string){const [users]:any=await sql.query('SELECT id,is_platform_admin FROM users WHERE id=?',[actorId]);if(users.length!==1)throw new RenderError(403,'REEL_ACTOR_REVOKED');const access=await agencyClientAccess(sql,users[0],company,'write');if(!access.authorized)throw new RenderError(access.status,'REEL_ACTOR_REVOKED');}
export async function enqueueReel(pool:Pool,root:string,actor:string,input:z.infer<typeof reelRenderInput>,key:string){
 if(!/^[a-f0-9]{64}$/.test(key))throw new RenderError(400,'REEL_REQUEST_KEY_REQUIRED');
 const {companyName:_,...intent}=input,hash=renderHash(JSON.stringify(intent)),c=await pool.getConnection();let lock='';
 try{lock=await renderLockName(c,'admit');const [got]:any=await c.query('SELECT GET_LOCK(?,0) acquired',[lock]);if(Number(got[0].acquired)!==1)throw new RenderError(409,'REEL_ADMISSION_BUSY');
 await c.beginTransaction();const [companies]:any=await c.query('SELECT id,name FROM companies WHERE id=? FOR UPDATE',[input.companyId]);if(companies.length!==1)throw new RenderError(404,'COMPANY_NOT_FOUND');input={...input,companyId:companies[0].id};await activeActor(c,input.companyId,actor);
 const [prior]:any=await c.query('SELECT *,UNIX_TIMESTAMP(created_at)*1000 created_ms,UNIX_TIMESTAMP(updated_at)*1000 updated_ms FROM job_queue WHERE company_id=? AND idempotency_key=?',[input.companyId,'reel:'+key]);if(prior.length){const payload=decode(prior[0].payload);if(prior[0].job_type!==kind||payload.requestHash!==hash||payload.actorId!==actor)throw new RenderError(409,'REEL_REQUEST_CONFLICT');await c.commit();return{job:reelJobDto(prior[0]),reused:true};}
 const [counts]:any=await c.query("SELECT COUNT(*) total,SUM(company_id=?) own FROM job_queue WHERE job_type=? AND status IN ('QUEUED','RETRY_WAIT','RUNNING')",[input.companyId,kind]);if(Number(counts[0].total)>=64||Number(counts[0].own)>=8)throw new RenderError(409,'REEL_QUEUE_FULL');
 const [profileRows]:any=await c.query('SELECT data_payload FROM company_profiles_data WHERE company_id=?',[input.companyId]);const profile=profileRows[0]?decode(profileRows[0].data_payload):{};const brand=profile?.brandKit||profile?.business?.brandKit;const color=input.primaryColor||(/^#[a-fA-F0-9]{6}$/.test(brand?.primaryColor)?brand.primaryColor:'#4f46e5');
 const approved=await approvedRenderAssets(c,root,input.companyId,input.logoUrl);
 const snapshot=snapshotSchema.parse({version:1,actorId:actor,requestHash:hash,businessName:companies[0].name.trim().slice(0,200)||'Business',primaryColor:color,scenes:input.reelScript,assets:approved.refs});
 const id='reel_'+crypto.randomBytes(16).toString('hex');await c.query("INSERT INTO job_queue(id,company_id,job_type,payload,status,attempts,max_attempts,idempotency_key,scheduled_for) VALUES (?,?,?,?,'QUEUED',0,3,?,NOW())",[id,input.companyId,kind,JSON.stringify(snapshot),'reel:'+key]);await appendQueueEvent(c,id,'JOB_QUEUED',{userId:actor});const [rows]:any=await c.query('SELECT *,UNIX_TIMESTAMP(created_at)*1000 created_ms,UNIX_TIMESTAMP(updated_at)*1000 updated_ms FROM job_queue WHERE id=?',[id]);await c.commit();return{job:reelJobDto(rows[0]),reused:false};
 }catch(error){await c.rollback();throw error;}finally{if(lock)await c.query('SELECT RELEASE_LOCK(?)',[lock]).catch(()=>{});c.release();}
}
export async function readReels(pool:Pool,company:string,id?:string){if(id!==undefined&&!reelJobId(id))throw new RenderError(400,'REEL_JOB_ID_INVALID');const [rows]:any=await pool.query(`SELECT id,company_id,status,result,error_message,UNIX_TIMESTAMP(created_at)*1000 created_ms,UNIX_TIMESTAMP(updated_at)*1000 updated_ms FROM job_queue WHERE company_id=? AND job_type=? ${id?'AND id=?':''} ORDER BY (status IN ('QUEUED','RUNNING','RETRY_WAIT')) DESC,created_at DESC,id DESC LIMIT 18`,[company,kind,...(id?[id]:[])]);return rows.map(reelJobDto);}
export async function cancelReel(pool:Pool,company:string,id:string,actor:string){if(!reelJobId(id))throw new RenderError(400,'REEL_JOB_ID_INVALID');const c=await pool.getConnection();try{await c.beginTransaction();const [rows]:any=await c.query('SELECT status FROM job_queue WHERE id=? AND company_id=? AND job_type=? FOR UPDATE',[id,company,kind]);if(!rows.length)throw new RenderError(404,'REEL_JOB_NOT_FOUND');if(rows[0].status==='CANCELLED'){await c.commit();return;}
 if(!['QUEUED','RUNNING','RETRY_WAIT'].includes(rows[0].status))throw new RenderError(409,'REEL_JOB_TERMINAL');await activeActor(c,company,actor);await c.query("UPDATE job_queue SET status='CANCELLED',locked_at=NULL,locked_by=NULL,updated_at=NOW() WHERE id=?",[id]);await appendQueueEvent(c,id,'JOB_CANCELLED',{userId:actor});await c.commit();}catch(e){await c.rollback();throw e;}finally{c.release();}}

export type ReelRenderAdapter=(options:{inputProps:any;outputPath:string;signal:AbortSignal})=>Promise<void>;
export async function executeReelJob(pool:Pool,job:DbJobQueue,options:{root?:string;render?:ReelRenderAdapter;enabled?:boolean;timeoutMs?:number;pollMs?:number}={}):Promise<JobExecutionResult>{
 const base={jobId:job.id,jobType:job.job_type},root=options.root||path.join(process.cwd(),'uploads');
 if(job.job_type!==kind||!reelJobId(job.id)||job.status!=='RUNNING'||!job.locked_by||job.attempts<1)return{...base,status:'FAILED',error:'JOB_LEASE_LOST'};
 const lease={workerId:job.locked_by,attempt:job.attempts},controller=new AbortController();let pendingInspection:Promise<void>|undefined;let slot:PoolConnection|undefined,lock='',stage='',output='',publicPath='',timer:ReturnType<typeof setInterval>|undefined,timeout:ReturnType<typeof setTimeout>|undefined;
 const ensure=async(sql:Pick<Pool,'query'>,snapshot:z.infer<typeof snapshotSchema>,bytes=false)=>{
  const [current]:any=await sql.query("SELECT j.id FROM job_queue j WHERE j.id=? AND j.company_id=? AND j.job_type=? AND j.status='RUNNING' AND j.locked_by=? AND j.attempts=? AND j.locked_at>=DATE_SUB(NOW(),INTERVAL 5 MINUTE)",[job.id,job.company_id,kind,lease.workerId,lease.attempt]);if(current.length!==1)throw new RenderError(409,'JOB_LEASE_LOST');
  if(isGlobalEmergencyStopActive())throw new RenderError(409,'GLOBAL_EMERGENCY_STOP');await activeActor(sql,job.company_id,snapshot.actorId);
  const [companies]:any=await sql.query('SELECT name FROM companies WHERE id=?',[job.company_id]);if(companies.length!==1||(companies[0].name.trim().slice(0,200)||'Business')!==snapshot.businessName)throw new RenderError(409,'REEL_BRAND_CHANGED');return verifyRenderAssetRefs(sql,root,job.company_id,snapshot.assets,bytes);
 };
 try{
  if(!(options.enabled??process.env.ENABLE_REEL_RENDERING==='true')){await deferSqlJob(pool,job.id,'REEL_RENDERING_DISABLED',lease);return{...base,status:'SKIPPED',error:'REEL_RENDERING_DISABLED'};}
  const snapshot=snapshotSchema.parse(job.payload);if(!/^[A-Za-z0-9_-]{1,64}$/.test(job.company_id))throw new RenderError(400,'REEL_PAYLOAD_INVALID');
  slot=await pool.getConnection();lock=await renderLockName(slot,'cpu');const [held]:any=await slot.query('SELECT GET_LOCK(?,0) acquired',[lock]);if(Number(held[0].acquired)!==1){slot.release();slot=undefined;await deferSqlJob(pool,job.id,'REEL_CAPACITY_BUSY',lease);return{...base,status:'SKIPPED',error:'REEL_CAPACITY_BUSY'};}
  const images=await ensure(pool,snapshot,true);
  await fs.mkdir(root,{recursive:true});const realRoot=await fs.realpath(root),companyDir=path.join(realRoot,job.company_id);await fs.mkdir(companyDir,{recursive:true});if(await fs.realpath(companyDir)!==companyDir)throw new RenderError(409,'REEL_STORAGE_INVALID');
  await checkReelStorage(realRoot,job.company_id);
  const stagingDir=path.join(companyDir,'.reel-staging');await fs.mkdir(stagingDir,{recursive:true,mode:0o700});if(await fs.realpath(stagingDir)!==stagingDir)throw new RenderError(409,'REEL_STORAGE_INVALID');
  // Only private staging directories from this renderer are eligible for orphan cleanup.
  for(const entry of await fs.readdir(stagingDir,{withFileTypes:true})){if(entry.isDirectory()&&/^reel_[a-f0-9]{32}-[a-f0-9]{32}$/.test(entry.name)){const p=path.join(stagingDir,entry.name);if((await fs.stat(p)).mtimeMs<Date.now()-24*3600*1000)await fs.rm(p,{recursive:true,force:true});}}
  stage=path.join(stagingDir,job.id+'-'+crypto.randomBytes(16).toString('hex'));await fs.mkdir(stage,{mode:0o700});output=path.join(stage,'output.mp4');
  let checking=false;const inspect=async()=>{if(checking||controller.signal.aborted)return;checking=true;try{const [owns]:any=await slot!.query('SELECT IS_USED_LOCK(?)=CONNECTION_ID() owns',[lock]);if(Number(owns[0].owns)!==1)throw new Error('REEL_CAPACITY_LOST');if(!await renewSqlJobLease(pool,job.id,lease))throw new Error('JOB_LEASE_LOST');await ensure(pool,snapshot);const stat=await fs.stat(output).catch(()=>null);if(stat&&stat.size>50*1024*1024)throw new Error('REEL_OUTPUT_LIMIT');}catch{controller.abort();}finally{checking=false;}};
  timer=setInterval(()=>{if(!pendingInspection)pendingInspection=inspect().finally(()=>{pendingInspection=undefined;});},options.pollMs??1000);timeout=setTimeout(()=>controller.abort(),options.timeoutMs??180000);timer.unref();timeout.unref();
  await (options.render||renderReelInProcess)({inputProps:{scenes:snapshot.scenes,businessName:snapshot.businessName,primaryColor:snapshot.primaryColor,...images},outputPath:output,signal:controller.signal});
  if(controller.signal.aborted)throw new RenderError(409,'REEL_RENDER_ABORTED');
  const bytes=await fs.stat(output);if(!bytes.isFile()||bytes.size<16||bytes.size>50*1024*1024)throw new RenderError(409,'REEL_OUTPUT_INVALID');const handle=await fs.open(output,'r');const header=Buffer.alloc(12);try{await handle.read(header,0,12,0);}finally{await handle.close();}if(header.toString('ascii',4,8)!=='ftyp')throw new RenderError(409,'REEL_OUTPUT_INVALID');
  const generated=path.join(companyDir,'generated');await fs.mkdir(generated,{recursive:true});if(await fs.realpath(generated)!==generated)throw new RenderError(409,'REEL_STORAGE_INVALID');await checkReelStorage(realRoot,job.company_id,bytes.size);const filename=`reel_${job.id}_${job.attempts}_${crypto.randomBytes(16).toString('hex')}.mp4`;publicPath=path.join(generated,filename);
  const result={videoUrl:`/uploads/${job.company_id}/generated/${filename}`,filename,sizeBytes:bytes.size,durationSeconds:15};
  const settled=await completeSqlJob(pool,job.id,result,lease,async c=>{await c.query('SELECT id FROM companies WHERE id=? FOR UPDATE',[job.company_id]);
   // completeSqlJob has already fenced the row to SUCCEEDED in this transaction.
   await activeActor(c,job.company_id,snapshot.actorId);const [brand]:any=await c.query('SELECT name FROM companies WHERE id=?',[job.company_id]);if(brand[0]?.name.trim().slice(0,200)!==snapshot.businessName||controller.signal.aborted||isGlobalEmergencyStopActive())throw new RenderError(409,'REEL_CONTEXT_CHANGED');await verifyRenderAssetRefs(c,root,job.company_id,snapshot.assets,true);await fs.rename(output,publicPath);
  });if(!settled)throw new RenderError(409,'JOB_LEASE_LOST');return{...base,status:'SUCCEEDED',result};
 }catch(error){
  // A lost commit acknowledgement must not remove a file referenced by a committed success.
  try{const [rows]:any=await pool.query('SELECT status,result FROM job_queue WHERE id=? AND company_id=? AND job_type=?',[job.id,job.company_id,kind]);if(rows[0]?.status==='SUCCEEDED')return{...base,status:'SUCCEEDED',result:decode(rows[0].result)};if(publicPath)await fs.rm(publicPath,{force:true});}catch{return{...base,status:'FAILED',error:'REEL_SETTLEMENT_UNCONFIRMED'};}
  const code=error instanceof RenderError?error.code:controller.signal.aborted?'REEL_RENDER_ABORTED':'REEL_RENDER_FAILED';await failSqlJob(pool,job.id,code,false,lease);return{...base,status:'FAILED',error:code};
 }finally{if(timer)clearInterval(timer);if(timeout)clearTimeout(timeout);controller.abort();await pendingInspection;if(stage)await fs.rm(stage,{recursive:true,force:true}).catch(()=>{});if(slot){if(lock)await slot.query('SELECT RELEASE_LOCK(?)',[lock]).catch(()=>{});slot.release();}}
}
