import type { Connection, Pool } from 'mysql2/promise';
export async function createNotificationOccurrences(db: Connection | Pool): Promise<void> {
  await db.query(`CREATE TABLE IF NOT EXISTS notification_occurrences (
    company_id VARCHAR(64) NOT NULL,
    notification_kind VARCHAR(32) NOT NULL,
    due_at DATETIME NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'RUNNING',
    claim_token VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (company_id, notification_kind, due_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}
