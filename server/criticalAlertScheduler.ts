import {getDbPool} from './db';
import {selectNotificationCompanyBatch} from './notificationBatch';
import {latestNotificationDue} from './notificationOccurrences';
import {resolveNotificationDispatchContext,notificationPolicyClock} from './notificationPolicies';
import {withReadOnlySqlDeadline} from './readOnlySqlDeadline';
import {observeCriticalAlerts,reserveCriticalAlertCandidates} from './criticalAlertIncidents';
import {formatCriticalAlertMessage} from '../shared/criticalAlerts';
import {sendScheduledNotification,recordScheduledNotificationDecision} from './scheduledNotifications';
import {isGlobalEmergencyStopActive} from './executionStop';
/** Runs inside the existing reminders stage; no timer, queue, or alternative transport. */
export async function runCriticalAlertsJob(tickTime=Date.now(),canStart:()=>boolean=()=>true){
 const summary:{criticalAlertsAccepted:number;criticalCompaniesChecked:number;criticalAlertsFailed:number;criticalAlertsDeferred:number;criticalAlertsAvailable?:boolean}={criticalAlertsAccepted:0,criticalCompaniesChecked:0,criticalAlertsFailed:0,criticalAlertsDeferred:0};
 if(!canStart()||isGlobalEmergencyStopActive())return summary;
 const pool=await getDbPool();if(!pool)return{...summary,criticalAlertsAvailable:false};
 const due=latestNotificationDue('critical_alert',tickTime);let clients:any[];
 try{clients=await selectNotificationCompanyBatch(pool,'critical_alert');summary.criticalAlertsAvailable=true;}catch{return{...summary,criticalAlertsAvailable:false};}
 for(const client of clients){if(!canStart()||isGlobalEmergencyStopActive())break;summary.criticalCompaniesChecked++;
  let sendStarted=false;
  try{
   const eligible=await withReadOnlySqlDeadline(pool,async sql=>Boolean(await resolveNotificationDispatchContext(sql,client.id,'critical_alert',due,await notificationPolicyClock(sql))));if(!eligible){summary.criticalAlertsDeferred++;await recordScheduledNotificationDecision(client.id,'critical_alert','PrecheckUnavailable',canStart);continue;}
   const candidates=await observeCriticalAlerts(pool,client.id);if(!candidates.length){await recordScheduledNotificationDecision(client.id,'critical_alert','NoCandidates',canStart);continue;}if(!canStart()){summary.criticalAlertsDeferred++;break;}
   const message=`Client reference: ${JSON.stringify(client.id)}\n${formatCriticalAlertMessage(candidates)}`;
   sendStarted=true;
   const sent=await sendScheduledNotification(client.id,'critical_alert',due,message,canStart,sql=>reserveCriticalAlertCandidates(sql,client.id,due,candidates));
   if(sent)summary.criticalAlertsAccepted++;else summary.criticalAlertsDeferred++;
  }catch{summary.criticalAlertsFailed++;summary.criticalAlertsAvailable=false;if(!sendStarted)await recordScheduledNotificationDecision(client.id,'critical_alert','PreparationFailed',canStart);}
 }
 return summary;
}
