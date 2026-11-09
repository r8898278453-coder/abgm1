import {z} from 'zod';
import type {Express,Request} from 'express';
import {platformDateKey,platformDayBounds} from '../shared/dailyWorkReport';
const scope={companyId:z.string().min(1).max(64).optional(),company_id:z.string().min(1).max(64).optional()};
const scoped=(input:any)=>!!(input.companyId||input.company_id)&&(!input.companyId||!input.company_id||input.companyId===input.company_id);
const day=z.string().refine(value=>{try{platformDayBounds(value);return true;}catch{return false;}});
const fields={name:z.string().trim().min(1).max(255),objective:z.string().trim().min(1).max(4000),status:z.enum(['draft','active','paused','completed']),start_date:day,end_date:day,planned_budget:z.number().min(0).max(99999999.99).refine(value=>Number(value.toFixed(2))===value),channels:z.array(z.string().trim().min(1).max(64)).max(20),external_campaign_id:z.string().min(1).max(128).nullable()};
const create=z.object({...scope,...fields,status:fields.status.optional(),start_date:day.optional(),end_date:day.optional(),planned_budget:fields.planned_budget.optional(),channels:fields.channels.optional(),external_campaign_id:fields.external_campaign_id.optional()}).strict().refine(scoped);
const update=z.object({...scope,...Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,value.optional()]))}).strict().refine(scoped).refine(value=>Object.keys(value).some(key=>!['companyId','company_id'].includes(key)));
const scopedQuery=z.object(scope).strict().refine(scoped),link=z.object({...scope,external_campaign_id:fields.external_campaign_id}).strict().refine(scoped);
export function registerInternalCampaignRoutes(app:Express,deps:{auth:(req:Request)=>Promise<any>;access:(user:any,company:string)=>Promise<any>;read:(company:string)=>Promise<any[]>;external:(company:string)=>Promise<any[]>;create:(data:any)=>Promise<any>;update:(id:string,data:any,company:string)=>Promise<boolean>;remove:(id:string,company:string)=>Promise<boolean>}){
 const definitions=[['get','/api/campaigns/internal','list'],['post','/api/campaigns/internal','create'],['put','/api/campaigns/internal/:id','update'],['delete','/api/campaigns/internal/:id','delete'],['post','/api/campaigns/internal/:id/link-external','link']] as const;
 for(const [method,path,kind]of definitions)app[method](path,async(req,res)=>{
  res.set('Cache-Control','no-store');try{
   const params=req.params as Record<string,string>;
   const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
   if(kind==='delete'&&Object.keys(req.body||{}).length||params.id&&params.id.length>64||!['list','delete'].includes(kind)&&Object.keys(req.query).length){res.status(400).json({success:false,error:'Invalid campaign request'});return;}
   const parsed=(kind==='list'||kind==='delete'?scopedQuery:kind==='create'?create:kind==='link'?link:update).safeParse(kind==='list'||kind==='delete'?req.query:req.body);
   if(!parsed.success){res.status(400).json({success:false,error:'Explicit workspace and valid campaign planning fields required'});return;}
   const input:any=parsed.data,company=input.companyId||input.company_id,access=await deps.access(user,company);if(!access.authorized){res.status(access.status).json({success:false,error:'Campaign workspace access denied'});return;}
   if(kind==='list'){const campaigns=await deps.read(company);if(!Array.isArray(campaigns)||campaigns.some(row=>row.company_id!==company))throw new Error('CAMPAIGN_SCOPE_INVALID');res.json({success:true,companyId:company,campaigns});return;}
   if(input.external_campaign_id){const external=await deps.external(company);if(!Array.isArray(external)||external.some(row=>row.company_id!==company))throw new Error('CAMPAIGN_SCOPE_INVALID');if(external.filter(row=>row.external_campaign_id===input.external_campaign_id).length!==1){res.status(409).json({success:false,error:'Select one stored external campaign from this workspace'});return;}}
   const {companyId:_,company_id:__,...values}=input;
   if(kind==='create'){
    const data={status:'draft',start_date:platformDateKey(),end_date:platformDateKey(Date.now()+30*86400000),planned_budget:0,channels:[],...values,company_id:company};if(data.end_date<data.start_date){res.status(400).json({success:false,error:'Campaign end date must follow start date'});return;}
    const campaign=await deps.create(data);if(campaign?.company_id!==company||typeof campaign.id!=='string')throw new Error('CAMPAIGN_CREATE_UNCONFIRMED');res.json({success:true,companyId:company,campaign});return;
   }
   const id=params.id as string,changed=kind==='delete'?await deps.remove(id,company):await deps.update(id,values,company);
   res.status(changed?200:404).json({success:changed,companyId:company,id,message:changed?'Internal planning record saved':'Internal campaign not found'});
  }catch(error){if(error instanceof Error&&error.message==='CAMPAIGN_PERIOD_INVALID'){res.status(400).json({success:false,error:'Campaign end date must follow start date'});return;}res.status(503).json({success:false,error:'Campaign storage unavailable or operation unconfirmed'});}
 });
}
