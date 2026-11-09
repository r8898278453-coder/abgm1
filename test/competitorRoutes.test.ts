import assert from 'node:assert/strict';
import express from 'express';
import {registerCompetitorRoutes} from '../server/competitorRoutes';
import {competitorVersion,competitorAdd} from '../shared/competitors';
import {ObservationError} from '../server/observationStore';
assert.equal(competitorAdd.safeParse({name:'Other',rating:'4.5'}).success,false);assert.equal(competitorAdd.safeParse({name:'Other',reviewsCount:1.2}).success,false);
const app=express();app.use(express.json());let writes=0,reads=0,calls=0,fail=false,unknown=false,failRefresh=false,version=0;
const item={id:'c',name:'Other',rating:4,provider:'manual',lastObservedAt:'2026-11-09T00:00:00Z',rawPayload:{secret:'private-fixture'}};
registerCompetitorRoutes(app,{auth:async req=>req.headers.authorization?{}:null,access:async(_,company)=>({authorized:company==='A',status:403}),read:async()=>{reads++;return [item];},fetch:async()=>{calls++;return {dataClassification:unknown?'UNAVAILABLE':'LIVE'};},mutate:async(company,command)=>{writes++;if(fail||failRefresh&&command.kind==='refresh')throw new Error('private-fixture');if(command.observation?.dataClassification==='UNAVAILABLE')throw new ObservationError('COMPETITOR_OBSERVATION_UNAVAILABLE',503);const previousVersion=String(version++);return {companyId:company,competitors:[item],version:String(version),previousVersion,competitor:item};}});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const origin=`http://127.0.0.1:${(server.address() as any).port}`;
try{
 const call=async(path:string,method:string,status:number,body?:any,auth=true)=>{const response=await fetch(origin+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'fixture'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});assert.equal(response.status,status);const result=await response.json();if(status>=400)assert.ok(!JSON.stringify(result).includes('private-fixture'));return result;};
 await call('/api/companies/A/competitors','POST',401,{name:'Other'},false);await call('/api/companies/B/competitors','POST',403,{name:'Other'});assert.equal(writes+calls+reads,0);
 await call('/api/companies/A/competitors/c','PUT',428,{name:'Other'});await call('/api/companies/A/competitors/c','PUT',400,{expectedVersion:competitorVersion(item)});await call('/api/companies/A/competitors','POST',400,{name:'Other',rating:7});await call('/api/companies/A/competitors/c/refresh','POST',400,{companyId:'B'});assert.equal(writes+calls+reads,0);
 unknown=true;const added=await call('/api/companies/A/competitors','POST',200,{name:'Other',refreshNow:true});assert.equal(added.refreshStatus,'UNAVAILABLE');assert.equal(added.revisionDelta,1);assert.equal(calls,1);unknown=false;
 const refreshed=await call('/api/companies/A/competitors','POST',200,{name:'Other',refreshNow:true});assert.equal(refreshed.refreshStatus,'SAVED');assert.equal(refreshed.revisionDelta,2);assert.equal(BigInt(refreshed.version)-BigInt(refreshed.previousVersion),2n);
 failRefresh=true;const uncertain=await call('/api/companies/A/competitors','POST',200,{name:'Other',refreshNow:true});assert.equal(uncertain.refreshStatus,'UNCONFIRMED');assert.equal(uncertain.revisionUnconfirmed,true);failRefresh=false;
 await call('/api/companies/A/competitors/c','DELETE',200,{expectedVersion:competitorVersion(item)});fail=true;await call('/api/companies/A/competitors/c','DELETE',503,{expectedVersion:competitorVersion(item)});fail=false;
 unknown=true;await call('/api/companies/A/competitors/c/refresh','POST',503);
 const batch=await call('/api/companies/A/competitors/refresh-all','POST',200);assert.equal(batch.partial,true);assert.equal(batch.results[0].status,'UNAVAILABLE');assert.ok(!JSON.stringify(batch).includes('private-fixture'));
 console.log('Competitor routes: auth/scope before reads or provider, strict bounded input, revision precondition, manual creation, failed refresh and partial batch outcomes, safe errors and metadata projection passed.');
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
