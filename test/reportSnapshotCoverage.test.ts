import {NOTIFICATION_DECISION_ACTIVITY} from '../shared/notificationDecisionReporting';
import {NOTIFICATION_DAILY_ACTIVITY,NOTIFICATION_DAILY_BACKLOG} from '../shared/notificationDailyReporting';
import {CALENDAR_PLAN_DAILY_ACTIVITY} from '../shared/calendarPlanDailyReporting';
import {SCHEDULE_HISTORY_ACTIVITY} from '../shared/scheduleHistoryReporting';
import {PUBLISHING_RECONCILIATION_ACTIVITY} from '../shared/publishingReconciliationReporting';
import {PLATFORM_DAILY_ACTIVITY} from '../shared/platformDailyReporting';
import {PUBLICATION_ADMISSION_OUTCOMES} from '../shared/publicationDailyReporting';
import {QUEUE_DAILY_ACTIVITY,QUEUE_DAILY_BACKLOG} from '../shared/queueDailyReporting';
import {WORKFLOW_DAILY_ACTIVITY,WORKFLOW_DAILY_BACKLOG} from '../shared/workflowDailyReporting';
import {EMAIL_WORK_ACTIVITY,EMAIL_WORK_BACKLOG} from '../shared/emailWorkReporting';
import {canonicalSnapshotReportV3,SNAPSHOT_METRICS_V3} from '../shared/reportSnapshotSchemaV3';
import {SALES_ACTIVITY} from '../shared/salesActivityReporting';
import assert from 'node:assert/strict';
import {DAILY_WORK_METRICS} from '../shared/dailyWorkReport';
import {canonicalSnapshotReportV1,SNAPSHOT_METRICS_V1} from '../shared/reportSnapshotSchemaV1';
import {canonicalSnapshotReportV2,SNAPSHOT_METRICS_V2} from '../shared/reportSnapshotSchemaV2';
import {reportSnapshotCoverage} from '../shared/reportSnapshotCoverage';
import {compareReportSnapshots,reportSnapshotCsv,validateReportSnapshot} from '../shared/reportSnapshots';
const source={date:'2026-11-16',timeZone:'Asia/Kolkata',generatedAt:'2026-11-17T03:00:00Z',activity:Object.fromEntries(DAILY_WORK_METRICS.activity.map(k=>[k,1])),backlog:Object.fromEntries(DAILY_WORK_METRICS.backlog.map(k=>[k,2])),privateBody:'PRIVATE'};
const old=canonicalSnapshotReportV1(source),current=canonicalSnapshotReportV2(source);assert.equal('reportSnapshotsStored' in old.activity,false);assert.equal(current.activity.reportSnapshotsStored,1);assert.ok(!JSON.stringify(current).includes('PRIVATE'));assert.equal(SNAPSHOT_METRICS_V2.activity.length,SNAPSHOT_METRICS_V1.activity.length+8);assert.equal(SNAPSHOT_METRICS_V2.backlog.length,SNAPSHOT_METRICS_V1.backlog.length+4);assert.throws(()=>reportSnapshotCoverage(16));
for(const key of SNAPSHOT_METRICS_V2.activity.filter(k=>!SNAPSHOT_METRICS_V1.activity.includes(k)))for(const v of [undefined,-1,1.5,'1'])assert.throws(()=>canonicalSnapshotReportV2({...source,activity:{...source.activity,[key]:v}}));
const meta={id:'rps_'+'a'.repeat(32),companyId:'A',date:source.date,revision:1,reason:'BASELINE',capturedAtMs:Date.now(),sourceGeneratedAtMs:Date.parse(source.generatedAt),contentHash:'a'.repeat(64),immutable:true,backlogDefinition:'AT_CAPTURE'};
const v1={...meta,schemaVersion:1,report:old},v2={...meta,schemaVersion:2,report:current};validateReportSnapshot(v1,'A');validateReportSnapshot(v2,'A');assert.equal(reportSnapshotCsv(v1).includes('reportCapturesPending'),false);assert.match(reportSnapshotCsv(v2),/"2","1","2026-11-16"/);assert.ok(reportSnapshotCsv(v2).includes('reportCapturesPending'));assert.throws(()=>compareReportSnapshots(v1,{...v2,revision:2,reason:'REVIEW'}),/COVERAGE_MISMATCH/);assert.deepEqual(compareReportSnapshots(v2,{...v2,revision:2,reason:'REVIEW',report:{...current,activity:{...current.activity,reportCapturesCompleted:3}}}).map(d=>[d.metric,d.delta]),[['reportCapturesCompleted',2]]);
console.log('Frozen V2: fixed expanded coverage, legacy V1 exclusion/export, malformed new metrics and unknown version refusal, exact-version comparisons and private projection passed.');

