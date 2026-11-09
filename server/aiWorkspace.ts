import type {Request,RequestHandler} from 'express';
import type {DbUser} from './db';
/** Every AI prompt using stored evidence resolves an authorized workspace before provider work. */
export function requireAiWorkspace(deps:{auth:(req:Request)=>Promise<DbUser|null>;resolve:(user:DbUser,requested?:string)=>Promise<{companyId?:string|null;status:number}>;company:(id:string)=>Promise<{id:string;name:string;category:string;city?:string;website?:string}|null>}):RequestHandler{
 return async(req,res,next)=>{
  try{
   const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
   const {companyId,company_id}=req.body||{};
   if([companyId,company_id].some(value=>value!==undefined&&(typeof value!=='string'||!value.trim()||value.length>64))||(companyId&&company_id&&companyId!==company_id)){res.status(400).json({success:false,error:'Invalid AI workspace'});return;}
   const resolved=await deps.resolve(user,companyId||company_id);if(!resolved.companyId){res.status(resolved.status).json({success:false,error:'AI workspace access denied'});return;}
   const company=await deps.company(resolved.companyId);if(!company){res.status(404).json({success:false,error:'AI workspace not found'});return;}
   if(company.id!==resolved.companyId)throw new Error('Workspace identity mismatch');
   req.body={...req.body,companyId:company.id,businessName:company.name,category:company.category,city:company.city||'',website:company.website||''};
   res.locals.aiUser=user;res.locals.aiCompany=company;next();
  }catch{res.status(503).json({success:false,error:'AI workspace unavailable'});}
 };
}
