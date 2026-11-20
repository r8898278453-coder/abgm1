import {defineSqlMigration} from './manifestV1';
const id='VARCHAR(64) NOT NULL',stamp='BIGINT UNSIGNED NOT NULL',hash='CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL',state='VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL';
export const CALENDAR_WRITE_TABLES={
 sales_calendar_intents:{
  columns:{id:hash,company_id:id,lead_id:id,actor_id:id,request_key:hash,input_hash:hash,calendar_hash:hash,external_event_id:hash,expected_revision:stamp,state,start_at_ms:stamp,end_at_ms:stamp},
  indexes:{uq_calendar_intent_request:['company_id','request_key'],idx_calendar_intent_lead:['company_id','lead_id','state'],idx_calendar_intent_window:['company_id','calendar_hash','state','start_at_ms','end_at_ms']},
 },
} as const;
export const CALENDAR_WRITE_CHECKS=Object.entries(CALENDAR_WRITE_TABLES).flatMap(([table,{columns,indexes}])=>[
 {code:'MIGRATION_CALENDAR_WRITE_SHAPE',sql:`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES t WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='${table}' AND(ENGINE<>'InnoDB' OR NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS s WHERE s.TABLE_SCHEMA=DATABASE() AND s.TABLE_NAME=t.TABLE_NAME AND s.INDEX_NAME='PRIMARY' GROUP BY s.INDEX_NAME HAVING GROUP_CONCAT(s.COLUMN_NAME ORDER BY s.SEQ_IN_INDEX)='id' AND MIN(s.NON_UNIQUE)=0 AND SUM(s.SUB_PART IS NOT NULL)=0) OR ${Object.entries(columns).map(([name,definition])=>{const match=definition.match(/^(VARCHAR|CHAR)\((\d+)\)/);return`NOT EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS c WHERE c.TABLE_SCHEMA=DATABASE() AND c.TABLE_NAME=t.TABLE_NAME AND c.COLUMN_NAME='${name}' AND c.DATA_TYPE='${definition.split(/[ (]/)[0].toLowerCase()}' AND c.IS_NULLABLE='${definition.endsWith('NOT NULL')?'NO':'YES'}' ${match?`AND c.CHARACTER_MAXIMUM_LENGTH=${match[2]}`:''} ${definition.includes('ascii_bin')?"AND c.COLLATION_NAME='ascii_bin'":''} ${definition.includes('UNSIGNED')?"AND c.COLUMN_TYPE LIKE '%unsigned%'":''})`;}).join(' OR ')})`},
 {code:'MIGRATION_CALENDAR_WRITE_INDEX',sql:`SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='${table}' AND INDEX_NAME IN (${Object.keys(indexes).map(n=>"'"+n+"'").join(',')}) GROUP BY INDEX_NAME HAVING SUM(SUB_PART IS NOT NULL)<>0 OR ${Object.entries(indexes).map(([n,c])=>`(INDEX_NAME='${n}' AND(MIN(NON_UNIQUE)<>${n.startsWith('uq_')?0:1} OR GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX)<>'${c.join(',')}'))`).join(' OR ')}`}
]);
export const calendarWriteMigration=defineSqlMigration({name:'057_calendar_write_intents',preflight:CALENDAR_WRITE_CHECKS,statements:Object.entries(CALENDAR_WRITE_TABLES).flatMap(([table,{columns,indexes}])=>[
 `CREATE TABLE IF NOT EXISTS ${table}(${Object.entries(columns).map(([n,d])=>n+' '+d).join(',')},PRIMARY KEY(id),${Object.entries(indexes).map(([n,c])=>`${n.startsWith('uq_')?'UNIQUE ':''}KEY ${n}(${c.join(',')})`).join(',')}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
 ...Object.entries(indexes).map(([n,c])=>`CREATE ${n.startsWith('uq_')?'UNIQUE ':''}INDEX IF NOT EXISTS ${n} ON ${table}(${c.join(',')})`)
])});
