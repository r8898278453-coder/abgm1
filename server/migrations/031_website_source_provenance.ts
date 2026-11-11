import {defineSqlMigration} from './manifestV1';
export const websiteSourceProvenance=defineSqlMigration({name:'031_website_source_provenance',preflight:[{code:'MIGRATION_WEBSITE_PROVENANCE_CONFLICT',sql:"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='knowledge_sources' AND ((COLUMN_NAME='source_url' AND (DATA_TYPE<>'varchar' OR CHARACTER_MAXIMUM_LENGTH<2048)) OR (COLUMN_NAME='fetched_at_ms' AND (DATA_TYPE<>'bigint' OR COLUMN_TYPE NOT LIKE '%unsigned%')))"}],statements:[
 'ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS source_url VARCHAR(2048) DEFAULT NULL',
 'ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS fetched_at_ms BIGINT UNSIGNED DEFAULT NULL'
]});
