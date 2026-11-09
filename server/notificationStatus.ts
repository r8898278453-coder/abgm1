import type { Pool } from 'mysql2/promise';
export interface NotificationCursor { dueAt: string; kind: string }
export function parseNotificationCursor(value: unknown): NotificationCursor | null {
  if (value === undefined) return null;
  if (typeof value !== 'string' || value.length > 80) throw new Error('INVALID_NOTIFICATION_CURSOR');
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\|(daily_digest|review_reminder)$/.exec(value);
  if (!match || !Number.isFinite(Date.parse(match[1])) || new Date(match[1]).toISOString().slice(0,19)+'Z' !== match[1]) throw new Error('INVALID_NOTIFICATION_CURSOR');
  return { dueAt: match[1], kind: match[2] };
}
export async function readNotificationStatus(pool: Pool, companyId: string, before?: NotificationCursor | null, limit = 25) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('INVALID_NOTIFICATION_LIMIT');
  const values: any[] = [companyId];
  const boundary = before ? 'AND (due_at < ? OR (due_at = ? AND notification_kind < ?))' : '';
  if (before) { const due = before.dueAt.slice(0,19).replace('T',' '); values.push(due, due, before.kind); }
  values.push(limit + 1);
  const [rows]: any = await pool.query(`SELECT notification_kind AS kind,
    DATE_FORMAT(due_at, '%Y-%m-%dT%H:%i:%sZ') AS dueAt, status,
    (status = 'RUNNING' AND created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)) AS needsReview
    FROM notification_occurrences WHERE company_id = ? ${boundary}
    ORDER BY due_at DESC, notification_kind DESC LIMIT ?`, values);
  const hasMore = rows.length > limit;
  const occurrences = rows.slice(0, limit).map((row: any) => ({ ...row, needsReview: row.status === 'UNKNOWN' || Boolean(row.needsReview) }));
  const last = occurrences.at(-1);
  return { available: true, occurrences, nextCursor: hasMore && last ? `${last.dueAt}|${last.kind}` : null };
}
