import type {Express,Request} from 'express';import {calculateRevenueAttribution,type AttributionLead} from './revenueAttribution';
export function registerRevenueAttributionRoutes(app:Express,deps:{auth:(req:Request)=>Promise<any>;resolve:(user:any,requested?:string)=>Promise<{companyId?:string;status:number;error?:string}>;access:(user:any,company:string)=>Promise<{authorized:boolean;status:number}>;leads:(company:string)=>Promise<AttributionLead[]>}){
 const handler=(scoped:boolean)=>async(req:Request,res:any)=>{res.set('Cache-Control','no-store');try{
  const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'AUTH_REQUIRED'});return;}
  const keys=Object.keys(req.query);if(keys.some(k=>scoped||!['companyId','company_id'].includes(k))||keys.length>1||Object.values(req.query).some(v=>typeof v!=='string')){res.status(400).json({success:false,error:'ATTRIBUTION_QUERY_INVALID'});return;}
  const requested=scoped?req.params.id:(req.query.companyId||req.query.company_id) as string|undefined;if(requested!==undefined&&(typeof requested!=='string'||!requested||requested.length>64)){res.status(400).json({success:false,error:'ATTRIBUTION_SCOPE_INVALID'});return;}
  const resolved=await deps.resolve(user,requested);if(!resolved.companyId){res.status(resolved.status).json({success:false,error:'ATTRIBUTION_SCOPE_UNAVAILABLE'});return;}
  const access=await deps.access(user,resolved.companyId);if(!access.authorized){res.status(access.status).json({success:false,error:'ATTRIBUTION_ACCESS_DENIED'});return;}
  const leads=await deps.leads(resolved.companyId);if(!Array.isArray(leads))throw new Error();res.json({success:true,attribution:calculateRevenueAttribution({companyId:resolved.companyId,leads,invoices:[]})});
 }catch{res.status(503).json({success:false,error:'ATTRIBUTION_UNAVAILABLE'});}};
 app.get('/api/companies/:id/revenue-attribution',handler(true));app.get('/api/revenue-attribution',handler(false));
}
