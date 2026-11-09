import type { Connection, Pool } from 'mysql2/promise';

/** Immutable forward-only foundation; no historical activity is invented. */
export async function createQueueActionLedger(db: Connection | Pool): Promise<void> {
  const [duplicates]: any = await db.query(`SELECT company_id, idempotency_key FROM job_queue
    WHERE idempotency_key IS NOT NULL GROUP BY company_id, idempotency_key HAVING COUNT(*) > 1 LIMIT 1`);
  if (duplicates.length) throw new Error('QUEUE_IDEMPOTENCY_CONFLICT: Resolve existing duplicate keys before migration');
  const [indexes]: any = await db.query(`SELECT INDEX_NAME, MIN(NON_UNIQUE) AS non_unique,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns_list, SUM(SUB_PART IS NOT NULL) AS prefix_parts
    FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'job_queue' GROUP BY INDEX_NAME`);
  if (!indexes.some((r: any) => Number(r.non_unique) === 0 && r.columns_list === 'company_id,idempotency_key' && Number(r.prefix_parts) === 0)) {
    await db.query('ALTER TABLE job_queue ADD UNIQUE KEY uq_jq_company_idempotency (company_id, idempotency_key)');
  }
  await db.query(`CREATE TABLE IF NOT EXISTS job_action_runs (
    job_id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL,
    job_type VARCHAR(64) NOT NULL,
    current_status VARCHAR(32) NOT NULL,
    attempt INT NOT NULL DEFAULT 0,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_action_runs_company (company_id),
    CONSTRAINT fk_action_run_job FOREIGN KEY (job_id) REFERENCES job_queue(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS job_action_events (
    id VARCHAR(64) PRIMARY KEY,
    job_id VARCHAR(64) NOT NULL,
    company_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    job_status VARCHAR(32) NOT NULL,
    reason_code VARCHAR(64) DEFAULT NULL,
    sequence BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    attempt INT NOT NULL,
    actor_id VARCHAR(64) DEFAULT NULL,
    worker_id VARCHAR(128) DEFAULT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_action_events_company (company_id, recorded_at),
    INDEX idx_action_events_job (job_id, sequence),
    UNIQUE KEY uq_action_event_sequence (sequence),
    CONSTRAINT fk_action_event_run FOREIGN KEY (job_id) REFERENCES job_action_runs(job_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS job_action_outbox (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL,
    company_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_outbox_event (event_id),
    INDEX idx_outbox_pending (status, recorded_at),
    CONSTRAINT fk_action_outbox_event FOREIGN KEY (event_id) REFERENCES job_action_events(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}
