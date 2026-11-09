import assert from 'node:assert/strict';
import express from 'express';
import {registerWebsiteRoutes} from '../server/websiteRoutes';
import {WebsiteError} from '../shared/website';
const app=express();app.use(express.json());let writes=0,checks=0,fail=false,foreign=false,missing=false,unavailable=false;
const domain={id:'domain',company_id:'A',domain:'example.invalid',dns_txt_record:'challenge',status:'active',ssl_status:'active',private:'private-value'};
registerWebsiteRoutes(app,{
 auth:async req=>req.headers.authorization?{id:'fixture'}:null,access:async(_,company)=>({authorized:company==='A',status:403,company:{id:company}}),
 domains:async()=>{if(fail)throw new Error('private-storage');return [{...domain,company_id:foreign?'B':'A'}];},domain:async()=>missing?null:domain,
 create:async input=>{writes++;assert.deepEqual(input,{company_id:'A',domain:'example.invalid'});if(fail)throw new WebsiteError(409,'DOMAIN_CONFLICT','Domain registration conflicts with an existing record');return domain;},
 verify:async()=>{checks++;return {verified:true,unavailable,sslState:'UNVERIFIED'};},saveDns:async(company,id,proof)=>{writes++;assert.deepEqual([company,id,proof.dns_txt_record],['A','domain','challenge']);return missing?null:{...domain,status:'dns_verified',ssl_status:'unverified'};},
 remove:async(company,id)=>{writes++;assert.deepEqual([company,id],['A','domain']);return !missing;},config:async()=>{if(fail)throw new Error('private-storage');return missing?null:{company_id:foreign?'B':'A',hero_title:'Saved',custom_header_html:'private-header'};},
 save:async data=>{writes++;assert.deepEqual(data,{hero_title:'New',company_id:'A'});return data;},zip:async company=>{assert.equal(company.id,'A');return Buffer.from('fixture');}
});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
try{
 const base=`http://127.0.0.1:${(server.address() as any).port}`;
 async function request(path:string,status:number,method='GET',body?:any,auth=true){const response=await fetch(base+path,{method,headers:{...(auth?{Authorization:'fixture'}:{}),'Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})});assert.equal(response.status,status);assert.equal(response.headers.get('cache-control'),'no-store');if(response.headers.get('content-type')?.includes('zip'))return null;const data=await response.json();assert.ok(!JSON.stringify(data).includes('private-'));return data;}
 const path='/api/companies/A';await request(path+'/domains',401,'GET',undefined,false);await request('/api/companies/B/domains',403);await request(path+'/domains?company_id=B',400);
 for(const body of [{domain:'example.invalid',company_id:'B'},{domain:'https://example.invalid/path'},{domain:'127.0.0.1'},{domain:'a..invalid'}])await request(path+'/domains',400,'POST',body);
 for(const body of [{hero_title:'New',company_id:'B'},{id:'foreign',hero_title:'New'},{enable_whatsapp_cta:'false'},{primary_color:"';bad"},{custom_header_html:'<script/>'},{pages_json:'[]'},{}])await request(path+'/website/config',400,'PUT',body);
 assert.equal(writes,0);await request(path+'/website/config',200,'PUT',{hero_title:'New'});
 await request(path+'/domains',201,'POST',{domain:'EXAMPLE.INVALID.'});const read=await request(path+'/domains',200);assert.equal(read.domains[0].status,'pending_verification');assert.equal(read.domains[0].ssl_status,'unverified');
 await request(path+'/domains/domain/verify',400,'POST',{simulation:true});assert.equal(checks,0);
 const verified=await request(path+'/domains/domain/verify',200,'POST',{});assert.equal(verified.domain.status,'dns_verified');assert.equal(verified.domain.ssl_status,'unverified');
 unavailable=true;const before=writes;await request(path+'/domains/domain/verify',503,'POST',{});assert.equal(writes,before);unavailable=false;
 missing=true;await request(path+'/domains/domain/verify',404,'POST',{});await request(path+'/domains/domain',404,'DELETE');assert.equal((await request(path+'/website/config',200)).config,null);missing=false;
 await request(path+'/domains/domain',200,'DELETE');await request(path+'/website/export',200);
 foreign=true;await request(path+'/domains',503);await request(path+'/website/config',503);foreign=false;fail=true;await request(path+'/domains',409,'POST',{domain:'example.invalid'});await request(path+'/website/config',503);
 console.log('Website HTTP: authenticated scope, body-ID/unknown-field rejection, no effect before validation, DNS/SSL truth, storage/foreign ACK redaction and accurate missing deletion/config results passed.');
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
