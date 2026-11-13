import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import express from 'express';
import {registerWhatsAppWebhook,whatsAppWebhookBodyParser} from '../server/whatsAppWebhook';
import {resolveWhatsAppTenant} from '../server/whatsAppTenant';
import {readMessageDelivery} from '../server/messageDeliveryReceipts';

const integrations=[{company_id:'A',status:'connected',credentials:{phoneNumberId:'123',wabaId:'456'}}];
assert.equal(resolveWhatsAppTenant(integrations,'123','456'),'A');
assert.equal(resolveWhatsAppTenant(integrations,undefined,'456'),null);
assert.equal(resolveWhatsAppTenant(integrations,'123','999'),null);
assert.equal(resolveWhatsAppTenant([...integrations,{...integrations[0],company_id:'B'}],'123','456'),null);
assert.equal(resolveWhatsAppTenant([{...integrations[0],status:'error'}],'123','456'),null);
const sql={query:async()=>[[{status:'read',count:1,lastAt:3},{status:'sent',count:2,lastAt:4},{status:'failed',count:1,lastAt:5}]]} as any;
assert.deepEqual(await readMessageDelivery(sql,'A','id','123'),{delivery:'READ',receiptCount:4,conflicting:true,lastReceiptAtMs:5});
assert.equal((await readMessageDelivery(sql,'A','id',null)).delivery,'UNOBSERVED');

