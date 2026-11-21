import {readSalesEmailReceiptDay} from './salesEmailReceipts';
import {readSalesEmailReplyDay} from './salesEmailReplies';
import {readSalesEmailIntakeReport} from './salesEmailReplyIntakes';
import type {ReadOnlySql} from './readOnlySqlDeadline';

export async function readEmailWorkReporting(sql:ReadOnlySql,company:string,start:number,end:number){
 const delivery=await readSalesEmailReceiptDay(sql,company,start,end);
 const replies=await readSalesEmailReplyDay(sql,company,start,end);
 const intake=await readSalesEmailIntakeReport(sql,company,start,end);
 return {
  activity:{
   emailSent:delivery.SENT??0,emailDelayed:delivery.DELAYED??0,emailDelivered:delivery.DELIVERED??0,
   emailFailed:delivery.FAILED??0,emailBounced:delivery.BOUNCED??0,emailSuppressed:delivery.SUPPRESSED??0,
   emailComplained:delivery.COMPLAINED??0,emailRepliesLinked:replies.replies,emailReplyOptOuts:replies.optOuts,
   emailIntakesQueued:intake.activity.admitted,emailIntakesRecorded:intake.activity.recorded,
   emailIntakesIgnored:intake.activity.ignored,emailIntakesFailed:intake.activity.failed,emailIntakesExpired:intake.activity.expired,
  },
  backlog:{emailIntakesPending:intake.backlog.pending,emailIntakesRunning:intake.backlog.running},
 };
}
