import type {Connection,Pool} from 'mysql2/promise';
export async function createPublicationWorkflowAudit(db:Connection|Pool):Promise<void>{
 const [columns]:any=await db.query("SHOW COLUMNS FROM content_posts LIKE 'workflow_revision'");
 if(!columns.length)await db.query('ALTER TABLE content_posts ADD COLUMN workflow_revision BIGINT UNSIGNED NOT NULL DEFAULT 0');
 await db.query(`CREATE TABLE IF NOT EXISTS publication_workflow_audit (
  id VARCHAR(64) PRIMARY KEY,
  company_id VARCHAR(64) NOT NULL,
  post_id VARCHAR(64) NOT NULL,
  actor_id VARCHAR(64) NOT NULL,
  from_status VARCHAR(32) NOT NULL,
  to_status VARCHAR(32) NOT NULL,
  source_version CHAR(64) NOT NULL,
  resulting_version CHAR(64) NOT NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_workflow_scope (company_id,post_id,recorded_at),
  CONSTRAINT fk_workflow_post FOREIGN KEY (post_id) REFERENCES content_posts(id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}
