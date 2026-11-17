import type {Express,Request} from 'express';
import {validateCriticalAlertHistory} from '../shared/criticalAlerts';

/** Read-only evidence. Provider checks, acknowledgement and replay are not exposed here. */
export function registerCriticalAlertRoutes(app:Express,deps:{
 auth:(req:Request)=>Promise<any>;
 access:(user:any,company:string)=>Promise<{authorized:boolean;status:number}>;
 read:(company:string)=>Promise<any>;
}){
 app.get('/api/companies/:companyId/critical-alerts',async(req,res)=>{
  res.set('Cache-Control','no-store');
  try{
   const user=await deps.auth(req);
   if(!user){res.status(401).json({success:false,error:'AUTH_REQUIRED'});return;}
   const company=req.params.companyId;
   if(!company||company.length>64||Object.keys(req.query).length){res.status(400).json({success:false,error:'CRITICAL_ALERT_SCOPE_INVALID'});return;}
   const access=await deps.access(user,company);
   if(!access.authorized){res.status(access.status).json({success:false,error:'CRITICAL_ALERT_ACCESS_DENIED'});return;}
   const value=await deps.read(company);validateCriticalAlertHistory(value,company);
   res.json({success:true,...value});
  }catch{res.status(503).json({success:false,error:'CRITICAL_ALERT_EVIDENCE_UNAVAILABLE'});}
 });
}
