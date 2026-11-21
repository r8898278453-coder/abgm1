import type {ReadOnlySql} from './readOnlySqlDeadline';

export async function readCalendarPlanDailyReporting(sql:ReadOnlySql,company:string,date:string,start:number,end:number){
 const [[history]]=await sql.query(`SELECT
  COUNT(CASE WHEN BINARY kind='CREATED' THEN 1 END) calendarPlanCreated,
  COUNT(CASE WHEN BINARY kind='CLOSED' THEN 1 END) calendarPlanClosed,
  COUNT(CASE WHEN BINARY kind='REQUEST_SEALED' THEN 1 END) calendarRequestSealed,
  COUNT(CASE WHEN BINARY kind='GENERATION_ADMITTED' THEN 1 END) calendarGenerationAdmitted,
  COUNT(CASE WHEN BINARY kind='ITEM_SAVED' THEN 1 END) calendarItemSaved,
  COUNT(CASE WHEN BINARY kind='ITEM_FAILED' THEN 1 END) calendarItemFailed,
  COUNT(CASE WHEN BINARY kind='ITEM_CANCELLED' THEN 1 END) calendarItemCancelled,
  COUNT(CASE WHEN BINARY kind='PHOTO_ATTACHED' THEN 1 END) calendarPhotoAttached,
  COUNT(CASE WHEN BINARY kind='PHOTO_DETACHED' THEN 1 END) calendarPhotoDetached
  FROM calendar_plan_revisions WHERE company_id=? AND recorded_at_ms>=? AND recorded_at_ms<?`,[company,start,end]);
 const [[slots]]=await sql.query(`SELECT
  COUNT(CASE WHEN state='PENDING' THEN 1 END) calendarSlotPending,
  COUNT(CASE WHEN state='GENERATING' THEN 1 END) calendarSlotGenerating,
  COUNT(CASE WHEN state='FAILED' THEN 1 END) calendarSlotFailed,
  COUNT(CASE WHEN state='CANCELLED' THEN 1 END) calendarSlotCancelled,
  COUNT(CASE WHEN state='SAVED' THEN 1 END) calendarSlotSaved,
  COUNT(CASE WHEN state='SAVED' AND linkedPost IS NULL THEN 1 END) calendarSlotMissingPost,
  COUNT(CASE WHEN state='SAVED' AND linkedPost IS NOT NULL AND admitted=1 THEN 1 END) calendarSlotAdmittedPost,
  COUNT(CASE WHEN state='SAVED' AND claimStatus='PUBLISHED' THEN 1 END) calendarSlotPublishedPost
  FROM (
   SELECT BINARY i.state state,p.id linkedPost,BINARY c.status claimStatus,
    EXISTS(SELECT 1 FROM publication_admission_reservations r WHERE r.post_id=p.id AND r.company_id=p.company_id) admitted
   FROM calendar_plan_items i
   JOIN calendar_plans plan ON plan.id=i.plan_id AND plan.company_id=i.company_id AND BINARY plan.state IN ('OPEN','CLOSED')
   LEFT JOIN content_posts p ON p.id=i.post_id AND p.company_id=i.company_id
   LEFT JOIN publishing_dispatch_claims c ON c.post_id=p.id AND c.company_id=p.company_id
   WHERE i.company_id=? AND i.month=? AND
    BINARY JSON_UNQUOTE(JSON_EXTRACT(CASE WHEN JSON_VALID(i.config_json) THEN i.config_json ELSE '{}' END,'$.date'))=?
  ) slot_states`,[company,date.slice(0,7),date]);
 return {...history,...slots};
}
