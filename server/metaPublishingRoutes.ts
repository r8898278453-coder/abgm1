import {publishingSourceVersion} from './publishingSource';
import type { Express, Request } from 'express';
import type { DbUser, DbContentPost } from './db';
import type { executePublishingJob } from './publishingEngine';
import { metaPublishSchema } from './validation';

/** Compatibility endpoint uses stored content and the same claim-protected publisher as queue workers. */
export function registerMetaPublishing(app: Express, deps: {
  getAuthUserFromRequest: (req: Request) => Promise<DbUser | null>;
  verifyCompanyWorkspaceAccess: (user: DbUser, company: string) => Promise<{authorized:boolean;status:number;error?:string}>;
  getPostById: (id:string) => Promise<DbContentPost|null>;
  executePublishingJob: typeof executePublishingJob;
}) {
  app.post('/api/meta/publish-post',async(req,res)=>{
    try {
      const user=await deps.getAuthUserFromRequest(req);
      if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
      const parsed=metaPublishSchema.safeParse(req.body);
      if(!parsed.success){res.status(400).json({success:false,error:'Explicit workspace, stored post and valid Meta targets are required'});return;}
      const body=parsed.data;
      const access=await deps.verifyCompanyWorkspaceAccess(user,body.companyId);
      if(!access.authorized){res.status(access.status).json({success:false,error:access.error});return;}
      const post=await deps.getPostById(body.postId);
      if(!post || post.company_id!==body.companyId){res.status(404).json({success:false,error:'Content post not found in this workspace'});return;}
      if(body.expectedVersion && body.expectedVersion!==publishingSourceVersion(post)){res.status(409).json({success:false,error:'Stored content or approval state changed. Review before publishing.'});return;}
      const storedTargets=[...new Set(post.platforms?.length ? post.platforms : [post.channel || 'google'])].sort();
      const targets=[...new Set(body.platforms)].sort();
      if(post.caption!==body.content || (body.caption!==undefined && body.caption!==post.caption) ||
        (post.image_url || '')!==(body.imageUrl || '') || (post.video_url || '')!==(body.videoUrl || '') || JSON.stringify(storedTargets)!==JSON.stringify(targets)) {
        res.status(409).json({success:false,error:'Save changed content or targets as a new post before publishing'});return;
      }
      const result=await deps.executePublishingJob(post,{triggeredBy:user.id,expectedVersion:body.expectedVersion});
      const success=['PUBLISHED','SKIPPED_ALREADY_PUBLISHED'].includes(result.overallStatus);
      const results=Object.fromEntries(result.platformResults.map(row=>[row.platform,{success:row.status==='PUBLISHED',id:row.providerPostId || undefined,error:row.errorMessage || undefined}]));
      res.status(result.overallStatus==='IN_PROGRESS'?202:200).json({success,status:result.overallStatus,postId:post.id,results,message:result.message});
    } catch {res.status(500).json({success:false,error:'Unable to process stored Meta publication'});}
  });
}
