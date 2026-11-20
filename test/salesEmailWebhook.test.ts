import {parseSalesEmailReply} from '../server/salesEmailReplies';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import express from 'express';
import type {Pool} from 'mysql2/promise';
import {parseSalesEmailReceipt} from '../server/salesEmailReceipts';
import {registerSalesEmailWebhook,salesEmailWebhookBodyParser} from '../server/salesEmailWebhook';

const now=Date.parse('2026-11-21T00:00:00Z');
const key=Buffer.alloc(32,73),secret='whsec_'+key.toString('base64');
const app=express();
app.use('/api/webhooks/resend/:companyId',salesEmailWebhookBodyParser);
app.use(express.json());
let lookup=0,toggle=true,drop=false;
const pool={query:async(_sql:string,[company]:string[])=>{
 lookup++;
 if(drop)throw new Error('PRIVATE DB ERROR');
 return [company==='A'?[{company_id:company,provider:'transactional_email',status:'saved',credentials:{provider:'resend',resendWebhookSecret:secret}}]:[]];
}} as unknown as Pool;
registerSalesEmailWebhook(app,{pool:async()=>pool,clock:()=>now,enabled:()=>toggle});
const server=app.listen(0,'127.0.0.1');
await new Promise<void>(resolve=>server.once('listening',resolve));
const origin='http://127.0.0.1:'+(server.address() as {port:number}).port;
const id='msg_fixture',stamp=String(now/1000);
function header(body:string,ts=stamp){
 return {'content-type':'application/json','svix-id':id,'svix-timestamp':ts,
  'svix-signature':'v1,'+createHmac('sha256',key).update(id+'.'+ts+'.'+body).digest('base64')};
}
const send=async(body:string,status:number,headers:Record<string,string>=header(body),url='/api/webhooks/resend/A')=>{
 const result=await fetch(origin+url,{method:'POST',body,headers});
 assert.equal(result.status,status);
 return result.json();
};
try{
 const ignored=JSON.stringify({type:'email.opened',data:{email_id:'private'}});
 toggle=false;await send(ignored,503);toggle=true;
 await send(ignored,400,header(ignored),'/api/webhooks/resend/A?company=B');
 await send(ignored,403,header(ignored,String(now/1000-301)));
 await send(ignored,403,header(ignored,String(now/1000+301)));
 await send('x'.repeat(65537),413);
 await send(ignored,400,{...header(ignored),'content-encoding':'gzip'});
 assert.equal(lookup,0);
 await send(ignored+' ',403,header(ignored));
 await send(ignored,403,header(ignored),'/api/webhooks/resend/B');
 assert.deepEqual(await send(ignored,200),{status:'ignored'});
 assert.deepEqual(await send(ignored,200,{...header(ignored),'svix-signature':'v2,ignored '+header(ignored)['svix-signature']}),{status:'ignored'});
 await send('{malformed',400);
 const invalid=JSON.stringify({type:'email.delivered',created_at:new Date(now).toISOString(),data:{email_id:'invalid'}});
 await send(invalid,400);
 drop=true;assert.deepEqual(await send(ignored,503),{error:'EMAIL_WEBHOOK_UNAVAILABLE'});
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}

const envelope={type:'email.bounced',created_at:new Date(now).toISOString(),data:{
 email_id:'baf8e852-130b-4c16-a13c-3fc2b8b69a04',from:'Fixture <sender@example.invalid>',
 to:['CUSTOMER@EXAMPLE.INVALID'],bounce:{type:'Permanent',message:'PRIVATE PROVIDER DETAILS'},
}};
const parsed=parseSalesEmailReceipt(envelope,now);
assert.equal(parsed?.kind,'BOUNCED');
assert.equal(parsed?.suppresses,true);
assert.equal(parseSalesEmailReceipt({...envelope,data:{...envelope.data,bounce:{type:'Transient'}}},now)?.suppresses,false);
assert.equal(parseSalesEmailReceipt({...envelope,type:'email.received'},now),null);
assert.equal(parseSalesEmailReceipt({...envelope,type:'email.complained'},now)?.suppresses,true);
assert.equal(parseSalesEmailReceipt({...envelope,type:'email.suppressed'},now)?.suppresses,true);
assert.equal(parseSalesEmailReceipt({...envelope,type:'email.delivered'},now)?.suppresses,false);
assert.equal(JSON.stringify(parsed).includes('PRIVATE'),false);
assert.equal(JSON.stringify(parsed).includes('@'),false);
for(const bad of [
 {...envelope,data:{...envelope.data,to:['one@example.invalid','two@example.invalid']}},
 {...envelope,data:{...envelope.data,from:'invalid\r\n@example.invalid'}},
 {...envelope,created_at:'2026-11-21T00:06:00Z'},
 {...envelope,created_at:'2026-11-21'},
])assert.throws(()=>parseSalesEmailReceipt(bad,now));
console.log('Sales email webhook: default-off, method scope, bounded raw body, signed bytes, timestamp window, tenant secret, payload validation, unsupported-event no-op, redacted failures and hard/soft bounce classification passed.');

const incoming={...envelope,type:'email.received',data:{...envelope.data,to:['b'.repeat(64)+'@reply.example.invalid']}};
assert.equal(parseSalesEmailReply(incoming,now)?.dispatchKey,'b'.repeat(64));
assert.equal(parseSalesEmailReply({...incoming,data:{...incoming.data,to:['manual@reply.example.invalid']}},now),null);
assert.throws(()=>parseSalesEmailReply({...incoming,data:{...incoming.data,to:['first@example.invalid','second@example.invalid']}},now));
assert.throws(()=>parseSalesEmailReply({...incoming,data:{...incoming.data,email_id:'invalid'}},now));
assert.throws(()=>parseSalesEmailReply({...incoming,created_at:'2026-11-21T00:06:00Z'},now));
assert.throws(()=>parseSalesEmailReply({...incoming,data:{...incoming.data,from:'Customer\r\n <customer@example.invalid>'}},now));
