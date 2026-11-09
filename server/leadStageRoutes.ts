import type {Express,Request,RequestHandler} from 'express';
import type {DbUser} from './db';
import type {LeadStage} from '../shared/leadStages';
export function registerLeadStageRoutes(app:Express,deps:{validate:RequestHandler;auth:(req:Request)=>Promise<DbUser|null>;lead:(id:string)=>Promise<{id:string;company_id?:string|null;stage:LeadStage}|null>;access:(user:DbUser,company:string)=>Promise<{authorized:boolean;status:number}>;update:(id:string,stage:LeadStage,company:string,expected?:LeadStage)=>Promise<boolean>}){
 app.patch('/api/leads/:id/stage',deps.validate,async(req,res)=>{
  try{
   const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
   const lead=await deps.lead(req.params.id);if(!lead){res.status(404).json({success:false,error:'Lead not found'});return;}
   if(!lead.company_id){res.status(409).json({success:false,error:'Lead needs an assigned workspace'});return;}
   if(req.body.companyId!==undefined&&req.body.companyId!==lead.company_id){res.status(403).json({success:false,error:'Lead workspace mismatch'});return;}
   const access=await deps.access(user,lead.company_id);if(!access.authorized){res.status(access.status).json({success:false,error:'Lead access denied'});return;}
   if(req.body.expectedStage!==undefined&&req.body.expectedStage!==lead.stage){res.status(409).json({success:false,error:'Lead stage changed. Refresh before updating.'});return;}
   if(!await deps.update(lead.id,req.body.stage,lead.company_id,req.body.expectedStage)){res.status(409).json({success:false,error:'Lead update unconfirmed. Refresh before updating.'});return;}
   res.json({success:true,lead:{id:lead.id,company_id:lead.company_id,stage:req.body.stage}});
  }catch{res.status(503).json({success:false,error:'Lead stage update unavailable'});}
 });
}
