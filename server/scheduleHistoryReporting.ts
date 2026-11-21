import type {ReadOnlySql} from './readOnlySqlDeadline';
import {platformDateKey} from '../shared/dailyWorkReport';
import {scheduledTimeMs} from './scheduleTime';

const DAY_MS=86_400_000;
const MAX_TIMESTAMP_CANDIDATES=2000;

export async function readScheduleHistoryReporting(sql:ReadOnlySql,company:string,date:string,start:number,end:number){
 const [[revisions]]=await sql.query(`SELECT COUNT(*) scheduleRevisions,COUNT(DISTINCT post_id) scheduleRevisedPosts,
  COUNT(CASE WHEN BINARY from_status='scheduled' THEN 1 END) scheduleRevisionsFromScheduled,
  COUNT(CASE WHEN BINARY from_status='pending_approval' THEN 1 END) scheduleRevisionsFromApproval,
  COUNT(CASE WHEN BINARY to_status='pending_approval' THEN 1 END) scheduleRevisionsToApproval
  FROM publication_workflow_audit WHERE company_id=? AND BINARY change_kind='RESCHEDULE'
   AND recorded_at>=FROM_UNIXTIME(?) AND recorded_at<FROM_UNIXTIME(?)`,[company,start/1000,end/1000]);

 // Explicit offsets plus IST can move a timestamp two calendar dates from its stored date.
 const firstDate=platformDateKey(start-2*DAY_MS),lastDate=platformDateKey(end+2*DAY_MS);
 const [candidates]=await sql.query(`SELECT p.scheduled_date,p.scheduled_time,p.time_slot,p.status,
  EXISTS(SELECT 1 FROM publication_admission_reservations r WHERE r.company_id=p.company_id AND r.post_id=p.id AND r.quota_day=?) sameDay,
  EXISTS(SELECT 1 FROM publication_admission_reservations r WHERE r.company_id=p.company_id AND r.post_id=p.id) anyDay
  FROM content_posts p WHERE p.company_id=? AND ((p.scheduled_date>=? AND p.scheduled_date<?)
     OR (p.scheduled_date REGEXP '^[[:space:]]' AND REGEXP_REPLACE(p.scheduled_date,'^[[:space:]]+','')>=?
         AND REGEXP_REPLACE(p.scheduled_date,'^[[:space:]]+','')<?))
   AND (p.scheduled_date REGEXP '^[[:space:]]*[0-9]{4}-[0-9]{2}-[0-9]{2}[T ]'
      OR p.scheduled_time REGEXP '^[[:space:]]*[0-9]{4}-[0-9]{2}-[0-9]{2}[T ]')
  LIMIT ?`,[date,company,firstDate,lastDate,firstDate,lastDate,MAX_TIMESTAMP_CANDIDATES+1]);
 if(candidates.length>MAX_TIMESTAMP_CANDIDATES)throw new Error('SCHEDULE_HISTORY_REPORT_LIMIT');
 const legacy={
  legacyPlans:0,legacySameDayAdmission:0,legacyOtherDayAdmission:0,legacyWithoutAdmission:0,
  legacyScheduledWithoutAdmission:0,legacyApprovalWithoutAdmission:0,
 };
 for(const row of candidates){
  const instant=scheduledTimeMs(row.scheduled_date,row.scheduled_time,row.time_slot);
  if(instant===null||instant<start||instant>=end)continue;
  legacy.legacyPlans++;
  if(Number(row.sameDay)===1)legacy.legacySameDayAdmission++;
  else if(Number(row.anyDay)===1)legacy.legacyOtherDayAdmission++;
  else{
   legacy.legacyWithoutAdmission++;
   if(row.status==='scheduled')legacy.legacyScheduledWithoutAdmission++;
   if(row.status==='pending_approval')legacy.legacyApprovalWithoutAdmission++;
  }
 }
 return {...revisions,...legacy};
}
