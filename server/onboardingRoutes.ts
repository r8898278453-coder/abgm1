import type {Express,Request} from 'express';
import type {Pool} from 'mysql2/promise';
import {readOnboarding,saveOnboarding,importLegacyKnowledge} from './onboarding';
import {AgencyError} from './agencyPolicy';
import {KnowledgeError} from './knowledgeStore';
import {WorkspaceConflict} from '../shared/workspaceRevision';
export function registerOnboardingRoutes(app:Express,deps:{auth:(req:Request)=>Promise<any>;pool:()=>Promise<Pool|null>;access:(user:any,company:string)=>Promise<{authorized:boolean;status:number}>}){
 const route=(method:'get'|'put'|'post',path:string,work:(req:Request,pool:Pool,user:any,company:string)=>Promise<any>)=>app[method](path,async(req,res)=>{
  res.set('Cache-Control','no-store');try{const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}const company=req.params.id as string;if(!company||company.length>64||Object.keys(req.query).length)throw new AgencyError(400,'ONBOARDING_SCOPE_INVALID');const access=await deps.access(user,company);if(!access.authorized)throw new AgencyError(access.status,'ONBOARDING_ACCESS_DENIED');const pool=await deps.pool();if(!pool)throw new AgencyError(503,'ONBOARDING_STORAGE_UNAVAILABLE');res.json({success:true,...await work(req,pool,user,company)});
  }catch(e){res.status(e instanceof WorkspaceConflict?409:e instanceof AgencyError||e instanceof KnowledgeError?e.status:503).json({success:false,error:e instanceof WorkspaceConflict?'WORKSPACE_CHANGED':e instanceof AgencyError||e instanceof KnowledgeError?e.code:'Onboarding operation unavailable or unconfirmed'});}
 });
 route('get','/api/companies/:id/onboarding',(_,pool,user,company)=>readOnboarding(pool,company,user));
 route('put','/api/companies/:id/onboarding',(req,pool,user,company)=>saveOnboarding(pool,company,user,req.body));
 route('post','/api/companies/:id/onboarding/legacy-import',(req,pool,user,company)=>importLegacyKnowledge(pool,company,user,req.body));
}
