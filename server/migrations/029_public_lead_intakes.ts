import type {Pool,Connection} from 'mysql2/promise';
export async function createPublicLeadIntakes(db:Pool|Connection){
 await db.query(`CREATE TABLE IF NOT EXISTS public_lead_intakes (
 company_id VARCHAR(64) NOT NULL,
 request_key CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 input_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 lead_id VARCHAR(64) NOT NULL,
 notification_state VARCHAR(32) CHARACTER SET ascii NOT NULL DEFAULT 'NOT_ATTEMPTED',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(company_id,request_key),
 UNIQUE KEY uq_public_intake_lead(lead_id),
 INDEX idx_public_intake_created(company_id,created_at),
 INDEX idx_public_intake_notification(company_id,notification_state,updated_at),
 CONSTRAINT fk_public_intake_company FOREIGN KEY(company_id) REFERENCES companies(id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}
