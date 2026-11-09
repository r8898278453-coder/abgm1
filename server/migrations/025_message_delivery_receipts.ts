import type {Pool,Connection} from 'mysql2/promise';
export async function createMessageDeliveryReceipts(db:Pool|Connection){
 const [columns]:any=await db.query("SHOW COLUMNS FROM message_dispatch_intents LIKE 'sender_id'");
 if(!columns.length)await db.query('ALTER TABLE message_dispatch_intents ADD COLUMN sender_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL');
 await db.query(`CREATE TABLE IF NOT EXISTS message_delivery_receipts (
 company_id VARCHAR(64) NOT NULL,event_key CHAR(64) CHARACTER SET ascii NOT NULL,
 phone_number_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 provider_id VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 status VARCHAR(16) CHARACTER SET ascii NOT NULL,occurred_at_ms BIGINT UNSIGNED NOT NULL,error_code INT UNSIGNED DEFAULT NULL,
 received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(company_id,event_key),
 INDEX idx_receipt_message(company_id,provider_id,phone_number_id,status),
 INDEX idx_receipt_day(company_id,received_at),
 CONSTRAINT fk_receipt_company FOREIGN KEY(company_id) REFERENCES companies(id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}
