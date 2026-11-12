import type {Pool} from 'mysql2/promise';
import {salesWorkflowContext,salesWorkflowActorAllowed} from './salesWorkflows';
import {salesHash} from './salesWorkspace';
import {canonicalJson} from '../shared/canonicalJson';
import type {SalesSendPermit} from '../shared/approvedSalesMessages';
import {resolveWhatsAppCredentials,type WhatsAppCredentials} from './metaWhatsAppService';
import {isGlobalEmergencyStopActive} from './executionStop';
export const approvedSalesSendingEnabled=()=>process.env.ENABLE_APPROVED_SALES_SEND==='true';
export const salesSenderFingerprint=(c:WhatsAppCredentials)=>salesHash(canonicalJson({phoneNumberId:c.phoneNumberId,accessToken:c.accessToken,wabaId:c.wabaId,appSecret:c.appSecret}));
export const decodeSalesPayload=(v:any)=>typeof v==='string'?JSON.parse(v):v;
/** Server-only permit; browser/API bodies never select or pass this argument. No consent or budget checks are bypassed. */
export async function validateApprovedSalesPermit(pool:Pool,company:string,key:string,input:any,permit:SalesSendPermit):Promise<string|null>{
 if(!approvedSalesSendingEnabled())return'APPROVED_SALES_SEND_DISABLED';if(isGlobalEmergencyStopActive())return'GLOBAL_EMERGENCY_STOP';
 if(!/^swa_[a-f0-9]{32}$/.test(permit?.approvalId)||!/^[a-f0-9]{32}$/.test(permit?.claimToken))return'APPROVED_SALES_PERMIT_INVALID';
 const [rows]:any=await pool.query("SELECT a.*,UNIX_TIMESTAMP(a.expires_at)*1000 expires_ms,UNIX_TIMESTAMP()*1000 now_ms FROM sales_message_approvals a JOIN job_queue j ON j.id=a.job_id AND j.company_id=a.company_id AND j.job_type='sales_workflow_send' AND j.status='RUNNING' AND j.locked_by=a.claim_worker AND j.attempts=a.claim_attempt AND j.locked_at>=DATE_SUB(NOW(),INTERVAL 5 MINUTE) WHERE a.id=? AND a.company_id=? AND a.state='DISPATCHING' AND a.claim_token=?",[permit.approvalId,company,permit.claimToken]);
 if(rows.length!==1)return'APPROVED_SALES_PERMIT_INVALID';const row=rows[0],payload=decodeSalesPayload(row.payload_json);if(row.dispatch_key!==key||Number(row.expires_ms)<=Number(row.now_ms)||salesHash(canonicalJson(payload))!==row.payload_hash||payload.recipient!==input.to||payload.message!==input.message||payload.senderId!==input.sender||input.salesApprovalId!==row.id||input.mode!=='automatic')return'APPROVED_SALES_INPUT_CHANGED';
 if(!await salesWorkflowActorAllowed(pool,company,row.approver_id,'approve')||!await salesWorkflowActorAllowed(pool,company,row.approver_id,'execute'))return'APPROVED_SALES_ACTOR_REVOKED';
 const [enrollments]:any=await pool.query('SELECT *,CAST(revision AS CHAR) version FROM sales_workflow_enrollments WHERE id=? AND company_id=?',[row.enrollment_id,company]);const e=enrollments[0];const [tasks]:any=await pool.query('SELECT *,CAST(revision AS CHAR) version FROM sales_workflow_tasks WHERE company_id=? AND id=?',[company,row.task_id]);
 if(!e||!tasks[0]||e.state!=='WAITING_SEND'||e.current_job_id!==row.job_id||e.version!==payload.enrollmentVersion||tasks[0].state!=='MESSAGE_APPROVED'||tasks[0].version!==payload.taskVersion||tasks[0].snapshot_hash!==e.snapshot_hash||e.snapshot_hash!==payload.workflowSnapshotHash)return'APPROVED_SALES_CONTEXT_CHANGED';
 const reason=await salesWorkflowContext(pool,company,e);if(reason)return reason;const sender=await resolveWhatsAppCredentials(company);if(!sender.configured||salesSenderFingerprint(sender)!==payload.senderFingerprint)return'APPROVED_SALES_SENDER_CHANGED';return null;
}
