import assert from 'node:assert/strict';
import express from 'express';
import {registerInternalCampaignRoutes} from '../server/internalCampaignRoutes';
let writes=0,reads=0,fail=false,missing=false;const app=express();app.use(express.json());
registerInternalCampaignRoutes(app,{auth:async req=>req.headers.authorization?{id:'owner'}:null,access:async(_,company)=>({authorized:company==='A',status:403}),read:async company=>{reads++;if(fail)throw new Error('private SQL secret');return[];},external:async company=>[{company_id:company,external_campaign_id:'owned-ad'}],create:async data=>{writes++;if(fail)throw new Error('private SQL secret');return{id:'record',...data};},update:async()=>{writes++;return!missing;},remove:async()=>{writes++;return!missing;}});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const origin=`http://127.0.0.1:${(server.address() as any).port}`;
try{
 const call=async(method:string,path:string,status:number,body?:any,auth=true)=>{const response=await fetch(origin+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'fixture'}:{})},...(body?{body:JSON.stringify(body)}:{})});assert.equal(response.status,status);assert.equal(response.headers.get('cache-control'),'no-store');const data=await response.json();assert.ok(!JSON.stringify(data).includes('private SQL'));return data;};
 const base='/api/campaigns/internal',valid={company_id:'A',name:'Planning',objective:'Generate inquiries'};
 await call('GET',base+'?company_id=A',401,undefined,false);await call('GET',base+'?company_id=B',403);await call('GET',base,400);await call('POST',base,400,{...valid,companyId:'B'});assert.equal(reads+writes,0);
 for(const extra of [{planned_budget:-1},{planned_budget:1.001},{planned_budget:'500'},{start_date:'2026-02-30'},{start_date:'2026-12-30',end_date:'2026-12-01'},{spend:100},{status:'launched'}])await call('POST',base,400,{...valid,...extra});assert.equal(writes,0);
 assert.deepEqual((await call('GET',base+'?company_id=A',200)).campaigns,[]);
 const saved=await call('POST',base,200,valid);assert.equal(saved.companyId,'A');assert.equal(saved.campaign.status,'draft');assert.match(saved.campaign.start_date,/^\d{4}-\d{2}-\d{2}$/);
 await call('POST',base+'/record/link-external',409,{company_id:'A',external_campaign_id:'foreign-ad'});
 await call('PUT',base+'/record',400,{company_id:'A'});await call('DELETE',base+'/record?company_id=A',400,{status:'active'});
 await call('POST',base+'/record/link-external',200,{company_id:'A',external_campaign_id:'owned-ad'});
 await call('POST',base+'/record/link-external',200,{company_id:'A',external_campaign_id:null});missing=true;await call('PUT',base+'/missing',404,{company_id:'A',status:'paused'});await call('DELETE',base+'/missing?company_id=A',404);
 fail=true;await call('GET',base+'?company_id=A',503);await call('POST',base,503,valid);
 console.log('Internal campaign HTTP: explicit authorized scope, strict planning fields/budget/dates, valid empty reads, same-client stored ad links, missing-row acknowledgements and redacted storage errors passed.');
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
