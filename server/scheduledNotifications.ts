import {recordNotificationDecision,type NotificationDecision} from './notificationDecisionReporting';
import { isGlobalEmergencyStopActive } from './executionStop';
import { getDbPool, getCompanyIntegration, getCompanyIntegrations } from './db';
import { type NotificationKind } from './notificationOccurrences';
import { runBoundNotificationOccurrence,scheduledNotificationCanSend } from './boundNotificationOccurrences';
import { sendTenantTelegramAttempt } from './tenantNotifications';

export async function recordScheduledNotificationDecision(company:string,kind:NotificationKind,decision:NotificationDecision,canStart:()=>boolean) {
  if(!canStart())return;
  try {
    const pool=await getDbPool();
    if(pool&&canStart())await recordNotificationDecision(pool,company,kind,decision,Date.now());
  } catch { /* Optional reporting evidence must not affect scheduler progress. */ }
}

/** Missing configuration leaves the occurrence unclaimed for a later configured tick. */
export async function sendScheduledNotification(companyId: string, kind: NotificationKind, dueAt: number, message: string, canStart: () => boolean = () => true, admit?: (sql:any,context:{policyVersion:string;claimToken:string})=>Promise<boolean>): Promise<boolean> {
  if (!canStart() || isGlobalEmergencyStopActive()) return false;
  if(typeof message!=='string'||!message.trim()||message.length>4096){
    await recordScheduledNotificationDecision(companyId,kind,'InvalidMessage',canStart);
    return false;
  }
  const pool = await getDbPool();
  if (!pool || !canStart()) return false; // No volatile fallback for scheduled external delivery.
  return await runBoundNotificationOccurrence(pool,companyId,kind,dueAt,message,{canStart,admit,
    send:(bindingHash,_actor,context)=>sendTenantTelegramAttempt(companyId,message,{getCompanyIntegration,getCompanyIntegrations,fetch,
      canSend:async()=>canStart()&&await scheduledNotificationCanSend(pool,companyId,kind,dueAt,context,bindingHash)},bindingHash)})==='SENT';
}
