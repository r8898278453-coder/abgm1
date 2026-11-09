import type {Express,Request,RequestHandler} from 'express';
import type {DbUser} from './db';
export function registerReviewReplyRoutes(app:Express,deps:{validate:RequestHandler;auth:(req:Request)=>Promise<DbUser|null>;companyForReview:(id:string)=>Promise<string|null>;access:(user:DbUser,company:string)=>Promise<{authorized:boolean;status:number}>;remove:(id:string,company:string)=>Promise<boolean>;save:(id:string,text:string,company:string)=>Promise<boolean>}){
 app.post(['/api/reviews/:id/reply','/api/reviews/:id/replyText'],deps.validate,async(req,res)=>{
  try{
   const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
   const company=await deps.companyForReview(req.params.id);if(!company){res.status(404).json({success:false,error:'Review not found'});return;}
   if(req.body.companyId!==undefined&&req.body.companyId!==company){res.status(403).json({success:false,error:'Review workspace mismatch'});return;}
   const access=await deps.access(user,company);if(!access.authorized){res.status(access.status).json({success:false,error:'Review access denied'});return;}
   if(!await deps.save(req.params.id,req.body.replyText.trim(),company)){res.status(404).json({success:false,error:'Review save not confirmed'});return;}
   res.json({success:true,reviewId:req.params.id,storage:'workspace',providerPublication:'NOT_VERIFIED'});
  }catch{res.status(503).json({success:false,error:'Review save unavailable'});}
 });
 app.delete('/api/reviews/:id',async(req,res)=>{
  try{
   const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
   if(Object.keys(req.query).some(key=>key!=='companyId')||(req.query.companyId!==undefined&&(typeof req.query.companyId!=='string'||!req.query.companyId||req.query.companyId.length>64))){res.status(400).json({success:false,error:'Invalid workspace query'});return;}
   const company=await deps.companyForReview(req.params.id);if(!company){res.status(404).json({success:false,error:'Review not found'});return;}
   if(req.query.companyId!==undefined&&req.query.companyId!==company){res.status(403).json({success:false,error:'Review workspace mismatch'});return;}
   const access=await deps.access(user,company);if(!access.authorized){res.status(access.status).json({success:false,error:'Review access denied'});return;}
   if(!await deps.remove(req.params.id,company)){res.status(404).json({success:false,error:'Review deletion not confirmed'});return;}
   res.json({success:true,reviewId:req.params.id,storage:'workspace',providerDeletion:'NOT_PERFORMED'});
  }catch{res.status(503).json({success:false,error:'Review deletion unavailable'});}
 });

}
