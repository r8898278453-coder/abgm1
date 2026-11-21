import assert from 'node:assert/strict';
import {DAILY_WORK_METRICS} from '../shared/dailyWorkReport';
import {projectClientReport,clientReportCsv,clientReportPublic,clientReportInput,createClientReport,clientReportTransition,issueClientLink} from '../shared/clientReports';
const s:any={id:'rps_'+'a'.repeat(32),companyId:'A',schemaVersion:4,date:'2026-11-16',revision:1,reason:'BASELINE',capturedAtMs:1794873600000,sourceGeneratedAtMs:1794873600000,contentHash:'b'.repeat(64),immutable:true,backlogDefinition:'AT_CAPTURE',report:{date:'2026-11-16',timeZone:'Asia/Kolkata',generatedAt:new Date(1794873600000).toISOString(),activity:Object.fromEntries(DAILY_WORK_METRICS.activity.map(k=>[k,3])),backlog:Object.fromEntries(DAILY_WORK_METRICS.backlog.map(k=>[k,2])),privateNotes:'PRIVATE_SOURCE',contact:'PRIVATE_CONTACT'}};
const p={snapshotId:s.id,sourceHash:s.contentHash,sourceRevision:1,title:'=Client title',clientSummary:'@FORMULA',privateNotes:'PRIVATE_NOTE',optionalMetrics:['growthAssessmentsSaved','websiteInquiries']};
const r=projectClientReport(s,'A','=Business',p);assert.deepEqual(r.activity.slice(0,3).map(m=>m.key),['completedJobs','failedJobs','pausedJobs']);assert.equal(r.backlog.length,6);for(const secret of ['PRIVATE_SOURCE','PRIVATE_CONTACT','PRIVATE_NOTE',s.id,s.companyId,s.contentHash])assert.equal(JSON.stringify(r).includes('"'+secret+'"'),false);assert.equal(r.activity[3].key,'websiteInquiries');assert.equal(r.activity[4].key,'growthAssessmentsSaved');const csv=clientReportCsv(r);assert.match(csv,/"'=Business"/);assert.match(csv,/"'=Client title"/);assert.match(csv,/"'@FORMULA"/);assert.match(csv,/backlog_at_capture/);assert.equal(csv.includes('PRIVATE_NOTE'),false);
for(const input of [{...p,sourceHash:'c'.repeat(64)},{...p,sourceRevision:2},{...p,snapshotId:'rps_'+'d'.repeat(32)},{...p,optionalMetrics:['websiteInquiries','websiteInquiries']},{...p,optionalMetrics:['completedJobs']},{...p,optionalMetrics:['secret']},{...p,title:'ab'},{...p,privateNotes:'\x00'},{...p,extra:1}])assert.throws(()=>projectClientReport(s,'A','Business',input));assert.throws(()=>projectClientReport(s,'B','Business',p));const old={...s,schemaVersion:1};assert.throws(()=>projectClientReport(old,'A','Business',p),/METRIC_UNAVAILABLE/);assert.equal(projectClientReport(old,'A','Business',{...p,optionalMetrics:[]}).coverageVersion,1);
for(const invalid of [{...r,privateNotes:'private'},{...r,activity:r.activity.filter(m=>m.key!=='failedJobs')},{...r,activity:r.activity.map(m=>({...m,label:'Claimed success'}))},{...r,backlog:r.backlog.slice(1)},{...r,date:'2026-02-31'},{...r,notice:'Guaranteed business growth'}])assert.equal(clientReportPublic.safeParse(invalid).success,false);
assert.equal(createClientReport.safeParse({...p,requestKey:'e'.repeat(64)}).success,true);assert.equal(clientReportInput.safeParse({...p,requestKey:'e'.repeat(64)}).success,false);for(const input of [{action:'APPROVE',expectedVersion:1,expectedPublicHash:'f'.repeat(64),privateNotes:'x'},{action:'APPROVE',expectedVersion:1},{action:'EDIT',expectedVersion:0,input:p},{action:'REVOKE',expectedVersion:1,force:true}])assert.equal(clientReportTransition.safeParse(input).success,false);for(const expiryDays of [0,31,1.5])assert.equal(issueClientLink.safeParse({expectedVersion:2,requestKey:'e'.repeat(64),expiryDays}).success,false);
console.log('Client reports: fixed mandatory failures/backlog, strict frozen source binding, old-coverage missing refusal, private-data exclusion, strict transitions, bounded expiry and spreadsheet-safe public CSV passed.');

