import mysql from 'mysql2/promise';
import assert from 'node:assert/strict';
import {runDispatcherCycle,dispatcherSummary} from '../server/dispatcherCycle';
import {createWorkBudget} from '../server/workBudget';
import {DISPATCHER_STAGES,dispatcherOrder,parseDispatcherStages,dispatcherCursor} from '../shared/dispatcher';
assert.deepEqual([0,1,2,3].map(i=>dispatcherOrder(i)[0]),['autoPublish','outbox','digest','reminders']);
for(let group=0;group<4;group++){const order=dispatcherOrder(group);assert.equal(order.indexOf('queue'),order.indexOf('autoPublish')+1);}
assert.throws(()=>dispatcherOrder(4));assert.throws(()=>parseDispatcherStages('{"private-stage":"OBSERVED"}'));assert.throws(()=>parseDispatcherStages('{"queue":"SUCCESS"}'));
assert.equal(dispatcherCursor('123'),'123');for(const cursor of ['0','01','-1','18446744073709551616',1])assert.throws(()=>dispatcherCursor(cursor));
let now=0;const calls:string[]=[],checkpoints:string[]=[];
const stages=Object.fromEntries(DISPATCHER_STAGES.map(stage=>[stage,async()=>{calls.push(stage);if(stage==='queue')throw new Error('private-sql-body');return stage==='digest'?{available:false}:{processed:1,private:'private-customer'};}])) as any;
const cycle=await runDispatcherCycle(0,stages,async(stage,state)=>{checkpoints.push(`${stage}:${state}`);},createWorkBudget(100,()=>now));
assert.equal(cycle.states.queue,'FAILED');assert.equal(cycle.states.digest,'UNAVAILABLE');assert.equal(cycle.states.reminders,'OBSERVED');assert.equal(cycle.partial,true);assert.equal(calls.length,5);assert.ok(!JSON.stringify(cycle.results.queue).includes('private-'));assert.ok(checkpoints.indexOf('queue:STARTED')<checkpoints.indexOf('queue:FAILED'));
assert.deepEqual(dispatcherSummary({processedCount:2,failedCount:1,jobs:[{token:'private-token'}],workerId:'private-worker',reason:'private-error'}),{processedCount:2,failedCount:1});
now=0;calls.length=0;
const slow=await runDispatcherCycle(2,stages,async(stage,state)=>{if(stage==='digest'&&state==='STARTED')now=101;},createWorkBudget(100,()=>now));assert.equal(calls.length,0);assert.equal(slow.states.digest,'DEFERRED');assert.equal(slow.budget.deferredStages.length,5);
now=0;calls.length=0;await assert.rejects(runDispatcherCycle(0,stages,async()=>{throw new Error('checkpoint unavailable');},createWorkBudget(100,()=>now)),/checkpoint unavailable/);assert.equal(calls.length,0);
let gateCalls=0;const observed=await runDispatcherCycle(0,Object.fromEntries(DISPATCHER_STAGES.map(stage=>[stage,async gate=>{gateCalls++;assert.equal(gate(),true);if(stage==='queue')now=101;return {processed:1};}])) as any,async()=>{},createWorkBudget(100,()=>now));assert.equal(gateCalls,2);assert.equal(observed.states.queue,'OBSERVED');assert.equal(observed.states.outbox,'DEFERRED');
console.log('Dispatcher cycle: persistent-order contract, isolated stage failure/unavailability, checkpoint-before-effect and post-checkpoint budget recheck, active settlement/next-stage deferral and count-only privacy passed.');

now=0;const failedWork=await runDispatcherCycle(0,Object.fromEntries(DISPATCHER_STAGES.map(stage=>[stage,async()=>({failedCount:stage==='queue'?1:0})])) as any,async()=>{},createWorkBudget(100,()=>now));assert.equal(failedWork.states.queue,'OBSERVED');assert.equal(failedWork.partial,true);

// Exercise the composed service's journal-failure response without any live database/provider.
Object.assign(process.env,{NODE_ENV:'test',DB_HOST:'fixture.invalid',DB_NAME:'dispatcher-fixture',DB_USER:'fixture',DB_PASSWORD:'fixture'});
const originalFactory=mysql.createPool;let claimFails=false;
const connection={beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},query:async(sql:string)=>{if(claimFails)throw new Error('private-claim-fault');if(sql.includes('SELECT next_group'))return [[{next_group:0}]];if(sql.includes('FLOOR(UNIX_TIMESTAMP'))return [[{slot:'123'}]];if(sql.includes('SELECT slot_key'))return [[]];return [{affectedRows:1}];}};
(mysql as any).createPool=()=>({getConnection:async()=>connection,query:async()=>{throw new Error('private-journal-fault');},end:async()=>{}});
try{
 const {runSchedulerTick}=await import('../server/scheduler');const uncertain=await runSchedulerTick();assert.equal(uncertain.status,'UNCONFIRMED');assert.equal((uncertain.queue as any).unconfirmed,true);assert.equal('deferred' in uncertain.queue,false);assert.deepEqual(uncertain.budget.deferredStages,[]);assert.ok(!JSON.stringify(uncertain).includes('private-'));
 claimFails=true;const unavailable=await runSchedulerTick();assert.equal(unavailable.status,'UNAVAILABLE');assert.equal((unavailable.queue as any).deferred,true);
}finally{(mysql as any).createPool=originalFactory;}
