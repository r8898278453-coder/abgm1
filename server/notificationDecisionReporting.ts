import {NOTIFICATION_SELECTION_ACTIVITY} from '../shared/notificationSelectionReporting';
import {createHash} from 'node:crypto';
import type {Pool,PoolConnection} from 'mysql2/promise';
import {platformDateKey} from '../shared/dailyWorkReport';
import {NOTIFICATION_DECISION_ACTIVITY} from '../shared/notificationDecisionReporting';
import type {NotificationKind} from './notificationOccurrences';
import type {ReadOnlySql} from './readOnlySqlDeadline';

const kindPrefix={daily_digest:'digest',review_reminder:'review',critical_alert:'critical'} as const;
const eventPrefix='NOTIFICATION_PRECLAIM_';
const reportableEvents={...NOTIFICATION_DECISION_ACTIVITY,...NOTIFICATION_SELECTION_ACTIVITY};
export type NotificationDecision='ContextUnavailable'|'ControlChanged'|'RetainedLimit'|'RunningLimit'|'ReservationDeclined'|'PreparationFailed'|'InvalidMessage'|'CompactSummary'|'NoEligibleReviews'|'NoCandidates'|'PrecheckUnavailable'|'Selected';

export async function recordNotificationDecision(sql:Pool|PoolConnection,company:string,kind:NotificationKind,decision:NotificationDecision,observedAt:number){
 const event=eventPrefix+kindPrefix[kind]+decision;
 if(!Object.hasOwn(reportableEvents,kindPrefix[kind]+decision))throw new Error('INVALID_NOTIFICATION_DECISION');
 const id=createHash('sha256').update(JSON.stringify([company,platformDateKey(observedAt),event])).digest('hex');
 await sql.query(`INSERT INTO autonomous_audit_logs(id,company_id,actor,event_type,details,timestamp)
  VALUES (?,?,'scheduled-notification',?,'{}',FROM_UNIXTIME(?)) ON DUPLICATE KEY UPDATE id=id`,[id,company,event,observedAt/1000]);
}

export async function readNotificationDecisionActivity(sql:ReadOnlySql,company:string,start:number,end:number){
 const keys=Object.keys(reportableEvents);
 const [rows]=await sql.query(`SELECT BINARY event_type eventType,COUNT(*) count
  FROM autonomous_audit_logs WHERE company_id=? AND timestamp>=FROM_UNIXTIME(?) AND timestamp<FROM_UNIXTIME(?)
   AND BINARY event_type IN (${keys.map(()=>'?').join(',')}) GROUP BY BINARY event_type`,
  [company,start/1000,end/1000,...keys.map(key=>eventPrefix+key)]);
 const counts=new Map<string,unknown>(rows.map((row:{eventType:Buffer|string;count:unknown})=>[String(row.eventType),row.count]));
 return Object.fromEntries(keys.map(key=>[key,counts.get(eventPrefix+key)??0]));
}
