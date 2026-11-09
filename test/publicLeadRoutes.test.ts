import assert from 'node:assert/strict';
import express from 'express';
import {registerPublicLeadRoutes} from '../server/publicLeadRoutes';
import {PublicLeadError} from '../shared/publicLead';
const app=express();app.use(express.json());let writes=0,notifies=0,reads=0,mode='new',available=true;
const id='12345678-1234-4234-8234-123456789012';
registerPublicLeadRoutes(app,{rateLimit:(_,__,next)=>next(),pool:async()=>available?{}:null,resolve:async(_,token)=>{assert.equal(token,'fixture-token');return {id:'A',name:'Fixture'};},score:()=>42,
 save:async(_,company,token,key,input)=>{writes++;assert.equal(company,'A');assert.equal(token,'fixture-token');assert.equal(input.phone,'+919999999999');if(mode==='conflict')throw new PublicLeadError(409,'INQUIRY_CONFLICT','Inquiry reference conflict');return {companyId:mode==='foreign'?'B':'A',requestId:key,leadId:'lead-receipt',created:mode!=='duplicate',private:'private-body'};},
 notify:async()=>{notifies++;if(mode==='notify-failure')throw new Error('private-alert-error');},receipt:async()=>{reads++;return {status:'RECEIVED',leadId:'lead-receipt',private:'private-staff-notes'};}});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
try{
 const origin=`http://127.0.0.1:${(server.address() as any).port}`;const body={publicFormToken:'fixture-token',requestId:id,name:'Visitor',phone:'+91 (99999) 99999'};
 async function request(status:number,input:any,path='/api/public/leads'){const response=await fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});assert.equal(response.status,status);assert.equal(response.headers.get('cache-control'),'no-store');const data=await response.json();assert.ok(!JSON.stringify(data).includes('private-'));return data;}
 for(const invalid of [{...body,company_id:'B'},{...body,requestId:'bad'},{...body,formToken:'different'},{...body,name:''},{...body,phone:'++1234567'},{...body,notes:'x'.repeat(12001)}])await request(400,invalid);
 await request(400,body,'/api/public/leads?token=secret');assert.equal(writes,0);
 const saved=await request(201,body);assert.deepEqual(saved.lead,{id:'lead-receipt'});assert.equal(saved.requestId,id);assert.equal(saved.idempotent,true);assert.equal(notifies,1);
 mode='duplicate';const duplicate=await request(200,body);assert.equal(duplicate.duplicate,true);assert.equal(notifies,1);
 const receipt=await request(200,{publicFormToken:'fixture-token',requestId:id},'/api/public/leads/receipt');assert.deepEqual(receipt.receipt,{status:'RECEIVED',leadId:'lead-receipt'});assert.equal(reads,1);
 await request(400,{publicFormToken:'fixture-token'},'/api/public/leads/receipt');
 mode='notify-failure';await request(201,body);assert.equal(notifies,2);
 mode='conflict';await request(409,body);mode='foreign';await request(503,body);
 mode='new';const legacy=await request(201,{...body,requestId:undefined},'/api/public/lead');assert.equal(legacy.requestId,null);assert.equal(legacy.idempotent,false);
 const before=writes;await request(200,{...body,_hp:'bot'});assert.equal(writes,before);
 available=false;await request(503,body);assert.equal(writes,before);
 console.log('Public intake HTTP: strict bounded payload, exact token-alias agreement, query credential rejection, durable availability, minimal receipts, duplicate/conflict/legacy semantics and alert failure cannot negate confirmed lead passed.');
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
