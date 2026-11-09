import type {Express,Request} from 'express';
import type {DbUser} from './db';
import {z} from 'zod';
import {auditEvidenceSchema,type AuditEvidence} from '../shared/auditSnapshot';
export function registerAuditRoutes(app:Express,deps:{auth:(req:Request)=>Promise<DbUser|null>;access:(user:DbUser,company:string)=>Promise<{authorized:boolean;status:number}>;read:(company:string)=>Promise<AuditEvidence[]>}){
 const actionSchema=z.object({action:z.enum(['resolve','remediate','google','seo','reviews','social','content','website']).optional()}).strict();
 async function evaluate(req:Request,res:any,mode:'read'|'scan'|'guidance'){
  try{
   const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
   const company=req.params.id;if(!company||company.length>64){res.status(400).json({success:false,error:'Invalid workspace'});return;}
   const access=await deps.access(user,company);if(!access.authorized){res.status(access.status).json({success:false,error:'Audit access denied'});return;}
   if(Object.keys(req.query).length||(mode==='scan'&&req.body&&Object.keys(req.body).length)||(mode==='guidance'&&!actionSchema.safeParse(req.body||{}).success)){res.status(400).json({success:false,error:'Invalid audit request'});return;}
   const items=z.array(auditEvidenceSchema).max(200).parse(await deps.read(company));
   res.set('Cache-Control','no-store');
   if(mode==='guidance'){
    const item=items.find(item=>item.id===req.params.auditId);if(!item){res.status(404).json({success:false,error:'Current audit finding not found'});return;}
    res.json({success:true,companyId:company,auditId:item.id,status:item.status,remediationExecuted:false,auditItem:item,message:'Current evidence evaluated. No remediation or provider write was performed. Review the relevant workspace module.'});return;
   }
   res.json({success:true,companyId:company,auditItems:items,totalIssues:items.filter(item=>!item.resolved).length,resolvedIssues:items.filter(item=>item.resolved).length,timestamp:new Date().toISOString(),coverage:'Saved workspace evidence; no live provider verification or remediation',persisted:false});
  }catch{res.status(503).json({success:false,error:'Audit evidence unavailable'});}
 }
 app.get('/api/companies/:id/audit',(req,res)=>evaluate(req,res,'read'));
 app.post('/api/companies/:id/audit/scan',(req,res)=>evaluate(req,res,'scan'));
 app.post('/api/companies/:id/audit/:auditId/resolve',(req,res)=>evaluate(req,res,'guidance'));
}
