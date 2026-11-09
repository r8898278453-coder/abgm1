import {controlHistoryQuery} from './publicationControlHistory';
import type {Express,Request} from 'express';
import type {DbUser} from './db';
import {scopedControlInput} from './publicationScopedControls';
import {PublishingReviewError} from './publishingReview';
export function registerPublicationControls(app:Express,deps:{
 getAuthUserFromRequest:(req:Request)=>Promise<DbUser|null>;
 verifyCompanyWorkspaceAccess:(user:DbUser,company:string)=>Promise<{authorized:boolean;status:number;error?:string}>;
 read:(company:string)=>Promise<any>;
 history:(company:string,before?:string)=>Promise<any>;
 update:(company:string,actor:string,input:any)=>Promise<any>;
}){
 app.get('/api/companies/:companyId/publication-controls/history',async(req,res)=>{
  try{
   const user=await deps.getAuthUserFromRequest(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
   const query=controlHistoryQuery.safeParse(req.query);if(!query.success||req.params.companyId.length>64){res.status(400).json({success:false,error:'Invalid workspace or control history cursor'});return;}
   const access=await deps.verifyCompanyWorkspaceAccess(user,req.params.companyId);if(!access.authorized){res.status(access.status).json({success:false,error:access.error});return;}
   res.json({success:true,...await deps.history(req.params.companyId,query.data.before)});
  }catch(error){res.status(error instanceof PublishingReviewError?error.status:503).json({success:false,error:error instanceof PublishingReviewError?error.message:'Publication control history unavailable'});}
 });
 for(const method of ['get','patch'] as const)app[method]('/api/companies/:companyId/publication-controls',async(req,res)=>{
  try{
   const user=await deps.getAuthUserFromRequest(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
   if(req.params.companyId.length>64){res.status(400).json({success:false,error:'Invalid workspace'});return;}
   const access=await deps.verifyCompanyWorkspaceAccess(user,req.params.companyId);if(!access.authorized){res.status(access.status).json({success:false,error:access.error});return;}
   if(method==='get'){res.json({success:true,controls:await deps.read(req.params.companyId)});return;}
   const input=scopedControlInput.safeParse(req.body);if(!input.success){res.status(400).json({success:false,error:'Current version, boolean pause and distinct supported channels required'});return;}
   res.json({success:true,controls:await deps.update(req.params.companyId,user.id,input.data)});
  }catch(error){res.status(error instanceof PublishingReviewError?error.status:503).json({success:false,error:error instanceof PublishingReviewError?error.message:'Publication controls unavailable; reload before retrying'});}
 });
}
