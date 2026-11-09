import {createHash} from 'node:crypto';
import type {Pool} from 'mysql2/promise';
import {z} from 'zod';
import {normalizeContentPost,insertContentPost} from './contentPostWriter';
import {publishingSourceVersion} from './publishingSource';
import {PublishingReviewError} from './publishingReview';
export const publicationDraftInput=z.object({
 requestKey:z.string().regex(/^[a-f0-9]{64}$/),
 content:z.string().trim().min(1).max(5000),
 imageUrl:z.string().trim().url().max(2048).optional(),
 platforms:z.array(z.enum(['facebook','instagram'])).min(1).max(2).refine(v=>new Set(v).size===v.length),
}).strict().refine(v=>!v.platforms.includes('instagram') || !!v.imageUrl,{message:'Instagram requires an image'});
export type PublicationDraftInput=z.infer<typeof publicationDraftInput>;
export async function preparePublicationDraft(pool:Pool,company:string,actor:string,input:PublicationDraftInput){
 const parsed=publicationDraftInput.parse(input);
 if(!company||company.length>64||!actor||actor.length>64)throw new PublishingReviewError(400,'Invalid draft scope');
 const targets=[...parsed.platforms].sort();
 const hash=createHash('sha256').update(JSON.stringify([parsed.content,parsed.imageUrl || '',targets])).digest('hex');
 const connection=await pool.getConnection();
 try{
  await connection.beginTransaction();
  await connection.query(`INSERT INTO publication_draft_intents (company_id,request_key,input_hash,actor_id) VALUES (?,?,?,?)
    ON DUPLICATE KEY UPDATE request_key = VALUES(request_key)`,[company,parsed.requestKey,hash,actor]);
  const [intents]:any=await connection.query('SELECT input_hash,post_id FROM publication_draft_intents WHERE company_id = ? AND request_key = ? FOR UPDATE',[company,parsed.requestKey]);
  const intent=intents[0];
  if(intent.input_hash!==hash)throw new PublishingReviewError(409,'Draft intent already belongs to different content or targets');
  let post,reused=false;
  if(intent.post_id){
   const [posts]:any=await connection.query('SELECT * FROM content_posts WHERE id = ? AND company_id = ? FOR UPDATE',[intent.post_id,company]);
   if(!posts[0])throw new PublishingReviewError(409,'Draft reference unavailable. Review history before creating another intent.');
   post=posts[0];
   for(const field of ['platforms','hashtags'])post[field]=typeof post[field]==='string'?JSON.parse(post[field]):post[field] || [];
   reused=true;
  }else{
   post=normalizeContentPost({company_id:company,title:'Meta publication',type:'offer',caption:parsed.content,image_url:parsed.imageUrl,platforms:targets,status:'draft'});
   await insertContentPost(connection,post);
   await connection.query('UPDATE publication_draft_intents SET post_id = ? WHERE company_id = ? AND request_key = ?',[post.id,company,parsed.requestKey]);
  }
  const intended=normalizeContentPost({id:post.id,company_id:company,title:'Meta publication',type:'offer',caption:parsed.content,image_url:parsed.imageUrl,platforms:targets,status:post.status});
  intended.workflow_revision=post.workflow_revision;
  intended.scheduled_date=post.scheduled_date;intended.scheduled_time=post.scheduled_time;intended.time_slot=post.time_slot;
  if(publishingSourceVersion(intended)!==publishingSourceVersion(post))throw new PublishingReviewError(409,'Stored intent content changed. Review the stored post before publishing.');
  await connection.commit();
  return {post,sourceVersion:publishingSourceVersion(post),reused};
 }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}
