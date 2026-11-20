import {SalesError} from '../server/salesWorkspace';
import assert from 'node:assert/strict';import express from 'express';import {registerTenantEmailRoutes} from '../server/tenantEmailRoutes';const app=express();app.use(express.json());let reads=0,domainReads=0,statusReads=0;registerTenantEmailRoutes(app,{auth:async r=>r.headers.authorization==='owner'?{id:'owner'}:null,access:async(_,c)=>{reads++;return{authorized:c==='A',status:403};},verifyDomain:async(_,company)=>{
 domainReads++;
 if(company!=='A')throw new SalesError(403,'TENANT_EMAIL_ACCESS_DENIED');
 return {provider:'resend',domain:'example.invalid',state:'VERIFIED_DOMAIN',checkedAtMs:Date.now()};
},readDomain:async(_,company)=>{
 statusReads++;
 if(company!=='A')throw new SalesError(403,'TENANT_EMAIL_ACCESS_DENIED');
 return {state:'UNCHECKED'};
}});const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));try{const url='http://127.0.0.1:'+(server.address() as any).port+'/api/integrations/email/test-send';const call=async(b:any,status:number,auth=true)=>{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'owner'}:{})},body:JSON.stringify(b)});assert.equal(r.status,status);assert.equal(r.headers.get('cache-control'),'no-store');return r.json();};await call({companyId:'A'},401,false);await call({},400);assert.equal(reads,0);await call({companyId:'A',credentials:'not accepted'},400);await call({companyId:'B'},403);const result=await call({companyId:'A',recipientEmail:'fixture@example.invalid'},503);assert.equal(result.code,'TENANT_EMAIL_UNAVAILABLE');assert.equal(result.success,false);const origin=new URL(url).origin;
const domain=async(company:string,body:unknown,status:number,auth=true,query='')=>{
 const response=await fetch(origin+'/api/companies/'+company+'/tenant-email/verify-domain'+query,{
  method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'owner'}:{})},body:JSON.stringify(body),
 });
 assert.equal(response.status,status);
 assert.equal(response.headers.get('cache-control'),'no-store');
 return response.json();
};
await domain('A',{},401,false);
await domain('A',{recipientEmail:'private@example.invalid'},400);
await domain('A',{credentials:{apiKey:'private'}},400);
await domain('A',[],400);
await domain('A',{},400,true,'?companyId=B');
assert.equal(domainReads,0);
await domain('B',{},403);
const checked=await domain('A',{},200);
assert.equal(checked.domain.state,'VERIFIED_DOMAIN');
assert.equal(checked.companyId,'A');
assert.equal(domainReads,2);
const status=async(company:string,expected:number,auth=true,query='')=>{
 const response=await fetch(origin+'/api/companies/'+company+'/tenant-email/domain-status'+query,{headers:auth?{Authorization:'owner'}:{}});
 assert.equal(response.status,expected);
 assert.equal(response.headers.get('cache-control'),'no-store');
 return response.json();
};
await status('A',401,false);
await status('A',400,true,'?companyId=B');
assert.equal(statusReads,0);
await status('B',403);
assert.deepEqual((await status('A',200)).domain,{state:'UNCHECKED'});
assert.equal(domainReads,2);
console.log('Tenant email: authenticated explicit scope, no foreign/malformed authority, no-store and unavailable sender integration; platform email never invoked.');}finally{await new Promise<void>(r=>server.close(()=>r()));}
