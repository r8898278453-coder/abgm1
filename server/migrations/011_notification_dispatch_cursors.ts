import type { Connection, Pool } from 'mysql2/promise';
export async function createNotificationDispatchCursors(db: Connection | Pool): Promise<void> {
  await db.query(`CREATE TABLE IF NOT EXISTS notification_dispatch_cursors (
    notification_kind VARCHAR(32) PRIMARY KEY,
    last_company_id VARCHAR(64) DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}
