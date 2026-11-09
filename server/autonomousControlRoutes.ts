import type {Express,Request} from 'express';
import type {DbUser} from './db';
import {z} from 'zod';
const command=z.union([z.object({companyId:z.string().min(1).max(64),autopilotEnabled:z.boolean()}).strict(),z.object({companyId:z.string().min(1).max(64).optional(),emergencyStop:z.boolean()}).strict()]);
export function registerAutonomousControlRoutes(app:Express,deps:{auth:(req:Request)=>Promise<DbUser|null>;access:(user:DbUser,company:string)=>Promise<{authorized:boolean;status:number}>;autopilot:(company:string,enabled:boolean)=>Promise<boolean>;stop:(enabled:boolean)=>void;isStopped:()=>boolean}){
 app.post('/api/autonomous/kill-switch',async(req,res)=>{
  try{
   const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
   const parsed=command.safeParse(req.body);if(!parsed.success){res.status(400).json({success:false,error:'One explicit boolean control command is required'});return;}
   const input=parsed.data;
   if('emergencyStop' in input&&!user.is_platform_admin){res.status(403).json({success:false,error:'Platform administrator required for global stop'});return;}
   if(input.companyId){const access=await deps.access(user,input.companyId);if(!access.authorized){res.status(access.status).json({success:false,error:'Workspace access denied'});return;}}
   if('autopilotEnabled' in input){if(!await deps.autopilot(input.companyId,input.autopilotEnabled)){res.status(503).json({success:false,error:'Autopilot persistence not confirmed'});return;}
    res.json({success:true,companyId:input.companyId,autopilotEnabled:input.autopilotEnabled,globalEmergencyStop:deps.isStopped()});
   }else{deps.stop(input.emergencyStop);const observed=deps.isStopped();if(observed!==input.emergencyStop)throw new Error('Unconfirmed stop');res.json({success:true,companyId:input.companyId,globalEmergencyStop:observed});}
  }catch{res.status(503).json({success:false,error:'Execution control update unconfirmed. Reload backend status.'});}
 });
}
