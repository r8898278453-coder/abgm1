import assert from 'node:assert/strict';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {registerRenderRoutes} from '../server/renderRoutes';
import {operationForRequest} from '../server/agencyPolicy';
let reads=0,renders=0,themes=0,fail=false;
const root=await fs.mkdtemp(path.join(os.tmpdir(),'render-http-'));
const app=express();app.use(express.json());
registerRenderRoutes(app,{auth:async req=>req.headers.authorization?{id:'owner'} as any:null,resolve:async(_,companyId)=>companyId==='owned'?{companyId,status:200}:{status:403,error:'Denied'},access:async()=>({authorized:true,status:200}),limiter:(_,__,next)=>next(),uploadsRoot:root,
 company:async()=>{reads++;return {id:'owned',name:'Canonical brand'} as any;},data:async()=>({} as any),assets:async()=>[],
 theme:async()=>{themes++;return {templateId:'fixture',template:{name:'Fixture'},palette:{id:'fixture',name:'Fixture',category:'fixture',primaryColor:'#112233',secondaryColor:'#445566',accentColor:'#778899',textColor:'#ffffff'}} as any;},
 creative:async(_,input)=>{renders++;assert.equal(input.businessName,'Canonical brand');assert.equal(input.caption,'');if(fail)throw new Error('PRIVATE_RENDER_CREDENTIAL');return Buffer.from('fixture only; not a real rendered PNG');}
});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const origin=`http://127.0.0.1:${(server.address() as any).port}`;
const saved=process.env.ENABLE_REEL_RENDERING;delete process.env.ENABLE_REEL_RENDERING;
try{
 const call=async(route:string,status:number,body:any,auth=true)=>{const res=await fetch(origin+route,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'fixture'}:{})},body:JSON.stringify(body)});assert.equal(res.status,status);assert.equal(res.headers.get('cache-control'),'no-store');const data=await res.json();assert.ok(!JSON.stringify(data).includes('PRIVATE_RENDER_CREDENTIAL'));return data;};
 const route='/api/ai/render-creative';
 await call(route,401,{},false);await call(route,400,{});await call(route,403,{companyId:'foreign'});assert.equal(reads+renders+themes,0);
 await call(route,400,{companyId:'owned',photoUrl:'http://127.0.0.1/private'});assert.equal(renders+themes,0);
 await call(route,400,{companyId:'owned',logoUrl:'/uploads/foreign/logo.png'});assert.equal(renders+themes,0);
 const result=await call(route,200,{companyId:'owned',companyName:'Forged brand'});assert.equal(result.companyId,'owned');assert.equal(renders,1);assert.equal(themes,1);assert.match(result.imageUrl,/^\/uploads\/owned\/generated\/creative_/);
 fail=true;await call(route,503,{companyId:'owned'});
 const scene={scene:1,visual:'Draft',audio:'Draft'};
 await call('/api/ai/render-reel',409,{companyId:'owned',reelScript:[scene,scene,scene]});
 assert.equal(operationForRequest('POST',route),'write');assert.equal(operationForRequest('POST','/api/ai/render-reel'),'write');
 console.log('Render HTTP: auth, explicit scope, pre-effect asset rejection, canonical brand, safe failures, disabled reel capability passed');
}finally{if(saved===undefined)delete process.env.ENABLE_REEL_RENDERING;else process.env.ENABLE_REEL_RENDERING=saved;await new Promise<void>((r,j)=>server.close(e=>e?j(e):r()));await fs.rm(root,{recursive:true,force:true});}
