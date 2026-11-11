import { appendQueueEvent } from './queueEvents';
import type { Pool,PoolConnection } from 'mysql2/promise';
import type { DbJobQueue } from './db';

/** Claim and state transition share one retained connection and transaction. */
export async function claimSqlJob(pool: Pool, workerId: string, supportedTypes?: string[]): Promise<DbJobQueue | null> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const filter = supportedTypes?.length ? `AND job_type IN (${supportedTypes.map(() => '?').join(', ')})` : '';
    // Crashed workers must not be reclaimed forever after consuming the attempt budget.
    const [exhausted]: any = await connection.query(
      `SELECT id FROM job_queue WHERE (attempts - deferrals) >= max_attempts AND
         ((status IN ('QUEUED', 'RETRY_WAIT') AND scheduled_for <= NOW()) OR
          (status = 'RUNNING' AND locked_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE))) ${filter}
       ORDER BY id LIMIT 100 FOR UPDATE`, supportedTypes || []);
    for (const job of exhausted) {
      await connection.query("UPDATE job_queue SET status = 'FAILED', error_message = 'ATTEMPTS_EXHAUSTED', locked_at = NULL, locked_by = NULL, updated_at = NOW() WHERE id = ?", [job.id]);
      await appendQueueEvent(connection, job.id, 'JOB_ATTEMPTS_EXHAUSTED', { workerId });
    }
    const [candidates]: any = await connection.query(
      `SELECT id FROM job_queue
       WHERE ((status IN ('QUEUED', 'RETRY_WAIT') AND scheduled_for <= NOW())
          OR (status = 'RUNNING' AND locked_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)))
       AND (attempts - deferrals) < max_attempts ${filter}
       ORDER BY scheduled_for ASC, id ASC LIMIT 1 FOR UPDATE`, supportedTypes || []);
    if (!candidates.length) {
      await connection.commit();
      return null;
    }
    const id = candidates[0].id;
    await connection.query(
      `UPDATE job_queue SET status = 'RUNNING', locked_at = NOW(), locked_by = ?, attempts = attempts + 1, updated_at = NOW() WHERE id = ?`,
      [workerId, id]);
    const [rows]: any = await connection.query('SELECT * FROM job_queue WHERE id = ?', [id]);
    const row = rows[0];
    const job = {
      ...row,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      result: typeof row.result === 'string' ? JSON.parse(row.result) : row.result,
    };
    await appendQueueEvent(connection, id, 'JOB_CLAIMED', { workerId });
    await connection.commit();
    return job;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export interface QueueLease { workerId: string; attempt: number }

function leaseCondition(lease?: QueueLease): { sql: string; values: unknown[] } {
  if (!lease) return { sql: "status IN ('QUEUED', 'RETRY_WAIT')", values: [] };
  if (!lease.workerId || !Number.isInteger(lease.attempt) || lease.attempt < 1) throw new Error('INVALID_JOB_LEASE');
  return { sql: "status = 'RUNNING' AND locked_by = ? AND attempts = ? AND locked_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)", values: [lease.workerId, lease.attempt] };
}

export function ownsJobLease(job: DbJobQueue, lease?: QueueLease): boolean {
  if (!lease) return job.status === 'QUEUED' || job.status === 'RETRY_WAIT';
  return Number.isInteger(lease.attempt) && lease.attempt > 0 && !!lease.workerId && job.status === 'RUNNING' && job.locked_by === lease.workerId && job.attempts === lease.attempt &&
    !!job.locked_at && Date.parse(job.locked_at) >= Date.now() - 5 * 60 * 1000;
}

async function settleSqlJob(pool: Pool, id: string, sql: string, values: unknown[], event: string, lease?: QueueLease,project?:(connection:PoolConnection)=>Promise<void>): Promise<DbJobQueue | null> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [update]: any = await connection.query(sql, values);
    if (!update.affectedRows) { await connection.commit(); return null; }
    if(project)await project(connection);
    await appendQueueEvent(connection, id, event, { workerId: lease?.workerId });
    const [rows]: any = await connection.query('SELECT * FROM job_queue WHERE id = ?', [id]);
    const row = rows[0];
    const job = { ...row, payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      result: typeof row.result === 'string' ? JSON.parse(row.result) : row.result };
    await connection.commit();
    return job;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

