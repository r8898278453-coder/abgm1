import type { Pool } from 'mysql2/promise';
import { withReadOnlySqlDeadline } from './readOnlySqlDeadline';
// created_at is a SQL TIMESTAMP. FROM_UNIXTIME keeps comparisons correct even if DB session TZ differs.
const knownTime = "created_at IS NOT NULL AND created_at <> '0000-00-00 00:00:00' AND UNIX_TIMESTAMP(created_at) IS NOT NULL";
const unanswered = "COALESCE(replied, 0) = 0 AND COALESCE(reply_text, '') NOT REGEXP '[^[:space:]]'";
function boundaries(company: string, cutoff: number) {
  if (!company || !Number.isFinite(cutoff) || cutoff < 86400000) throw new Error('INVALID_REPORT_WINDOW');
  return { start: (cutoff - 86400000) / 1000, end: cutoff / 1000 };
}
export async function readDigestSummary(pool: Pool, company: string, cutoff: number, timeoutMs = 5000) {
  const { start, end } = boundaries(company, cutoff);
  return withReadOnlySqlDeadline(pool, async connection => {
    const [leads]: any = await connection.query(`SELECT
      COALESCE(SUM(${knownTime} AND created_at >= FROM_UNIXTIME(?) AND created_at < FROM_UNIXTIME(?)), 0) AS recent,
      COALESCE(SUM(NOT (${knownTime})), 0) AS missingTime FROM leads WHERE company_id = ?`, [start,end,company]);
    const [reviews]: any = await connection.query(`SELECT
      COALESCE(SUM(${knownTime} AND created_at >= FROM_UNIXTIME(?) AND created_at < FROM_UNIXTIME(?)), 0) AS recent,
      COALESCE(SUM(NOT (${knownTime})), 0) AS missingTime,
      AVG(CASE WHEN ${knownTime} AND created_at < FROM_UNIXTIME(?) AND rating BETWEEN 1 AND 5 THEN rating END) AS average,
      AVG(CASE WHEN ${knownTime} AND created_at < FROM_UNIXTIME(?) AND rating BETWEEN 1 AND 5 THEN rating END) AS olderAverage
      FROM reviews WHERE company_id = ?`, [start,end,end,start,company]);
    const [leadSample]: any = await connection.query(`SELECT name, service FROM leads WHERE company_id = ? AND ${knownTime}
      AND created_at >= FROM_UNIXTIME(?) AND created_at < FROM_UNIXTIME(?) ORDER BY created_at DESC, id DESC LIMIT 1`, [company,start,end]);
    const [reviewSample]: any = await connection.query(`SELECT author, CASE WHEN rating BETWEEN 1 AND 5 THEN rating ELSE NULL END AS rating
      FROM reviews WHERE company_id = ? AND ${knownTime} AND created_at >= FROM_UNIXTIME(?) AND created_at < FROM_UNIXTIME(?) ORDER BY created_at DESC, id DESC LIMIT 1`, [company,start,end]);
    return { recentLeads: Number(leads[0].recent), recentReviews: Number(reviews[0].recent),
      missingLeadTime: Number(leads[0].missingTime), missingReviewTime: Number(reviews[0].missingTime),
      averageRating: reviews[0].average === null ? null : Number(reviews[0].average),
      olderAverageRating: reviews[0].olderAverage === null ? null : Number(reviews[0].olderAverage),
      leadSample: leadSample[0] as { name: string; service: string } | undefined,
      reviewSample: reviewSample[0] as { author: string; rating: number | null } | undefined };
  }, timeoutMs);
}
export async function readReviewReminderSummary(pool: Pool, company: string, cutoff: number, timeoutMs = 5000) {
  const { start } = boundaries(company,cutoff);
  return withReadOnlySqlDeadline(pool, async connection => {
    const [stats]: any = await connection.query(`SELECT
      COALESCE(SUM(${knownTime} AND created_at < FROM_UNIXTIME(?)), 0) AS pending,
      COALESCE(SUM(NOT (${knownTime})), 0) AS missingTime,
      MIN(CASE WHEN ${knownTime} AND created_at < FROM_UNIXTIME(?) AND rating BETWEEN 1 AND 5 THEN rating END) AS lowest
      FROM reviews WHERE company_id = ? AND ${unanswered}`, [start,start,company]);
    const [sample]: any = await connection.query(`SELECT author, CASE WHEN rating BETWEEN 1 AND 5 THEN rating ELSE NULL END AS rating,
      LEFT(content,110) AS excerpt, CHAR_LENGTH(content) > 110 AS truncated FROM reviews WHERE company_id = ? AND ${unanswered}
      AND ${knownTime} AND created_at < FROM_UNIXTIME(?) ORDER BY created_at, id LIMIT 1`, [company,start]);
    return { pendingReviews: Number(stats[0].pending), missingReviewTime: Number(stats[0].missingTime),
      lowestRating: stats[0].lowest === null ? null : Number(stats[0].lowest),
      sample: sample[0] as { author: string; rating: number | null; excerpt: string; truncated: number } | undefined };
  }, timeoutMs);
}
