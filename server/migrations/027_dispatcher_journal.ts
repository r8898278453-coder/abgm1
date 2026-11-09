import type {Pool,Connection} from 'mysql2/promise';
export async function createDispatcherJournal(db:Pool|Connection){
 await db.query(`CREATE TABLE IF NOT EXISTS dispatcher_state (
 cursor_key VARCHAR(32) CHARACTER SET ascii PRIMARY KEY,next_group TINYINT UNSIGNED NOT NULL DEFAULT 0,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
 await db.query(`CREATE TABLE IF NOT EXISTS dispatcher_ticks (
 slot_key BIGINT UNSIGNED PRIMARY KEY,owner_token CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 first_group TINYINT UNSIGNED NOT NULL,status VARCHAR(16) CHARACTER SET ascii NOT NULL,
 stage_states LONGTEXT NOT NULL,started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,finished_at TIMESTAMP NULL DEFAULT NULL,
 INDEX idx_dispatcher_status(status,started_at)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}
