import {workflowHistoryQuery} from './publicationWorkflowHistory';
import type {Express,Request} from 'express';
import type {DbUser,DbContentPost} from './db';
import {workflowInput,manualPublishInput} from './publicationWorkflow';
import {PublishingReviewError} from './publishingReview';
import {publishingSourceVersion} from './publishingSource';
export function registerPublicationWorkflow(app:Express,deps:{
 getAuthUserFromRequest:(req:Request)=>Promise<DbUser|null>;
 verifyCompanyWorkspaceAccess:(user:DbUser,company:string)=>Promise<{authorized:boolean;status:number;error?:string}>;
 transition:(id:string,actor:string,input:any)=>Promise<any>;
 history:(company:string,post:string,before?:string)=>Promise<any>;
 getPostById:(id:string)=>Promise<DbContentPost|null>;
 publish:(post:DbContentPost,options:any)=>Promise<any>;
}){
 app.get('/api/companies/:companyId/posts/:postId/workflow-history',async(req,res)=>{
  try{
   const user=await deps.getAuthUserFromRequest(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
   const query=workflowHistoryQuery.safeParse(req.query);
   if(!query.success || req.params.companyId.length>64 || req.params.postId.length>64){res.status(400).json({success:false,error:'Invalid workspace, post or history cursor'});return;}
   const access=await deps.verifyCompanyWorkspaceAccess(user,req.params.companyId);if(!access.authorized){res.status(access.status).json({success:false,error:access.error});return;}
   res.json({success:true,...await deps.history(req.params.companyId,req.params.postId,query.data.before)});
  }catch(error){res.status(error instanceof PublishingReviewError?error.status:503).json({success:false,error:error instanceof PublishingReviewError?error.message:'Workflow history unavailable'});}
 });
 for(const mode of ['status','publish'] as const){
  app[mode==='status'?'patch':'post']([`/api/content-posts/:id/${mode}`,`/api/posts/:id/${mode}`],async(req,res)=>{
   try{
    const user=await deps.getAuthUserFromRequest(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
    const input=(mode==='status'?workflowInput:manualPublishInput).safeParse(req.body);
    if(!input.success||req.params.id.length>64){res.status(400).json({success:false,error:'Explicit workspace and current source version required; only draft, pending_approval or scheduled status allowed'});return;}
    const access=await deps.verifyCompanyWorkspaceAccess(user,input.data.companyId);if(!access.authorized){res.status(access.status).json({success:false,error:access.error});return;}
    if(mode==='status'){const result=await deps.transition(req.params.id,user.id,input.data);res.json({success:true,...result});return;}
    const post=await deps.getPostById(req.params.id);
    if(!post||post.company_id!==input.data.companyId){res.status(404).json({success:false,error:'Stored post not found in this workspace'});return;}
    if(publishingSourceVersion(post)!==input.data.expectedVersion){res.status(409).json({success:false,error:'Post changed. Reload before publishing.'});return;}
    const result=await deps.publish(post,{triggeredBy:user.id,expectedVersion:input.data.expectedVersion,force:(input.data as any).force});
    res.status(result.overallStatus==='IN_PROGRESS'?202:200).json({success:['PUBLISHED','SKIPPED_ALREADY_PUBLISHED'].includes(result.overallStatus),result});
   }catch(error){res.status(error instanceof PublishingReviewError?error.status:500).json({success:false,error:error instanceof PublishingReviewError?error.message:'Publication workflow unavailable'});}
  });
 }
}
