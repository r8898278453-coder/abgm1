import {loadPublicationPolicy} from './publicationPolicy';
import {scheduledTimeMs} from './scheduleTime';
import {randomUUID} from 'node:crypto';
import type {Pool} from 'mysql2/promise';
import {z} from 'zod';
import {publishingSourceVersion} from './publishingSource';
import {PublishingReviewError} from './publishingReview';
const scheduleInput=z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)}).strict().refine(v=>scheduledTimeMs(v.date,v.time)!==null);
export const workflowInput=z.object({companyId:z.string().min(1).max(64),expectedVersion:z.string().regex(/^[a-f0-9]{64}$/),status:z.enum(['draft','pending_approval','scheduled']),schedule:scheduleInput.optional()}).strict().refine(v=>!v.schedule || v.status==='pending_approval',{message:'Schedule changes must return to approval'});
export const manualPublishInput=z.object({companyId:z.string().min(1).max(64),expectedVersion:z.string().regex(/^[a-f0-9]{64}$/),force:z.boolean().optional()}).strict();
export async function transitionPublication(pool:Pool,postId:string,actor:string,input:z.infer<typeof workflowInput>){
 const parsed=workflowInput.parse(input);if(!actor||actor.length>64)throw new PublishingReviewError(400,'Invalid actor');
 const connection=await pool.getConnection();
 try{
  await connection.beginTransaction();
  const [posts]:any=await connection.query('SELECT * FROM content_posts WHERE id = ? AND company_id = ? FOR UPDATE',[postId,parsed.companyId]);
  if(!posts.length)throw new PublishingReviewError(404,'Stored post not found in this workspace');
  const post=posts[0];
  if(publishingSourceVersion(post)!==parsed.expectedVersion)throw new PublishingReviewError(409,'Post changed. Reload before approving or editing status.');
  const [claims]:any=await connection.query('SELECT status FROM publishing_dispatch_claims WHERE post_id = ? FOR UPDATE',[postId]);
  if(claims.length && !['READY','FAILED'].includes(claims[0].status))throw new PublishingReviewError(409,'Dispatch state blocks status changes. Review publishing outcome first.');
  if(!['draft','pending_approval','scheduled','failed'].includes(post.status) || (post.status===parsed.status && !parsed.schedule))throw new PublishingReviewError(409,'Current post state cannot make this transition');
  const policy=await loadPublicationPolicy(connection,parsed.companyId);
  const nextPost={...post,status:parsed.status,...(parsed.schedule?{scheduled_date:parsed.schedule.date,scheduled_time:parsed.schedule.time,time_slot:parsed.schedule.time}:{})};
  if(parsed.status==='scheduled' && scheduledTimeMs(nextPost.scheduled_date,nextPost.scheduled_time,nextPost.time_slot)===null)throw new PublishingReviewError(409,'Stored schedule is invalid. Reschedule for approval first.');
  const revision=BigInt(post.workflow_revision || 0)+1n;
  const resultingVersion=publishingSourceVersion({...nextPost,workflow_revision:revision.toString()});
  await connection.query('UPDATE content_posts SET status = ?,workflow_revision = ?,scheduled_date = ?,scheduled_time = ?,time_slot = ? WHERE id = ? AND company_id = ?',[parsed.status,revision.toString(),nextPost.scheduled_date || null,nextPost.scheduled_time || null,nextPost.time_slot || null,postId,parsed.companyId]);
  const id=randomUUID();
  await connection.query(`INSERT INTO publication_workflow_audit (id,company_id,post_id,actor_id,from_status,to_status,source_version,resulting_version,change_kind,schedule_before,schedule_after,policy_version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,[id,parsed.companyId,postId,actor,post.status,parsed.status,parsed.expectedVersion,resultingVersion,parsed.schedule?'RESCHEDULE':'STATUS',parsed.schedule?JSON.stringify({date:post.scheduled_date,time:post.scheduled_time,timeSlot:post.time_slot}):null,parsed.schedule?JSON.stringify(parsed.schedule):null,policy.version]);
  await connection.commit();return {id,status:parsed.status,sourceVersion:resultingVersion};
 }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}
