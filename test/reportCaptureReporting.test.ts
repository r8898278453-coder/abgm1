import assert from 'node:assert/strict';
import {CAPTURE_ACTIVITY,CAPTURE_BACKLOG} from '../shared/reportCaptureReporting';
import {DAILY_WORK_METRICS,dailyWorkReportCsv} from '../shared/dailyWorkReport';
import {DAILY_ACTIVITY_LABELS,DAILY_BACKLOG_LABELS} from '../shared/dailyWorkReportLabels';
import {canonicalSnapshotReportV1,SNAPSHOT_METRICS_V1} from '../shared/reportSnapshotSchemaV1';
import {formatDailyWorkDigest} from '../server/dailyWorkDigest';
import {readCaptureReporting} from '../server/reportCaptureReporting';
const report:any={date:'2026-11-17',timeZone:'Asia/Kolkata',generatedAt:'2026-11-18T00:00:00Z',activity:Object.fromEntries(DAILY_WORK_METRICS.activity.map(k=>[k,1])),backlog:Object.fromEntries(DAILY_WORK_METRICS.backlog.map(k=>[k,2]))};
for(const [section,labels,all]of [['activity',CAPTURE_ACTIVITY,DAILY_ACTIVITY_LABELS],['backlog',CAPTURE_BACKLOG,DAILY_BACKLOG_LABELS]] as const){for(const [key,label]of Object.entries(labels)){assert.equal((all as any)[key],label);assert.match(dailyWorkReportCsv(report),new RegExp('"'+key+'"'));for(const invalid of [undefined,-1,NaN,1.5,'1',Number.MAX_SAFE_INTEGER+1])assert.throws(()=>dailyWorkReportCsv({...report,[section]:{...report[section],[key]:invalid}}));}}
assert.match(formatDailyWorkDigest(report),/Frozen reports: 1 revisions stored \(1 amendments\)/);assert.match(formatDailyWorkDigest(report),/2 awaiting settlement/);assert.match(formatDailyWorkDigest(report),/do not prove report delivery/);
const frozen=canonicalSnapshotReportV1(report);assert.deepEqual(Object.keys(frozen.activity),SNAPSHOT_METRICS_V1.activity);assert.equal('reportSnapshotsStored' in frozen.activity,false);assert.equal('reportCapturesPending' in frozen.backlog,false);
let calls=0;const fake={query:async(query:string,args:any[])=>{assert.equal(args[0],'A');calls++;if(query.includes('autonomous_audit_logs')){assert.deepEqual(args,['A',1000,2000]);return[[{...report.activity,invalidPolicyCounts:0}]];}return[[{...report.backlog,invalidStates:0}]];}};const r=await readCaptureReporting(fake,'A',1000000,2000000);assert.equal(calls,2);assert.equal(r.activity.reportSnapshotsStored,1);assert.equal('invalidStates' in r.backlog,false);
for(const field of ['invalidPolicyCounts','invalidStates'])await assert.rejects(readCaptureReporting({query:async(query:string)=>query.includes('autonomous_audit_logs')?[[{invalidPolicyCounts:field==='invalidPolicyCounts'?1:0}]]:[[{invalidStates:field==='invalidStates'?1:0}]]},'A',0,1));
console.log('Capture reporting: twelve fixed live metrics, numeric/coverage refusal, UI labels/CSV/digest privacy, bounded scoped query arguments and unchanged frozen V1 coverage passed.');
