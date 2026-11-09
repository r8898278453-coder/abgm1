import type {Express,Request} from 'express';
import type {DbUser} from './db';
import {z} from 'zod';
const campaignFields=['id','company_id','internal_campaign_id','provider','external_campaign_id','name','status','fetched_at','spend','impressions','clicks','conversions','conversion_tracking_status','revenue','revenue_attribution_status','roas','created_at','updated_at'];
const publicRows=(rows:any[])=>rows.map(row=>Object.fromEntries(campaignFields.map(key=>[key,row[key]])));
const scope={companyId:z.string().min(1).max(64).optional(),company_id:z.string().min(1).max(64).optional()};
export function registerAdCampaignRoutes(app:Express,deps:{auth:(req:Request)=>Promise<DbUser|null>;resolve:(user:DbUser,company?:string)=>Promise<{companyId?:string;status:number;error?:string}>;read:(company:string)=>Promise<any[]>;sync:(company:string,provider:string)=>Promise<any>}){
 for(const mode of ['read','sync'] as const)app[mode==='read'?'get':'post'](mode==='read'?'/api/campaigns/external':'/api/campaigns/external/sync',async(req,res)=>{
  try{
   const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
   const parsed=(mode==='read'?z.object(scope).strict():z.object({...scope,provider:z.literal('meta_ads').default('meta_ads')}).strict()).safeParse(mode==='read'?req.query:req.body);
   if(!parsed.success||parsed.data.companyId&&parsed.data.company_id&&parsed.data.companyId!==parsed.data.company_id){res.status(400).json({success:false,error:'Invalid campaign scope or provider'});return;}
   const resolved=await deps.resolve(user,parsed.data.companyId||parsed.data.company_id);if(!resolved.companyId){res.status(resolved.status).json({success:false,error:'Campaign workspace access denied'});return;}
   const company=resolved.companyId;
   if(mode==='read'){const rows=await deps.read(company);if(!Array.isArray(rows)||rows.some(row=>row.company_id!==company))throw new Error('Invalid campaign collection');res.set('Cache-Control','no-store').json({success:true,companyId:company,campaigns:publicRows(rows)});}
   else{const result=await deps.sync(company,'meta_ads');if(result.companyId!==company||!['SUCCESS','PARTIAL','PROVIDER_ERROR','NOT_CONFIGURED'].includes(result.status)||!Array.isArray(result.campaigns)||result.campaigns.some((row:any)=>row.company_id!==company)||result.campaignsCount!==result.campaigns.length)throw new Error('Invalid sync acknowledgement');res.set('Cache-Control','no-store').json({success:result.status==='SUCCESS',companyId:company,syncResult:{...result,campaigns:publicRows(result.campaigns)}});}
  }catch{res.status(503).json({success:false,error:'Campaign data unavailable'});}
 });
}
