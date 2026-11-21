import {NOTIFICATION_SELECTION_BACKLOG} from '../shared/notificationSelectionReporting';
import {NOTIFICATION_ACTIVE_SQL,NOTIFICATION_CONNECTED_SQL} from './notificationSelectionSql';
import type {ReadOnlySql} from './readOnlySqlDeadline';

const prefixes={daily_digest:'digest',review_reminder:'review',critical_alert:'critical'} as const;

export async function readNotificationSelectionBacklog(sql:ReadOnlySql,company:string){
 const [[workspace]]=await sql.query(`SELECT o.status operationsStatus,${NOTIFICATION_ACTIVE_SQL} active,
   ${NOTIFICATION_CONNECTED_SQL} connected,
   EXISTS(SELECT 1 FROM company_integrations i WHERE i.company_id=c.id AND i.provider='telegram_bot') hasTelegram,
   UNIX_TIMESTAMP()*1000 nowMs
   FROM companies c LEFT JOIN client_operations o ON o.company_id=c.id WHERE c.id=?`,[company]);
 const result=Object.fromEntries(Object.keys(NOTIFICATION_SELECTION_BACKLOG).map(key=>[key,0]));
 if(!workspace)return result;
 const [policies]=await sql.query(`SELECT notification_kind kind,enabled,first_due_ms firstDueMs
   FROM notification_policies WHERE company_id=? AND BINARY notification_kind IN ('daily_digest','review_reminder','critical_alert')`,[company]);
 const [rotation]=await sql.query(`SELECT notification_kind kind FROM notification_dispatch_cursors
   WHERE last_company_id=? AND BINARY notification_kind IN ('daily_digest','review_reminder','critical_alert')`,[company]);
 const active=Number(workspace.active)===1,connected=Number(workspace.connected)===1;
 const hasTelegram=Number(workspace.hasTelegram)===1,operations=workspace.operationsStatus;
 Object.assign(result,{
  notificationWorkspaceActive:Number(active),
  notificationWorkspaceArchived:Number(!active&&operations==='ARCHIVED'),
  notificationWorkspaceOperationsMissing:Number(operations===null),
  notificationWorkspaceOtherStatus:Number(!active&&operations!==null&&operations!=='ARCHIVED'),
  notificationTelegramConnected:Number(connected),
  notificationTelegramDisconnected:Number(hasTelegram&&!connected),
  notificationTelegramMissing:Number(!hasTelegram),
 });
 for(const [kind,prefix] of Object.entries(prefixes)){
  const policy=policies.find((row:{kind:string})=>row.kind===kind);
  const enabled=policy!==undefined&&Number(policy.enabled)===1;
  const firstDue=policy?.firstDueMs;
  result[prefix+'PolicyMissing']=Number(!policy);
  result[prefix+'PolicyDisabled']=Number(Boolean(policy)&&!enabled);
  result[prefix+'PolicyEnabled']=Number(enabled);
  result[prefix+'SelectionEligible']=Number(active&&connected&&enabled);
  result[prefix+'RotationHead']=Number(rotation.some((row:{kind:string})=>row.kind===kind));
  result[prefix+'FirstDuePending']=Number(enabled&&firstDue!==null&&Number(firstDue)>Number(workspace.nowMs));
  result[prefix+'FirstDueReached']=Number(enabled&&firstDue!==null&&Number(firstDue)<=Number(workspace.nowMs));
  result[prefix+'FirstDueMissing']=Number(enabled&&firstDue===null);
 }
 return result;
}
