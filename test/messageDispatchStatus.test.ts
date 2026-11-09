import {isConfirmedMessageAcceptance} from '../shared/whatsAppOutcomes';
import assert from 'node:assert/strict';
import express from 'express';
import {registerMessageDispatchStatus} from '../server/messageDispatchStatus';
import {messageRequestKey} from '../src/services/messageRequestKeys';
assert.equal(isConfirmedMessageAcceptance({success:true,status:'API_ACCEPTED',requestKey:'a'.repeat(64),messageId:'id'},'a'.repeat(64)),true);assert.equal(isConfirmedMessageAcceptance({success:true,status:'API_ACCEPTED',requestKey:'b'.repeat(64),messageId:'id'},'a'.repeat(64)),false);assert.equal(isConfirmedMessageAcceptance({success:true,requestKey:'a'.repeat(64),messageId:'id'},'a'.repeat(64)),false);
const previous=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');const values=new Map<string,string>();Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)}});
try{
 const ordered=await messageRequestKey('actor:order',{z:1,a:{b:2,a:3}});assert.equal((await messageRequestKey('actor:order',{a:{a:3,b:2},z:1})).key,ordered.key);
 const first=await messageRequestKey('actor:A',{message:'private-message'}),repeat=await messageRequestKey('actor:A',{message:'private-message'}),other=await messageRequestKey('actor:B',{message:'private-message'});assert.equal(first.key,repeat.key);assert.notEqual(first.key,other.key);assert.match(first.key,/^[a-f0-9]{64}$/);assert.ok(!JSON.stringify([...values]).includes('private-message'));first.clear();assert.notEqual((await messageRequestKey('actor:A',{message:'private-message'})).key,first.key);
 Object.defineProperty(globalThis,'sessionStorage',{configurable:true,get:()=>{throw new Error('denied');}});await assert.rejects(messageRequestKey('actor:C',{}),/storage unavailable/);
}finally{if(previous)Object.defineProperty(globalThis,'sessionStorage',previous);else delete (globalThis as any).sessionStorage;}
const app=express();let reads=0,fail=false;
registerMessageDispatchStatus(app,{auth:async req=>req.headers.authorization?{id:'actor'} as any:null,access:async(_,company)=>({authorized:company==='A',status:403}),read:async(_,key)=>{reads++;if(fail)throw new Error('private-sql-detail');return key==='b'.repeat(64)?null:{status:'UNKNOWN',providerId:null,needsReview:true};}});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
try{
 const port=(server.address() as any).port;async function get(company:string,key:string,status:number,auth=true){const response=await fetch(`http://127.0.0.1:${port}/api/companies/${company}/message-dispatch/${key}`,{headers:auth?{Authorization:'fixture'}:{}});assert.equal(response.status,status);return {cache:response.headers.get('cache-control'),body:await response.json()};}
 await get('A','a'.repeat(64),401,false);await get('B','a'.repeat(64),403);await get('A','bad',400);await get('A','a'.repeat(64)+'?actor=x',400);assert.equal(reads,0);
 const found=await get('A','a'.repeat(64),200);assert.equal(found.cache,'no-store');assert.equal(found.body.dispatch.status,'UNKNOWN');await get('A','b'.repeat(64),404);fail=true;assert.ok(!JSON.stringify((await get('A','a'.repeat(64),503)).body).includes('private-sql'));
 console.log('Message status: scoped retry keys/private payload exclusion, auth/owner/strict lookup, no-store UNKNOWN metadata, missing rows and redacted failure passed.');
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
