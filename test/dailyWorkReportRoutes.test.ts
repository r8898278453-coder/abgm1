import {loadDailyWorkDigest,formatDailyWorkDigest} from '../server/dailyWorkDigest';
import assert from 'node:assert/strict';
import express from 'express';
import {registerDailyWorkReport} from '../server/dailyWorkReportRoutes';
import {dailyWorkReportCsv,platformDateKey,platformDayBounds} from '../shared/dailyWorkReport';
assert.equal(platformDateKey(Date.parse('2026-11-02T20:00:00Z')),'2026-11-03');
assert.deepEqual(platformDayBounds('2026-11-03'),{start:Date.parse('2026-11-02T18:30:00Z'),end:Date.parse('2026-11-03T18:30:00Z')});
for(const day of ['2026-02-30','2026-13-01','bad','2026-11-03T00:00:00Z','0001-01-01'])assert.throws(()=>platformDayBounds(day));
const digestReport={date:'2026-11-02',timeZone:'Asia/Kolkata' as const,generatedAt:'2026-11-03T02:30:00Z',activity:{completedJobs:3,failedJobs:1,pausedJobs:2,approvedPosts:1,rescheduledPosts:0,admittedPosts:0,controlChanges:0,messageRequests:0,apiAcceptedMessages:0,websiteInquiries:0,inquiryAlertsAccepted:0,knowledgeStored:0,knowledgeExtractionsSettled:0,knowledgeExtractionsBlocked:0,knowledgeApprovals:0,knowledgeWithdrawals:0,knowledgeDeleted:0,websiteImportsQueued:0,websiteImportsCommitted:0,websiteImportsWithFailures:0,websiteImportsPaused:0,websiteImportsCancelled:0},backlog:{waitingJobs:4,runningJobs:0,failedJobs:1,pendingApprovals:2,uncertainPublications:1,unconfirmedMessages:0,inquiryAlertsNotAttempted:0,inquiryAlertsUnconfirmed:0,knowledgeAwaitingApproval:0,knowledgeExtractionRunning:0,knowledgeExtractionBlocked:0,websiteImportsWaiting:0,websiteImportsRunning:0,websiteImportsFailed:0}};
const csv=dailyWorkReportCsv(digestReport);
assert.ok(!dailyWorkReportCsv({...digestReport,activity:{...digestReport.activity,evil:'=HYPERLINK("bad")'} as any}).includes('HYPERLINK'));
assert.match(csv,/"activity","websiteInquiries","0"/);assert.match(csv,/"current_backlog","inquiryAlertsNotAttempted","0"/);assert.match(csv,/"activity","admittedPosts","0"/);assert.match(csv,/"current_backlog","waitingJobs","4"/);assert.equal(csv.split('\r\n').length,38);
assert.match(formatDailyWorkDigest(digestReport),/Admitted posts: 0; publishing control changes: 0/);
assert.match(formatDailyWorkDigest(digestReport),/Knowledge: 0 originals stored/);assert.throws(()=>formatDailyWorkDigest({...digestReport,activity:{...digestReport.activity,knowledgeStored:undefined}} as any));
const workDigest=await loadDailyWorkDigest('owned',Date.parse('2026-11-03T02:30:00Z'),async(company,date)=>{assert.equal(company,'owned');assert.equal(date,'2026-11-02');return digestReport;});
assert.ok(workDigest.available);assert.match(workDigest.text,/2026-11-02 IST/);assert.match(workDigest.text,/Completed jobs: 3/);assert.match(formatDailyWorkDigest(digestReport),/Current backlog: 4 waiting/);
const unavailableDigest=await loadDailyWorkDigest('owned',Date.parse('2026-11-03T02:30:00Z'),async()=>{throw new Error('private-secret');});assert.equal(unavailableDigest.available,false);assert.ok(!unavailableDigest.text.includes('private-secret'));assert.ok(!unavailableDigest.text.includes('Completed jobs: 0'));
const deferredDigest=await loadDailyWorkDigest('owned',Date.parse('2026-11-03T02:30:00Z'),async()=>{throw new Error('Must not read after budget');},()=>false);assert.equal(deferredDigest.deferred,true);
await assert.rejects(async()=>formatDailyWorkDigest({...digestReport,activity:{...digestReport.activity,websiteInquiries:undefined}} as any));
const app=express();let calls=0,fail=false;
registerDailyWorkReport(app,{
 getAuthUserFromRequest:async req=>req.headers.authorization?{id:'actor'} as any:null,
 verifyCompanyWorkspaceAccess:async(_,company)=>({authorized:company==='owned',status:403}),
 read:async(company,date)=>{calls++;assert.equal(company,'owned');if(fail)throw new Error('private-database-value');return {date,timeZone:'Asia/Kolkata',generatedAt:new Date().toISOString(),activity:{completedJobs:1,failedJobs:1,pausedJobs:1,approvedPosts:1,rescheduledPosts:1,admittedPosts:0,controlChanges:0,messageRequests:0,apiAcceptedMessages:0,websiteInquiries:0,inquiryAlertsAccepted:0,knowledgeStored:0,knowledgeExtractionsSettled:0,knowledgeExtractionsBlocked:0,knowledgeApprovals:0,knowledgeWithdrawals:0,knowledgeDeleted:0,websiteImportsQueued:0,websiteImportsCommitted:0,websiteImportsWithFailures:0,websiteImportsPaused:0,websiteImportsCancelled:0},backlog:{waitingJobs:2,runningJobs:0,failedJobs:0,pendingApprovals:1,uncertainPublications:1,unconfirmedMessages:0,inquiryAlertsNotAttempted:0,inquiryAlertsUnconfirmed:0,knowledgeAwaitingApproval:0,knowledgeExtractionRunning:0,knowledgeExtractionBlocked:0,websiteImportsWaiting:0,websiteImportsRunning:0,websiteImportsFailed:0}};},
});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
try{
 const port=(server.address() as any).port;
 async function get(company:string,query:string,status:number,auth=true){const response=await fetch(`http://127.0.0.1:${port}/api/companies/${company}/daily-work-report${query}`,{headers:auth?{Authorization:'fixture'}:{}});assert.equal(response.status,status);return response.json();}
 await get('owned','',401,false);await get('foreign','?date=2026-11-03',403);
 for(const query of ['?date=bad','?date=2026-02-30','?date=2026-11-03&date=2026-11-04','?date=2026-11-03&actor=forged'])await get('owned',query,400);
 assert.equal(calls,0);assert.equal((await get('owned','?date=2026-11-03',200)).report.date,'2026-11-03');
 assert.equal((await get('owned','',200)).report.date,platformDateKey());
 fail=true;assert.ok(!JSON.stringify(await get('owned','?date=2026-11-03',503)).includes('private-database-value'));
 console.log('Daily work report: fixed IST boundaries, strict dates, auth/workspace scope, query rejection, default date and redacted unavailability passed.');
}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}

assert.match(csv,/\"activity\",\"websiteImportsQueued\",\"0\"/);assert.match(csv,/\"current_backlog\",\"websiteImportsWaiting\",\"0\"/);assert.match(formatDailyWorkDigest(digestReport),/Website imports: 0 queued; 0 snapshot groups committed/);
for(const metric of ['websiteImportsQueued', 'websiteImportsCommitted', 'websiteImportsWithFailures', 'websiteImportsPaused', 'websiteImportsCancelled']){assert.throws(()=>dailyWorkReportCsv({...digestReport,activity:{...digestReport.activity,[metric]:undefined}} as any));}

for(const metric of ['websiteImportsWaiting','websiteImportsRunning','websiteImportsFailed'])assert.throws(()=>dailyWorkReportCsv({...digestReport,backlog:{...digestReport.backlog,[metric]:undefined}} as any));
