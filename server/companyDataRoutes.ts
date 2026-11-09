import type {Express,Request} from 'express';
import type {DbCompany,DbUser} from './db';
import {z} from 'zod';
import {validWorkspaceRevision,WorkspaceConflict} from '../shared/workspaceRevision';
import {sanitizeCompanyData} from './companyDataPolicy';
const input=z.object({expectedVersion:z.string().refine(validWorkspaceRevision),data:z.record(z.string(),z.unknown()).refine(value=>{const settings:any=value.engine_settings;return settings===undefined||settings!==null&&typeof settings==='object'&&!Array.isArray(settings)&&(settings.isHolidayPaused===undefined||typeof settings.isHolidayPaused==='boolean');})}).strict();
export function registerCompanyDataRoutes(app:Express,deps:{auth:(req:Request)=>Promise<DbUser|null>;company:(id:string)=>Promise<DbCompany|null>;access:(user:DbUser,company:string)=>Promise<{authorized:boolean;status:number}>;read:(company:string)=>Promise<{data:any;version:string}>;save:(company:string,data:any,expected:string)=>Promise<string>}){
 for(const method of ['get','put'] as const)app[method]('/api/companies/:id/data',async(req,res)=>{
  try{
   const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
   if(!req.params.id||req.params.id.length>64||Object.keys(req.query).length){res.status(400).json({success:false,error:'Invalid workspace request'});return;}
   const company=await deps.company(req.params.id);if(!company){res.status(404).json({success:false,error:'Workspace not found'});return;}
   const access=await deps.access(user,company.id);if(!access.authorized){res.status(access.status).json({success:false,error:'Workspace access denied'});return;}
   if(method==='put'&&req.body?.expectedVersion===undefined){res.status(428).json({success:false,error:'Load workspace revision before saving'});return;}
   const parsed=method==='put'?input.safeParse(req.body):null;
   if(parsed&&!parsed.success){res.status(400).json({success:false,error:'Invalid workspace save'});return;}
   const snapshot=await deps.read(company.id);if(!validWorkspaceRevision(snapshot.version))throw new Error('Invalid snapshot');
   if(method==='get'){res.set('Cache-Control','no-store').json({success:true,companyId:company.id,company,data:snapshot.data,version:snapshot.version});return;}
   if(!parsed?.success)throw new Error('Missing input');
   if(parsed.data.expectedVersion!==snapshot.version)throw new WorkspaceConflict();
   const data=sanitizeCompanyData(parsed.data.data,snapshot.data||{},company);
   const version=await deps.save(company.id,data,parsed.data.expectedVersion);
   if(!validWorkspaceRevision(version)||BigInt(version)!==BigInt(parsed.data.expectedVersion)+1n)throw new Error('Save acknowledgement unconfirmed');
   res.set('Cache-Control','no-store').json({success:true,companyId:company.id,data,version});
  }catch(error){if(error instanceof WorkspaceConflict){res.status(409).json({success:false,error:error.message});return;}res.status(503).json({success:false,error:'Workspace data/save unavailable. Reload before retrying.'});}
 });
}
