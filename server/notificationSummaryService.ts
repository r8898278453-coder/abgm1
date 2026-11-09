import {readDailyWorkReport} from './dailyWorkReport';
import {loadDailyWorkDigest} from './dailyWorkDigest';
import { getDbPool } from './db';
import { readDigestSummary, readReviewReminderSummary } from './notificationSummaries';
export async function getDigestSummary(company: string, cutoff: number) {
  const pool = await getDbPool();
  if (!pool) throw new Error('NOTIFICATION_SUMMARY_UNAVAILABLE');
  return readDigestSummary(pool,company,cutoff);
}
export async function getReviewReminderSummary(company: string, cutoff: number) {
  const pool = await getDbPool();
  if (!pool) throw new Error('NOTIFICATION_SUMMARY_UNAVAILABLE');
  return readReviewReminderSummary(pool,company,cutoff);
}

export async function getDailyWorkDigest(company:string,dueAt:number,canStart:()=>boolean){
 return loadDailyWorkDigest(company,dueAt,async(id,date)=>{const pool=await getDbPool();if(!pool)throw new Error('DAILY_WORK_REPORT_UNAVAILABLE');return readDailyWorkReport(pool,id,date);},canStart);
}
