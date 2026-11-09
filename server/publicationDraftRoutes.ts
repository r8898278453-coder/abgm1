import type {Express,Request} from 'express';
import type {DbUser} from './db';
import {publicationDraftInput,type PublicationDraftInput} from './publicationDraftIntents';
import {PublishingReviewError} from './publishingReview';
export function registerPublicationDrafts(app:Express,deps:{
 getAuthUserFromRequest:(req:Request)=>Promise<DbUser|null>;
 verifyCompanyWorkspaceAccess:(user:DbUser,company:string)=>Promise<{authorized:boolean;status:number;error?:string}>;
 prepare:(company:string,actor:string,input:PublicationDraftInput)=>Promise<any>;
}){
 app.post('/api/companies/:companyId/meta-publication-drafts',async(req,res)=>{
  try{
   const user=await deps.getAuthUserFromRequest(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
   const company=req.params.companyId;if(company.length>64){res.status(400).json({success:false,error:'Invalid workspace'});return;}
   const access=await deps.verifyCompanyWorkspaceAccess(user,company);if(!access.authorized){res.status(access.status).json({success:false,error:access.error});return;}
   const input=publicationDraftInput.safeParse(req.body);if(!input.success){res.status(400).json({success:false,error:'Valid request key, content, Meta targets and Instagram image required'});return;}
   const result=await deps.prepare(company,user.id,input.data);
   res.status(result.reused?200:201).json({success:true,...result});
  }catch(error){res.status(error instanceof PublishingReviewError?error.status:500).json({success:false,error:error instanceof PublishingReviewError?error.message:'Draft acknowledgment unconfirmed. Retry the same intent.'});}
 });
}
