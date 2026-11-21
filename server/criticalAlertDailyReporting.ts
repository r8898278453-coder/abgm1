import {CRITICAL_ALERT_KEYS,type CriticalAlertSignal} from '../shared/criticalAlerts';
import {CRITICAL_ALERT_DAILY_ACTIVITY,CRITICAL_ALERT_DAILY_BACKLOG} from '../shared/criticalAlertDailyReporting';
import type {ReadOnlySql} from './readOnlySqlDeadline';

const levels=['Initial','EscalationOne','EscalationTwo'] as const;
const statuses={SENT:'Accepted',RUNNING:'Running',UNKNOWN:'Unknown',MISSING:'WithoutOccurrence'} as const;
const zeros=(keys:Record<string,string>)=>Object.fromEntries(Object.keys(keys).map(key=>[key,0]));

function count(value:unknown){
 const n=Number(value);
 if(value===null||!Number.isSafeInteger(n)||n<0)throw new Error('CRITICAL_DAILY_COUNT_INVALID');
 return n;
}

export async function readCriticalAlertDailyReporting(sql:ReadOnlySql,company:string,start:number,end:number){
 const [rows]=await sql.query(`SELECT r.signal_key signalKey,r.level,
   CASE WHEN n.company_id IS NULL THEN 'MISSING' ELSE BINARY n.status END outcome,
   COUNT(*) retained,COUNT(CASE WHEN r.created_at>=FROM_UNIXTIME(?) AND r.created_at<FROM_UNIXTIME(?) THEN 1 END) dayCount
  FROM critical_alert_reservations r
  LEFT JOIN notification_occurrences n ON n.company_id=r.company_id AND n.notification_kind='critical_alert' AND n.due_at=r.due_at
  WHERE r.company_id=? GROUP BY r.signal_key,r.level,outcome`,[start/1000,end/1000,company]);
 const [incidents]=await sql.query('SELECT signal_key signalKey,observed_count observed FROM critical_alert_incidents WHERE company_id=?',[company]);
 const activity=zeros(CRITICAL_ALERT_DAILY_ACTIVITY),backlog=zeros(CRITICAL_ALERT_DAILY_BACKLOG);
 for(const row of rows){
  const signal=String(row.signalKey) as CriticalAlertSignal,level=levels[Number(row.level)],outcome=String(row.outcome);
  if(!CRITICAL_ALERT_KEYS.includes(signal)||!level||!Object.hasOwn(statuses,outcome))throw new Error('CRITICAL_DAILY_OUTCOME_INVALID');
  const metric='critical_'+signal+'_'+level+statuses[outcome as keyof typeof statuses];
  activity[metric]=count(row.dayCount);
  backlog['critical_'+signal+'_Retained']+=count(row.retained);
 }
 for(const row of incidents){
  const signal=String(row.signalKey) as CriticalAlertSignal;
  if(!CRITICAL_ALERT_KEYS.includes(signal))throw new Error('CRITICAL_DAILY_SIGNAL_INVALID');
  const observed=count(row.observed);
  backlog['critical_'+signal+'_Observed']=observed;
  backlog['critical_'+signal+'_Open']=Number(observed>0);
 }
 return {activity,backlog};
}
