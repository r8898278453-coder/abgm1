import {runCriticalAlertsJob} from '../server/criticalAlertScheduler';
import {dispatcherSummary,runDispatcherCycle} from '../server/dispatcherCycle';
import {DISPATCHER_STAGES} from '../shared/dispatcher';
import assert from 'node:assert/strict';
import {latestNotificationDue} from '../server/notificationOccurrences';
import {runBoundNotificationOccurrence} from '../server/boundNotificationOccurrences';
const due=latestNotificationDue('review_reminder',Date.parse('2026-11-17T05:42:00Z'));
let queries=0,sends=0;
const unavailable={query:async()=>{queries++;throw new Error('SQL must not be reached');},getConnection:async()=>{queries++;throw new Error('SQL must not be reached');}} as any;
const deps={send:async()=>{sends++;return{state:'API_ACCEPTED' as const,providerId:'99',reason:null};}};
for(const [company,kind,at,message]of [
 ['', 'daily_digest',due,'message'],['x'.repeat(65),'daily_digest',due,'message'],['A','forged',due,'message'],
 ['A','review_reminder',NaN,'message'],['A','review_reminder',due+0.5,'message'],['A','review_reminder',due+1,'message'],
 ['A','review_reminder',due,''],['A','review_reminder',due,'   '],['A','review_reminder',due,'x'.repeat(4097)],
] as const)await assert.rejects(runBoundNotificationOccurrence(unavailable,company,kind as any,at,message,deps),/INVALID_NOTIFICATION_OCCURRENCE/);
assert.equal(queries,0);assert.equal(sends,0);
assert.equal(await runBoundNotificationOccurrence(unavailable,'A','review_reminder',due,'message',{...deps,canStart:()=>false}),'DEFERRED');assert.equal(queries,0);assert.equal(sends,0);
assert.equal(latestNotificationDue('daily_digest',Date.parse('2026-11-17T02:30:00Z')),Date.parse('2026-11-17T02:30:00Z'));
assert.equal(latestNotificationDue('daily_digest',Date.parse('2026-11-17T02:29:59Z')),Date.parse('2026-11-16T02:30:00Z'));
console.log('Bound scheduled delivery: strict scope/kind/aligned due/text validation before SQL/provider effects, cooperative deferral and IST slot boundaries passed.');

assert.deepEqual(await runCriticalAlertsJob(Date.now(),()=>false),{criticalAlertsAccepted:0,criticalCompaniesChecked:0,criticalAlertsFailed:0,criticalAlertsDeferred:0});assert.equal(latestNotificationDue('critical_alert',Date.parse('2026-11-17T05:42:39Z')),Date.parse('2026-11-17T05:42:00Z'));assert.deepEqual(dispatcherSummary({criticalAlertsAccepted:2,criticalAlertsFailed:1,criticalAlertsAvailable:false,privateText:'PRIVATE'}),{criticalAlertsAccepted:2,criticalAlertsFailed:1,criticalAlertsAvailable:false});const partial=await runDispatcherCycle(0,Object.fromEntries(DISPATCHER_STAGES.map(stage=>[stage,async()=>stage==='reminders'?{criticalAlertsAvailable:false}:{}])) as any,async()=>{});assert.equal(partial.partial,true);

await assert.rejects(runBoundNotificationOccurrence(unavailable,'A','critical_alert',latestNotificationDue('critical_alert',Date.now()),'message',deps),/CRITICAL_ALERT_RESERVATION_REQUIRED/);assert.equal(queries,0);assert.equal(sends,0);
