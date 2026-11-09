import type {Connection,Pool} from 'mysql2/promise';
export async function createPublishingVerificationAudit(db:Connection|Pool):Promise<void>{
  await db.query(`CREATE TABLE IF NOT EXISTS publishing_verification_audit (
    id VARCHAR(64) PRIMARY KEY,
    check_sequence BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id VARCHAR(64) NOT NULL,
    post_id VARCHAR(64) NOT NULL,
    actor_id VARCHAR(64) NOT NULL,
    source_version CHAR(64) NOT NULL,
    integration_version VARCHAR(64) NOT NULL,
    platform VARCHAR(32) NOT NULL,
    provider_object_id VARCHAR(128) NOT NULL,
    status VARCHAR(16) NOT NULL,
    reason VARCHAR(64) NOT NULL,
    publication_id VARCHAR(128) DEFAULT NULL,
    account_id VARCHAR(64) DEFAULT NULL,
    provider_created_ms BIGINT DEFAULT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_pub_check_sequence (check_sequence),
    INDEX idx_pub_check_scope (company_id,post_id,check_sequence),
    CONSTRAINT fk_pub_check_claim FOREIGN KEY (post_id) REFERENCES publishing_dispatch_claims(post_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}
