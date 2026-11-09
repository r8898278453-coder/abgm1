import type {Express,Request,Response} from 'express';
import {z} from 'zod';
import {WebsiteError,websiteDomainInput,websiteConfigPatch,WEBSITE_EDITABLE_FIELDS,type DomainDnsSnapshot} from '../shared/website';
const scope=z.string().min(1).max(64),empty=z.object({}).strict();
const domainView=(row:any)=>Object.fromEntries(['id','company_id','domain','cname_target','a_record_target','dns_txt_record','created_at','updated_at','verified_at'].map(key=>[key,row[key]]).concat([['verified_at',row.status==='dns_verified'?row.verified_at:null],['status',row.status==='dns_verified'?'dns_verified':'pending_verification'],['ssl_status','unverified']]));
const configView=(row:any)=>row?Object.fromEntries(['id','company_id','subdomain','created_at','updated_at',...WEBSITE_EDITABLE_FIELDS].map(key=>[key,row[key]])):null;
export function registerWebsiteRoutes(app:Express,deps:{auth:(req:Request)=>Promise<any>;access:(user:any,company:string)=>Promise<any>;domains:(company:string)=>Promise<any[]>;domain:(id:string)=>Promise<any>;create:(data:any)=>Promise<any>;verify:(...args:any[])=>Promise<any>;saveDns:(company:string,id:string,proof:DomainDnsSnapshot,verified:boolean)=>Promise<any>;remove:(company:string,id:string)=>Promise<boolean>;config:(company:string)=>Promise<any>;save:(data:any)=>Promise<any>;zip:(company:any,config:any,domain:string)=>Promise<Buffer>}){
 const route=(method:'get'|'post'|'put'|'delete',path:string,run:(req:Request,res:Response,company:string,access:any)=>Promise<void>)=>app[method](path,async(req,res)=>{
  res.set('Cache-Control','no-store');try{
   const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
   if(!scope.safeParse(req.params.id).success||req.params.domainId&&!scope.safeParse(req.params.domainId).success||!empty.safeParse(req.query).success){res.status(400).json({success:false,error:'Invalid website request'});return;}
   const access=await deps.access(user,req.params.id);if(!access.authorized){res.status(access.status).json({success:false,error:'Workspace access denied'});return;}
   await run(req,res,req.params.id,access);
  }catch(error){res.status(error instanceof WebsiteError?error.status:503).json({success:false,error:error instanceof WebsiteError?error.message:'Website operation unavailable; reload to confirm saved state'});}
 });
 route('get','/api/companies/:id/domains',async(_,res,company)=>{const rows=await deps.domains(company);if(!Array.isArray(rows)||rows.some(row=>row.company_id!==company))throw new Error('INVALID_DOMAIN_SCOPE');res.json({success:true,companyId:company,count:rows.length,domains:rows.map(domainView)});});
 route('post','/api/companies/:id/domains',async(req,res,company)=>{const parsed=websiteDomainInput.safeParse(req.body);if(!parsed.success){res.status(400).json({success:false,error:'A bare public domain is required'});return;}const saved=await deps.create({company_id:company,domain:parsed.data.domain});if(saved?.company_id!==company)throw new Error('INVALID_DOMAIN_ACK');res.status(201).json({success:true,companyId:company,domain:domainView(saved)});});
 route('post','/api/companies/:id/domains/:domainId/verify',async(req,res,company)=>{
  if(!empty.safeParse(req.body||{}).success){res.status(400).json({success:false,error:'Verification takes no overrides'});return;}
  const row=await deps.domain(req.params.domainId);if(!row||row.company_id!==company){res.status(404).json({success:false,error:'Domain not found'});return;}
  const verification=await deps.verify(row.domain,row.cname_target,row.a_record_target,row.dns_txt_record);
  if(verification.unavailable)throw new Error('DNS_UNAVAILABLE');
  const saved=await deps.saveDns(company,row.id,{domain:row.domain,cname_target:row.cname_target,a_record_target:row.a_record_target,dns_txt_record:row.dns_txt_record},verification.verified===true);if(!saved){res.status(409).json({success:false,error:'Domain changed; reload before verification'});return;}
  if(saved.company_id!==company)throw new Error('INVALID_DOMAIN_ACK');res.json({success:true,companyId:company,domain:domainView(saved),verification});
 });
 route('delete','/api/companies/:id/domains/:domainId',async(req,res,company)=>{if(!empty.safeParse(req.body||{}).success){res.status(400).json({success:false,error:'Invalid deletion request'});return;}const removed=await deps.remove(company,req.params.domainId);res.status(removed?200:404).json({success:removed,companyId:company,...(!removed?{error:'Domain not found'}:{message:'Domain registration removed'})});});
 route('get','/api/companies/:id/website/config',async(_,res,company)=>{const saved=await deps.config(company);if(saved&&saved.company_id!==company)throw new Error('INVALID_CONFIG_SCOPE');res.json({success:true,companyId:company,config:configView(saved)});});
 route('put','/api/companies/:id/website/config',async(req,res,company)=>{const parsed=websiteConfigPatch.safeParse(req.body);if(!parsed.success){res.status(400).json({success:false,error:'Only supported website settings with valid values are accepted'});return;}const saved=await deps.save({...parsed.data,company_id:company});if(saved?.company_id!==company)throw new Error('INVALID_CONFIG_ACK');res.json({success:true,companyId:company,config:configView(saved)});});
 route('get','/api/companies/:id/website/export',async(_,res,company,access)=>{const config=await deps.config(company);if(config&&config.company_id!==company)throw new Error('INVALID_CONFIG_SCOPE');const domains=await deps.domains(company);if(domains.some(row=>row.company_id!==company))throw new Error('INVALID_DOMAIN_SCOPE');const domain=domains.find(row=>row.status==='dns_verified')?.domain||'bga.aaditechs.in';const bytes=await deps.zip(access.company,config,domain);res.set({'Content-Type':'application/zip','Content-Disposition':`attachment; filename="storefront-${domain.replace(/[^a-z0-9]/gi,'_')}.zip"`}).send(bytes);});
}
