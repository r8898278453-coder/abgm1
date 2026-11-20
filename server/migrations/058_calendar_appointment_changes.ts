import { defineSqlMigration } from './manifestV1';

export const calendarChangeColumns = {
  operation: "VARCHAR(12) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'CREATE'",
  reminder_minutes: 'SMALLINT UNSIGNED NULL',
  hold_until_ms: 'BIGINT UNSIGNED NULL',
} as const;

export const calendarChangeCheck = {
  code: 'MIGRATION_CALENDAR_CHANGE_SHAPE',
  sql: `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sales_calendar_intents' AND (
      (COLUMN_NAME='operation' AND (DATA_TYPE<>'varchar' OR CHARACTER_MAXIMUM_LENGTH<>12 OR COLLATION_NAME<>'ascii_bin' OR IS_NULLABLE<>'NO'))
      OR (COLUMN_NAME='reminder_minutes' AND (DATA_TYPE<>'smallint' OR COLUMN_TYPE NOT LIKE '%unsigned%' OR IS_NULLABLE<>'YES'))
      OR (COLUMN_NAME='hold_until_ms' AND (DATA_TYPE<>'bigint' OR COLUMN_TYPE NOT LIKE '%unsigned%' OR IS_NULLABLE<>'YES'))
    )`,
};

export const calendarAppointmentChanges = defineSqlMigration({
  name: '058_calendar_appointment_changes',
  preflight: [calendarChangeCheck],
  statements: Object.entries(calendarChangeColumns).map(([column, definition]) =>
    `ALTER TABLE sales_calendar_intents ADD COLUMN IF NOT EXISTS ${column} ${definition}`),
});
