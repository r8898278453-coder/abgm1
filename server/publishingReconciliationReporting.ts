import {readScheduleHistoryReporting} from './scheduleHistoryReporting';
import type {ReadOnlySql} from './readOnlySqlDeadline';

export async function readPublishingReconciliation(sql:ReadOnlySql,company:string,date:string,start:number,end:number){
 const range=[company,start/1000,end/1000];
 const [[checks]]=await sql.query(`SELECT
  COUNT(CASE WHEN BINARY status='MATCHED' THEN 1 END) providerCheckMatched,
  COUNT(CASE WHEN BINARY status='MISMATCH' THEN 1 END) providerCheckMismatch,
  COUNT(CASE WHEN BINARY status='UNAVAILABLE' THEN 1 END) providerCheckUnavailable,
  COUNT(CASE WHEN BINARY status='STALE' THEN 1 END) providerCheckStale
  FROM publishing_verification_audit WHERE company_id=? AND recorded_at>=FROM_UNIXTIME(?) AND recorded_at<FROM_UNIXTIME(?)`,range);
 const [[reviews]]=await sql.query(`SELECT
  COUNT(CASE WHEN BINARY decision='OBSERVED_PUBLISHED' THEN 1 END) operatorObservedPublished,
  COUNT(CASE WHEN BINARY decision='NOT_FOUND' THEN 1 END) operatorPublicationNotFound,
  COUNT(CASE WHEN BINARY decision='UNRESOLVED' THEN 1 END) operatorPublicationUnresolved
  FROM publishing_review_audit WHERE company_id=? AND recorded_at>=FROM_UNIXTIME(?) AND recorded_at<FROM_UNIXTIME(?)`,range);
 const [[plans]]=await sql.query(`SELECT COUNT(*) plannedPosts,
  COUNT(CASE WHEN sameDay=1 THEN 1 END) plannedWithSameDayAdmission,
  COUNT(CASE WHEN sameDay=0 AND anyDay=1 THEN 1 END) plannedWithOtherDayAdmission,
  COUNT(CASE WHEN anyDay=0 THEN 1 END) plannedWithoutAdmission,
  COUNT(CASE WHEN anyDay=0 AND BINARY state='scheduled' THEN 1 END) plannedScheduledWithoutAdmission,
  COUNT(CASE WHEN anyDay=0 AND BINARY state='pending_approval' THEN 1 END) plannedApprovalWithoutAdmission
  FROM (
   SELECT p.status state,
    EXISTS(SELECT 1 FROM publication_admission_reservations r WHERE r.company_id=p.company_id AND r.post_id=p.id AND r.quota_day=?) sameDay,
    EXISTS(SELECT 1 FROM publication_admission_reservations r WHERE r.post_id=p.id AND r.company_id=p.company_id) anyDay
   FROM content_posts p WHERE p.company_id=? AND p.scheduled_date=? AND BINARY p.scheduled_date=?
  ) dated_posts`,[date,company,date,date]);
 return {...checks,...reviews,...plans,...await readScheduleHistoryReporting(sql,company,date,start,end)};
}
