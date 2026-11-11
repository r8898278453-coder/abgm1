import {defineSqlMigration} from './manifestV1';
export const knowledgeIngestionQueue=defineSqlMigration({name:'032_knowledge_ingestion_queue',preflight:[{code:'MIGRATION_KNOWLEDGE_JOB_CONFLICT',sql:"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='knowledge_sources' AND ((COLUMN_NAME='extraction_job_id' AND (DATA_TYPE<>'varchar' OR CHARACTER_MAXIMUM_LENGTH<64 OR IS_NULLABLE<>'YES')) OR (COLUMN_NAME='extraction_attempt' AND (DATA_TYPE<>'int' OR COLUMN_TYPE NOT LIKE '%unsigned%' OR IS_NULLABLE<>'YES')))"}],statements:[
 'ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS extraction_job_id VARCHAR(64) DEFAULT NULL',
 'ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS extraction_attempt INT UNSIGNED DEFAULT NULL'
]});
