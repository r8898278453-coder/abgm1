import type {Express,Request} from 'express';
import type {DbUser} from './db';
import {platformDateKey,platformDayBounds,type DailyWorkReport} from '../shared/dailyWorkReport';
export function registerDailyWorkReport(app:Express,deps:{
 getAuthUserFromRequest:(req:Request)=>Promise<DbUser|null>;
 verifyCompanyWorkspaceAccess:(user:DbUser,company:string)=>Promise<{authorized:boolean;status:number;error?:string}>;
 read:(company:string,date:string)=>Promise<DailyWorkReport>;
}){
 app.get('/api/companies/:companyId/daily-work-report',async(req,res)=>{
  try{
   const user=await deps.getAuthUserFromRequest(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
   if(req.params.companyId.length>64){res.status(400).json({success:false,error:'Invalid workspace'});return;}
   const access=await deps.verifyCompanyWorkspaceAccess(user,req.params.companyId);if(!access.authorized){res.status(access.status).json({success:false,error:access.error});return;}
   const date=req.query.date ?? platformDateKey();
   try{if(typeof date!=='string'||Object.keys(req.query).some(key=>key!=='date'))throw new Error();platformDayBounds(date);}catch{res.status(400).json({success:false,error:'Valid YYYY-MM-DD report date required'});return;}
   res.set('Cache-Control','no-store');
   res.json({success:true,report:await deps.read(req.params.companyId,date as string)});
  }catch{res.status(503).json({success:false,error:'Recorded work report unavailable'});}
 });
}
