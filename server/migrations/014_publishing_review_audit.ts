import type { Connection, Pool } from 'mysql2/promise';
export async function createPublishingReviewAudit(db: Connection | Pool): Promise<void> {
  await db.query(`CREATE TABLE IF NOT EXISTS publishing_review_audit (
    id VARCHAR(64) PRIMARY KEY,
    review_sequence BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id VARCHAR(64) NOT NULL,
    post_id VARCHAR(64) NOT NULL,
    actor_id VARCHAR(64) NOT NULL,
    observed_version CHAR(64) NOT NULL,
    observed_claim_status VARCHAR(16) NOT NULL,
    observed_post_status VARCHAR(32) NOT NULL,
    observed_content_version CHAR(64) NOT NULL,
    decision VARCHAR(32) NOT NULL,
    platform VARCHAR(64) DEFAULT NULL,
    provider_post_id VARCHAR(128) DEFAULT NULL,
    evidence_reference VARCHAR(512) NOT NULL,
    note VARCHAR(1000) NOT NULL DEFAULT '',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_pub_review_sequence (review_sequence),
    INDEX idx_pub_review_scope (company_id,post_id,review_sequence),
    CONSTRAINT fk_pub_review_claim FOREIGN KEY (post_id) REFERENCES publishing_dispatch_claims(post_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}
