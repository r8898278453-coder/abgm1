import type { Connection, Pool } from 'mysql2/promise';

/** Additive, single internal subscriber; no external notification delivery enabled. */
export async function createInternalActionFeed(db: Connection | Pool): Promise<void> {
  const additions = [
    ['consumer_name', "VARCHAR(64) NOT NULL DEFAULT 'action-feed-v1'"],
    ['attempts', 'INT NOT NULL DEFAULT 0'],
    ['available_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'],
    ['locked_by', 'VARCHAR(128) DEFAULT NULL'],
    ['locked_at', 'TIMESTAMP NULL DEFAULT NULL'],
    ['last_error_code', 'VARCHAR(64) DEFAULT NULL'],
  ];
  for (const [name, definition] of additions) {
    const [columns]: any = await db.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'job_action_outbox' AND COLUMN_NAME = ?", [name]);
    if (!columns.length) await db.query(`ALTER TABLE job_action_outbox ADD COLUMN ${name} ${definition}`);
  }
  await db.query(`CREATE TABLE IF NOT EXISTS job_action_feed_cursors (
    company_id VARCHAR(64) NOT NULL,
    consumer_name VARCHAR(64) NOT NULL,
    revision BIGINT UNSIGNED NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (company_id, consumer_name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS job_action_receipts (
    consumer_name VARCHAR(64) NOT NULL,
    event_id VARCHAR(64) NOT NULL,
    company_id VARCHAR(64) NOT NULL,
    revision BIGINT UNSIGNED NOT NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (consumer_name, event_id),
    UNIQUE KEY uq_action_receipt_revision (company_id, consumer_name, revision),
    CONSTRAINT fk_action_receipt_event FOREIGN KEY (event_id) REFERENCES job_action_events(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}
