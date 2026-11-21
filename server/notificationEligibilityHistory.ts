import type {PoolConnection} from 'mysql2/promise';
import {recordNotificationDecisions,type NotificationEligibilityObservation} from './notificationDecisionReporting';
import type {NotificationKind} from './notificationOccurrences';
import {NOTIFICATION_ACTIVE_SQL,NOTIFICATION_CONNECTED_SQL,NOTIFICATION_HAS_TELEGRAM_SQL} from './notificationSelectionSql';

type Candidate={id:string;operationsStatus:string|null;active:number;connected:number;hasTelegram:number;policyKind:string|null;enabled:number|null;firstDueMs:string|number|null};

function reasons(candidate:Candidate,nowMs:number):NotificationEligibilityObservation[]{
 const observations:NotificationEligibilityObservation[]=[];
 const active=Number(candidate.active)===1,connected=Number(candidate.connected)===1,enabled=Number(candidate.enabled)===1;
 if(active&&connected&&enabled)observations.push('ObservedEligible');
 if(!active){
  if(candidate.operationsStatus===null)observations.push('ObservedOpsMissing');
  else if(candidate.operationsStatus==='ARCHIVED')observations.push('ObservedArchived');
  else observations.push('ObservedOpsOther');
 }
 if(!connected)observations.push(Number(candidate.hasTelegram)===1?'ObservedTelegramDisconnected':'ObservedTelegramMissing');
 if(candidate.policyKind===null)observations.push('ObservedPolicyMissing');
 else if(!enabled)observations.push('ObservedPolicyDisabled');
 else if(candidate.firstDueMs===null)observations.push('ObservedFirstDueMissing');
 else observations.push(Number(candidate.firstDueMs)>nowMs?'ObservedFirstDuePending':'ObservedFirstDueReached');
 return observations;
}

/** Eligibility observations rotate independently of dispatch selection and have no send authority. */
export async function observeNotificationEligibility(connection:PoolConnection,kind:NotificationKind,limit:number,nowMs:number){
 const cursorKey='observation_'+kind;
 await connection.query(`INSERT INTO notification_dispatch_cursors(notification_kind) VALUES (?)
   ON DUPLICATE KEY UPDATE notification_kind=VALUES(notification_kind)`,[cursorKey]);
 const [[cursor]]=await connection.query<any[]>('SELECT last_company_id FROM notification_dispatch_cursors WHERE notification_kind=? FOR UPDATE',[cursorKey]);
 const last=cursor.last_company_id;
 const select=`SELECT c.id,o.status operationsStatus,${NOTIFICATION_ACTIVE_SQL} active,
   ${NOTIFICATION_CONNECTED_SQL} connected,${NOTIFICATION_HAS_TELEGRAM_SQL} hasTelegram,
   p.notification_kind policyKind,p.enabled,p.first_due_ms firstDueMs
   FROM companies c LEFT JOIN client_operations o ON o.company_id=c.id
   LEFT JOIN notification_policies p ON p.company_id=c.id AND p.notification_kind=?`;
 const [forward]=await connection.query<any[]>(`${select} ${last?'WHERE c.id>?':''} ORDER BY c.id LIMIT ?`,last?[kind,last,limit]:[kind,limit]);
 const candidates:Candidate[]=forward;
 if(last&&candidates.length<limit){
  const [wrapped]=await connection.query<any[]>(`${select} WHERE c.id<=? ORDER BY c.id LIMIT ?`,[kind,last,limit-candidates.length]);
  candidates.push(...wrapped);
 }
 if(!candidates.length)return;
 await recordNotificationDecisions(connection,kind,candidates.flatMap(candidate=>reasons(candidate,nowMs).map(decision=>({company:candidate.id,decision}))),nowMs);
 await connection.query('UPDATE notification_dispatch_cursors SET last_company_id=? WHERE notification_kind=?',[candidates[candidates.length-1].id,cursorKey]);
}
