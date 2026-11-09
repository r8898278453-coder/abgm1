import { createHash, randomUUID } from 'node:crypto';
import type { Pool, PoolConnection } from 'mysql2/promise';
import { z } from 'zod';
import { withReadOnlySqlDeadline, type ReadOnlySql } from './readOnlySqlDeadline';
export class PublishingReviewError extends Error {
  constructor(public status: number,message: string){super(message);}
}
export const publishingReviewInput=z.object({
  expectedVersion:z.string().regex(/^[a-f0-9]{64}$/),
  decision:z.enum(['OBSERVED_PUBLISHED','NOT_FOUND','UNRESOLVED']),
  platform:z.string().trim().min(1).max(64).optional(),
  providerPostId:z.string().trim().min(1).max(128).optional(),
  evidenceReference:z.string().trim().min(5).max(512),
  note:z.string().trim().max(1000).optional().default(''),
}).strict().refine(value=>value.decision==='OBSERVED_PUBLISHED' ? !!value.platform && !!value.providerPostId : !value.providerPostId,{message:'Provider identity required only for observed publication'});
export type PublishingReviewInput=z.infer<typeof publishingReviewInput>;
export function validateReviewBefore(value:unknown):string|undefined{
  if(value===undefined)return undefined;
  if(typeof value!=='string'||!/^\d{1,20}$/.test(value)||BigInt(value)<1n||BigInt(value)>18446744073709551615n)throw new PublishingReviewError(400,'Invalid review history cursor');
  return value;
}
export async function loadPublishingReviewContext(sql:ReadOnlySql,company:string,postId:string,lock=false){
  const [posts]:any=await sql.query(`SELECT status,platforms,channel,SHA2(JSON_ARRAY(title,caption,headline,cta,hashtags,platforms,image_url,video_url,workflow_revision,scheduled_date,scheduled_time,time_slot),256) AS content_version
    FROM content_posts WHERE id = ? AND company_id = ? ${lock?'FOR UPDATE':''}`,[postId,company]);
  if(!posts.length)throw new PublishingReviewError(404,'Stored post not found in this workspace');
  const [claims]:any=await sql.query(`SELECT status,claim_token,UNIX_TIMESTAMP(started_at)*1000 AS started_ms,UNIX_TIMESTAMP(updated_at) AS updated_epoch,
    (status = 'IN_PROGRESS' AND started_at < DATE_SUB(NOW(),INTERVAL 5 MINUTE)) AS stale
    FROM publishing_dispatch_claims WHERE post_id = ? AND company_id = ? ${lock?'FOR UPDATE':''}`,[postId,company]);
  if(!claims.length)throw new PublishingReviewError(404,'No publishing dispatch claim recorded');
  const [latest]:any=await sql.query('SELECT CAST(review_sequence AS CHAR) AS sequence FROM publishing_review_audit WHERE company_id = ? AND post_id = ? ORDER BY review_sequence DESC LIMIT 1',[company,postId]);
  const [evidence]:any=await sql.query(`SELECT id,platform,status,provider_post_id,attempt_count,UNIX_TIMESTAMP(updated_at) AS updated_epoch
    FROM publishing_records WHERE company_id = ? AND post_id = ? ORDER BY created_at DESC,id DESC LIMIT 21 ${lock?'FOR UPDATE':''}`,[company,postId]);
  const post=posts[0],claim=claims[0];
  let platforms:string[]=[];
  try{platforms=typeof post.platforms==='string'?JSON.parse(post.platforms):post.platforms || [];}catch{/* invalid stored targets remain non-reviewable */}
  if(!Array.isArray(platforms))platforms=[];
  platforms=[...new Set((platforms.length?platforms:[post.channel || 'google']).filter(value=>typeof value==='string').map(value=>value.toLowerCase().trim()))];
  const version=createHash('sha256').update(JSON.stringify([company,postId,post.status,post.content_version,claim.status,claim.claim_token,claim.updated_epoch,latest[0]?.sequence || '0',evidence])).digest('hex');
  return {version,startedAtMs:Number(claim.started_ms),postStatus:post.status as string,contentVersion:post.content_version as string,status:claim.status as string,needsReview:claim.status==='UNKNOWN'||Boolean(claim.stale),platforms,providerRecords:evidence.slice(0,20),providerRecordsTruncated:evidence.length>20};
}
export async function readPublishingReview(pool:Pool,company:string,postId:string,before?:string){
  validateReviewBefore(before);
  return withReadOnlySqlDeadline(pool,async sql=>{
    const current=await loadPublishingReviewContext(sql,company,postId);
    const values:any[]=[company,postId];if(before)values.push(before);
    const [history]:any=await sql.query(`SELECT id,CAST(review_sequence AS CHAR) AS sequence,actor_id,observed_claim_status,observed_post_status,observed_content_version,decision,platform,provider_post_id,evidence_reference,note,
      UNIX_TIMESTAMP(recorded_at)*1000 AS recordedAtMs
      FROM publishing_review_audit WHERE company_id = ? AND post_id = ? ${before?'AND review_sequence < ?':''} ORDER BY review_sequence DESC LIMIT 21`,values);
    const [verifications]:any=await sql.query(`SELECT id,source_version,integration_version,actor_id,platform,provider_object_id,status,reason,publication_id,account_id,provider_created_ms,
      UNIX_TIMESTAMP(recorded_at)*1000 AS recordedAtMs FROM publishing_verification_audit WHERE company_id = ? AND post_id = ? ORDER BY check_sequence DESC LIMIT 21`,[company,postId]);
    const [connections]:any=await sql.query("SELECT SHA2(JSON_ARRAY(id,status,credentials,config),256) AS version FROM company_integrations WHERE company_id = ? AND provider = 'meta_social'",[company]);
    return {...current,verifications:verifications.slice(0,20).map(({source_version,integration_version,...row}:any)=>({...row,contextCurrent:source_version===current.version && integration_version===(connections[0]?.version || 'MISSING'),recordedAtMs:Number(row.recordedAtMs)})),verificationsTruncated:verifications.length>20,history:history.slice(0,20).map((row:any)=>({...row,recordedAtMs:Number(row.recordedAtMs)})),nextBefore:history.length>20?history[19].sequence:null};
  });
}
export async function appendPublishingReview(pool:Pool,company:string,postId:string,actor:string,input:PublishingReviewInput){
  const parsed=publishingReviewInput.parse(input);
  if(!actor||actor.length>64)throw new PublishingReviewError(400,'Invalid review actor');
  const connection:PoolConnection=await pool.getConnection();
  try{
    await connection.beginTransaction();
    const current=await loadPublishingReviewContext(connection,company,postId,true);
    if(current.version!==parsed.expectedVersion)throw new PublishingReviewError(409,'Publishing evidence changed. Reload before recording a review.');
    if(!current.needsReview)throw new PublishingReviewError(409,'Only uncertain or stale publishing claims can be reviewed');
    if(parsed.platform&&!current.platforms.includes(parsed.platform))throw new PublishingReviewError(400,'Review platform is not a target of this post');
    const id=randomUUID();
    await connection.query(`INSERT INTO publishing_review_audit
      (id,company_id,post_id,actor_id,observed_version,observed_claim_status,observed_post_status,observed_content_version,decision,platform,provider_post_id,evidence_reference,note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id,company,postId,actor,parsed.expectedVersion,current.status,current.postStatus,current.contentVersion,parsed.decision,parsed.platform || null,parsed.providerPostId || null,parsed.evidenceReference,parsed.note]);
    await connection.commit();return {id,recorded:true,resendEnabled:false};
  }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}
