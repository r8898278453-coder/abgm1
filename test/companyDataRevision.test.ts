import {workspaceDraft} from '../src/services/workspaceDraft';
import {canonicalJson} from '../shared/canonicalJson';
import {newCompanyProfile} from '../src/services/newCompanyProfile';
import assert from 'node:assert/strict';
import express from 'express';
import {registerCompanyDataRoutes} from '../server/companyDataRoutes';
import {createWorkspaceSaver} from '../src/services/workspaceSaver';
import {WorkspaceConflict,validWorkspaceRevision} from '../shared/workspaceRevision';
assert.equal(validWorkspaceRevision('18446744073709551615'),true);for(const invalid of ['01','-1','18446744073709551616',1,null])assert.equal(validWorkspaceRevision(invalid),false);
const newProfile=newCompanyProfile({id:'new',name:'Canonical'} as any,{category:'Industry',city:'Delhi',phone:'',website:'https://example.invalid'});assert.equal(newProfile.state,'');assert.equal(newProfile.country,'');assert.deepEqual(newProfile.services,[]);assert.equal(newProfile.connectedAccounts.website,false);assert.equal(newProfile.connectedAccounts.googleBusiness,false);
const draftState={business:{name:'Fixture'},keywords:[{id:'k',keyword:'fixture',rank:1}],competitors:[{id:'c',name:'Other',rating:5}],campaigns:[{id:'a',name:'Plan',clicks:99}],growthScore:{overall:100},actions:[{id:'observed'}],isAutopilotOn:true,isHolidayPaused:false};
const editable=workspaceDraft(draftState);assert.equal('growth_score' in editable,false);assert.equal('isAutopilotOn' in editable.engine_settings,false);assert.equal('rank' in editable.keywords[0],false);assert.equal('competitors' in editable,false);assert.equal('clicks' in editable.campaigns[0],false);
assert.equal(canonicalJson(editable),canonicalJson(workspaceDraft({...draftState,keywords:[{id:'k',keyword:'fixture',rank:99}],growthScore:{overall:0}})));
const observer=createWorkspaceSaver('3',()=>true,async()=>({version:'5'}));assert.equal(observer.observe('3','4'),true);assert.equal(observer.observe('3','5'),false);
const combined=createWorkspaceSaver('0',()=>true,async(_,expected)=>({version:String(BigInt(expected)+1n)}));assert.equal(combined.observe('0','2',2),true);assert.equal((await combined.enqueue({})).version,'3');
let finishObserved!:()=>void;const observing=createWorkspaceSaver('0',()=>true,async()=>{await new Promise<void>(resolve=>{finishObserved=resolve;});return {version:'1'};});const activeObserved=observing.enqueue({});await Promise.resolve();assert.equal(observing.observe('0','1'),false);finishObserved();await assert.rejects(activeObserved);await assert.rejects(observing.enqueue({}));
let current=true,release:()=>void=()=>{};const requests:any[]=[];const held=new Promise<void>(resolve=>{release=resolve;});
const saver=createWorkspaceSaver('0',()=>current,async(data,expected)=>{requests.push({data,expected});if(requests.length===1)await held;return {version:String(BigInt(expected)+1n)};});
const input={value:'original'},first=saver.enqueue(input);input.value='changed';const second=saver.enqueue({value:'second'});
await Promise.resolve();assert.equal(saver.pendingCount,2);assert.equal(requests.length,1);release();await Promise.all([first,second]);assert.equal(saver.pendingCount,0);assert.equal(requests[0].data.value,'original');assert.deepEqual(requests.map(x=>x.expected),['0','1']);
let sends=0;const uncertain=createWorkspaceSaver('3',()=>true,async()=>{sends++;throw new Error('Unconfirmed response');});await assert.rejects(uncertain.enqueue({}));await assert.rejects(uncertain.enqueue({}),/paused/);assert.equal(sends,1);
const mismatch=createWorkspaceSaver('3',()=>true,async()=>({version:'99'}));await assert.rejects(mismatch.enqueue({}),/unconfirmed/);await assert.rejects(mismatch.enqueue({}),/paused/);
current=false;await assert.rejects(saver.enqueue({}),/Obsolete/);assert.equal(requests.length,2);

