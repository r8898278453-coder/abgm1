import {validateScopedCollection,boundedRecordedNumber} from '../shared/scopedCollection';
import assert from 'node:assert/strict';
import express from 'express';
import {registerLeadStageRoutes} from '../server/leadStageRoutes';
import {updateLeadStageSchema,createLeadSchema,validateBody} from '../server/validation';
assert.deepEqual(validateScopedCollection({success:true,companyId:'A',leads:[]},'leads','A'),[]);
for(const response of [{success:false,companyId:'A',leads:[]},{success:true,companyId:'B',leads:[]},{success:true,companyId:'A',leads:[{id:'x',company_id:'B'}]},{success:true,companyId:'A',leads:[{id:'x',company_id:'A'},{id:'x',company_id:'A'}]}])assert.throws(()=>validateScopedCollection(response,'leads','A'));
assert.equal(boundedRecordedNumber(0,0,100),0);assert.equal(boundedRecordedNumber(null,0,100),null);assert.equal(boundedRecordedNumber('bad',0,100),null);
assert.equal(updateLeadStageSchema.parse({stage:'opportunity'}).stage,'opportunity');assert.equal(updateLeadStageSchema.parse({stage:'proposal'}).stage,'proposal');
assert.equal(createLeadSchema.safeParse({name:'Fixture',phone:'9999999999',companyId:'B',company_id:'A'}).success,false);
const app=express();app.use(express.json());let writes=0,allow=true,fail=false;let stage='new';
registerLeadStageRoutes(app,{validate:validateBody(updateLeadStageSchema),auth:async req=>req.headers.authorization?{id:'actor'} as any:null,lead:async id=>id==='missing'?null:{id,company_id:id==='global'?null:'A',stage:stage as any},access:async()=>({authorized:allow,status:403}),update:async(_,next,company,expected)=>{assert.equal(company,'A');writes++;if(fail)throw new Error('private-sql-secret');if(expected&&expected!==stage)return false;stage=next;return true;}});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
try{
 const port=(server.address() as any).port;
 async function patch(id:string,body:any,status:number,auth=true){const res=await fetch(`http://127.0.0.1:${port}/api/leads/${id}/stage`,{method:'PATCH',headers:{'Content-Type':'application/json',...(auth?{Authorization:'fixture'}:{})},body:JSON.stringify(body)});assert.equal(res.status,status);return res.json();}
 await patch('lead',{stage:'qualified'},401,false);await patch('missing',{stage:'qualified'},404);await patch('global',{stage:'qualified'},409);await patch('lead',{stage:'qualified',companyId:'B'},403);allow=false;await patch('lead',{stage:'qualified'},403);allow=true;
 await patch('lead',{stage:'fabricated'},400);await patch('lead',{stage:'qualified',actor:'invented'},400);await patch('lead',{stage:'qualified',expectedStage:'lost'},409);assert.equal(writes,0);
 const result=await patch('lead',{stage:'opportunity',companyId:'A',expectedStage:'new'},200);assert.equal(result.lead.stage,'opportunity');assert.equal(result.lead.company_id,'A');assert.equal(writes,1);
 await patch('lead',{stage:'won',expectedStage:'new'},409);assert.equal(writes,1);await patch('lead',{stage:'proposal'},200);
 fail=true;assert.ok(!JSON.stringify(await patch('lead',{stage:'lost'},503)).includes('private-sql-secret'));
 console.log('Lead stages: shared stages, alias conflict rejection, tenant/auth/strict input, expected-stage conflicts, legacy compatibility and redacted persistence errors passed.');
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
