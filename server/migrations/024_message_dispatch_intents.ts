import type {Pool,Connection} from 'mysql2/promise';
export async function createMessageDispatchIntents(db:Pool|Connection){
 await db.query(`CREATE TABLE IF NOT EXISTS message_dispatch_intents (
 company_id VARCHAR(64) NOT NULL,request_key CHAR(64) NOT NULL,input_hash CHAR(64) NOT NULL,
 actor_id VARCHAR(64) NOT NULL,
 status VARCHAR(32) NOT NULL,claim_token VARCHAR(64) NOT NULL,provider_id VARCHAR(255) DEFAULT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(company_id,request_key),
 INDEX idx_message_intent_created(company_id,created_at),
 INDEX idx_message_intent_state(company_id,status,updated_at),
 CONSTRAINT fk_message_intent_company FOREIGN KEY(company_id) REFERENCES companies(id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}
