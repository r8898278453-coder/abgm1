import { IST_OFFSET_MS } from '../shared/platformTime';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'mysql2/promise';
export type NotificationKind = 'daily_digest' | 'review_reminder';
export function latestNotificationDue(kind: NotificationKind, now = Date.now()): number {
  if (!Number.isFinite(now)) throw new Error('INVALID_NOTIFICATION_TIME');
  const offset = IST_OFFSET_MS;
  const period = kind === 'daily_digest' ? 86400000 : 3600000;
  const anchor = kind === 'daily_digest' ? 8 * 3600000 : 0;
  return Math.floor((now + offset - anchor) / period) * period + anchor - offset;
}
/** Claim commits before I/O. Any ambiguous crash/send remains UNKNOWN, never blindly resent. */
export async function runNotificationOccurrence(pool: Pool, companyId: string, kind: NotificationKind, dueAt: number,
  deliver: () => Promise<boolean>): Promise<'SENT' | 'UNKNOWN' | 'EXISTING'> {
  if (!companyId || companyId.length > 64 || !['daily_digest', 'review_reminder'].includes(kind) || !Number.isFinite(dueAt)) throw new Error('INVALID_NOTIFICATION_OCCURRENCE');
  const due = new Date(dueAt).toISOString().slice(0, 19).replace('T', ' ');
  const token = randomUUID();
  // Sweep bounded stale claims for this client/kind, including an older due slot.
  await pool.query(`UPDATE notification_occurrences SET status = 'UNKNOWN'
    WHERE company_id = ? AND notification_kind = ? AND status = 'RUNNING'
    AND created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE) LIMIT 100`, [companyId, kind]);
  // Autocommit: claim is durable before invoking the provider.
  const [insert]: any = await pool.query(`INSERT IGNORE INTO notification_occurrences
    (company_id, notification_kind, due_at, claim_token) VALUES (?, ?, ?, ?)`, [companyId, kind, due, token]);
  if (insert.affectedRows !== 1) return 'EXISTING';
  let status: 'SENT' | 'UNKNOWN' = 'UNKNOWN';
  try { if (await deliver()) status = 'SENT'; } catch { /* no raw provider errors or tokens */ }
  const [settled]: any = await pool.query(`UPDATE notification_occurrences SET status = ?
    WHERE company_id = ? AND notification_kind = ? AND due_at = ? AND claim_token = ? AND status = 'RUNNING'`, [status, companyId, kind, due, token]);
  return settled.affectedRows === 1 ? status : 'UNKNOWN';
}
