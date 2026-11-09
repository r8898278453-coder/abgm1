import {defineSqlMigration} from './manifestV1';
export const privateKnowledgeSources=defineSqlMigration({name:'030_private_knowledge_sources',preflight:[{
 code:'MIGRATION_KNOWLEDGE_TABLE_CONFLICT',sql:`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES t
 WHERE t.TABLE_SCHEMA=DATABASE() AND t.TABLE_NAME='knowledge_sources' AND (
 t.ENGINE<>'InnoDB' OR
 (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS c WHERE c.TABLE_SCHEMA=DATABASE() AND c.TABLE_NAME=t.TABLE_NAME
 AND c.COLUMN_NAME IN ('id','company_id','filename','media_type','byte_size','content_sha','content_bytes','extraction_state','extraction_code','extracted_text','chunks_json','revision','claimed_at','approved_by','approved_at','created_at','updated_at'))<>17 OR
 NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS c WHERE c.TABLE_SCHEMA=DATABASE() AND c.TABLE_NAME=t.TABLE_NAME AND c.COLUMN_NAME='content_bytes' AND c.DATA_TYPE='mediumblob') OR
 NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS s WHERE s.TABLE_SCHEMA=DATABASE() AND s.TABLE_NAME=t.TABLE_NAME AND s.INDEX_NAME='uq_knowledge_company_sha' AND s.NON_UNIQUE=0) OR
 NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k WHERE k.TABLE_SCHEMA=DATABASE() AND k.TABLE_NAME=t.TABLE_NAME AND k.COLUMN_NAME='company_id' AND k.REFERENCED_TABLE_NAME='companies' AND k.REFERENCED_COLUMN_NAME='id'))`
}],statements:[
 `CREATE TABLE IF NOT EXISTS knowledge_sources (
 id VARCHAR(64) NOT NULL PRIMARY KEY,company_id VARCHAR(64) NOT NULL,
 filename VARCHAR(255) NOT NULL,media_type VARCHAR(128) NOT NULL,byte_size INT UNSIGNED NOT NULL,
 content_sha CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,content_bytes MEDIUMBLOB NOT NULL,
 extraction_state VARCHAR(32) NOT NULL DEFAULT 'STORED',extraction_code VARCHAR(64) DEFAULT NULL,
 extracted_text MEDIUMTEXT DEFAULT NULL,chunks_json MEDIUMTEXT DEFAULT NULL,
 revision BIGINT UNSIGNED NOT NULL DEFAULT 0,claimed_at TIMESTAMP NULL DEFAULT NULL,
 approved_by VARCHAR(64) DEFAULT NULL,approved_at TIMESTAMP NULL DEFAULT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY idx_knowledge_company_created(company_id,created_at),UNIQUE KEY uq_knowledge_company_sha(company_id,content_sha),
 CONSTRAINT fk_knowledge_company FOREIGN KEY(company_id) REFERENCES companies(id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
]});
