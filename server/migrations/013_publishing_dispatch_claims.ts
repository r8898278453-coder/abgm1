import type { Connection, Pool } from 'mysql2/promise';
export async function createPublishingDispatchClaims(db: Connection | Pool): Promise<void> {
  await db.query(`CREATE TABLE IF NOT EXISTS publishing_dispatch_claims (
    post_id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'READY',
    claim_token VARCHAR(64) DEFAULT NULL,
    started_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}