const app=express();app.use(express.json());let version='0',writes=0,fail=false,race=false;
let stored:any={engine_settings:{legacy:'preserved',isHolidayPaused:true},growth_score:{overall:12},audit_items:[{id:'server-audit',resolved:false}],autonomous_actions:[{id:'server-action'}],keywords:[{id:'server-keyword',keyword:'fixture',currentRank:4}],business:{name:'Canonical'}};
registerCompanyDataRoutes(app,{auth:async req=>req.headers.authorization?{id:'actor'} as any:null,company:async id=>id==='missing'?null:{id,name:'Canonical',city:'Pune',category:'Service'} as any,access:async(_,company)=>({authorized:company==='A',status:403}),read:async()=>{if(fail)throw new Error('private-db-detail');return {data:stored,version};},save:async(_,data,expected)=>{writes++;if(race)throw new WorkspaceConflict();assert.equal(expected,version);stored=data;version=String(BigInt(version)+1n);return version;}});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
try{
 const origin=`http://127.0.0.1:${(server.address() as any).port}`;
 async function call(company:string,status:number,body?:any,auth=true){const response=await fetch(`${origin}/api/companies/${company}/data`,{method:body?'PUT':'GET',headers:{'Content-Type':'application/json',...(auth?{Authorization:'fixture'}:{})},...(body?{body:JSON.stringify(body)}:{})});assert.equal(response.status,status);const data=await response.json();assert.ok(!JSON.stringify(data).includes('private-'));return {data,cache:response.headers.get('cache-control')};}
 await call('A',401,undefined,false);await call('B',403);await call('missing',404);await call('A',428,{data:{}});await call('A',400,{data:{},expectedVersion:0});await call('A',400,{data:{},expectedVersion:'0',extra:true});assert.equal(writes,0);
 const snapshot=await call('A',200);assert.equal(snapshot.data.version,'0');assert.equal(snapshot.data.companyId,'A');assert.equal(snapshot.cache,'no-store');
 const saved=await call('A',200,{expectedVersion:'0',data:{engine_settings:{isHolidayPaused:false},business:{name:'Forged'},growth_score:{overall:100},audit_items:[{id:'server-audit',resolved:true}],autonomous_actions:[{id:'forged'}],keywords:[{keyword:'fixture',currentRank:1}],knowledge_base:{faqs:[{question:'Fixture',answer:'Answer'}]}}});
 assert.equal(saved.data.data.engine_settings.legacy,'preserved');assert.equal(saved.data.data.engine_settings.isHolidayPaused,false);assert.equal(saved.data.version,'1');assert.equal(saved.data.data.business.name,'Canonical');assert.equal(saved.data.data.growth_score.overall,12);assert.equal(saved.data.data.audit_items[0].resolved,false);assert.equal(saved.data.data.autonomous_actions[0].id,'server-action');assert.equal(saved.data.data.keywords[0].currentRank,4);
 await call('A',409,{expectedVersion:'0',data:{business:{phone:'stale'}}});assert.equal(writes,1);race=true;await call('A',409,{expectedVersion:'1',data:{}});assert.equal(version,'1');fail=true;await call('A',503);
 console.log('Workspace revision: server/client scope, required version, stale/concurrent rejection, protected observations, sequential immutable saves, unknown/mismatched acknowledgement pause and obsolete workspace fences passed.');
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}

// Isolated development fixtures exercise the compatibility exports, never cloud DB bindings.
for(const key of Object.keys(process.env))if(/^DB_|^DATABASE_URL$/.test(key))delete process.env[key];process.env.NODE_ENV='test';
const db=await import('../server/db');
await db.saveCompanyDataPayload('memory-A',{knowledge_base:{faqs:[]}});
const copyA:any=await db.getCompanyDataPayload('memory-A'),copyB:any=await db.getCompanyDataPayload('memory-A');
copyA.knowledge_base.faqs.push({question:'Committed'});assert.equal((await db.getCompanyDataPayload('memory-A') as any).knowledge_base.faqs.length,0);
await db.saveCompanyDataPayload('memory-A',copyA);await assert.rejects(db.saveCompanyDataPayload('memory-A',copyB),WorkspaceConflict);
await assert.rejects(db.saveCompanyDataPayload('memory-B',copyA),/scope mismatch/);assert.equal(await db.getCompanyDataPayload('memory-B'),null);
console.log('Workspace compatibility exports: defensive snapshots, stale internal writer rejection and cross-company snapshot rejection passed.');
