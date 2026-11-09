import type { Pool } from 'mysql2/promise';

export const ACTION_FEED_CONSUMER = 'action-feed-v1';
export interface ActionOutboxSummary { available: boolean; processed: number; failed: number }

/** Internal SQL-only subscriber. No network/provider calls are permitted inside these transactions. */
export async function processActionOutbox(pool: Pool, worker: string, batchSize = 25, canStart: () => boolean = () => true): Promise<ActionOutboxSummary> {
  if (!worker || worker.length > 128 || !Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) throw new Error('INVALID_OUTBOX_WORKER');
  const summary = { available: true, processed: 0, failed: 0 };
  for (let n = 0; n < batchSize; n++) {
    if (!canStart()) break;
    const connection = await pool.getConnection();
    let claimed: any;
    try {
      await connection.beginTransaction();
      await connection.query(`UPDATE job_action_outbox SET status = 'FAILED', locked_at = NULL, locked_by = NULL, last_error_code = 'ATTEMPTS_EXHAUSTED'
        WHERE consumer_name = ? AND attempts >= 3 AND
          ((status = 'PENDING' AND available_at <= NOW()) OR (status = 'PROCESSING' AND locked_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE))) LIMIT 100`, [ACTION_FEED_CONSUMER]);
      const [rows]: any = await connection.query(`SELECT id, attempts FROM job_action_outbox
        WHERE consumer_name = ? AND attempts < 3 AND
          ((status = 'PENDING' AND available_at <= NOW()) OR (status = 'PROCESSING' AND locked_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)))
        ORDER BY available_at, id LIMIT 1 FOR UPDATE`, [ACTION_FEED_CONSUMER]);
      if (!rows.length) { await connection.commit(); break; }
      claimed = { id: rows[0].id, attempt: Number(rows[0].attempts) + 1 };
      await connection.query("UPDATE job_action_outbox SET status = 'PROCESSING', attempts = attempts + 1, locked_at = NOW(), locked_by = ? WHERE id = ?", [worker, claimed.id]);
      await connection.commit();

      await connection.beginTransaction();
      const [owned]: any = await connection.query(`SELECT o.event_id, o.company_id, e.company_id AS event_company, r.company_id AS run_company, j.company_id AS job_company
        FROM job_action_outbox o JOIN job_action_events e ON e.id = o.event_id
        JOIN job_action_runs r ON r.job_id = e.job_id JOIN job_queue j ON j.id = e.job_id
        WHERE o.id = ? AND o.consumer_name = ? AND o.status = 'PROCESSING' AND o.locked_by = ? AND o.attempts = ?
          AND o.locked_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE) FOR UPDATE`, [claimed.id, ACTION_FEED_CONSUMER, worker, claimed.attempt]);
      if (!owned.length) { await connection.commit(); summary.failed++; continue; }
      const event = owned[0];
      if ([event.event_company, event.run_company, event.job_company].some(id => id !== event.company_id)) throw new Error('OUTBOX_SCOPE_MISMATCH');
      const [receipt]: any = await connection.query('SELECT event_id FROM job_action_receipts WHERE consumer_name = ? AND event_id = ?', [ACTION_FEED_CONSUMER, event.event_id]);
      if (!receipt.length) {
        await connection.query(`INSERT INTO job_action_feed_cursors (company_id, consumer_name, revision) VALUES (?, ?, 0)
          ON DUPLICATE KEY UPDATE company_id = VALUES(company_id)`, [event.company_id, ACTION_FEED_CONSUMER]);
        await connection.query('UPDATE job_action_feed_cursors SET revision = revision + 1 WHERE company_id = ? AND consumer_name = ?', [event.company_id, ACTION_FEED_CONSUMER]);
        await connection.query(`INSERT INTO job_action_receipts (consumer_name, event_id, company_id, revision)
          SELECT consumer_name, ?, company_id, revision FROM job_action_feed_cursors WHERE company_id = ? AND consumer_name = ?`, [event.event_id, event.company_id, ACTION_FEED_CONSUMER]);
      }
      await connection.query("UPDATE job_action_outbox SET status = 'PROCESSED', locked_by = NULL, locked_at = NULL, last_error_code = NULL WHERE id = ?", [claimed.id]);
      await connection.commit();
      summary.processed++;
    } catch (error: any) {
      await connection.rollback();
      if (!claimed) {
        if (error?.code === 'ER_LOCK_DEADLOCK' || error?.code === 'ER_LOCK_WAIT_TIMEOUT') { summary.failed++; continue; }
        throw error;
      }
      await connection.query(`UPDATE job_action_outbox SET status = CASE WHEN attempts >= 3 THEN 'FAILED' ELSE 'PENDING' END,
        available_at = DATE_ADD(NOW(), INTERVAL 30 SECOND), locked_at = NULL, locked_by = NULL, last_error_code = ?
        WHERE id = ? AND status = 'PROCESSING' AND locked_by = ? AND attempts = ?`,
      [error?.message === 'OUTBOX_SCOPE_MISMATCH' ? 'SCOPE_MISMATCH' : 'CONSUMER_TRANSACTION_FAILED', claimed.id, worker, claimed.attempt]);
      summary.failed++;
    } finally { connection.release(); }
  }
  return summary;
}

export function validateActionFeedQuery(after: string, limit: number): void {
  if (!/^\d{1,20}$/.test(after) || BigInt(after) > 18446744073709551615n || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('INVALID_ACTION_FEED_QUERY');
}

/** Cursor revisions are assigned at consumer commit, not source event allocation order. */
export async function readActionFeed(pool: Pool, companyId: string, after = '0', limit = 50) {
  validateActionFeedQuery(after, limit);
  const [events]: any = await pool.query(`SELECT CAST(r.revision AS CHAR) AS revision, e.id, e.job_id, e.event_type, e.job_status,
      j.job_type, e.reason_code, e.attempt, e.actor_id, e.worker_id, e.recorded_at
    FROM job_action_receipts r JOIN job_action_events e ON e.id = r.event_id AND e.company_id = r.company_id
    JOIN job_queue j ON j.id = e.job_id AND j.company_id = r.company_id
    WHERE r.company_id = ? AND r.consumer_name = ? AND r.revision > ? ORDER BY r.revision LIMIT ?`, [companyId, ACTION_FEED_CONSUMER, after, limit]);
  const [cursor]: any = await pool.query('SELECT CAST(revision AS CHAR) AS revision FROM job_action_feed_cursors WHERE company_id = ? AND consumer_name = ?', [companyId, ACTION_FEED_CONSUMER]);
  return { available: true, events, nextCursor: events.length ? events[events.length - 1].revision : after, latestRevision: cursor[0]?.revision || '0' };
}
