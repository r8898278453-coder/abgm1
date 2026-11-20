import { defineSqlMigration } from './manifestV1';

export const calendarReconciliationColumns = {
  sync_due_ms: 'BIGINT UNSIGNED NOT NULL DEFAULT 0',
  sync_failures: 'SMALLINT UNSIGNED NOT NULL DEFAULT 0',
  sync_claim: 'CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL',
  sync_status: 'VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NULL',
} as const;

export const calendarReconciliationIndex = ['operation', 'state', 'sync_due_ms', 'id'] as const;
const indexName = 'idx_calendar_sync_due';
export const calendarReconciliationChecks = [{
  code: 'MIGRATION_CALENDAR_RECONCILIATION_SHAPE',
  sql: `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sales_calendar_intents' AND (
      (COLUMN_NAME IN ('sync_due_ms','sync_failures') AND (
        DATA_TYPE<>IF(COLUMN_NAME='sync_due_ms','bigint','smallint') OR COLUMN_TYPE NOT LIKE '%unsigned%'
        OR IS_NULLABLE<>'NO' OR COALESCE(COLUMN_DEFAULT,'')<>'0'))
      OR (COLUMN_NAME='sync_claim' AND (DATA_TYPE<>'char' OR CHARACTER_MAXIMUM_LENGTH<>64 OR COLLATION_NAME<>'ascii_bin' OR IS_NULLABLE<>'YES'))
      OR (COLUMN_NAME='sync_status' AND (DATA_TYPE<>'varchar' OR CHARACTER_MAXIMUM_LENGTH<>16 OR COLLATION_NAME<>'ascii_bin' OR IS_NULLABLE<>'YES'))
    )`,
}, {
  code: 'MIGRATION_CALENDAR_RECONCILIATION_INDEX',
  sql: `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE()
    AND TABLE_NAME='sales_calendar_intents' AND INDEX_NAME='${indexName}'
    GROUP BY INDEX_NAME HAVING MIN(NON_UNIQUE)<>1 OR SUM(SUB_PART IS NOT NULL)<>0
      OR GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX)<>'${calendarReconciliationIndex.join(',')}'`,
}];

export const calendarReconciliation = defineSqlMigration({
  name: '059_calendar_reconciliation',
  preflight: calendarReconciliationChecks,
  statements: [
    ...Object.entries(calendarReconciliationColumns).map(([column, definition]) =>
      `ALTER TABLE sales_calendar_intents ADD COLUMN IF NOT EXISTS ${column} ${definition}`),
    `CREATE INDEX IF NOT EXISTS ${indexName} ON sales_calendar_intents(${calendarReconciliationIndex.join(',')})`,
  ],
});
