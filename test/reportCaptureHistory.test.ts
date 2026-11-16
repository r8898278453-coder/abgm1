import assert from 'node:assert/strict';
import express from 'express';
import {captureHistoryQuery,readCaptureHistory} from '../server/reportCaptureHistory';
import {validateCaptureHistory,captureHistoryCsv} from '../shared/reportCaptureHistory';
import {registerCaptureScheduleRoutes} from '../server/reportCaptureScheduleRoutes';
assert.deepEqual(captureHistoryQuery({}),{state:'ALL'});
for(const q of [{state:['FAILED']},{state:'failed'},{recipient:'private'},{before:'../x'},{limit:'10000'}])assert.throws(()=>captureHistoryQuery(q));
const row={id:'rcr_'+'a'.repeat(32),state:'FAILED',date:'2026-11-16',createdAtMs:1700000000000,snapshotId:null,reason:'RECOVERY_REQUIRED',jobStatus:null};
const page={companyId:'A',state:'FAILED',runs:[row],nextCursor:null};validateCaptureHistory(page,'A','FAILED');
for(const v of [{...page,companyId:'B'},{...page,state:'ALL'},{...page,runs:[row,row]},{...page,runs:[{...row,date:'2026-02-30'}]},{...page,nextCursor:'cursor'},{...page,runs:[{...row,jobStatus:'DELIVERED'}]}])assert.throws(()=>validateCaptureHistory(v,'A','FAILED'));
const csv=captureHistoryCsv({...page,companyId:' \t=FORMULA'},' \t=FORMULA','FAILED');assert.ok(csv.includes('"\' \t=FORMULA"'));assert.ok(csv.includes('IST'));assert.equal(csv.includes('actor_id'),false);
let reads=0;const app=express();registerCaptureScheduleRoutes(app,{auth:async req=>req.headers.authorization?{id:req.headers.authorization}:null,access:async(u,c)=>({authorized:c==='A'&&u.id==='viewer',status:403}),history:async(c,q)=>{reads++;assert.equal(captureHistoryQuery(q).state,'FAILED');return page;},read:async()=>({}),save:async()=>({})});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));try{const origin=`http://127.0.0.1:${(server.address() as any).port}`;for(const [actor,company,query,status] of [[null,'A','',401],['viewer','B','',403],['viewer','A','?state=FAILED',200],['viewer','A','?state=FAILED&state=SKIPPED',400],['viewer','A','?recipient=private',400]] as const){const res=await fetch(`${origin}/api/companies/${company}/report-capture-history${query}`,{headers:actor?{Authorization:actor}:{}});assert.equal(res.status,status);assert.equal(res.headers.get('cache-control'),'no-store');}assert.equal(reads,1);}finally{await new Promise<void>(r=>server.close(()=>r()));}
const unreachable={getConnection:async()=>{throw new Error('SQL should not be reached');}} as any;
for(const before of ['e30',Buffer.from(JSON.stringify({v:1,company:'B',state:'ALL',time:0,id:row.id})).toString('base64url')])await assert.rejects(readCaptureHistory(unreachable,'A',{before}),{status:400});
console.log('Capture history: strict query/tenant/filter/row validation, private no-store authorization, pre-SQL cursor rejection and formula-safe page CSV passed.');
