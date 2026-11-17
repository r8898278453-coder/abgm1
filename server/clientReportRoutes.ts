import type {Express,Request} from 'express';
import type {Pool} from 'mysql2/promise';
import {ClientReportError,draftClientReport,transitionClientReport,readClientReports,issueClientReportLink,listClientReportLinks,revokeClientReportLink,publicClientReport,reconcileClientReportLink} from './clientReports';
import {createSlidingRateLimiter} from './rateLimiter';
export function registerClientReportRoutes(app:Express,deps:{auth:(req:Request)=>Promise<any>;pool:()=>Promise<Pool|null>}){
 const route=(method:'get'|'post',path:string,work:(req:Request,pool:Pool,user:any)=>Promise<any>)=>app[method](path,async(req,res)=>{res.set({'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});try{const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'AUTH_REQUIRED'});return;}if(Object.keys(req.query).length||!req.params.companyId||req.params.companyId.length>64)throw new ClientReportError(400,'CLIENT_REPORT_SCOPE_INVALID');const pool=await deps.pool();if(!pool)throw new Error();res.json({success:true,companyId:req.params.companyId,...await work(req,pool,user)});}catch(e){res.status(e instanceof ClientReportError?e.status:503).json({success:false,error:e instanceof ClientReportError?e.code:'CLIENT_REPORT_UNAVAILABLE'});}});
 const base='/api/companies/:companyId/client-report-publications';
 route('get',base,(r,p,u)=>readClientReports(p,u,r.params.companyId));
 route('get',base+'/by-request/:requestKey',(r,p,u)=>readClientReports(p,u,r.params.companyId,undefined,r.params.requestKey));
 route('get',base+'/:id',(r,p,u)=>readClientReports(p,u,r.params.companyId,r.params.id));
 route('post',base,(r,p,u)=>draftClientReport(p,u,r.params.companyId,r.body));
 route('post',base+'/:id/transition',(r,p,u)=>transitionClientReport(p,u,r.params.companyId,r.params.id,r.body));
 route('post',base+'/:id/links/reconcile',(r,p,u)=>reconcileClientReportLink(p,u,r.params.companyId,r.params.id,r.body));
 route('get',base+'/:id/links',(r,p,u)=>listClientReportLinks(p,u,r.params.companyId,r.params.id));
 route('post',base+'/:id/links',(r,p,u)=>issueClientReportLink(p,u,r.params.companyId,r.params.id,r.body));
 route('post','/api/companies/:companyId/client-report-links/:id/revoke',(r,p,u)=>revokeClientReportLink(p,u,r.params.companyId,r.params.id,r.body));
 app.get('/api/public/client-reports/:id',(_req,res,next)=>{res.set({'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow, noarchive','X-Content-Type-Options':'nosniff'});next();},createSlidingRateLimiter({name:'client-report-read',windowMs:60000,max:60,message:'Report unavailable'}),async(req,res)=>{res.set({'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow, noarchive','X-Content-Type-Options':'nosniff'});try{if(Object.keys(req.query).length)throw new Error();const pool=await deps.pool();if(!pool)throw new Error();const report=await publicClientReport(pool,req.params.id,req.headers['x-client-report-token']);if(!report)throw new Error();res.json({success:true,...report});}catch{res.status(404).json({success:false,error:'REPORT_UNAVAILABLE'});}});
}