export async function completeSqlJob(pool: Pool, id: string, result?: Record<string, any>, lease?: QueueLease,project?:(connection:PoolConnection)=>Promise<void>): Promise<DbJobQueue | null> {
  const guard = leaseCondition(lease);
  return settleSqlJob(pool, id,
    `UPDATE job_queue SET status = 'SUCCEEDED', result = ?, locked_at = NULL, locked_by = NULL, error_message = NULL, updated_at = NOW()
     WHERE id = ? AND ${guard.sql}`, [result ? JSON.stringify(result) : null, id, ...guard.values], 'JOB_SUCCEEDED', lease,project);
}

export async function failSqlJob(pool: Pool, id: string, error: string, retryable = true, lease?: QueueLease,project?:(connection:PoolConnection)=>Promise<void>): Promise<DbJobQueue | null> {
  const guard = leaseCondition(lease);
  return settleSqlJob(pool, id,
    `UPDATE job_queue SET
       scheduled_for = CASE WHEN ? AND (attempts - deferrals) < max_attempts THEN DATE_ADD(NOW(), INTERVAL (GREATEST(attempts - deferrals, 1) * 30) SECOND) ELSE scheduled_for END,
       status = CASE WHEN ? AND (attempts - deferrals) < max_attempts THEN 'RETRY_WAIT' ELSE 'FAILED' END,
       error_message = ?, locked_at = NULL, locked_by = NULL, updated_at = NOW()
     WHERE id = ? AND ${guard.sql}`, [retryable, retryable, error, id, ...guard.values], 'JOB_FAILED', lease,project);
}

export async function renewSqlJobLease(pool: Pool, id: string, lease: QueueLease): Promise<boolean> {
  const guard = leaseCondition(lease);
  const [update]: any = await pool.query(
    `UPDATE job_queue SET locked_at = NOW(), updated_at = NOW() WHERE id = ? AND ${guard.sql}`,
    [id, ...guard.values]);
  return update.affectedRows > 0;
}

export async function cancelSqlJob(pool: Pool, id: string, companyId?: string): Promise<DbJobQueue | null> {
  return settleSqlJob(pool, id,
    `UPDATE job_queue SET status = 'CANCELLED', locked_at = NULL, locked_by = NULL, updated_at = NOW()
     WHERE id = ? AND status IN ('QUEUED', 'RETRY_WAIT') ${companyId ? 'AND company_id = ?' : ''}`,
    companyId ? [id, companyId] : [id], 'JOB_CANCELLED');
}

export const PAUSE_REASONS=['GLOBAL_EMERGENCY_STOP','CLIENT_AUTOPILOT_PAUSED','CLIENT_HOLIDAY_PAUSED','EXECUTION_CONTROLS_UNAVAILABLE','PUBLICATION_PAUSED','PUBLICATION_CHANNEL_PAUSED','PUBLICATION_QUOTA_EXHAUSTED'] as const;
export type PauseReason=typeof PAUSE_REASONS[number];
export async function deferSqlJob(pool:Pool,id:string,reason:PauseReason,lease?:QueueLease):Promise<DbJobQueue|null>{
 if(!PAUSE_REASONS.includes(reason))throw new Error('INVALID_PAUSE_REASON');
 const guard=leaseCondition(lease);
 return settleSqlJob(pool,id,`UPDATE job_queue SET deferrals = deferrals + CASE WHEN status = 'RUNNING' THEN 1 ELSE 0 END,
  status = 'RETRY_WAIT',scheduled_for = DATE_ADD(NOW(),INTERVAL 60 SECOND),error_message = ?,locked_at = NULL,locked_by = NULL,updated_at = NOW()
  WHERE id = ? AND ${guard.sql}`,[reason,id,...guard.values],'JOB_DEFERRED',lease);
}
