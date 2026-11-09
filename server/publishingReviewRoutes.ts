import type { Express,Request } from 'express';
import type { DbUser } from './db';
import { PublishingReviewError,publishingReviewInput,validateReviewBefore,type PublishingReviewInput } from './publishingReview';
export function registerPublishingReview(app:Express,deps:{
  getAuthUserFromRequest:(req:Request)=>Promise<DbUser|null>;
  verifyCompanyWorkspaceAccess:(user:DbUser,id:string)=>Promise<{authorized:boolean;status:number;error?:string}>;
  read:(company:string,post:string,before?:string)=>Promise<unknown>;
  append:(company:string,post:string,actor:string,input:PublishingReviewInput)=>Promise<unknown>;
}){
  const path='/api/companies/:companyId/posts/:postId/publishing-review';
  for(const method of ['get','post'] as const)app[method](path,async(req,res)=>{
    try{
      const user=await deps.getAuthUserFromRequest(req);
      if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
      if(req.params.companyId.length>64 || req.params.postId.length>64){res.status(400).json({success:false,error:'Invalid workspace or post identifier'});return;}
      const access=await deps.verifyCompanyWorkspaceAccess(user,req.params.companyId);
      if(!access.authorized){res.status(access.status).json({success:false,error:access.error});return;}
      if(method==='get'){
        const before=validateReviewBefore(req.query.before);
        res.json({success:true,review:await deps.read(req.params.companyId,req.params.postId,before)});
      }else{
        const input=publishingReviewInput.safeParse(req.body);
        if(!input.success){res.status(400).json({success:false,error:'Valid observation, evidence and current version required'});return;}
        res.status(201).json({success:true,...await deps.append(req.params.companyId,req.params.postId,user.id,input.data) as object});
      }
    }catch(error){
      if(error instanceof PublishingReviewError)res.status(error.status).json({success:false,error:error.message});
      else res.status(500).json({success:false,error:'Publishing review unavailable'});
    }
  });
}
