import {SalesError} from './salesWorkspace';
import type {readTenantEmailDomainStatus,verifyTenantEmailDomain} from './tenantEmailDomain';
import type {Express,Request} from 'express';
/** Account recovery transport must never be used to certify a customer's email channel. */
export function registerTenantEmailRoutes(app:Express,deps:{auth:(r:Request)=>Promise<any>;access:(user:any,company:string)=>Promise<{authorized:boolean;status:number}>;verifyDomain:(user:any,company:string)=>ReturnType<typeof verifyTenantEmailDomain>;readDomain:(user:any,company:string)=>ReturnType<typeof readTenantEmailDomainStatus>}) {
 app.get('/api/companies/:companyId/tenant-email/domain-status',async(req,res)=>{
  res.set('Cache-Control','no-store');
  try{
   const user=await deps.auth(req);
   if(!user){res.status(401).json({success:false,code:'AUTH_REQUIRED'});return;}
   const company=req.params.companyId;
   if(!/^[A-Za-z0-9_-]{1,64}$/.test(company)||Object.keys(req.query).length||Number(req.headers['content-length']||0)!==0||req.headers['transfer-encoding']){
    res.status(400).json({success:false,code:'TENANT_EMAIL_STATUS_INPUT_INVALID'});return;
   }
   const domain=await deps.readDomain(user,company);
   res.json({success:true,companyId:company,domain});
  }catch(error){
   const code=error instanceof SalesError?error.code:'TENANT_EMAIL_DOMAIN_UNAVAILABLE';
   res.status(error instanceof SalesError?error.status:503).json({success:false,code,error:code});
  }
 });
 app.post('/api/companies/:companyId/tenant-email/verify-domain',async(req,res)=>{
  res.set('Cache-Control','no-store');
  try{
   const user=await deps.auth(req);
   if(!user){res.status(401).json({success:false,code:'AUTH_REQUIRED'});return;}
   const company=req.params.companyId;
   if(!/^[A-Za-z0-9_-]{1,64}$/.test(company)||Object.keys(req.query).length||!req.body||
      typeof req.body!=='object'||Array.isArray(req.body)||Object.keys(req.body).length){
    res.status(400).json({success:false,code:'TENANT_EMAIL_CHECK_INPUT_INVALID'});return;
   }
   const domain=await deps.verifyDomain(user,company);
   res.json({success:true,companyId:company,domain});
  }catch(error){
   const code=error instanceof SalesError?error.code:'TENANT_EMAIL_DOMAIN_UNAVAILABLE';
   res.status(error instanceof SalesError?error.status:503).json({success:false,code,error:code});
  }
 });
 app.post('/api/integrations/email/test-send',async(req,res)=>{res.set('Cache-Control','no-store');try{const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}const b=req.body;if(!b||typeof b.companyId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(b.companyId)||Object.keys(b).some(k=>!['companyId','recipientEmail'].includes(k))||Object.keys(req.query).length){res.status(400).json({success:false,error:'Explicit client email scope required'});return;}const access=await deps.access(user,b.companyId);if(!access.authorized){res.status(access.status).json({success:false,error:'Client integration access denied'});return;}res.status(503).json({success:false,companyId:b.companyId,code:'TENANT_EMAIL_UNAVAILABLE',error:'Tenant email dispatch and reply/bounce intake are unavailable. Use the client integration card to check the saved domain.'});}catch{res.status(503).json({success:false,error:'Tenant email check unavailable'});}});}
