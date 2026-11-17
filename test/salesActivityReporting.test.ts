import assert from 'node:assert/strict';
import {SALES_ACTIVITY} from '../shared/salesActivityReporting';
import {DAILY_WORK_METRICS,dailyWorkReportCsv} from '../shared/dailyWorkReport';
import {DAILY_ACTIVITY_LABELS} from '../shared/dailyWorkReportLabels';
import {reportSnapshotCoverage} from '../shared/reportSnapshotCoverage';
import {formatDailyWorkDigest} from '../server/dailyWorkDigest';
import {readSalesActivity} from '../server/salesActivityReporting';
const report:any={date:'2026-11-17',timeZone:'Asia/Kolkata',generatedAt:'2026-11-18T00:00:00Z',activity:Object.fromEntries(DAILY_WORK_METRICS.activity.map(k=>[k,1])),backlog:Object.fromEntries(DAILY_WORK_METRICS.backlog.map(k=>[k,0]))};
assert.equal(Object.keys(SALES_ACTIVITY).length,11);
for(const [key,label]of Object.entries(SALES_ACTIVITY)){assert.equal((DAILY_ACTIVITY_LABELS as any)[key],label);assert.match(dailyWorkReportCsv(report),new RegExp('"'+key+'"'));for(const invalid of [undefined,-1,NaN,1.5,'1',Number.MAX_SAFE_INTEGER+1])assert.throws(()=>dailyWorkReportCsv({...report,activity:{...report.activity,[key]:invalid}}));}
for(const version of [1,2]){const frozen=reportSnapshotCoverage(version).canonical(report);for(const key of Object.keys(SALES_ACTIVITY))assert.equal(key in frozen.activity,false);}
assert.match(formatDailyWorkDigest(report),/Sales recorded: 1 import batches/);assert.match(formatDailyWorkDigest(report),/imports grant no consent/);
let calls=0;const activity=await readSalesActivity({query:async(query:string,args:any[])=>{calls++;assert.deepEqual(args,['A',1000,2000]);assert.match(query,/company_id=\?/);assert.match(query,/timestamp<FROM_UNIXTIME/);return[[{...Object.fromEntries(Object.keys(SALES_ACTIVITY).map(k=>[k,1])),invalidImportCounts:0}]];}},'A',1000000,2000000);assert.equal(calls,1);assert.deepEqual(Object.keys(activity),Object.keys(SALES_ACTIVITY));
for(const invalid of [1,undefined,'invalid'])await assert.rejects(readSalesActivity({query:async()=>[[{invalidImportCounts:invalid}]]},'A',0,1));
console.log('Sales reporting: eleven fixed numeric metrics, labels/CSV/digest, scoped half-open query, corrupt import refusal and frozen V1/V2 preservation passed.');
