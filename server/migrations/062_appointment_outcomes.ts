import {defineSqlMigration} from './manifestV1';

const id='VARCHAR(64) NOT NULL',stamp='BIGINT UNSIGNED NOT NULL';
const hash='CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL';
export const appointmentOutcomeColumns={
  id,company_id:id,lead_id:id,booking_id:id,actor_id:id,request_key:hash,input_hash:hash,revision:stamp,
  outcome:'VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL',
  declared_source:'VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL',
  evidence:'VARCHAR(500) NOT NULL',recorded_at_ms:stamp,
} as const;
export const appointmentOutcomeIndexes={
  uq_appointment_outcome_request:['company_id','request_key'],
  uq_appointment_outcome_revision:['company_id','booking_id','revision'],
} as const;
const endIndex=['company_id','state','end_at_ms'];
const table='sales_appointment_outcomes';
export const appointmentOutcomeChecks=[{
  code:'MIGRATION_APPOINTMENT_OUTCOME_SHAPE',
  sql:`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES t WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='${table}'
    AND (ENGINE<>'InnoDB' OR ${Object.entries(appointmentOutcomeColumns).map(([name,definition])=>{
      const width=definition.match(/^(?:VARCHAR|CHAR)\((\d+)\)/)?.[1];
      return `NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS c WHERE c.TABLE_SCHEMA=DATABASE()
        AND c.TABLE_NAME=t.TABLE_NAME AND c.COLUMN_NAME='${name}'
        AND c.DATA_TYPE='${definition.split(/[ (]/)[0].toLowerCase()}' AND c.IS_NULLABLE='NO'
        ${width?`AND c.CHARACTER_MAXIMUM_LENGTH=${width}`:''}
        ${definition.includes('ascii_bin')?"AND c.COLLATION_NAME='ascii_bin'":''}
        ${definition.includes('UNSIGNED')?"AND c.COLUMN_TYPE LIKE '%unsigned%'":''})`;
    }).join(' OR ')})`,
},{
  code:'MIGRATION_APPOINTMENT_OUTCOME_INDEX',
  sql:`SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='${table}'
    AND INDEX_NAME IN ('PRIMARY',${Object.keys(appointmentOutcomeIndexes).map(name=>"'"+name+"'").join(',')})
    GROUP BY INDEX_NAME HAVING MIN(NON_UNIQUE)<>0 OR SUM(SUB_PART IS NOT NULL)<>0 OR
    (INDEX_NAME='PRIMARY' AND GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX)<>'id') OR
    ${Object.entries(appointmentOutcomeIndexes).map(([name,columns])=>
      `(INDEX_NAME='${name}' AND GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX)<>'${columns.join(',')}')`).join(' OR ')}`,
},{
  code:'MIGRATION_APPOINTMENT_BOOKING_END_INDEX',
  sql:`SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE()
    AND TABLE_NAME='sales_booking_evidence' AND INDEX_NAME='idx_booking_end' GROUP BY INDEX_NAME
    HAVING MIN(NON_UNIQUE)<>1 OR SUM(SUB_PART IS NOT NULL)<>0 OR
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX)<>'${endIndex.join(',')}'`,
}];
export const appointmentOutcomes=defineSqlMigration({
  name:'062_appointment_outcomes',preflight:appointmentOutcomeChecks,
  statements:[
    `CREATE TABLE IF NOT EXISTS ${table}(${Object.entries(appointmentOutcomeColumns).map(([name,type])=>name+' '+type).join(',')},
      PRIMARY KEY(id),${Object.entries(appointmentOutcomeIndexes).map(([name,columns])=>
        `UNIQUE KEY ${name}(${columns.join(',')})`).join(',')}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    ...Object.entries(appointmentOutcomeIndexes).map(([name,columns])=>
      `CREATE UNIQUE INDEX IF NOT EXISTS ${name} ON ${table}(${columns.join(',')})`),
    `CREATE INDEX IF NOT EXISTS idx_booking_end ON sales_booking_evidence(${endIndex.join(',')})`,
  ],
});
