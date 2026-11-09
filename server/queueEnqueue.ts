import { appendQueueEvent } from './queueEvents';
import type { Pool } from 'mysql2/promise';
import type { DbJobQueue } from './db';

function decode(row: any): DbJobQueue {
  return { ...row, payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
    result: typeof row.result === 'string' ? JSON.parse(row.result) : row.result };
}

/** Queue intent, minimal audit event and delivery intent commit together or not at all. */
export async function enqueueSqlJob(pool: Pool, job: DbJobQueue): Promise<DbJobQueue> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    if (job.idempotency_key) {
      const [existing]: any = await connection.query('SELECT * FROM job_queue WHERE company_id = ? AND idempotency_key = ? LIMIT 1', [job.company_id, job.idempotency_key]);
      if (existing.length) { await connection.commit(); return decode(existing[0]); }
    }
    const scheduled = new Date(job.scheduled_for);
    if (!Number.isFinite(scheduled.getTime())) throw new Error('INVALID_JOB_SCHEDULE');
    await connection.query(`INSERT INTO job_queue
      (id, company_id, job_type, payload, status, attempts, max_attempts, idempotency_key, scheduled_for)
      VALUES (?, ?, ?, ?, 'QUEUED', 0, ?, ?, ?)`,
    [job.id, job.company_id, job.job_type, JSON.stringify(job.payload), job.max_attempts, job.idempotency_key, scheduled]);
    await appendQueueEvent(connection, job.id, 'JOB_QUEUED', { userId: job.requested_by });
    await connection.commit();
    return job;
  } catch (error: any) {
    await connection.rollback();
    if (error?.code === 'ER_DUP_ENTRY' && job.idempotency_key) {
      const [existing]: any = await connection.query('SELECT * FROM job_queue WHERE company_id = ? AND idempotency_key = ? LIMIT 1', [job.company_id, job.idempotency_key]);
      if (existing.length) return decode(existing[0]);
    }
    throw error;
  } finally {
    connection.release();
  }
}
