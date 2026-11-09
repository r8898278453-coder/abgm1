import type {Connection,Pool} from 'mysql2/promise';
export async function createPublicationDraftIntents(db:Connection|Pool):Promise<void>{
 await db.query(`CREATE TABLE IF NOT EXISTS publication_draft_intents (
   company_id VARCHAR(64) NOT NULL,
   request_key CHAR(64) NOT NULL,
   input_hash CHAR(64) NOT NULL,
   actor_id VARCHAR(64) NOT NULL,
   post_id VARCHAR(64) DEFAULT NULL,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   PRIMARY KEY (company_id,request_key),
   UNIQUE KEY uq_publication_intent_post (post_id),
   CONSTRAINT fk_publication_intent_post FOREIGN KEY (post_id) REFERENCES content_posts(id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}
