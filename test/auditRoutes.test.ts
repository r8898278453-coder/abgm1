import assert from 'node:assert/strict';
import express from 'express';
import {registerAuditRoutes} from '../server/auditRoutes';
import {generateEvidenceBasedAudit} from '../server/auditEngine';
const configured=generateEvidenceBasedAudit({companyId:'A',businessProfile:{connectedAccounts:{googleBusiness:true}},reviews:[{id:'null-rating',rating:null,replied:false,reply_text:'local text'}]});
assert.ok(configured.find(item=>item.category==='google'&&!item.resolved&&item.status==='MANUAL_ACTION_REQUIRED'));
assert.ok(!configured.find(item=>item.id.includes('low_rating')));assert.ok(configured.find(item=>item.id.includes('unreplied')));
const app=express();app.use(express.json());let reads=0,fail=false;
registerAuditRoutes(app,{auth:async req=>req.headers.authorization?{id:'actor'} as any:null,access:async(_,company)=>({authorized:company==='A',status:403}),read:async company=>{reads++;if(fail)throw new Error('private-sql-secret');return generateEvidenceBasedAudit({companyId:company,businessProfile:{connectedAccounts:{googleBusiness:true}}});}});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
try{
 const port=(server.address() as any).port;
 async function call(path:string,status:number,method='GET',body?:any,auth=true){const res=await fetch(`http://127.0.0.1:${port}/api/companies/${path}`,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'fixture'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});assert.equal(res.status,status);return {data:await res.json(),cache:res.headers.get('cache-control')};}
 await call('A/audit',401,'GET',undefined,false);await call('B/audit',403);await call('A/audit?actor=x',400);
 await call('A/audit/scan',400,'POST',{force:true});await call('A/audit/x/resolve',400,'POST',{action:'invented'});assert.equal(reads,0);
 const snapshot=await call('A/audit',200);assert.equal(snapshot.cache,'no-store');assert.equal(snapshot.data.persisted,false);assert.equal(snapshot.data.auditItems[0].source,'Business Profile Configuration');
 const scan=await call('A/audit/scan',200,'POST');assert.deepEqual(scan.data.auditItems.map((item:any)=>item.id),snapshot.data.auditItems.map((item:any)=>item.id));
 const id=scan.data.auditItems[0].id;const guidance=await call(`A/audit/${id}/resolve`,200,'POST',{action:'remediate'});assert.equal(guidance.data.remediationExecuted,false);assert.equal(guidance.data.auditItem.resolved,false);
 await call('A/audit/unknown/resolve',404,'POST',{});fail=true;assert.ok(!JSON.stringify((await call('A/audit',503)).data).includes('private-sql-secret'));
 console.log('Audit routes: tenant/auth/strict requests, current configuration is unverified, unknown rating not low, no remediation writes, fresh scan and redacted unavailability passed.');
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
