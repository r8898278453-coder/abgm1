import type {Express,Request} from 'express';
import type {DbUser} from './db';
export function registerContentMutationRoutes(app:Express,deps:{auth:(req:Request)=>Promise<DbUser|null>;company:(id:string)=>Promise<string|null>;access:(user:DbUser,company:string)=>Promise<{authorized:boolean;status:number}>;remove:(id:string,company:string)=>Promise<boolean>}){
 app.delete(['/api/content-posts/:id','/api/posts/:id'],async(req,res)=>{
  try{
   const user=await deps.auth(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
   if(Object.keys(req.query).some(key=>key!=='companyId')||(req.query.companyId!==undefined&&(typeof req.query.companyId!=='string'||!req.query.companyId||req.query.companyId.length>64))){res.status(400).json({success:false,error:'Invalid workspace query'});return;}
   const company=await deps.company(req.params.id);if(!company){res.status(404).json({success:false,error:'Post not found'});return;}
   if(req.query.companyId!==undefined&&req.query.companyId!==company){res.status(403).json({success:false,error:'Post workspace mismatch'});return;}
   const access=await deps.access(user,company);if(!access.authorized){res.status(access.status).json({success:false,error:'Post access denied'});return;}
   if(!await deps.remove(req.params.id,company)){res.status(409).json({success:false,error:'Post deletion not confirmed. Reload; published, uncertain or referenced records must be retained.'});return;}
   res.json({success:true,postId:req.params.id,providerDeletion:'NOT_PERFORMED'});
  }catch{res.status(503).json({success:false,error:'Post deletion unavailable. Reload; publishing history may require retention.'});}
 });
}
