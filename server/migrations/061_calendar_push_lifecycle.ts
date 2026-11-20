import { defineSqlMigration } from './manifestV1';

export const calendarPushLifecycleColumns = ['manager_id','renew_after_ms'] as const;
export const calendarPushJobColumns = ['channel_id','kind','company_id','manager_id','calendar_hash','token_hash',
  'resource_id','state','requested_at_ms','expires_at_ms'] as const;
export const calendarPushLifecycle = defineSqlMigration({
  name:'061_calendar_push_lifecycle',
  preflight:[{
    code:'MIGRATION_CALENDAR_PUSH_LIFECYCLE_SHAPE',
    sql:`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='calendar_push_channels'
      AND ((COLUMN_NAME='manager_id' AND (DATA_TYPE<>'varchar' OR CHARACTER_MAXIMUM_LENGTH<>64 OR IS_NULLABLE<>'YES'))
        OR (COLUMN_NAME='renew_after_ms' AND (DATA_TYPE<>'bigint' OR COLUMN_TYPE NOT LIKE '%unsigned%' OR IS_NULLABLE<>'NO')))`,
  }],
  statements:[
    'ALTER TABLE calendar_push_channels ADD COLUMN IF NOT EXISTS manager_id VARCHAR(64) NULL',
    'ALTER TABLE calendar_push_channels ADD COLUMN IF NOT EXISTS renew_after_ms BIGINT UNSIGNED NOT NULL DEFAULT 0',
    `CREATE TABLE IF NOT EXISTS calendar_push_jobs (
      channel_id CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      kind VARCHAR(5) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      company_id VARCHAR(64) NOT NULL, manager_id VARCHAR(64) NOT NULL,
      calendar_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
      resource_id VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NULL,
      state VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      requested_at_ms BIGINT UNSIGNED NOT NULL, expires_at_ms BIGINT UNSIGNED NOT NULL,
      PRIMARY KEY(channel_id,kind),
      KEY idx_calendar_push_jobs_company(company_id,kind,requested_at_ms),
      KEY idx_calendar_push_jobs_due(kind,state,requested_at_ms)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ],
});
