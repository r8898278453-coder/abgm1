import {randomUUID} from 'node:crypto';
import type {Pool} from 'mysql2/promise';
import {z} from 'zod';
import type {DbContentPost} from './db';
import {loadPublishingReviewContext,PublishingReviewError} from './publishingReview';
import {withReadOnlySqlDeadline} from './readOnlySqlDeadline';
import type {MetaCheckConnection,MetaCheckResult} from './metaPublicationVerification';
export const metaVerificationInput=z.object({expectedVersion:z.string().regex(/^[a-f0-9]{64}$/),platform:z.enum(['facebook','instagram']),providerPostId:z.string().max(128).regex(/^\d+(?:_\d+)?$/)}).strict().refine(value=>value.platform!=='instagram'||/^\d+$/.test(value.providerPostId));
export type MetaVerificationInput=z.infer<typeof metaVerificationInput>;
export async function prepareMetaVerification(pool:Pool,company:string,postId:string,request:MetaVerificationInput,decode:(value:Record<string,any>)=>Record<string,any>){
  const input=metaVerificationInput.parse(request);
  return withReadOnlySqlDeadline(pool,async sql=>{
    const context=await loadPublishingReviewContext(sql,company,postId);
    if(context.version!==input.expectedVersion)throw new PublishingReviewError(409,'Publishing evidence changed. Reload before checking provider.');
    if(!context.needsReview || !context.platforms.includes(input.platform))throw new PublishingReviewError(409,'Current claim or target is not eligible for this verification');
    const [posts]:any=await sql.query('SELECT id,company_id,title,headline,caption,cta,hashtags,image_url,video_url,status FROM content_posts WHERE id = ? AND company_id = ?',[postId,company]);
    const post=posts[0];
    try{post.hashtags=typeof post.hashtags==='string'?JSON.parse(post.hashtags):post.hashtags || [];if(!Array.isArray(post.hashtags))throw new Error();}catch{throw new PublishingReviewError(409,'Stored publishing text requires repair');}
    const [integrations]:any=await sql.query("SELECT company_id,provider,status,credentials,SHA2(JSON_ARRAY(id,status,credentials,config),256) AS version FROM company_integrations WHERE company_id = ? AND provider = 'meta_social'",[company]);
    const integration=integrations[0];
    let connection:MetaCheckConnection|null=null;
    if(integration){
      let credentials;try{credentials=decode(typeof integration.credentials==='string'?JSON.parse(integration.credentials):integration.credentials || {});}catch{throw new PublishingReviewError(409,'Stored integration credentials unavailable');}
      connection={company_id:integration.company_id,provider:integration.provider,status:integration.status,credentials};
    }
    return {context,input,post:post as DbContentPost,connection,integrationVersion:integration?.version || 'MISSING'};
  });
}
export type MetaVerificationSnapshot=Awaited<ReturnType<typeof prepareMetaVerification>>;
export async function recordMetaVerification(pool:Pool,snapshot:MetaVerificationSnapshot,actor:string,result:MetaCheckResult){
  if(!actor||actor.length>64||result.platform!==snapshot.input.platform||result.providerObjectId!==snapshot.input.providerPostId)throw new Error('INVALID_VERIFICATION_CONTEXT');
  const connection=await pool.getConnection();
  try{
    await connection.beginTransaction();
    const {company_id:company,id:postId}=snapshot.post;
    const current=await loadPublishingReviewContext(connection,company,postId,true);
    const [integrations]:any=await connection.query("SELECT SHA2(JSON_ARRAY(id,status,credentials,config),256) AS version FROM company_integrations WHERE company_id = ? AND provider = 'meta_social' FOR UPDATE",[company]);
    const stale=current.version!==snapshot.context.version||(integrations[0]?.version || 'MISSING')!==snapshot.integrationVersion;
    const effective:MetaCheckResult=stale?{...result,status:'STALE',reason:'SOURCE_OR_CONNECTION_CHANGED'}:result;
    const id=randomUUID();
    await connection.query(`INSERT INTO publishing_verification_audit
      (id,company_id,post_id,actor_id,source_version,integration_version,platform,provider_object_id,status,reason,publication_id,account_id,provider_created_ms)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,[id,company,postId,actor,snapshot.context.version,snapshot.integrationVersion,effective.platform,effective.providerObjectId,effective.status,effective.reason,effective.publicationId || null,effective.accountId || null,effective.providerCreatedAtMs || null]);
    await connection.commit();return {id,verification:effective,resendEnabled:false,claimStateChanged:false};
  }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}