const app=express();app.use(express.json({limit:'2mb',strict:false,verify:(req,_,body)=>{(req as any).rawBody=Buffer.from(body);}}));app.use((req,_,next)=>{req.body={object:'tampered-parsed-body'};next();});
let secret:string|undefined='test-secret',storageFailure=false,unmapped=false,resolves=0;
const receipts:any[]=[],inbound:any[]=[];
registerWhatsAppWebhook(app,{secret:()=>secret,resolve:async()=>{resolves++;if(storageFailure)throw new Error('private-storage-detail');return unmapped?null:'A';},receipt:async(company,value)=>{receipts.push({company,...value});},inbound:async(company,message,contact,source)=>{inbound.push({company,id:message.id,name:contact?.profile?.name,source});}});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
try{
 const url=`http://127.0.0.1:${(server.address() as any).port}/api/whatsapp/webhook`;
 const timestamp=String(Math.floor(Date.now()/1000));
 const event=(id:string,status='delivered')=>({id,status,timestamp,recipient_id:'private-recipient',errors:status==='failed'?[{code:131026,message:'private-provider-detail'}]:undefined});
 const envelope=(statuses:any[],messages:any[]=[])=>({object:'whatsapp_business_account',entry:[{id:'456',changes:[{field:'messages',value:{metadata:{phone_number_id:'123'},statuses,messages,contacts:[{wa_id:'919999999999',profile:{name:'Fixture'}}]}}]}]});
 async function post(value:any,expected:number,signature?:string){const body=JSON.stringify(value);const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-Hub-Signature-256':signature??`sha256=${createHmac('sha256','test-secret').update(body).digest('hex')}`},body});assert.equal(response.status,expected);const data=await response.json();assert.ok(!JSON.stringify(data).includes('private-'));return data;}
 await post(envelope([event('id')]),403,'sha256='+'0'.repeat(64));assert.equal(resolves,0);
 secret=undefined;await post(envelope([event('id')]),503);secret='test-secret';
 await post(null,400);await post({object:'wrong',entry:[]},400);
 const batch=envelope([event('one'),event('two','read'),event('three','failed')],[{id:'inbound',timestamp,from:'919999999999',type:'text',text:{body:'private-text'}}]);
 batch.entry.push({id:'456',changes:[{field:'messages',value:{metadata:{phone_number_id:'123'},statuses:[event('four')],messages:[],contacts:[]}}]});
 assert.deepEqual(await post(batch,200),{status:'recorded',receipts:4,inbound:1,unmapped:0,ignored:0});assert.equal(resolves,1);assert.equal(receipts.length,4);assert.equal(inbound[0].name,'Fixture');assert.ok(!JSON.stringify(receipts).includes('private-'));
 const before=receipts.length;await post(envelope([event('valid'),{...event('invalid'),timestamp:'bad'}]),400);assert.equal(receipts.length,before);
 await post(envelope([event('valid')],[{id:'invalid-message',timestamp,from:'919999999999',type:'text',text:{body:{invalid:true}}}]),400);assert.equal(receipts.length,before);
 await post(envelope(Array.from({length:101},(_,i)=>event(String(i)))),400);assert.equal(receipts.length,before);
 await post(envelope([{...event('future'),timestamp:String(Math.floor(Date.now()/1000)+600)}]),400);
 const unknown=await post(envelope([event('unknown','future-provider-state')]),200);assert.equal(unknown.ignored,1);
 storageFailure=true;await post(envelope([event('retry')]),503);storageFailure=false;
 unmapped=true;assert.equal((await post(envelope([event('unmapped')]),503)).unmapped,1);assert.equal(receipts.length,before);
 unmapped=false;
 assert.equal(inbound[0].source.phoneNumberId,'123');assert.equal(inbound[0].source.wabaId,'456');assert.equal(inbound[0].source.occurredAtMs,Number(timestamp)*1000);
 const message={id:'timestamped',timestamp,from:'919999999999',type:'text',text:{body:'private-text'}};
 const recorded=inbound.length;await post(envelope([],[{...message,timestamp:undefined}]),400);await post(envelope([],[{...message,timestamp:String(Math.floor(Date.now()/1000)+600)}]),400);assert.equal(inbound.length,recorded);
 const duplicateProfiles=envelope([],[message]);duplicateProfiles.entry[0].changes[0].value.contacts.push({wa_id:'919999999999',profile:{name:'Other identity'}});await post(duplicateProfiles,200);assert.equal(inbound.at(-1).name,undefined);
 const contactOverflow=envelope([],[message]);contactOverflow.entry[0].changes[0].value.contacts=Array.from({length:101},()=>({wa_id:'919999999999',profile:{name:'Fixture'}}));await post(contactOverflow,400);
 const ignoredField=envelope([event('unsupported-field')]);ignoredField.entry[0].changes[0].field='account_update';assert.equal((await post(ignoredField,200)).ignored,1);
 await post({...envelope([],[]),padding:'x'.repeat(1024*1024)},413);
 console.log('WhatsApp receipts: strict signed raw body, complete bounded batch, prevalidation, exact unique sender scope, redacted storage retry, privacy and monotonic projection passed.');
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}

const bounded=express();let generalParses=0;bounded.use('/api/whatsapp/webhook',whatsAppWebhookBodyParser);bounded.use(express.json({limit:'5mb',verify:()=>{generalParses++;}}));bounded.post('/api/whatsapp/webhook',(req,res)=>res.json({raw:Buffer.isBuffer((req as any).rawBody),parsed:req.body.object==='fixture'}));const boundedServer=bounded.listen(0,'127.0.0.1');await new Promise<void>(r=>boundedServer.once('listening',r));try{const url=`http://127.0.0.1:${(boundedServer.address() as any).port}/api/whatsapp/webhook`;let response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"object":"fixture"}'});assert.equal(response.status,200);assert.deepEqual(await response.json(),{raw:true,parsed:true});assert.equal(generalParses,0);response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({padding:'x'.repeat(1024*1024)})});assert.equal(response.status,413);assert.equal(generalParses,0);response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:'private-invalid-json'});assert.equal(response.status,400);assert.ok(!JSON.stringify(await response.json()).includes('private-invalid-json'));console.log('Webhook body boundary: dedicated pre-JSON one-MiB cap, raw-byte capture, no general-parser fallback and redacted malformed JSON passed.');}finally{await new Promise<void>(r=>boundedServer.close(()=>r()));}
