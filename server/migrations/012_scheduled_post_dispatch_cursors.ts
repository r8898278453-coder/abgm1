import type { Connection, Pool } from 'mysql2/promise';
export async function createScheduledPostDispatchCursors(db: Connection | Pool): Promise<void> {
  await db.query(`CREATE TABLE IF NOT EXISTS scheduled_post_dispatch_cursors (
    cursor_key VARCHAR(128) PRIMARY KEY,
    last_id VARCHAR(64) DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}
