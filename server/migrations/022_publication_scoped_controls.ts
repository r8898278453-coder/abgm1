import type {Connection,Pool} from 'mysql2/promise';
export async function createPublicationScopedControls(db:Connection|Pool):Promise<void>{
 await db.query(`CREATE TABLE IF NOT EXISTS publication_execution_controls (
  company_id VARCHAR(64) PRIMARY KEY,
  paused TINYINT(1) NOT NULL DEFAULT 0,
  paused_channels LONGTEXT NOT NULL,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_by VARCHAR(64) DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_publication_controls_company FOREIGN KEY (company_id) REFERENCES companies(id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
 await db.query(`CREATE TABLE IF NOT EXISTS publication_control_audit (
  id VARCHAR(64) PRIMARY KEY,
  company_id VARCHAR(64) NOT NULL,
  revision BIGINT UNSIGNED NOT NULL,
  actor_id VARCHAR(64) NOT NULL,
  before_state JSON NOT NULL,
  after_state JSON NOT NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_publication_control_revision (company_id,revision),
  CONSTRAINT fk_publication_control_audit FOREIGN KEY (company_id) REFERENCES publication_execution_controls(company_id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}
