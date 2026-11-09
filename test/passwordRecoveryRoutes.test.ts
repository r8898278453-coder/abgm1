import assert from 'node:assert/strict';
import express from 'express';
import {passwordRecoveryUrl,registerPasswordRecoveryRoutes} from '../server/passwordRecoveryRoutes';
import {validateBody,forgotPasswordSchema,resetPasswordSchema} from '../server/validation';
const raw='a'.repeat(64);
assert.equal(new URL(passwordRecoveryUrl(raw,'https://canonical.example.invalid')).hostname,'canonical.example.invalid');
for(const origin of ['http://canonical.example.invalid','https://user:pass@example.invalid','https://example.invalid/path','https://example.invalid/?token=x','https://example.invalid/#x'])assert.throws(()=>passwordRecoveryUrl(raw,origin));
process.env.APP_URL='https://canonical.example.invalid';let known=true,configured=true,failSend=false,failConsume=false,valid=true,created=0,sent=0,consumed=0;let sentUrl='';
const app=express();app.use(express.json());registerPasswordRecoveryRoutes(app,{forgotLimit:(_,__,next)=>next(),forgotValidate:validateBody(forgotPasswordSchema),resetValidate:validateBody(resetPasswordSchema),configured:()=>configured,find:async()=>known?{id:'user'}:null,create:async(_,hash)=>{created++;assert.match(hash,/^[a-f0-9]{64}$/);assert.notEqual(hash,raw);return 'record';},send:async(_,url)=>{sent++;sentUrl=url;if(failSend)throw new Error('private-provider-token');return {success:false};},consume:async(hash)=>{consumed++;assert.match(hash,/^[a-f0-9]{64}$/);if(failConsume)throw new Error('private-sql-password');return valid?{userId:'user'}:null;},afterReset:async()=>{throw new Error('cleanup failed');}});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const origin=`http://127.0.0.1:${(server.address() as any).port}`;
try{
 const call=async(path:string,body:any,status:number)=>{const response=await fetch(origin+'/api/auth/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-Host':'attacker.example.invalid','X-Forwarded-Proto':'http'},body:JSON.stringify(body)});assert.equal(response.status,status);const text=await response.text();assert.ok(!/private-|password_hash|salt|userId/.test(text));return text;};
 const request={email:'fixture@example.invalid'},first=await call('forgot-password',request,200);assert.equal(new URL(sentUrl).origin,'https://canonical.example.invalid');assert.equal(new URL(sentUrl).searchParams.get('token')?.length,64);
 known=false;assert.equal(await call('forgot-password',request,200),first);assert.equal(created,1);known=true;failSend=true;assert.equal(await call('forgot-password',request,200),first);assert.equal(sent,2);
 configured=false;await call('forgot-password',request,503);configured=true;
 const reset={token:raw,newPassword:'New-password-fixture'};await call('reset-password',reset,200);assert.equal(consumed,1);valid=false;await call('reset-password',reset,400);failConsume=true;await call('reset-password',reset,503);await call('reset-password',{token:'short',newPassword:'short'},400);assert.equal(consumed,3);
 console.log('Password recovery HTTP: configured origin excludes Host injection, known/unknown/provider-failure acknowledgements match, no delivery claim, validation before consume, atomic success survives cleanup, invalid/uncertain outcomes and redaction passed.');
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