const sales=canonicalSnapshotReportV3(source),v3={...meta,schemaVersion:3,report:sales};validateReportSnapshot(v3,'A');assert.equal(SNAPSHOT_METRICS_V3.activity.length,SNAPSHOT_METRICS_V2.activity.length+11);assert.deepEqual(SNAPSHOT_METRICS_V3.backlog,SNAPSHOT_METRICS_V2.backlog);
for(const key of Object.keys(SALES_ACTIVITY)){assert.equal(key in old.activity,false);assert.equal(key in current.activity,false);assert.equal(sales.activity[key],1);assert.ok(reportSnapshotCsv(v3).includes('"'+key+'"'));for(const n of [undefined,-1,1.5,'1',NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>canonicalSnapshotReportV3({...source,activity:{...source.activity,[key]:n}}));}
assert.equal('privateBody' in sales,false);assert.throws(()=>compareReportSnapshots(v2,{...v3,revision:2,reason:'REVIEW'}),/COVERAGE_MISMATCH/);assert.deepEqual(compareReportSnapshots(v3,{...v3,revision:2,reason:'REVIEW',report:{...sales,activity:{...sales.activity,prospectRowsImported:4}}}).map(d=>[d.metric,d.delta]),[['prospectRowsImported',3]]);assert.match(reportSnapshotCsv(v3),/"3","1","2026-11-16"/);
console.log('Frozen V3: eleven fixed sales counters, V1/V2 exclusion, strict numeric/private projection, exact-version deltas and CSV coverage passed.');

const v4={...meta,schemaVersion:4,report:reportSnapshotCoverage(4).canonical(source)};validateReportSnapshot(v4,'A');assert.ok(reportSnapshotCsv(v4).includes('growthObservationsRecorded'));assert.equal(reportSnapshotCsv(v3).includes('growthObservationsRecorded'),false);assert.throws(()=>compareReportSnapshots(v3,{...v4,revision:2,reason:'REVIEW'}),/COVERAGE_MISMATCH/);

const v5={...meta,schemaVersion:5,report:reportSnapshotCoverage(5).canonical(source)};
validateReportSnapshot(v5,'A');
assert.match(reportSnapshotCsv(v5),/"appointmentBookingRevisions","1"/);
assert.match(reportSnapshotCsv(v5),/"backlog_at_capture","appointmentOutcomesAwaiting","2"/);
assert.equal(reportSnapshotCsv(v4).includes('appointmentOutcomesAwaiting'),false);
assert.throws(()=>compareReportSnapshots(v4,{...v5,revision:2,reason:'REVIEW'}),/COVERAGE_MISMATCH/);
const revision={...v5,revision:2,reason:'LATE_RECORDS',report:{...v5.report,backlog:{...v5.report.backlog,appointmentOutcomesAwaiting:1}}};
assert.deepEqual(compareReportSnapshots(v5,revision).map(({metric,delta})=>[metric,delta]),[['appointmentOutcomesAwaiting',-1]]);
assert.throws(()=>validateReportSnapshot({...revision,report:{...revision.report,activity:{...revision.report.activity,appointmentOutcomesRecorded:-1}}},'A'));

const v6={...meta,schemaVersion:6,report:reportSnapshotCoverage(6).canonical({...source,activity:{...source.activity,privateEmailBody:'PRIVATE_EMAIL'}})};
validateReportSnapshot(v6,'A');
for(const [section,registry] of [['activity',EMAIL_WORK_ACTIVITY],['backlog',EMAIL_WORK_BACKLOG]] as const){
 for(const key of Object.keys(registry)){
  assert.equal(key in v5.report[section],false);
  assert.ok(reportSnapshotCsv(v6).includes('"'+key+'"'));
  for(const value of [undefined,-1,1.5,'1',NaN,Number.MAX_SAFE_INTEGER+1]){
   assert.throws(()=>reportSnapshotCoverage(6).canonical({...source,[section]:{...source[section],[key]:value}}));
  }
 }
}
assert.ok(!JSON.stringify(v6).includes('PRIVATE_EMAIL'));
assert.throws(()=>compareReportSnapshots(v5,{...v6,revision:2,reason:'REVIEW'}),/COVERAGE_MISMATCH/);
assert.deepEqual(compareReportSnapshots(v6,{...v6,revision:2,reason:'REVIEW',report:{...v6.report,activity:{...v6.report.activity,emailDelivered:4}}}).map(({metric,delta})=>[metric,delta]),[['emailDelivered',3]]);

const v7={...meta,schemaVersion:7,report:reportSnapshotCoverage(7).canonical(source)};
validateReportSnapshot(v7,'A');
for(const [section,keys] of [['activity',WORKFLOW_DAILY_ACTIVITY],['backlog',WORKFLOW_DAILY_BACKLOG]] as const){
 for(const key of Object.keys(keys)){
  assert.equal(key in v6.report[section],false);
  assert.ok(reportSnapshotCsv(v7).includes('"'+key+'"'));
  for(const value of [undefined,-1,'1',Number.MAX_SAFE_INTEGER+1]){
   assert.throws(()=>reportSnapshotCoverage(7).canonical({...source,[section]:{...source[section],[key]:value}}));
  }
 }
}
assert.throws(()=>compareReportSnapshots(v6,{...v7,revision:2,reason:'REVIEW'}),/COVERAGE_MISMATCH/);

const v8={...meta,schemaVersion:8,report:reportSnapshotCoverage(8).canonical(source)};
validateReportSnapshot(v8,'A');
for(const [section,keys] of [['activity',QUEUE_DAILY_ACTIVITY],['backlog',QUEUE_DAILY_BACKLOG]] as const){
 for(const key of Object.keys(keys)){
  assert.equal(key in v7.report[section],false);
  assert.ok(reportSnapshotCsv(v8).includes('"'+key+'"'));
  for(const value of [undefined,-1,'1',Number.MAX_SAFE_INTEGER+1]){
   assert.throws(()=>reportSnapshotCoverage(8).canonical({...source,[section]:{...source[section],[key]:value}}));
  }
 }
}
assert.throws(()=>compareReportSnapshots(v7,{...v8,revision:2,reason:'REVIEW'}),/COVERAGE_MISMATCH/);

const v9={...meta,schemaVersion:9,report:reportSnapshotCoverage(9).canonical(source)};
validateReportSnapshot(v9,'A');
for(const key of Object.keys(PUBLICATION_ADMISSION_OUTCOMES)){
 assert.equal(key in v8.report.activity,false);
 assert.ok(reportSnapshotCsv(v9).includes('"'+key+'"'));
 for(const value of [undefined,-1,'1',Number.MAX_SAFE_INTEGER+1]){
  assert.throws(()=>reportSnapshotCoverage(9).canonical({...source,activity:{...source.activity,[key]:value}}));
 }
}
assert.throws(()=>compareReportSnapshots(v8,{...v9,revision:2,reason:'REVIEW'}),/COVERAGE_MISMATCH/);

const v10={...meta,schemaVersion:10,report:reportSnapshotCoverage(10).canonical(source)};
validateReportSnapshot(v10,'A');
for(const key of Object.keys(PLATFORM_DAILY_ACTIVITY)){
 assert.equal(key in v9.report.activity,false);
 assert.ok(reportSnapshotCsv(v10).includes('"'+key+'"'));
 for(const value of [undefined,-1,'1',Number.MAX_SAFE_INTEGER+1]){
  assert.throws(()=>reportSnapshotCoverage(10).canonical({...source,activity:{...source.activity,[key]:value}}));
 }
}
assert.throws(()=>compareReportSnapshots(v9,{...v10,revision:2,reason:'REVIEW'}),/COVERAGE_MISMATCH/);

const v11={...meta,schemaVersion:11,report:reportSnapshotCoverage(11).canonical(source)};
validateReportSnapshot(v11,'A');
for(const key of Object.keys(PUBLISHING_RECONCILIATION_ACTIVITY)){
 assert.equal(key in v10.report.activity,false);
 assert.ok(reportSnapshotCsv(v11).includes('"'+key+'"'));
 for(const value of [undefined,-1,'1',Number.MAX_SAFE_INTEGER+1]){
  assert.throws(()=>reportSnapshotCoverage(11).canonical({...source,activity:{...source.activity,[key]:value}}));
 }
}
assert.throws(()=>compareReportSnapshots(v10,{...v11,revision:2,reason:'REVIEW'}),/COVERAGE_MISMATCH/);

const v12={...meta,schemaVersion:12,report:reportSnapshotCoverage(12).canonical(source)};
validateReportSnapshot(v12,'A');
for(const key of Object.keys(SCHEDULE_HISTORY_ACTIVITY)){
 assert.equal(key in v11.report.activity,false);
 assert.ok(reportSnapshotCsv(v12).includes('"'+key+'"'));
 for(const value of [undefined,-1,'1',Number.MAX_SAFE_INTEGER+1]){
  assert.throws(()=>reportSnapshotCoverage(12).canonical({...source,activity:{...source.activity,[key]:value}}));
 }
}
assert.throws(()=>compareReportSnapshots(v11,{...v12,revision:2,reason:'REVIEW'}),/COVERAGE_MISMATCH/);

const v13={...meta,schemaVersion:13,report:reportSnapshotCoverage(13).canonical(source)};
validateReportSnapshot(v13,'A');
for(const key of Object.keys(CALENDAR_PLAN_DAILY_ACTIVITY)){
 assert.equal(key in v12.report.activity,false);
 assert.ok(reportSnapshotCsv(v13).includes('"'+key+'"'));
 for(const value of [undefined,-1,'1',Number.MAX_SAFE_INTEGER+1]){
  assert.throws(()=>reportSnapshotCoverage(13).canonical({...source,activity:{...source.activity,[key]:value}}));
 }
}
assert.throws(()=>compareReportSnapshots(v12,{...v13,revision:2,reason:'REVIEW'}),/COVERAGE_MISMATCH/);

const v14={...meta,schemaVersion:14,report:reportSnapshotCoverage(14).canonical(source)};
validateReportSnapshot(v14,'A');
for(const [section,keys] of [['activity',NOTIFICATION_DAILY_ACTIVITY],['backlog',NOTIFICATION_DAILY_BACKLOG]] as const){
 for(const key of Object.keys(keys)){
  assert.equal(key in v13.report[section],false);
  assert.ok(reportSnapshotCsv(v14).includes('"'+key+'"'));
  for(const value of [undefined,-1,'1',Number.MAX_SAFE_INTEGER+1]){
   assert.throws(()=>reportSnapshotCoverage(14).canonical({...source,[section]:{...source[section],[key]:value}}));
  }
 }
}
assert.throws(()=>compareReportSnapshots(v13,{...v14,revision:2,reason:'REVIEW'}),/COVERAGE_MISMATCH/);

const v15={...meta,schemaVersion:15,report:reportSnapshotCoverage(15).canonical(source)};
validateReportSnapshot(v15,'A');
for(const key of Object.keys(NOTIFICATION_DECISION_ACTIVITY)){
 assert.equal(key in v14.report.activity,false);
 assert.ok(reportSnapshotCsv(v15).includes('"'+key+'"'));
 for(const value of [undefined,-1,'1',Number.MAX_SAFE_INTEGER+1]){
  assert.throws(()=>reportSnapshotCoverage(15).canonical({...source,activity:{...source.activity,[key]:value}}));
 }
}
assert.throws(()=>compareReportSnapshots(v14,{...v15,revision:2,reason:'REVIEW'}),/COVERAGE_MISMATCH/);
