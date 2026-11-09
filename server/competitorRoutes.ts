import crypto from 'node:crypto';
import type {Express,Request} from 'express';
import {competitorAdd,competitorEdit,competitorDelete,competitorVersion,competitorDto} from '../shared/competitors';
import {ObservationError} from './observationStore';
import type {CompetitorCommand} from './competitorCommands';
export function registerCompetitorRoutes(app:Express,deps:{auth:(req:Request)=>Promise<any>;access:(user:any,company:string)=>Promise<any>;read:(company:string)=>Promise<any[]>;mutate:(company:string,command:CompetitorCommand)=>Promise<any>;fetch:(company:string,competitor:any)=>Promise<any>}){
 const routes=[['post','/api/companies/:id/competitors','add'],['put','/api/companies/:id/competitors/:competitorId','edit'],['delete','/api/companies/:id/competitors/:competitorId','delete'],['post','/api/companies/:id/competitors/:competitorId/refresh','refresh'],['post','/api/companies/:id/competitors/refresh-all','batch']] as const;
 for(const [method,path,kind] of routes)app[method](path,async(req,res)=>{
  res.set('Cache-Control','no-store');try{
   const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
   const params=req.params as Record<string,string>,company=params.id,id=params.competitorId;
   if(!company||company.length>64||id&&id.length>64||Object.keys(req.query).length)throw new ObservationError('COMPETITOR_INVALID');
   const access=await deps.access(user,company);if(!access.authorized){res.status(access.status).json({success:false,error:'Workspace access denied'});return;}
   const input=req.body??{};
   const schema=kind==='add'?competitorAdd:kind==='edit'?competitorEdit:competitorDelete;
   if((kind==='edit'||kind==='delete')&&input.expectedVersion===undefined){res.status(428).json({success:false,error:'Reload competitor before changing it'});return;}
   if(['add','edit','delete'].includes(kind)&&!schema.safeParse(input).success||['refresh','batch'].includes(kind)&&Object.keys(input).length)throw new ObservationError('COMPETITOR_INVALID');
   if(kind==='batch'||kind==='refresh'){
    const all=await deps.read(company);if(!Array.isArray(all)||all.length>100)throw new Error('COMPETITOR_COLLECTION_INVALID');
    const targets=kind==='refresh'?all.filter(row=>row.id===id):all;
    if(kind==='refresh'&&!targets.length)throw new ObservationError('COMPETITOR_NOT_FOUND',404);
    const results:any[]=[];let latest:any=null;const started=Date.now();
    for(const target of targets){
     if(results.length>=25||Date.now()-started>=20000){results.push({id:target.id,status:'NOT_ATTEMPTED'});continue;}
     try{const observation=await deps.fetch(company,target);latest=await deps.mutate(company,{kind:'refresh',id:target.id,expectedVersion:competitorVersion(target),observation});results.push({id:target.id,status:'SAVED'});}
     catch(error){if(kind==='refresh')throw error;results.push({id:target.id,status:error instanceof ObservationError&&error.status===409?'CONFLICT':'UNAVAILABLE'});}
    }
    const competitors=(await deps.read(company)).map(competitorDto),partial=results.some(row=>row.status!=='SAVED');
    res.json({success:true,companyId:company,competitors,results,partial,message:partial?'Some competitor observations were not saved.':'Competitor observations saved.',...(kind==='refresh'&&latest?{version:latest.version,previousVersion:latest.previousVersion}:{})});return;
   }
   const parsed:any=schema.parse(input),{expectedVersion,refreshNow,...details}=parsed;
   let result=await deps.mutate(company,{kind:kind as 'add'|'edit'|'delete',id:kind==='add'?'comp_'+crypto.randomUUID().replaceAll('-',''):id,expectedVersion,input:details});
   let refreshStatus:string|undefined,revisionDelta=1,revisionUnconfirmed=false;
   if(kind==='add'&&refreshNow){
    const saved=result;
    try{const observation=await deps.fetch(company,saved.competitor);result=await deps.mutate(company,{kind:'refresh',id:saved.competitor.id,expectedVersion:competitorVersion(saved.competitor),observation});result.previousVersion=saved.previousVersion;revisionDelta=2;refreshStatus='SAVED';}
    catch(error){refreshStatus=error instanceof ObservationError?'UNAVAILABLE':'UNCONFIRMED';revisionUnconfirmed=refreshStatus==='UNCONFIRMED';} // The acknowledged manual creation remains saved.
   }
   res.json({success:true,...result,revisionDelta,revisionUnconfirmed,...(refreshStatus?{refreshStatus}:{})});
  }catch(error){res.status(error instanceof ObservationError?error.status:503).json({success:false,error:error instanceof ObservationError?error.code:'Competitor operation unavailable'});}
 });
}
