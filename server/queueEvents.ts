import crypto from 'node:crypto';
import type { PoolConnection } from 'mysql2/promise';

/** Call only inside the transaction that changed the job; never copy its private payload. */
export async function appendQueueEvent(connection: PoolConnection, jobId: string, eventType: string,
  actor: { userId?: string; workerId?: string } = {}): Promise<void> {
  await connection.query(`INSERT INTO job_action_runs (job_id, company_id, job_type, current_status, attempt)
    SELECT id, company_id, job_type, status, attempts FROM job_queue WHERE id = ?
    ON DUPLICATE KEY UPDATE current_status = VALUES(current_status), attempt = VALUES(attempt)`, [jobId]);
  const eventId = crypto.randomUUID();
  const [eventWrite]: any = await connection.query(`INSERT INTO job_action_events (id, job_id, company_id, event_type, job_status, reason_code, attempt, actor_id, worker_id)
    SELECT ?, r.job_id, r.company_id, ?, r.current_status,
      CASE WHEN ? = 'JOB_ATTEMPTS_EXHAUSTED' THEN 'ATTEMPTS_EXHAUSTED' WHEN ? = 'JOB_DEFERRED' THEN j.error_message WHEN r.current_status = 'RETRY_WAIT' THEN 'RETRY_SCHEDULED' ELSE NULL END,
      r.attempt, ?, ? FROM job_action_runs r JOIN job_queue j ON j.id = r.job_id
    WHERE r.job_id = ? AND r.company_id = j.company_id AND r.job_type = j.job_type`,
  [eventId, eventType, eventType, eventType, actor.userId || null, actor.workerId || null, jobId]);
  if (eventWrite.affectedRows !== 1) throw new Error('ACTION_SCOPE_MISMATCH');
  const [outboxWrite]: any = await connection.query(`INSERT INTO job_action_outbox (id, event_id, company_id)
    SELECT ?, id, company_id FROM job_action_events WHERE id = ?`, [crypto.randomUUID(), eventId]);
  if (outboxWrite.affectedRows !== 1) throw new Error('ACTION_OUTBOX_WRITE_FAILED');
}
