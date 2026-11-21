import {randomUUID} from 'node:crypto';
import type {PoolConnection} from 'mysql2/promise';
import {PLATFORM_DAILY_ACTIVITY} from '../shared/platformDailyReporting';
import type {PublishingClaim} from './publishingClaims';
import type {ReadOnlySql} from './readOnlySqlDeadline';

export type PlatformOutcome={platform:string;status:string};
const eventPrefix='PUBLISHING_OUTCOME_';
const suffix={PUBLISHED:'Published',FAILED:'Failed',UNKNOWN:'Unknown'} as const;

export async function recordPlatformSettlement(connection:PoolConnection,claim:PublishingClaim,outcomes:readonly PlatformOutcome[]){
 const metrics=new Set<string>();
 for(const outcome of outcomes){
  if(!Object.hasOwn(suffix,outcome.status))continue;
  const metric=outcome.platform+suffix[outcome.status as keyof typeof suffix];
  if(Object.hasOwn(PLATFORM_DAILY_ACTIVITY,metric))metrics.add(metric);
 }
 if(outcomes.some(outcome=>outcome.status==='PUBLISHED')){
  if(outcomes.some(outcome=>outcome.status==='UNKNOWN'))metrics.add('publishPartialUnknown');
  else if(outcomes.some(outcome=>outcome.status==='FAILED'))metrics.add('publishPartialFailed');
 }
 if(!metrics.size)return;
 await connection.query(
  `INSERT INTO autonomous_audit_logs(id,company_id,action_id,actor,event_type,details)
   VALUES ${[...metrics].map(()=>"(?,?,?,'publishing-worker',?,'{}')").join(',')}`,
  [...metrics].flatMap(metric=>[randomUUID(),claim.companyId,claim.postId,eventPrefix+metric]));
}

export async function readPlatformDailyReporting(sql:ReadOnlySql,company:string,start:number,end:number){
 const metrics=Object.keys(PLATFORM_DAILY_ACTIVITY);
 const [rows]=await sql.query(
  `SELECT BINARY event_type eventType, COUNT(*) total FROM autonomous_audit_logs
    WHERE company_id=? AND timestamp>=FROM_UNIXTIME(?) AND timestamp<FROM_UNIXTIME(?)
      AND BINARY event_type IN (${metrics.map(()=>'?').join(',')})
    GROUP BY BINARY event_type`,
  [company,start/1000,end/1000,...metrics.map(key=>eventPrefix+key)]);
 const observed=new Map<string,unknown>(rows.map((row:{eventType:Buffer|string;total:unknown})=>[String(row.eventType),row.total]));
 return Object.fromEntries(metrics.map(key=>[key,observed.get(eventPrefix+key)??0]));
}