const fromV5=projectClientReport({...s,schemaVersion:5},'A','=Business',p);
assert.deepEqual(fromV5,{...r,coverageVersion:5});
assert.throws(()=>projectClientReport({...s,schemaVersion:5},'A','Business',{...p,optionalMetrics:['appointmentOutcomesRecorded']}));

const fromV6=projectClientReport({...s,schemaVersion:6},'A','=Business',p);
assert.deepEqual(fromV6,{...fromV5,coverageVersion:6});
assert.throws(()=>projectClientReport({...s,schemaVersion:6},'A','Business',{...p,optionalMetrics:['emailDelivered']}));

assert.deepEqual(projectClientReport({...s,schemaVersion:7},'A','=Business',p),{...fromV6,coverageVersion:7});
assert.throws(()=>projectClientReport({...s,schemaVersion:7},'A','Business',{...p,optionalMetrics:['workflowWaitingReview']}));

assert.deepEqual(projectClientReport({...s,schemaVersion:8},'A','=Business',p),{...fromV6,coverageVersion:8});
assert.throws(()=>projectClientReport({...s,schemaVersion:8},'A','Business',{...p,optionalMetrics:['queueRetryDue']}));

assert.deepEqual(projectClientReport({...s,schemaVersion:9},'A','=Business',p),{...fromV6,coverageVersion:9});
assert.throws(()=>projectClientReport({...s,schemaVersion:9},'A','Business',{...p,optionalMetrics:['admissionPublished']}));

assert.deepEqual(projectClientReport({...s,schemaVersion:10},'A','=Business',p),{...fromV6,coverageVersion:10});
assert.throws(()=>projectClientReport({...s,schemaVersion:10},'A','Business',{...p,optionalMetrics:['facebookPublished']}));

assert.deepEqual(projectClientReport({...s,schemaVersion:11},'A','=Business',p),{...fromV6,coverageVersion:11});
assert.throws(()=>projectClientReport({...s,schemaVersion:11},'A','Business',{...p,optionalMetrics:['providerCheckMatched']}));

assert.deepEqual(projectClientReport({...s,schemaVersion:12},'A','=Business',p),{...fromV6,coverageVersion:12});
assert.throws(()=>projectClientReport({...s,schemaVersion:12},'A','Business',{...p,optionalMetrics:['legacyPlans']}));

assert.deepEqual(projectClientReport({...s,schemaVersion:13},'A','=Business',p),{...fromV6,coverageVersion:13});
assert.throws(()=>projectClientReport({...s,schemaVersion:13},'A','Business',{...p,optionalMetrics:['calendarSlotSaved']}));

assert.deepEqual(projectClientReport({...s,schemaVersion:14},'A','=Business',p),{...fromV6,coverageVersion:14});
assert.throws(()=>projectClientReport({...s,schemaVersion:14},'A','Business',{...p,optionalMetrics:['notificationsUnconfirmed']}));

assert.deepEqual(projectClientReport({...s,schemaVersion:15},'A','=Business',p),{...fromV6,coverageVersion:15});
assert.throws(()=>projectClientReport({...s,schemaVersion:15},'A','Business',{...p,optionalMetrics:['reviewContextUnavailable']}));

assert.deepEqual(projectClientReport({...s,schemaVersion:16},'A','=Business',p),{...fromV6,coverageVersion:16});
assert.throws(()=>projectClientReport({...s,schemaVersion:16},'A','Business',{...p,optionalMetrics:['digestCompactSummary']}));

assert.deepEqual(projectClientReport({...s,schemaVersion:17},'A','=Business',p),{...fromV6,coverageVersion:17});
assert.throws(()=>projectClientReport({...s,schemaVersion:17},'A','Business',{...p,optionalMetrics:['digestSelected']}));
