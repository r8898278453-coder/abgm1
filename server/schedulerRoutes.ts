import {dispatcherCursor} from '../shared/dispatcher';
import { timingSafeEqual } from 'node:crypto';
import type { Express, Request } from 'express';

export function registerSchedulerRoutes(app: Express, deps: {
  getCronSecret: () => string | undefined;
  getAuthUserFromRequest: (req: Request) => Promise<{ is_platform_admin?: boolean } | null>;
  runSchedulerTick: () => Promise<unknown>;
  readHistory?:(before:string|null,limit:number)=>Promise<unknown>;
}) {
  app.post(['/api/scheduler/tick', '/api/cron/tick'], async (req, res) => {
    try {
      const expected = deps.getCronSecret();
      const supplied = req.headers['x-cron-secret'];
      const validSecret = typeof supplied === 'string' && !!expected &&
        Buffer.byteLength(supplied) === Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
      const admin = validSecret ? null : await deps.getAuthUserFromRequest(req);
      if (!validSecret && !admin?.is_platform_admin) { res.status(403).json({ success: false, error: 'Scheduler authorization required' }); return; }
      if(Object.keys(req.query).length||(req.body&&Object.keys(req.body).length)){res.status(400).json({success:false,error:'Tick accepts no query/body commands'});return;}
      const result:any=await deps.runSchedulerTick();
      const available=result?.available!==false;res.set('Cache-Control','no-store').status(!available?503:result?.status==='EXISTING'?202:200).json({success:available,status:!available?'unavailable':result?.status==='EXISTING'?'already_observed':result?.status==='PARTIAL'?'partial':'ok',result});
    } catch { res.status(500).json({ success: false, error: 'Scheduler tick failed' }); }
  });
  app.get('/api/scheduler/history',async(req,res)=>{
    try{
      const user=await deps.getAuthUserFromRequest(req);if(!user){res.status(401).json({success:false,error:'Authentication required'});return;}
      if(!user.is_platform_admin){res.status(403).json({success:false,error:'Platform administrator required'});return;}
      let before:string|null,limit:number;
      try{if(Object.keys(req.query).some(key=>!['before','limit'].includes(key)))throw new Error();before=dispatcherCursor(req.query.before);const raw=req.query.limit??'20';if(typeof raw!=='string'||!/^\d{1,2}$/.test(raw))throw new Error();limit=Number(raw);if(limit<1||limit>50)throw new Error();}catch{res.status(400).json({success:false,error:'Invalid dispatcher history query'});return;}
      if(!deps.readHistory)throw new Error();const result=await deps.readHistory(before,limit);res.set('Cache-Control','no-store').json({success:true,...result as any});
    }catch{res.status(503).json({success:false,error:'Dispatcher history unavailable'});}
  });
}
