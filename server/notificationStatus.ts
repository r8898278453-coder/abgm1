import {notificationCursor} from '../shared/notificationEvidence';
import type { Pool } from 'mysql2/promise';
export interface NotificationCursor { dueAt: string; kind: string }
export function parseNotificationCursor(value: unknown): NotificationCursor | null {
  if (value === undefined) return null;
  return notificationCursor(value);
}
export async function readNotificationStatus(pool: Pool, companyId: string, before?: NotificationCursor | null, limit = 25) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('INVALID_NOTIFICATION_LIMIT');
  const values: any[] = [companyId];
  const boundary = before ? 'AND (due_at < ? OR (due_at = ? AND notification_kind < ?))' : '';
  if (before) { const due = before.dueAt.slice(0,19).replace('T',' '); values.push(due, due, before.kind); }
  values.push(limit + 1);
  const [rows]: any = await pool.query(`SELECT notification_kind AS kind,
    DATE_FORMAT(due_at, '%Y-%m-%dT%H:%i:%sZ') AS dueAt, status, CAST(policy_revision AS CHAR) AS policyVersion, provider_id AS providerId, reason_code AS reasonCode,
    (status = 'RUNNING' AND created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)) AS needsReview
    FROM notification_occurrences WHERE company_id = ? ${boundary}
    ORDER BY due_at DESC, notification_kind DESC LIMIT ?`, values);
  for(const row of rows){notificationCursor(row.dueAt+'|'+row.kind);if(!['SENT','UNKNOWN','RUNNING'].includes(row.status))throw new Error('NOTIFICATION_STATUS_INVALID');}
  const hasMore = rows.length > limit;
  const occurrences = rows.slice(0, limit).map((row: any) => ({ ...row, needsReview: row.status === 'UNKNOWN' || Boolean(row.needsReview) }));
  const last = occurrences.at(-1);
  return { available: true, occurrences, nextCursor: hasMore && last ? `${last.dueAt}|${last.kind}` : null };
}
