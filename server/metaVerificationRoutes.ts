import {VerificationAdmission} from './verificationAdmission';
import type {Express,Request} from 'express';
import type {DbUser} from './db';
import {metaVerificationInput,type MetaVerificationInput} from './metaVerificationStore';
import {PublishingReviewError} from './publishingReview';
export function registerMetaVerification(app:Express,deps:{
  getAuthUserFromRequest:(req:Request)=>Promise<DbUser|null>;
  verifyCompanyWorkspaceAccess:(user:DbUser,company:string)=>Promise<{authorized:boolean;status:number;error?:string}>;
  check:(company:string,post:string,actor:string,input:MetaVerificationInput)=>Promise<any>;
}){
 const admission=new VerificationAdmission();
 app.post('/api/companies/:companyId/posts/:postId/publishing-verification',async(req,res)=>{
  try{
   const user=await deps.getAuthUserFromRequest(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
   if(req.params.companyId.length>64||req.params.postId.length>64){res.status(400).json({success:false,error:'Invalid workspace or post identifier'});return;}
   const access=await deps.verifyCompanyWorkspaceAccess(user,req.params.companyId);if(!access.authorized){res.status(access.status).json({success:false,error:access.error});return;}
   const input=metaVerificationInput.safeParse(req.body);if(!input.success){res.status(400).json({success:false,error:'Current evidence version, Meta platform and numeric object ID required'});return;}
   const slot=admission.acquire(req.params.companyId);
   if('retryAfterSeconds' in slot){res.setHeader('Retry-After',slot.retryAfterSeconds);res.status(429).json({success:false,error:'Verification busy or rate limited. Wait before checking again.'});return;}
   let result;
   try{result=await deps.check(req.params.companyId,req.params.postId,user.id,input.data);}finally{slot.release();}
   res.status(result.verification.status==='STALE'?409:200).json({success:result.verification.status!=='STALE',...result,...(result.verification.status==='STALE'?{error:'Source or connection changed. Reload before checking again.'}:{})});
  }catch(error){if(error instanceof PublishingReviewError)res.status(error.status).json({success:false,error:error.message});else res.status(500).json({success:false,error:'Provider verification unavailable'});}
 });
}
