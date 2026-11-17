import assert from 'node:assert/strict';
import express from 'express';
import {registerCriticalAlertRoutes} from '../server/criticalAlertRoutes';
const app=express();let reads=0,fail=false,foreign=false;
registerCriticalAlertRoutes(app,{auth:async req=>req.headers.authorization?{id:req.headers.authorization}:null,access:async(u,c)=>({authorized:u.id==='viewer'&&c==='A',status:403}),read:async company=>{reads++;if(fail)throw new Error('PRIVATE_BACKEND_DETAILS');return{companyId:foreign?'foreign':company,incidents:[],reservations:[],truncated:false};}});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
try{
 const origin=`http://127.0.0.1:${(server.address() as any).port}`;
 for(const [actor,path,status]of [[null,'/A/critical-alerts',401],['viewer','/B/critical-alerts',403],['viewer','/A/critical-alerts?recipient=private',400],['viewer','/A/critical-alerts?before=forged',400],['viewer','/A/critical-alerts',200]] as const){const res=await fetch(origin+'/api/companies'+path,{headers:actor?{Authorization:actor}:{}});assert.equal(res.status,status);assert.equal(res.headers.get('cache-control'),'no-store');}assert.equal(reads,1);
 for(const mode of ['failure','foreign']){fail=mode==='failure';foreign=mode==='foreign';const res=await fetch(origin+'/api/companies/A/critical-alerts',{headers:{Authorization:'viewer'}});assert.equal(res.status,503);const body=await res.json();assert.equal(body.error,'CRITICAL_ALERT_EVIDENCE_UNAVAILABLE');assert.equal(JSON.stringify(body).includes('PRIVATE'),false);}
 const write=await fetch(origin+'/api/companies/A/critical-alerts',{method:'POST',headers:{Authorization:'viewer'}});assert.equal(write.status,404);
}finally{await new Promise<void>(r=>server.close(()=>r()));}
console.log('Critical alert read API: auth/client scope before reads, query refusal, private no-store metadata, malformed/foreign evidence unavailable and no write route passed.');
