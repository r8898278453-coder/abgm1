import {cancelPendingInquiryEvents} from './salesInquiryRules';
import type {PoolConnection} from 'mysql2/promise';
import {appendQueueEvent} from './queueEvents';
import {agencyAudit} from './agencyRoutes';
/** Caller retains the company lock. Exits, review cancellations and queue fencing commit with the source event. */
export async function exitSalesWorkflows(c:PoolConnection,company:string,reason:string,actor:string,filter:{leadId?:string;workflowId?:string;contactHash?:string;enrollmentId?:string}={}){
 await cancelPendingInquiryEvents(c,company,reason,actor,filter);
 const keys=[['lead_id',filter.leadId],['workflow_id',filter.workflowId],['contact_hash',filter.contactHash],['id',filter.enrollmentId]].filter(([,value])=>value!==undefined);
 const [rows]:any=await c.query(`SELECT id,current_job_id FROM sales_workflow_enrollments WHERE company_id=? AND state IN ('ACTIVE','WAITING_REVIEW','WAITING_SEND') ${keys.map(([col])=>'AND '+col+'=?').join(' ')} ORDER BY id FOR UPDATE`,[company,...keys.map(([,value])=>value)]);
 for(const row of rows){await c.query("UPDATE sales_message_approvals SET state=CASE WHEN state='DISPATCHING' THEN 'UNKNOWN' ELSE 'CANCELLED' END,reason_code=?,revision=revision+1 WHERE company_id=? AND enrollment_id=? AND state IN ('PREPARED','DISPATCHING')",[reason,company,row.id]);await c.query("UPDATE sales_workflow_enrollments SET state='EXITED',revision=revision+1,exit_reason=?,updated_at=NOW() WHERE id=? AND company_id=?",[reason,row.id,company]);await c.query("UPDATE sales_workflow_tasks SET state='CANCELLED',revision=revision+1,updated_at=NOW() WHERE company_id=? AND enrollment_id=? AND state IN ('PENDING','MESSAGE_APPROVED')",[company,row.id]);if(row.current_job_id){const [changed]:any=await c.query("UPDATE job_queue SET status='CANCELLED',locked_at=NULL,locked_by=NULL,updated_at=NOW() WHERE id=? AND company_id=? AND job_type IN ('sales_workflow_review','sales_workflow_send') AND status IN ('QUEUED','RUNNING','RETRY_WAIT')",[row.current_job_id,company]);if(changed.affectedRows)await appendQueueEvent(c,row.current_job_id,'JOB_CANCELLED',{userId:actor});}await agencyAudit(c,company,actor,'SALES_WORKFLOW_EXITED',{enrollmentId:row.id,reason});}
 return rows.length;
}
