import type {Connection,Pool} from 'mysql2/promise';
export async function createPublicationAdmissionLimits(db:Connection|Pool):Promise<void>{
 const [columns]:any=await db.query("SHOW COLUMNS FROM publication_execution_controls LIKE 'daily_post_limit'");
 if(!columns.length)await db.query('ALTER TABLE publication_execution_controls ADD COLUMN daily_post_limit INT UNSIGNED DEFAULT NULL');
 await db.query(`CREATE TABLE IF NOT EXISTS publication_admission_reservations (
  company_id VARCHAR(64) NOT NULL,
  quota_day DATE NOT NULL,
  post_id VARCHAR(64) NOT NULL,
  claim_token VARCHAR(64) NOT NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id,quota_day,post_id),
  INDEX idx_admission_post (post_id),
  CONSTRAINT fk_admission_post FOREIGN KEY (post_id) REFERENCES content_posts(id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}
