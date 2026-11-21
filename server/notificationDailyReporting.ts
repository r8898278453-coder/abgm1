import {readNotificationDecisionActivity} from './notificationDecisionReporting';
import {NOTIFICATION_DAILY_ACTIVITY,NOTIFICATION_DAILY_BACKLOG} from '../shared/notificationDailyReporting';
import type {ReadOnlySql} from './readOnlySqlDeadline';

// Occurrence due_at stores a UTC wall-clock DATETIME independently of the SQL session timezone.
const utcDue=(ms:number)=>new Date(ms).toISOString().slice(0,19).replace('T',' ');

export async function readNotificationDailyReporting(sql:ReadOnlySql,company:string,start:number,end:number){
 const [[counts]]=await sql.query(`SELECT
  COUNT(CASE WHEN inDay AND BINARY notification_kind='daily_digest' AND BINARY status='SENT' THEN 1 END) dailyDigestAccepted,
  COUNT(CASE WHEN inDay AND BINARY notification_kind='daily_digest' AND BINARY status='UNKNOWN' THEN 1 END) dailyDigestUnknown,
  COUNT(CASE WHEN inDay AND BINARY notification_kind='daily_digest' AND BINARY status='RUNNING' AND created_at>=DATE_SUB(NOW(),INTERVAL 5 MINUTE) THEN 1 END) dailyDigestRunning,
  COUNT(CASE WHEN inDay AND BINARY notification_kind='daily_digest' AND BINARY status='RUNNING' AND created_at<DATE_SUB(NOW(),INTERVAL 5 MINUTE) THEN 1 END) dailyDigestStale,
  COUNT(CASE WHEN inDay AND BINARY notification_kind='review_reminder' AND BINARY status='SENT' THEN 1 END) reviewReminderAccepted,
  COUNT(CASE WHEN inDay AND BINARY notification_kind='review_reminder' AND BINARY status='UNKNOWN' THEN 1 END) reviewReminderUnknown,
  COUNT(CASE WHEN inDay AND BINARY notification_kind='review_reminder' AND BINARY status='RUNNING' AND created_at>=DATE_SUB(NOW(),INTERVAL 5 MINUTE) THEN 1 END) reviewReminderRunning,
  COUNT(CASE WHEN inDay AND BINARY notification_kind='review_reminder' AND BINARY status='RUNNING' AND created_at<DATE_SUB(NOW(),INTERVAL 5 MINUTE) THEN 1 END) reviewReminderStale,
  COUNT(CASE WHEN inDay AND BINARY notification_kind='critical_alert' AND BINARY status='SENT' THEN 1 END) criticalAlertAccepted,
  COUNT(CASE WHEN inDay AND BINARY notification_kind='critical_alert' AND BINARY status='UNKNOWN' THEN 1 END) criticalAlertUnknown,
  COUNT(CASE WHEN inDay AND BINARY notification_kind='critical_alert' AND BINARY status='RUNNING' AND created_at>=DATE_SUB(NOW(),INTERVAL 5 MINUTE) THEN 1 END) criticalAlertRunning,
  COUNT(CASE WHEN inDay AND BINARY notification_kind='critical_alert' AND BINARY status='RUNNING' AND created_at<DATE_SUB(NOW(),INTERVAL 5 MINUTE) THEN 1 END) criticalAlertStale,
  COUNT(CASE WHEN BINARY status='RUNNING' AND created_at>=DATE_SUB(NOW(),INTERVAL 5 MINUTE) THEN 1 END) notificationsRunning,
  COUNT(CASE WHEN BINARY status='RUNNING' AND created_at<DATE_SUB(NOW(),INTERVAL 5 MINUTE) THEN 1 END) notificationsStale,
  COUNT(CASE WHEN BINARY status='UNKNOWN' THEN 1 END) notificationsUnconfirmed
  FROM (
   SELECT notification_kind,status,created_at,(due_at>=? AND due_at<?) inDay
   FROM notification_occurrences WHERE company_id=?
    AND BINARY notification_kind IN ('daily_digest','review_reminder','critical_alert')
  ) occurrences`,[utcDue(start),utcDue(end),company]);
 const project=(keys:Record<string,string>)=>Object.fromEntries(Object.keys(keys).map(key=>[key,counts[key]]));
 return {activity:{...project(NOTIFICATION_DAILY_ACTIVITY),...await readNotificationDecisionActivity(sql,company,start,end)},backlog:project(NOTIFICATION_DAILY_BACKLOG)};
}
