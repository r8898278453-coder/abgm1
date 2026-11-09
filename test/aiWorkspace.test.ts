import assert from 'node:assert/strict';
import express from 'express';
import {requireAiWorkspace} from '../server/aiWorkspace';
import {generateAiContentSchema} from '../server/validation';
assert.equal(generateAiContentSchema.parse({companyId:'B',businessName:'B name',category:'Services'}).companyId,'B');
const app=express();app.use(express.json());let downstream=0,reads=0,fail=false;
app.post('/ai',requireAiWorkspace({auth:async req=>req.headers.authorization?{id:'actor'} as any:null,resolve:async(_,id)=>id==='foreign'?{status:403,companyId:null}:{status:200,companyId:id||'A'},company:async id=>{reads++;if(fail)throw new Error('private-config-value');return id==='missing'?null:{id,name:`${id} authoritative`,category:'Service',city:'Pune'};}}),(req,res)=>{downstream++;res.json({companyId:req.body.companyId,name:req.body.businessName,city:req.body.city});});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
try{
 const port=(server.address() as any).port;
 async function post(body:any,status:number,auth=true){const res=await fetch(`http://127.0.0.1:${port}/ai`,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'fixture'}:{})},body:JSON.stringify(body)});assert.equal(res.status,status);return res.json();}
 await post({companyId:'B'},401,false);await post({companyId:'foreign'},403);await post({companyId:'A',company_id:'B'},400);await post({companyId:[]},400);assert.equal(reads,0);assert.equal(downstream,0);
 assert.deepEqual(await post({companyId:'B',businessName:'Wrong A name',city:'Wrong city'},200),{companyId:'B',name:'B authoritative',city:'Pune'});
 assert.equal((await post({},200)).companyId,'A');await post({companyId:'missing'},404);fail=true;assert.ok(!JSON.stringify(await post({companyId:'B'},503)).includes('private-config-value'));assert.equal(downstream,2);
 console.log('AI workspace: selected B remains B, authoritative identity replaces browser branding, unauthorized/invalid scope blocks provider work, legacy default and redacted errors passed.');
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
