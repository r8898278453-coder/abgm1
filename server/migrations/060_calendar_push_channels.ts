import { defineSqlMigration } from './manifestV1';

const table = 'calendar_push_channels';
export const calendarPushColumns = {
  company_id: 'VARCHAR(64) NOT NULL',
  channel_id: 'CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL',
  token_hash: 'CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL',
  calendar_hash: 'CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL',
  state: 'VARCHAR(12) CHARACTER SET ascii COLLATE ascii_bin NOT NULL',
  resource_id: 'VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NULL',
  expires_at_ms: 'BIGINT UNSIGNED NOT NULL',
  last_message: 'BIGINT UNSIGNED NOT NULL DEFAULT 0',
  last_wake_ms: 'BIGINT UNSIGNED NOT NULL DEFAULT 0',
  requested_at_ms: 'BIGINT UNSIGNED NOT NULL',
} as const;
export const calendarPushChecks = [{
  code: 'MIGRATION_CALENDAR_PUSH_SHAPE',
  sql: `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES t WHERE TABLE_SCHEMA=DATABASE()
    AND TABLE_NAME='${table}' AND (ENGINE<>'InnoDB' OR
    ${Object.entries(calendarPushColumns).map(([column, definition]) => {
      const shape = definition.match(/^(VARCHAR|CHAR)\((\d+)\)/);
      return `NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS c WHERE c.TABLE_SCHEMA=DATABASE()
        AND c.TABLE_NAME=t.TABLE_NAME AND c.COLUMN_NAME='${column}'
        AND c.DATA_TYPE='${definition.split(/[ (]/)[0].toLowerCase()}'
        AND c.IS_NULLABLE='${definition.includes('NOT NULL')?'NO':'YES'}'
        ${shape?`AND c.CHARACTER_MAXIMUM_LENGTH=${shape[2]}`:''}
        ${definition.includes('ascii_bin')?"AND c.COLLATION_NAME='ascii_bin'":''}
        ${definition.includes('UNSIGNED')?"AND c.COLUMN_TYPE LIKE '%unsigned%'":''})`;
    }).join(' OR ')})`,
}, {
  code: 'MIGRATION_CALENDAR_PUSH_INDEX',
  sql: `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE()
    AND TABLE_NAME='${table}' AND INDEX_NAME IN ('PRIMARY','uq_calendar_push_channel') GROUP BY INDEX_NAME
    HAVING MIN(NON_UNIQUE)<>0 OR SUM(SUB_PART IS NOT NULL)<>0
      OR GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX)<>IF(INDEX_NAME='PRIMARY','company_id','channel_id')`,
}];
export const calendarPushChannels = defineSqlMigration({
  name: '060_calendar_push_channels',
  preflight: calendarPushChecks,
  statements: [
    `CREATE TABLE IF NOT EXISTS ${table}(${Object.entries(calendarPushColumns).map(([name,type])=>name+' '+type).join(',')},
      PRIMARY KEY(company_id),UNIQUE KEY uq_calendar_push_channel(channel_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_calendar_push_channel ON ${table}(channel_id)`,
  ],
});
