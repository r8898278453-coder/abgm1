import type {Express,Request} from 'express';
export function registerObservationHistoryRoutes(app:Express,deps:{auth:(req:Request)=>Promise<any>;access:(user:any,company:string)=>Promise<any>;ranks:(company:string,keyword:string,limit:number)=>Promise<any[]>;competitors:(company:string,competitor:string,limit:number)=>Promise<any[]>}){
 const fields={ranks:['id','company_id','keyword','latitude','longitude','grid_index','grid_label','timestamp','provider','position','status'],competitors:['id','company_id','competitor_id','name','place_id','address','rating','reviews_count','photos_count','posts_per_week','rank_position','provider','timestamp','status']};
 for(const kind of ['ranks','competitors'] as const)app.get(kind==='ranks'?'/api/companies/:id/keywords/:kw/history':'/api/companies/:id/competitors/:competitorId/history',async(req,res)=>{
  res.set('Cache-Control','no-store');try{
   const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
   const params=req.params as Record<string,string>,company=params.id,key=params[kind==='ranks'?'kw':'competitorId'];
   if(!company||company.length>64||!key.trim()||key.length>(kind==='ranks'?191:64)||Object.keys(req.query).length){res.status(400).json({success:false,error:'Invalid observation history request'});return;}
   const access=await deps.access(user,company);if(!access.authorized){res.status(access.status).json({success:false,error:'Workspace access denied'});return;}
   const rows=await deps[kind](company,key,50);if(!Array.isArray(rows)||rows.some(row=>row.company_id!==company||(kind==='ranks'?row.keyword.toLowerCase()!==key.toLowerCase():row.competitor_id!==key)))throw new Error('HISTORY_SCOPE_INVALID');
   res.json({success:true,companyId:company,...(kind==='ranks'?{keyword:key}:{competitorId:key}),history:rows.map(row=>Object.fromEntries(fields[kind].map(field=>[field,row[field]]))),windowLimit:50});
  }catch{res.status(503).json({success:false,error:'Observation history unavailable'});}
 });
}
