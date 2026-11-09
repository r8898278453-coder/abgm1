import assert from 'node:assert/strict';
import express from 'express';
import {registerObservationHistoryRoutes} from '../server/observationHistoryRoutes';
const app=express();let calls=0,mode='empty';
const read=async(company:string,key:string,limit:number)=>{calls++;assert.equal(limit,50);if(mode==='failed')throw new Error('private-database-detail');return mode==='empty'?[]:[{company_id:mode==='foreign'?'B':company,keyword:key,competitor_id:key,raw_payload:'private-token',source_evidence:'private-url',position:null}];};
registerObservationHistoryRoutes(app,{auth:async req=>req.headers.authorization?{id:'fixture'}:null,access:async(_,id)=>({authorized:id==='A',status:403}),ranks:read,competitors:read});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
try{
 const base=`http://127.0.0.1:${(server.address() as any).port}`;
 const get=async(path:string,status:number,auth=true)=>{const response=await fetch(base+path,{headers:auth?{Authorization:'fixture'}:{}});assert.equal(response.status,status);assert.equal(response.headers.get('cache-control'),'no-store');const body=await response.json();assert.ok(!JSON.stringify(body).includes('private-'));return body;};
 await get('/api/companies/A/keywords/dentist/history',401,false);await get('/api/companies/B/competitors/id/history',403);await get('/api/companies/A/keywords/dentist/history?companyId=B',400);assert.equal(calls,0);
 const empty=await get('/api/companies/A/keywords/100%25%20dentist/history',200);assert.deepEqual(empty.history,[]);assert.equal(empty.keyword,'100% dentist');mode='rows';await get('/api/companies/A/competitors/id/history',200);mode='foreign';await get('/api/companies/A/keywords/dentist/history',503);mode='failed';await get('/api/companies/A/competitors/id/history',503);
 console.log('Observation history HTTP: auth/scope before reads, literal percent keyword decoded once, recent50 window, actual empty results and no raw provider/database details passed.');
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
