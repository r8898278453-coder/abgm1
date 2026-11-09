import assert from 'node:assert/strict';
import express from 'express';
import {registerAdCampaignRoutes} from '../server/adCampaignRoutes';
const app=express();app.use(express.json());let reads=0,syncs=0,fail=false,foreign=false,foreignSync=false;
registerAdCampaignRoutes(app,{auth:async req=>req.headers.authorization?{id:'fixture'} as any:null,resolve:async(_,company)=>company==='B'?{status:403}:{companyId:company||'A',status:200},read:async company=>{reads++;if(fail)throw new Error('private-storage-detail');return [{id:'fixture',company_id:foreign?'B':company,raw_metrics_json:'private-legacy-token',unexpected:'private-extra-field'}];},sync:async(company,provider)=>{syncs++;assert.equal(company,'A');assert.equal(provider,'meta_ads');return {companyId:company,status:'PARTIAL',campaignsCount:1,message:'Saved1; more remain',campaigns:[{id:'saved',company_id:foreignSync?'B':company,raw_metrics_json:'private-legacy-token'}]};}});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
try{
 const origin=`http://127.0.0.1:${(server.address() as any).port}`;
 async function request(path:string,status:number,body?:any,auth=true){const response=await fetch(origin+path,{method:body?'POST':'GET',headers:{...(auth?{Authorization:'fixture'}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});assert.equal(response.status,status);const data=await response.json();assert.ok(!JSON.stringify(data).includes('private-'));return {data,cache:response.headers.get('cache-control')};}
 await request('/api/campaigns/external',401,undefined,false);await request('/api/campaigns/external?companyId=B',403);await request('/api/campaigns/external?companyId=A&company_id=B',400);await request('/api/campaigns/external?unknown=1',400);assert.equal(reads,0);
 const read=await request('/api/campaigns/external?company_id=A',200);assert.equal(read.data.companyId,'A');assert.equal(read.cache,'no-store');
 await request('/api/campaigns/external/sync',400,{companyId:'A',provider:'other'});await request('/api/campaigns/external/sync',400,{companyId:'A',company_id:'B'});assert.equal(syncs,0);
 const partial=await request('/api/campaigns/external/sync',200,{companyId:'A'});assert.equal(partial.data.success,false);assert.equal(partial.data.syncResult.campaignsCount,1);assert.equal(partial.data.companyId,'A');assert.equal(partial.cache,'no-store');
 foreignSync=true;await request('/api/campaigns/external/sync',503,{companyId:'A'});foreignSync=false;
 foreign=true;await request('/api/campaigns/external?companyId=A',503);foreign=false;fail=true;await request('/api/campaigns/external',503);
 console.log('Ad campaign routes: authenticated scope, default/aliases/conflict rejection, owner denial before work, no-store, partial acknowledgement and redacted unavailable/foreign collection passed.');
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
