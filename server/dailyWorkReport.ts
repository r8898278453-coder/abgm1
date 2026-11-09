import type {Pool} from 'mysql2/promise';
import {platformDayBounds,type DailyWorkReport} from '../shared/dailyWorkReport';
import {withReadOnlySqlDeadline} from './readOnlySqlDeadline';
export async function readDailyWorkReport(pool:Pool,company:string,date:string):Promise<DailyWorkReport>{
 const {start,end}=platformDayBounds(date);
 return withReadOnlySqlDeadline(pool,async sql=>{
  const [jobs]:any=await sql.query(`SELECT
    COUNT(DISTINCT CASE WHEN event_type = 'JOB_SUCCEEDED' THEN job_id END) AS completedJobs,
    COUNT(DISTINCT CASE WHEN event_type IN ('JOB_FAILED','JOB_ATTEMPTS_EXHAUSTED') THEN job_id END) AS failedJobs,
    COUNT(DISTINCT CASE WHEN event_type = 'JOB_DEFERRED' THEN job_id END) AS pausedJobs
    FROM job_action_events WHERE company_id = ? AND recorded_at >= FROM_UNIXTIME(?) AND recorded_at < FROM_UNIXTIME(?)`,[company,start/1000,end/1000]);
  const [approvals]:any=await sql.query(`SELECT
    COUNT(DISTINCT CASE WHEN to_status = 'scheduled' AND change_kind = 'STATUS' THEN post_id END) AS approvedPosts,
    COUNT(DISTINCT CASE WHEN change_kind = 'RESCHEDULE' THEN post_id END) AS rescheduledPosts
    FROM publication_workflow_audit WHERE company_id = ? AND recorded_at >= FROM_UNIXTIME(?) AND recorded_at < FROM_UNIXTIME(?)`,[company,start/1000,end/1000]);
  // Admissions are assigned to the reserved IST day, not inferred from mutable post status.
  const [admissions]:any=await sql.query('SELECT COUNT(*) AS admittedPosts FROM publication_admission_reservations WHERE company_id = ? AND quota_day = ?',[company,date]);
  const [controls]:any=await sql.query('SELECT COUNT(*) AS controlChanges FROM publication_control_audit WHERE company_id = ? AND recorded_at >= FROM_UNIXTIME(?) AND recorded_at < FROM_UNIXTIME(?)',[company,start/1000,end/1000]);
  const [requests]:any=await sql.query('SELECT COUNT(*) AS messageRequests FROM message_dispatch_intents WHERE company_id=? AND created_at>=FROM_UNIXTIME(?) AND created_at<FROM_UNIXTIME(?)',[company,start/1000,end/1000]);
  const [accepted]:any=await sql.query("SELECT COUNT(*) AS apiAcceptedMessages FROM message_dispatch_intents WHERE company_id=? AND status='API_ACCEPTED' AND updated_at>=FROM_UNIXTIME(?) AND updated_at<FROM_UNIXTIME(?)",[company,start/1000,end/1000]);
  const [unconfirmed]:any=await sql.query("SELECT COUNT(*) AS unconfirmedMessages FROM message_dispatch_intents WHERE company_id=? AND status IN ('IN_PROGRESS','UNKNOWN')",[company]);
  const [intakes]:any=await sql.query('SELECT COUNT(*) AS websiteInquiries FROM public_lead_intakes WHERE company_id=? AND created_at>=FROM_UNIXTIME(?) AND created_at<FROM_UNIXTIME(?)',[company,start/1000,end/1000]);
  const [intakeAccepted]:any=await sql.query("SELECT COUNT(*) AS inquiryAlertsAccepted FROM public_lead_intakes WHERE company_id=? AND notification_state='API_ACCEPTED' AND updated_at>=FROM_UNIXTIME(?) AND updated_at<FROM_UNIXTIME(?)",[company,start/1000,end/1000]);
  const [intakeBacklog]:any=await sql.query("SELECT COUNT(CASE WHEN notification_state='NOT_ATTEMPTED' THEN 1 END) AS inquiryAlertsNotAttempted,COUNT(CASE WHEN notification_state IN ('STARTED','UNCONFIRMED') THEN 1 END) AS inquiryAlertsUnconfirmed FROM public_lead_intakes WHERE company_id=?",[company]);
  const [backlog]:any=await sql.query(`SELECT
    COUNT(CASE WHEN status IN ('QUEUED','RETRY_WAIT') THEN 1 END) AS waitingJobs,
    COUNT(CASE WHEN status = 'RUNNING' THEN 1 END) AS runningJobs,
    COUNT(CASE WHEN status = 'FAILED' THEN 1 END) AS failedJobs FROM job_queue WHERE company_id = ?`,[company]);
  const [pending]:any=await sql.query("SELECT COUNT(*) AS pendingApprovals FROM content_posts WHERE company_id = ? AND status = 'pending_approval'",[company]);
  const [uncertain]:any=await sql.query("SELECT COUNT(*) AS uncertainPublications FROM publishing_dispatch_claims WHERE company_id = ? AND (status = 'UNKNOWN' OR (status = 'IN_PROGRESS' AND started_at < DATE_SUB(NOW(),INTERVAL 5 MINUTE)))",[company]);
  const [knowledge]:any=await sql.query("SELECT COUNT(CASE WHEN extraction_state='EXTRACTED' AND approved_at IS NULL THEN 1 END) knowledgeAwaitingApproval,COUNT(CASE WHEN extraction_state='PROCESSING' THEN 1 END) knowledgeExtractionRunning,COUNT(CASE WHEN extraction_state IN ('STORED','FAILED','UNSUPPORTED','NEEDS_OCR') THEN 1 END) knowledgeExtractionBlocked FROM knowledge_sources WHERE company_id=?",[company]);
  const counts=(row:any)=>Object.fromEntries(Object.entries(row).map(([key,value])=>{const count=Number(value);if(!Number.isSafeInteger(count)||count<0)throw new Error('INVALID_REPORT_COUNT');return [key,count];}));
  return {date,timeZone:'Asia/Kolkata',generatedAt:new Date().toISOString(),activity:{...counts(jobs[0]),...counts(approvals[0]),...counts(admissions[0]),...counts(controls[0]),...counts(requests[0]),...counts(accepted[0]),...counts(intakes[0]),...counts(intakeAccepted[0])},backlog:{...counts(backlog[0]),...counts(pending[0]),...counts(uncertain[0]),...counts(unconfirmed[0]),...counts(intakeBacklog[0]),...counts(knowledge[0])}} as DailyWorkReport;
 });
}
